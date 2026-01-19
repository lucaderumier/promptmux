/**
 * Simple in-memory rate limiter using sliding window algorithm
 *
 * NOTE: This provides basic protection but is NOT suitable for distributed/serverless
 * environments where each instance has its own memory. For production on Vercel:
 * - Use Vercel's Edge Config rate limiting
 * - Use Upstash Redis for distributed rate limiting
 * - Or configure rate limiting at the CDN/infrastructure level
 */

interface RateLimitEntry {
	count: number;
	windowStart: number;
}

// In-memory store - cleared on server restart
const store = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
	const now = Date.now();
	if (now - lastCleanup < CLEANUP_INTERVAL) return;

	lastCleanup = now;
	const cutoff = now - windowMs;

	for (const [key, entry] of store.entries()) {
		if (entry.windowStart < cutoff) {
			store.delete(key);
		}
	}
}

export interface RateLimitConfig {
	/** Maximum number of requests allowed in the window */
	limit: number;
	/** Time window in milliseconds */
	windowMs: number;
}

export interface RateLimitResult {
	/** Whether the request is allowed */
	allowed: boolean;
	/** Number of requests remaining in the window */
	remaining: number;
	/** Milliseconds until the window resets */
	resetIn: number;
}

/**
 * Check if a request should be rate limited
 * @param key Unique identifier (e.g., user ID, IP + endpoint)
 * @param config Rate limit configuration
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
	const now = Date.now();
	cleanup(config.windowMs);

	const entry = store.get(key);

	if (!entry || (now - entry.windowStart) >= config.windowMs) {
		// New window
		store.set(key, { count: 1, windowStart: now });
		return {
			allowed: true,
			remaining: config.limit - 1,
			resetIn: config.windowMs
		};
	}

	// Within existing window
	const resetIn = config.windowMs - (now - entry.windowStart);

	if (entry.count >= config.limit) {
		return {
			allowed: false,
			remaining: 0,
			resetIn
		};
	}

	entry.count++;
	return {
		allowed: true,
		remaining: config.limit - entry.count,
		resetIn
	};
}

/**
 * Pre-configured rate limits for different endpoints
 */
export const RATE_LIMITS = {
	// LLM generation: 30 requests per minute per user
	LLM_GENERATE: { limit: 30, windowMs: 60 * 1000 },

	// API key operations: 10 per minute per user
	API_KEY_SAVE: { limit: 10, windowMs: 60 * 1000 },

	// Library save/update: 20 per minute per user
	LIBRARY_SAVE: { limit: 20, windowMs: 60 * 1000 },

	// Avatar upload: 5 per minute per user
	AVATAR_UPLOAD: { limit: 5, windowMs: 60 * 1000 }
} as const;

/**
 * Create a rate limit key from user ID and endpoint
 */
export function createRateLimitKey(userId: string, endpoint: string): string {
	return `${userId}:${endpoint}`;
}
