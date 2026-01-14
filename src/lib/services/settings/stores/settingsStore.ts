import { writable, derived } from 'svelte/store';
import type { SettingsState, ApiKeyInfo } from '../types/settingsTypes';
import type { Provider } from '$lib/llm/types';
import { createLogger } from '$lib/utils/debugLogger';

const logger = createLogger({ context: 'Settings', icon: '' });

const initialState: SettingsState = {
	apiKeys: [],
	isLoading: false,
	error: null,
	savingProvider: null
};

export const settingsStore = writable<SettingsState>(initialState);

// Derived store for configured providers
export const configuredProviders = derived(settingsStore, ($settings) =>
	$settings.apiKeys.map((key) => key.provider)
);

// Derived store to check if a specific provider is configured
export const isProviderConfigured = derived(
	settingsStore,
	($settings) => (provider: Provider) =>
		$settings.apiKeys.some((key) => key.provider === provider)
);

export const settingsHandlers = {
	setLoading: (isLoading: boolean) => {
		settingsStore.update((state) => ({ ...state, isLoading }));
	},

	setError: (error: string | null) => {
		settingsStore.update((state) => ({ ...state, error, isLoading: false, savingProvider: null }));
		if (error) logger.error('Settings error:', error);
	},

	setApiKeys: (apiKeys: ApiKeyInfo[]) => {
		settingsStore.update((state) => ({ ...state, apiKeys, isLoading: false }));
		logger.log('Loaded API keys for providers:', apiKeys.map((k) => k.provider));
	},

	setSavingProvider: (provider: Provider | null) => {
		settingsStore.update((state) => ({ ...state, savingProvider: provider }));
	},

	addOrUpdateApiKey: (apiKey: ApiKeyInfo) => {
		settingsStore.update((state) => {
			const existingIndex = state.apiKeys.findIndex((k) => k.provider === apiKey.provider);

			let apiKeys: ApiKeyInfo[];
			if (existingIndex >= 0) {
				// Update existing
				apiKeys = [...state.apiKeys];
				apiKeys[existingIndex] = apiKey;
			} else {
				// Add new
				apiKeys = [...state.apiKeys, apiKey];
			}

			return { ...state, apiKeys, savingProvider: null };
		});
		logger.log('Saved API key for:', apiKey.provider);
	},

	removeApiKey: (provider: Provider) => {
		settingsStore.update((state) => ({
			...state,
			apiKeys: state.apiKeys.filter((k) => k.provider !== provider)
		}));
		logger.log('Removed API key for:', provider);
	},

	reset: () => {
		settingsStore.set(initialState);
	}
};
