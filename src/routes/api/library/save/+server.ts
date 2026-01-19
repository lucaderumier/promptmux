/**
 * API endpoint to save a prompt map with its responses and follow-ups
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Provider } from '$lib/llm/types';
import { validatePromptMapRequest } from '$lib/server/validation';
import { checkRateLimit, createRateLimitKey, RATE_LIMITS } from '$lib/server/rate-limit';

interface SavePromptMapRequest {
	name: string;
	prompt: string;
	promptPosition: { x: number; y: number };
	folderId?: string | null;
	responses: {
		id: string; // Client-side ID for linking
		provider: Provider;
		model: string;
		modelName: string;
		response: string;
		latencyMs: number | null;
		promptTokens?: number | null;
		completionTokens?: number | null;
		costCents?: number | null;
		rating: number | null;
		notes: string | null;
		liked?: boolean;
		position: { x: number; y: number };
		parentNodeId: string;
		parentNodeType: 'prompt' | 'followup';
	}[];
	followUps?: {
		id: string; // Client-side ID for linking
		prompt: string;
		position: { x: number; y: number };
		depth: number;
		parentResponseIds: string[]; // Client-side response IDs
	}[];
}

export const POST: RequestHandler = async ({ request, locals }) => {
	const session = locals.session;
	const supabase = locals.supabase;

	if (!session) {
		throw error(401, 'Unauthorized');
	}

	// Rate limiting
	const rateLimitKey = createRateLimitKey(session.user.id, 'library-save');
	const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.LIBRARY_SAVE);
	if (!rateLimit.allowed) {
		throw error(429, 'Too many requests. Please wait before trying again.');
	}

	const body = (await request.json()) as SavePromptMapRequest;
	const { name, prompt, promptPosition, folderId, responses, followUps = [] } = body;

	if (!name || !prompt) {
		throw error(400, 'Missing name or prompt');
	}

	// Validate input lengths to prevent DoS
	const validationError = validatePromptMapRequest(body);
	if (validationError) {
		throw error(400, validationError.message);
	}

	// Create the prompt map
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const { data: promptMapData, error: mapError } = await (supabase as any)
		.from('prompt_maps')
		.insert({
			user_id: session.user.id,
			name,
			prompt,
			folder_id: folderId || null,
			prompt_position_x: promptPosition.x,
			prompt_position_y: promptPosition.y
		})
		.select()
		.single();

	if (mapError || !promptMapData) {
		console.error('Failed to create prompt map:', mapError);
		throw error(500, 'Failed to save prompt map');
	}

	const promptMap = promptMapData as { id: string };

	// Maps to translate client-side IDs to server-side IDs
	const responseIdMap = new Map<string, string>(); // client ID -> server ID
	const followUpIdMap = new Map<string, string>(); // client ID -> server ID

	// Insert follow-up prompts first (to get their IDs before inserting responses)
	if (followUps.length > 0) {
		const followUpRecords = followUps.map((f) => ({
			prompt_map_id: promptMap.id,
			prompt: f.prompt,
			position_x: f.position.x,
			position_y: f.position.y,
			depth: f.depth,
			status: 'ready' // Saved follow-ups are considered ready
		}));

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const { data: insertedFollowUps, error: followUpError } = await (supabase as any)
			.from('follow_up_prompts')
			.insert(followUpRecords)
			.select();

		if (followUpError) {
			console.error('Failed to save follow-ups:', followUpError);
			await supabase.from('prompt_maps').delete().eq('id', promptMap.id);
			throw error(500, 'Failed to save follow-ups');
		}

		// Map client IDs to server IDs (insertion order is preserved)
		const insertedFollowUpsArray = insertedFollowUps as { id: string }[];
		followUps.forEach((f, index) => {
			followUpIdMap.set(f.id, insertedFollowUpsArray[index].id);
		});
	}

	// Insert model responses
	if (responses.length > 0) {
		const responseRecords = responses.map((r) => ({
			prompt_map_id: promptMap.id,
			provider: r.provider,
			model: r.model,
			response: r.response,
			latency_ms: r.latencyMs,
			prompt_tokens: r.promptTokens ?? null,
			completion_tokens: r.completionTokens ?? null,
			cost_cents: r.costCents ?? null,
			rating: r.rating,
			notes: r.notes,
			liked: r.liked ?? false,
			position_x: r.position.x,
			position_y: r.position.y,
			// Map parent node ID (follow-ups get mapped, prompt stays null for root)
			parent_node_id:
				r.parentNodeType === 'followup' ? followUpIdMap.get(r.parentNodeId) || null : null,
			parent_node_type: r.parentNodeType
		}));

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const { data: insertedResponses, error: responsesError } = await (supabase as any)
			.from('model_responses')
			.insert(responseRecords)
			.select();

		if (responsesError) {
			console.error('Failed to save responses:', responsesError);
			// Clean up
			await supabase.from('follow_up_prompts').delete().eq('prompt_map_id', promptMap.id);
			await supabase.from('prompt_maps').delete().eq('id', promptMap.id);
			throw error(500, 'Failed to save responses');
		}

		// Map client IDs to server IDs
		const insertedResponsesArray = insertedResponses as { id: string }[];
		responses.forEach((r, index) => {
			responseIdMap.set(r.id, insertedResponsesArray[index].id);
		});
	}

	// Insert follow-up parents junction records
	if (followUps.length > 0) {
		const parentRecords: { follow_up_id: string; parent_response_id: string; merge_order: number }[] =
			[];

		followUps.forEach((f) => {
			const followUpServerId = followUpIdMap.get(f.id);
			if (followUpServerId) {
				f.parentResponseIds.forEach((parentClientId, index) => {
					const parentServerId = responseIdMap.get(parentClientId);
					if (parentServerId) {
						parentRecords.push({
							follow_up_id: followUpServerId,
							parent_response_id: parentServerId,
							merge_order: index
						});
					}
				});
			}
		});

		if (parentRecords.length > 0) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const { error: parentsError } = await (supabase as any)
				.from('follow_up_parents')
				.insert(parentRecords);

			if (parentsError) {
				console.error('Failed to save follow-up parents:', parentsError);
				// Don't fail the entire save for this, the structure is still mostly intact
			}
		}
	}

	return json({
		success: true,
		promptMapId: promptMap.id
	});
};
