/**
 * Anthropic provider implementation using Vercel AI SDK
 */

import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import type { ProviderInstance, CreateProviderOptions } from './base';

export function createAnthropicProvider(options: CreateProviderOptions): ProviderInstance {
	const anthropic = createAnthropic({
		apiKey: options.apiKey
	});

	return {
		provider: 'anthropic',
		generateText: async ({ model, prompt, system, maxTokens, temperature }) => {
			const result = await generateText({
				model: anthropic(model),
				prompt,
				system,
				maxTokens: maxTokens ?? 4096,
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
