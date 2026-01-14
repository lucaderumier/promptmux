/**
 * OpenAI provider implementation using Vercel AI SDK
 */

import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import type { ProviderInstance, CreateProviderOptions } from './base';

export function createOpenAIProvider(options: CreateProviderOptions): ProviderInstance {
	const openai = createOpenAI({
		apiKey: options.apiKey
	});

	return {
		provider: 'openai',
		generateText: async ({ model, prompt, system, maxTokens, temperature }) => {
			const result = await generateText({
				model: openai(model),
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
