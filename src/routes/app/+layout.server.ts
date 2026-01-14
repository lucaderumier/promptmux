import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const { supabase, session } = locals;

	if (!session) {
		return { recentPromptMaps: [] };
	}

	// Fetch user's recent prompt maps for the sidebar
	const { data: promptMaps, error } = await supabase
		.from('prompt_maps')
		.select('id, name, updated_at')
		.eq('user_id', session.user.id)
		.order('updated_at', { ascending: false })
		.limit(15);

	if (error) {
		console.error('Failed to fetch recent prompt maps:', error);
		return { recentPromptMaps: [] };
	}

	return {
		recentPromptMaps: (promptMaps || []).map((pm: { id: string; name: string; updated_at: string }) => ({
			id: pm.id,
			name: pm.name,
			updatedAt: pm.updated_at
		}))
	};
};
