/**
 * Debug Logger Utility
 * Provides context-aware logging with icons for easier debugging
 */

interface LoggerConfig {
	context: string;
	icon?: string;
	enabled?: boolean;
	forceLog?: boolean;
}

interface Logger {
	log: (...args: unknown[]) => void;
	error: (...args: unknown[]) => void;
	warn: (...args: unknown[]) => void;
	info: (...args: unknown[]) => void;
	debug: (...args: unknown[]) => void;
}

const isDev = import.meta.env.DEV;

export function createLogger(config: LoggerConfig): Logger {
	const { context, icon = '', enabled = isDev, forceLog = false } = config;

	const shouldLog = enabled || forceLog;
	const prefix = icon ? `${icon} [${context}]` : `[${context}]`;

	return {
		log: (...args: unknown[]) => {
			if (shouldLog) console.log(prefix, ...args);
		},
		error: (...args: unknown[]) => {
			// Always log errors
			console.error(prefix, ...args);
		},
		warn: (...args: unknown[]) => {
			if (shouldLog) console.warn(prefix, ...args);
		},
		info: (...args: unknown[]) => {
			if (shouldLog) console.info(prefix, ...args);
		},
		debug: (...args: unknown[]) => {
			if (shouldLog) console.debug(prefix, ...args);
		}
	};
}

// Pre-configured loggers for common contexts
export const authLogger = createLogger({ context: 'Auth', icon: '' });
export const canvasLogger = createLogger({ context: 'Canvas', icon: '' });
export const llmLogger = createLogger({ context: 'LLM', icon: '' });
export const libraryLogger = createLogger({ context: 'Library', icon: '' });
