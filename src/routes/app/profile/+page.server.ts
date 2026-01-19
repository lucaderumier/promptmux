import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const { supabase, session } = locals;

	if (!session) {
		return { profile: null };
	}

	// Fetch user profile
	const { data: profile, error } = await supabase
		.from('user_profiles')
		.select('*')
		.eq('user_id', session.user.id)
		.single();

	if (error && error.code !== 'PGRST116') {
		// PGRST116 = no rows returned (profile doesn't exist yet)
		console.error('Error fetching profile:', error);
	}

	return {
		profile: profile || {
			display_name: session.user.user_metadata?.full_name || '',
			bio: '',
			avatar_url: session.user.user_metadata?.avatar_url || '',
			website: '',
			twitter: '',
			github: '',
			linkedin: ''
		}
	};
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const { supabase, session } = locals;

		if (!session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const display_name = formData.get('display_name') as string;
		const bio = formData.get('bio') as string;
		const website = formData.get('website') as string;
		const twitter = formData.get('twitter') as string;
		const github = formData.get('github') as string;
		const linkedin = formData.get('linkedin') as string;

		// Upsert profile (avatar_url is handled separately via /api/avatar)
		const { data, error } = await supabase
			.from('user_profiles')
			.upsert(
				{
					user_id: session.user.id,
					display_name,
					bio,
					website,
					twitter,
					github,
					linkedin,
					updated_at: new Date().toISOString()
				},
				{
					onConflict: 'user_id'
				}
			)
			.select()
			.single();

		if (error) {
			console.error('Error saving profile:', error);
			return fail(500, { error: 'Failed to save profile' });
		}

		return { success: true, profile: data };
	}
};
