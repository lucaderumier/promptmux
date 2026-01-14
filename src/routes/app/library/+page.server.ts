import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { supabase, session } = locals;

	if (!session) {
		return { promptMaps: [] };
	}

	// Fetch user's prompt maps with response counts
	const { data: promptMaps, error } = await supabase
		.from('prompt_maps')
		.select(`
			id,
			name,
			prompt,
			created_at,
			updated_at,
			model_responses (count)
		`)
		.eq('user_id', session.user.id)
		.order('updated_at', { ascending: false });

	if (error) {
		console.error('Failed to fetch prompt maps:', error);
		return { promptMaps: [] };
	}

	return {
		promptMaps: (promptMaps || []).map((pm: Record<string, unknown>) => ({
			id: pm.id,
			name: pm.name,
			prompt: pm.prompt,
			createdAt: pm.created_at,
			updatedAt: pm.updated_at,
			responseCount: Array.isArray(pm.model_responses)
				? pm.model_responses[0]?.count || 0
				: 0
		}))
	};
};
