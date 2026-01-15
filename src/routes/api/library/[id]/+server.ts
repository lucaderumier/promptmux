/**
 * API endpoint to get a prompt map with its responses and follow-ups
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
