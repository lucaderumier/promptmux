import type { Provider } from '$lib/llm/types';

export interface ApiKeyInfo {
	id: string;
	provider: Provider;
	maskedKey: string;
	createdAt: string;
	updatedAt: string;
}

export interface SettingsState {
	apiKeys: ApiKeyInfo[];
	isLoading: boolean;
	error: string | null;
	savingProvider: Provider | null;
}

export interface SaveApiKeyInput {
	provider: Provider;
	apiKey: string;
}

export interface ProviderConfig {
	id: Provider;
	name: string;
	description: string;
	docsUrl: string;
	keyPrefix: string;
	logo: string;
}

export const PROVIDER_CONFIGS: ProviderConfig[] = [
	{
		id: 'openai',
		name: 'OpenAI',
		description: 'GPT-4o, GPT-4 Turbo, o1 models',
		docsUrl: 'https://platform.openai.com/api-keys',
		keyPrefix: 'sk-',
		logo: '/logos/openai.svg'
	},
	{
		id: 'anthropic',
		name: 'Anthropic',
		description: 'Claude Sonnet 4, Claude Opus 4, Claude 3.5 models',
		docsUrl: 'https://console.anthropic.com/settings/keys',
		keyPrefix: 'sk-ant-',
		logo: '/logos/anthropic.svg'
	},
	{
		id: 'google',
		name: 'Google',
		description: 'Gemini 2.0 Flash, Gemini 1.5 Pro models',
		docsUrl: 'https://aistudio.google.com/app/apikey',
		keyPrefix: 'AIza',
		logo: '/logos/gemini.svg'
	}
];
