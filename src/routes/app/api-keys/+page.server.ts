import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { encrypt, decrypt, maskApiKey } from '$lib/server/encryption';
import type { ApiKeyInfo } from '$lib/services/settings';
import type { Provider } from '$lib/llm/types';

export const load: PageServerLoad = async ({ locals }) => {
	const { supabase, session } = locals;

	if (!session) {
		return { apiKeys: [] };
	}

	// Fetch user's API keys from database
	const { data: apiKeys, error } = await supabase
		.from('api_keys')
		.select('id, provider, encrypted_key, created_at, updated_at')
		.eq('user_id', session.user.id);

	if (error) {
		console.error('Error fetching API keys:', error);
		return { apiKeys: [] };
	}

	// Transform to masked format for display
	const maskedKeys: ApiKeyInfo[] = (apiKeys || []).map((key) => {
		let maskedKey = '********';
		try {
			const decryptedKey = decrypt(key.encrypted_key);
			maskedKey = maskApiKey(decryptedKey);
		} catch (e) {
			console.error('Error decrypting key for masking:', e);
		}

		return {
			id: key.id,
			provider: key.provider as Provider,
			maskedKey,
			createdAt: key.created_at,
			updatedAt: key.updated_at
		};
	});

	return { apiKeys: maskedKeys };
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const { supabase, session } = locals;

		if (!session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const provider = formData.get('provider') as Provider;
		const apiKey = formData.get('apiKey') as string;

		if (!provider || !apiKey) {
			return fail(400, { error: 'Provider and API key are required' });
		}

		// Validate provider
		const validProviders: Provider[] = ['openai', 'anthropic', 'google'];
		if (!validProviders.includes(provider)) {
			return fail(400, { error: 'Invalid provider' });
		}

		try {
			// Encrypt the API key
			const encryptedKey = encrypt(apiKey);

			// Upsert the API key (insert or update if exists)
			const { data, error } = await supabase
				.from('api_keys')
				.upsert(
					{
						user_id: session.user.id,
						provider,
						encrypted_key: encryptedKey,
						updated_at: new Date().toISOString()
					},
					{
						onConflict: 'user_id,provider'
					}
				)
				.select('id, provider, created_at, updated_at')
				.single();

			if (error) {
				console.error('Error saving API key:', error);
				return fail(500, { error: 'Failed to save API key' });
			}

			// Return masked key info
			const apiKeyInfo: ApiKeyInfo = {
				id: data.id,
				provider: data.provider as Provider,
				maskedKey: maskApiKey(apiKey),
				createdAt: data.created_at,
				updatedAt: data.updated_at
			};

			return { success: true, apiKey: apiKeyInfo };
		} catch (e) {
			console.error('Error in save action:', e);
			return fail(500, { error: 'Failed to encrypt and save API key' });
		}
	},

	remove: async ({ request, locals }) => {
		const { supabase, session } = locals;

		if (!session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const provider = formData.get('provider') as Provider;

		if (!provider) {
			return fail(400, { error: 'Provider is required' });
		}

		const { error } = await supabase
			.from('api_keys')
			.delete()
			.eq('user_id', session.user.id)
			.eq('provider', provider);

		if (error) {
			console.error('Error removing API key:', error);
			return fail(500, { error: 'Failed to remove API key' });
		}

		return { success: true, removedProvider: provider };
	}
};
