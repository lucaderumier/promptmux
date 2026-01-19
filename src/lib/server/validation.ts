/**
 * Input validation utilities for API endpoints
 * Prevents DoS attacks via oversized payloads while allowing generous limits for legitimate use
 */

// Limits in characters (not bytes, for simplicity)
export const INPUT_LIMITS = {
	// Names, titles - short text
	NAME_MAX: 255,

	// Prompts - generous to support long-context models (500KB ~125k tokens)
	PROMPT_MAX: 500_000,

	// Notes - moderate limit for annotations
	NOTES_MAX: 10_000,

	// Individual message in multi-turn (same as prompt)
	MESSAGE_MAX: 500_000,

	// System prompt - typically shorter than main prompt
	SYSTEM_PROMPT_MAX: 100_000,

	// Total request size sanity check (5MB)
	TOTAL_REQUEST_MAX: 5_000_000
} as const;

export interface ValidationError {
	field: string;
	message: string;
	limit: number;
	actual: number;
}

/**
 * Validate a string field against a maximum length
 */
export function validateLength(
	value: string | null | undefined,
	field: string,
	maxLength: number
): ValidationError | null {
	if (!value) return null;

	if (value.length > maxLength) {
		return {
			field,
			message: `${field} exceeds maximum length of ${maxLength.toLocaleString()} characters`,
			limit: maxLength,
			actual: value.length
		};
	}
	return null;
}

/**
 * Validate prompt map save/update request
 */
export function validatePromptMapRequest(body: {
	name?: string;
	prompt?: string;
	responses?: { notes?: string | null }[];
	followUps?: { prompt?: string }[];
}): ValidationError | null {
	// Validate name
	if (body.name) {
		const nameError = validateLength(body.name, 'name', INPUT_LIMITS.NAME_MAX);
		if (nameError) return nameError;
	}

	// Validate main prompt
	if (body.prompt) {
		const promptError = validateLength(body.prompt, 'prompt', INPUT_LIMITS.PROMPT_MAX);
		if (promptError) return promptError;
	}

	// Validate response notes
	if (body.responses) {
		for (let i = 0; i < body.responses.length; i++) {
			const notes = body.responses[i].notes;
			if (notes) {
				const notesError = validateLength(notes, `responses[${i}].notes`, INPUT_LIMITS.NOTES_MAX);
				if (notesError) return notesError;
			}
		}
	}

	// Validate follow-up prompts
	if (body.followUps) {
		for (let i = 0; i < body.followUps.length; i++) {
			const prompt = body.followUps[i].prompt;
			if (prompt) {
				const followUpError = validateLength(
					prompt,
					`followUps[${i}].prompt`,
					INPUT_LIMITS.PROMPT_MAX
				);
				if (followUpError) return followUpError;
			}
		}
	}

	return null;
}

/**
 * Validate LLM generate request
 */
export function validateGenerateRequest(body: {
	prompt?: string;
	messages?: { content: string }[];
	systemPrompt?: string;
}): ValidationError | null {
	// Validate single-turn prompt
	if (body.prompt) {
		const promptError = validateLength(body.prompt, 'prompt', INPUT_LIMITS.PROMPT_MAX);
		if (promptError) return promptError;
	}

	// Validate multi-turn messages
	if (body.messages) {
		for (let i = 0; i < body.messages.length; i++) {
			const content = body.messages[i].content;
			const msgError = validateLength(content, `messages[${i}].content`, INPUT_LIMITS.MESSAGE_MAX);
			if (msgError) return msgError;
		}
	}

	// Validate system prompt
	if (body.systemPrompt) {
		const sysError = validateLength(body.systemPrompt, 'systemPrompt', INPUT_LIMITS.SYSTEM_PROMPT_MAX);
		if (sysError) return sysError;
	}

	return null;
}
