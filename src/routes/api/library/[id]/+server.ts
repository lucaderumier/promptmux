/**
 * API endpoint to get, update, or delete a prompt map with its responses and follow-ups
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Provider } from '$lib/llm/types';

interface UpdatePromptMapRequest {
	name: string;
	prompt: string;
	promptPosition: { x: number; y: number };
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

export const GET: RequestHandler = async ({ params, locals }) => {
	const session = locals.session;
	const supabase = locals.supabase;

	if (!session) {
		throw error(401, 'Unauthorized');
	}

	const { id } = params;

	// Fetch the prompt map
	const { data: promptMapData, error: mapError } = await supabase
		.from('prompt_maps')
		.select('*')
		.eq('id', id)
		.eq('user_id', session.user.id)
		.single();

	if (mapError || !promptMapData) {
		throw error(404, 'Prompt map not found');
	}

	const promptMap = promptMapData as {
		id: string;
		name: string;
		prompt: string;
		prompt_position_x: number | null;
		prompt_position_y: number | null;
		folder_id: string | null;
		created_at: string;
		updated_at: string;
	};

	// Fetch the model responses
	const { data: responsesData, error: responsesError } = await supabase
		.from('model_responses')
		.select('*')
		.eq('prompt_map_id', id)
		.order('created_at', { ascending: true });

	if (responsesError) {
		console.error('Failed to fetch responses:', responsesError);
		throw error(500, 'Failed to load responses');
	}

	const responses = (responsesData || []) as {
		id: string;
		provider: string;
		model: string;
		response: string;
		latency_ms: number | null;
		prompt_tokens: number | null;
		completion_tokens: number | null;
		cost_cents: number | null;
		rating: number | null;
		notes: string | null;
		liked: boolean | null;
		position_x: number | null;
		position_y: number | null;
		parent_node_id: string | null;
		parent_node_type: string | null;
		created_at: string;
	}[];

	// Fetch follow-up prompts
	const { data: followUpsData, error: followUpsError } = await supabase
		.from('follow_up_prompts')
		.select('*')
		.eq('prompt_map_id', id)
		.order('created_at', { ascending: true });

	if (followUpsError) {
		console.error('Failed to fetch follow-ups:', followUpsError);
		// Don't fail entirely, just return empty follow-ups
	}

	const followUps = (followUpsData || []) as {
		id: string;
		prompt: string;
		position_x: number | null;
		position_y: number | null;
		depth: number | null;
		status: string | null;
		created_at: string;
	}[];

	// Fetch follow-up parent relationships
	const followUpIds = followUps.map((f) => f.id);
	let followUpParents: { follow_up_id: string; parent_response_id: string; merge_order: number }[] =
		[];

	if (followUpIds.length > 0) {
		const { data: parentsData, error: parentsError } = await supabase
			.from('follow_up_parents')
			.select('*')
			.in('follow_up_id', followUpIds)
			.order('merge_order', { ascending: true });

		if (parentsError) {
			console.error('Failed to fetch follow-up parents:', parentsError);
		} else {
			followUpParents = (parentsData || []) as {
				follow_up_id: string;
				parent_response_id: string;
				merge_order: number;
			}[];
		}
	}

	// Build a map of follow-up ID to parent response IDs
	const followUpParentsMap = new Map<string, string[]>();
	followUpParents.forEach((p) => {
		const existing = followUpParentsMap.get(p.follow_up_id) || [];
		existing.push(p.parent_response_id);
		followUpParentsMap.set(p.follow_up_id, existing);
	});

	// Build a map of follow-up ID to child response IDs
	const followUpChildrenMap = new Map<string, string[]>();
	responses.forEach((r) => {
		if (r.parent_node_type === 'followup' && r.parent_node_id) {
			const existing = followUpChildrenMap.get(r.parent_node_id) || [];
			existing.push(r.id);
			followUpChildrenMap.set(r.parent_node_id, existing);
		}
	});

	return json({
		id: promptMap.id,
		name: promptMap.name,
		prompt: promptMap.prompt,
		promptPosition: {
			x: promptMap.prompt_position_x || 0,
			y: promptMap.prompt_position_y || 0
		},
		folderId: promptMap.folder_id,
		createdAt: promptMap.created_at,
		updatedAt: promptMap.updated_at,
		responses: responses.map((r) => ({
			id: r.id,
			provider: r.provider,
			model: r.model,
			response: r.response,
			latencyMs: r.latency_ms,
			promptTokens: r.prompt_tokens,
			completionTokens: r.completion_tokens,
			costCents: r.cost_cents,
			rating: r.rating,
			notes: r.notes,
			liked: r.liked ?? false,
			position: {
				x: r.position_x || 0,
				y: r.position_y || 0
			},
			parentNodeId: r.parent_node_id,
			parentNodeType: r.parent_node_type as 'prompt' | 'followup' | null,
			createdAt: r.created_at
		})),
		followUps: followUps.map((f) => ({
			id: f.id,
			prompt: f.prompt,
			position: {
				x: f.position_x || 0,
				y: f.position_y || 0
			},
			depth: f.depth || 1,
			status: f.status || 'ready',
			parentResponseIds: followUpParentsMap.get(f.id) || [],
			childResponseIds: followUpChildrenMap.get(f.id) || [],
			createdAt: f.created_at
		}))
	});
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const session = locals.session;
	const supabase = locals.supabase;

	if (!session) {
		throw error(401, 'Unauthorized');
	}

	const { id } = params;

	// Cascade delete will handle follow_up_parents, follow_up_prompts, and model_responses
	const { error: deleteError } = await supabase
		.from('prompt_maps')
		.delete()
		.eq('id', id)
		.eq('user_id', session.user.id);

	if (deleteError) {
		throw error(500, 'Failed to delete prompt map');
	}

	return json({ success: true });
};

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const session = locals.session;
	const supabase = locals.supabase;

	if (!session) {
		throw error(401, 'Unauthorized');
	}

	const { id } = params;
	const body = await request.json();
	const { name } = body as { name?: string };

	if (!name?.trim()) {
		throw error(400, 'Name is required');
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const { error: updateError } = await (supabase as any)
		.from('prompt_maps')
		.update({ name: name.trim(), updated_at: new Date().toISOString() })
		.eq('id', id)
		.eq('user_id', session.user.id);

	if (updateError) {
		throw error(500, 'Failed to rename prompt map');
	}

	return json({ success: true });
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const session = locals.session;
	const supabase = locals.supabase;

	if (!session) {
		throw error(401, 'Unauthorized');
	}

	const { id } = params;
	const body = (await request.json()) as UpdatePromptMapRequest;
	const { name, prompt, promptPosition, responses, followUps = [] } = body;

	if (!name || !prompt) {
		throw error(400, 'Missing name or prompt');
	}

	// Verify user owns this prompt_map
	const { data: existingMap, error: fetchError } = await supabase
		.from('prompt_maps')
		.select('id')
		.eq('id', id)
		.eq('user_id', session.user.id)
		.single();

	if (fetchError || !existingMap) {
		throw error(404, 'Prompt map not found');
	}

	// Update the prompt map
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const { error: updateError } = await (supabase as any)
		.from('prompt_maps')
		.update({
			name,
			prompt,
			prompt_position_x: promptPosition.x,
			prompt_position_y: promptPosition.y,
			updated_at: new Date().toISOString()
		})
		.eq('id', id)
		.eq('user_id', session.user.id);

	if (updateError) {
		console.error('Failed to update prompt map:', updateError);
		throw error(500, 'Failed to update prompt map');
	}

	// Delete existing follow_up_parents (will cascade from follow_up_prompts)
	// Delete existing follow_up_prompts
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	await (supabase as any).from('follow_up_prompts').delete().eq('prompt_map_id', id);

	// Delete existing model_responses
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	await (supabase as any).from('model_responses').delete().eq('prompt_map_id', id);

	// Maps to translate client-side IDs to server-side IDs
	const responseIdMap = new Map<string, string>(); // client ID -> server ID
	const followUpIdMap = new Map<string, string>(); // client ID -> server ID

	// Insert follow-up prompts first (to get their IDs before inserting responses)
	if (followUps.length > 0) {
		const followUpRecords = followUps.map((f) => ({
			prompt_map_id: id,
			prompt: f.prompt,
			position_x: f.position.x,
			position_y: f.position.y,
			depth: f.depth,
			status: 'ready'
		}));

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const { data: insertedFollowUps, error: followUpError } = await (supabase as any)
			.from('follow_up_prompts')
			.insert(followUpRecords)
			.select();

		if (followUpError) {
			console.error('Failed to save follow-ups:', followUpError);
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
			prompt_map_id: id,
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
				// Don't fail the entire save for this
			}
		}
	}

	return json({
		success: true,
		promptMapId: id
	});
};
