/**
 * Google (Gemini) provider implementation using Vercel AI SDK
 */

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import type { ProviderInstance, CreateProviderOptions } from './base';

export function createGoogleProvider(options: CreateProviderOptions): ProviderInstance {
	const google = createGoogleGenerativeAI({
		apiKey: options.apiKey
	});

	return {
		provider: 'google',
		generateText: async ({ model, prompt, system, maxTokens, temperature }) => {
			const result = await generateText({
				model: google(model),
				prompt,
				system,
				maxTokens,
				temperature
			});

			return {
				text: result.text,
				usage: result.usage
					? {
							promptTokens: result.usage.promptTokens,
							completionTokens: result.usage.completionTokens
						}
					: undefined
			};
		}
	};
}
