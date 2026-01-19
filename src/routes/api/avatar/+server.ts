import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { checkRateLimit, createRateLimitKey, RATE_LIMITS } from '$lib/server/rate-limit';

/**
 * Validate file content by checking magic bytes (file signatures)
 * This prevents attackers from uploading malicious files with spoofed MIME types
 */
async function validateImageMagicBytes(file: File): Promise<{ valid: boolean; detectedType: string | null }> {
	const buffer = await file.arrayBuffer();
	const bytes = new Uint8Array(buffer.slice(0, 12));

	// JPEG: FF D8 FF
	if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
		return { valid: true, detectedType: 'image/jpeg' };
	}

	// PNG: 89 50 4E 47 0D 0A 1A 0A
	if (
		bytes[0] === 0x89 &&
		bytes[1] === 0x50 &&
		bytes[2] === 0x4e &&
		bytes[3] === 0x47 &&
		bytes[4] === 0x0d &&
		bytes[5] === 0x0a &&
		bytes[6] === 0x1a &&
		bytes[7] === 0x0a
	) {
		return { valid: true, detectedType: 'image/png' };
	}

	// GIF: 47 49 46 38 (GIF8)
	if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
		return { valid: true, detectedType: 'image/gif' };
	}

	// WebP: RIFF....WEBP (52 49 46 46 ... 57 45 42 50)
	if (
		bytes[0] === 0x52 &&
		bytes[1] === 0x49 &&
		bytes[2] === 0x46 &&
		bytes[3] === 0x46 &&
		bytes[8] === 0x57 &&
		bytes[9] === 0x45 &&
		bytes[10] === 0x42 &&
		bytes[11] === 0x50
	) {
		return { valid: true, detectedType: 'image/webp' };
	}

	return { valid: false, detectedType: null };
}

/**
 * Get file extension from detected MIME type
 */
function getExtensionFromMime(mimeType: string): string {
	const mimeToExt: Record<string, string> = {
		'image/jpeg': 'jpg',
		'image/png': 'png',
		'image/gif': 'gif',
		'image/webp': 'webp'
	};
	return mimeToExt[mimeType] || 'jpg';
}

export const POST: RequestHandler = async ({ request, locals }) => {
	const { supabase, session } = locals;

	if (!session) {
		throw error(401, 'Unauthorized');
	}

	// Rate limiting
	const rateLimitKey = createRateLimitKey(session.user.id, 'avatar-upload');
	const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.AVATAR_UPLOAD);
	if (!rateLimit.allowed) {
		throw error(429, 'Too many requests. Please wait before trying again.');
	}

	const formData = await request.formData();
	const file = formData.get('file') as File | null;

	if (!file) {
		throw error(400, 'No file provided');
	}

	// Validate file size first (5MB max) - check before reading content
	if (file.size > 5 * 1024 * 1024) {
		throw error(400, 'File too large. Maximum size is 5MB');
	}

	// Validate actual file content by checking magic bytes
	// This prevents attackers from uploading malicious files with spoofed MIME types
	const { valid, detectedType } = await validateImageMagicBytes(file);
	if (!valid || !detectedType) {
		throw error(400, 'Invalid file type. File content must be JPEG, PNG, GIF, or WebP');
	}

	const userId = session.user.id;
	// Use detected type for extension, not user-provided filename
	const fileExt = getExtensionFromMime(detectedType);
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
		// Log without exposing error details
		console.error('Avatar upload failed for user:', userId);
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
		// Log without exposing error details
		console.error('Profile update failed for user:', userId);
		throw error(500, 'Failed to update profile');
	}

	// Also update auth user metadata so sidebar avatar updates
	await supabase.auth.updateUser({
		data: { avatar_url: avatarUrl }
	});

	return json(
		{ success: true, avatarUrl },
		{ headers: { 'Cache-Control': 'no-store, must-revalidate' } }
	);
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
		// Log without exposing error details
		console.error('Profile update failed for user:', userId);
		throw error(500, 'Failed to update profile');
	}

	// Also clear auth user metadata so sidebar avatar updates
	await supabase.auth.updateUser({
		data: { avatar_url: null }
	});

	return json(
		{ success: true },
		{ headers: { 'Cache-Control': 'no-store, must-revalidate' } }
	);
};
