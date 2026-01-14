/**
 * Svelte stores for global state management
 * Re-exports from service modules for backward compatibility
 */

// Auth
export { authStore, authHandlers } from '$lib/services/auth';

// Canvas
export {
	canvasStore,
	canvasHandlers,
	responseNodesArray,
	hasLoadingNode,
	readyNodes
} from '$lib/services/canvas';

// Library
export {
	libraryStore,
	libraryHandlers,
	filteredPromptMaps,
	folderTree
} from '$lib/services/library';

// Settings
export {
	settingsStore,
	settingsHandlers,
	configuredProviders,
	isProviderConfigured
} from '$lib/services/settings';
