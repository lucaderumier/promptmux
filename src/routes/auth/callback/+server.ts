/**
 * OAuth callback handler for Supabase Auth
 */

import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
	const code = url.searchParams.get('code');
	const next = url.searchParams.get('next') ?? '/app';
	const type = url.searchParams.get('type');

	if (code) {
		const { error } = await supabase.auth.exchangeCodeForSession(code);
		if (!error) {
			// Handle password recovery - redirect to password update page
			if (type === 'recovery') {
				throw redirect(303, '/auth/update-password');
			}
			throw redirect(303, next);
		}
	}

	// Redirect to home on failure
	throw redirect(303, '/?error=auth_callback_error');
};
