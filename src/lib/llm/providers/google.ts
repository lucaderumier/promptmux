/**
 * Google (Gemini) provider implementation using Vercel AI SDK
 */

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import type { ProviderInstance, CreateProviderOptions, GenerateResult } from './base';

export function createGoogleProvider(options: CreateProviderOptions): ProviderInstance {
	const google = createGoogleGenerativeAI({
		apiKey: options.apiKey
	});

	// Helper to format usage
	const formatUsage = (usage: { promptTokens: number; completionTokens: number } | undefined) =>
		usage
			? {
					promptTokens: usage.promptTokens,
					completionTokens: usage.completionTokens
				}
			: undefined;

	return {
		provider: 'google',

		// Single-turn text generation
		generateText: async ({ model, prompt, system, maxTokens, temperature }): Promise<GenerateResult> => {
			const result = await generateText({
				model: google(model),
				prompt,
				system,
				maxTokens,
				temperature
			});

			return {
				text: result.text,
				usage: formatUsage(result.usage)
			};
		},

		// Multi-turn conversation generation
		generateTextMultiTurn: async ({ model, messages, system, maxTokens, temperature }): Promise<GenerateResult> => {
			const result = await generateText({
				model: google(model),
				messages: messages.map((m) => ({
					role: m.role,
					content: m.content
				})),
				system,
				maxTokens,
				temperature
			});

			return {
				text: result.text,
				usage: formatUsage(result.usage)
			};
		}
	};
}
