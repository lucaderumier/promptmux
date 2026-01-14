import type { PageServerLoad } from './$types';
import type { Provider } from '$lib/llm/types';

export const load: PageServerLoad = async ({ locals }) => {
	const { supabase, session } = locals;

	if (!session) {
		return { configuredProviders: [] };
	}

	// Fetch user's configured API keys to know which providers are available
	const { data: apiKeys, error } = await supabase
		.from('api_keys')
		.select('provider')
		.eq('user_id', session.user.id);

	if (error) {
		console.error('Failed to fetch API keys:', error);
		return { configuredProviders: [] };
	}

	const configuredProviders = ((apiKeys || []) as { provider: string }[]).map((k) => k.provider as Provider);

	return { configuredProviders };
};
