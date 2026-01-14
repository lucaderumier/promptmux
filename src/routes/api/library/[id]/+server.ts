/**
 * API endpoint to get a prompt map with its responses
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

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
		created_at: string;
	}[];

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
			createdAt: r.created_at
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

	// First delete the model responses (cascade should handle this but let's be explicit)
	await supabase.from('model_responses').delete().eq('prompt_map_id', id);

	// Then delete the prompt map
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

	const { error: updateError } = await supabase
		.from('prompt_maps')
		.update({ name: name.trim(), updated_at: new Date().toISOString() })
		.eq('id', id)
		.eq('user_id', session.user.id);

	if (updateError) {
		throw error(500, 'Failed to rename prompt map');
	}

	return json({ success: true });
};
