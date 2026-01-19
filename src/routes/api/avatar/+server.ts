import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { supabase, session } = locals;

	if (!session) {
		throw error(401, 'Unauthorized');
	}

	const formData = await request.formData();
	const file = formData.get('file') as File | null;

	if (!file) {
		throw error(400, 'No file provided');
	}

	// Validate file type
	const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
	if (!allowedTypes.includes(file.type)) {
		throw error(400, 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP');
	}

	// Validate file size (5MB max)
	if (file.size > 5 * 1024 * 1024) {
		throw error(400, 'File too large. Maximum size is 5MB');
	}

	const userId = session.user.id;
	const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
	const fileName = `${userId}/avatar.${fileExt}`;

	// Delete existing avatar if any (ignore errors)
	await supabase.storage.from('avatars').remove([`${userId}/avatar.jpg`, `${userId}/avatar.png`, `${userId}/avatar.gif`, `${userId}/avatar.webp`]);

	// Upload new avatar
	const { error: uploadError } = await supabase.storage
		.from('avatars')
		.upload(fileName, file, {
			cacheControl: '3600',
			upsert: true
		});

	if (uploadError) {
		console.error('Upload error:', uploadError);
		throw error(500, 'Failed to upload avatar');
	}

	// Get public URL
	const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);

	// Add cache-busting query param
	const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

	// Update user profile with new avatar URL
	const { error: updateError } = await supabase
		.from('user_profiles')
		.upsert(
			{
				user_id: userId,
				avatar_url: avatarUrl,
				updated_at: new Date().toISOString()
			},
			{ onConflict: 'user_id' }
		);

	if (updateError) {
		console.error('Profile update error:', updateError);
		throw error(500, 'Failed to update profile');
	}

	// Also update auth user metadata so sidebar avatar updates
	await supabase.auth.updateUser({
		data: { avatar_url: avatarUrl }
	});

	return json({ success: true, avatarUrl });
};

export const DELETE: RequestHandler = async ({ locals }) => {
	const { supabase, session } = locals;

	if (!session) {
		throw error(401, 'Unauthorized');
	}

	const userId = session.user.id;

	// Delete all avatar files for this user
	await supabase.storage.from('avatars').remove([
		`${userId}/avatar.jpg`,
		`${userId}/avatar.png`,
		`${userId}/avatar.gif`,
		`${userId}/avatar.webp`
	]);

	// Update user profile to remove avatar URL
	const { error: updateError } = await supabase
		.from('user_profiles')
		.upsert(
			{
				user_id: userId,
				avatar_url: null,
				updated_at: new Date().toISOString()
			},
			{ onConflict: 'user_id' }
		);

	if (updateError) {
		console.error('Profile update error:', updateError);
		throw error(500, 'Failed to update profile');
	}

	// Also clear auth user metadata so sidebar avatar updates
	await supabase.auth.updateUser({
		data: { avatar_url: null }
	});

	return json({ success: true });
};
