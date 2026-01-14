/**
 * API endpoint to save a prompt map with its responses
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Provider } from '$lib/llm/types';

interface SavePromptMapRequest {
	name: string;
	prompt: string;
	promptPosition: { x: number; y: number };
	folderId?: string | null;
	responses: {
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
	}[];
}

export const POST: RequestHandler = async ({ request, locals }) => {
	const session = locals.session;
	const supabase = locals.supabase;

	if (!session) {
		throw error(401, 'Unauthorized');
	}

	const body = (await request.json()) as SavePromptMapRequest;
	const { name, prompt, promptPosition, folderId, responses } = body;

	if (!name || !prompt) {
		throw error(400, 'Missing name or prompt');
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
			position_y: r.position.y
		}));

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const { error: responsesError } = await (supabase as any)
			.from('model_responses')
			.insert(responseRecords);

		if (responsesError) {
			console.error('Failed to save responses:', responsesError);
			// Clean up the prompt map if responses failed
			await supabase.from('prompt_maps').delete().eq('id', promptMap.id);
			throw error(500, 'Failed to save responses');
		}
	}

	return json({
		success: true,
		promptMapId: promptMap.id
	});
};
