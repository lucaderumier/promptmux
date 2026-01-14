/**
 * Base provider interface and utilities
 */

import type { Provider } from '../types';

export interface ProviderInstance {
	provider: Provider;
	generateText: (params: {
		model: string;
		prompt: string;
		system?: string;
		maxTokens?: number;
		temperature?: number;
	}) => Promise<{
		text: string;
		usage?: {
			promptTokens: number;
			completionTokens: number;
		};
	}>;
}

export interface CreateProviderOptions {
	apiKey: string;
}
