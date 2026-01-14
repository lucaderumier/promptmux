import { writable, derived } from 'svelte/store';
import type { LibraryState, PromptMap, Folder } from '../types/libraryTypes';
import { libraryLogger } from '$lib/utils/debugLogger';

const initialState: LibraryState = {
	promptMaps: [],
	folders: [],
	isLoading: false,
	error: null,
	selectedFolderId: null,
	searchQuery: ''
};

export const libraryStore = writable<LibraryState>(initialState);

// Derived store for filtered prompt maps based on search and folder
export const filteredPromptMaps = derived(libraryStore, ($library) => {
	let maps = $library.promptMaps;

	// Filter by folder
	if ($library.selectedFolderId !== null) {
		maps = maps.filter((map) => map.folderId === $library.selectedFolderId);
	}

	// Filter by search query
	if ($library.searchQuery.trim()) {
		const query = $library.searchQuery.toLowerCase();
		maps = maps.filter(
			(map) =>
				map.name.toLowerCase().includes(query) || map.prompt.toLowerCase().includes(query)
		);
	}

	// Sort by updated date (newest first)
	return maps.sort(
		(a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
	);
});

// Derived store for folder tree structure
export const folderTree = derived(libraryStore, ($library) => {
	const rootFolders = $library.folders.filter((f) => f.parentId === null);
	return rootFolders;
});

export const libraryHandlers = {
	setLoading: (isLoading: boolean) => {
		libraryStore.update((state) => ({ ...state, isLoading }));
	},

	setError: (error: string | null) => {
		libraryStore.update((state) => ({ ...state, error, isLoading: false }));
		if (error) libraryLogger.error('Library error:', error);
	},

	setPromptMaps: (promptMaps: PromptMap[]) => {
		libraryStore.update((state) => ({ ...state, promptMaps, isLoading: false }));
		libraryLogger.log('Loaded prompt maps:', promptMaps.length);
	},

	setFolders: (folders: Folder[]) => {
		libraryStore.update((state) => ({ ...state, folders }));
		libraryLogger.log('Loaded folders:', folders.length);
	},

	addPromptMap: (promptMap: PromptMap) => {
		libraryStore.update((state) => ({
			...state,
			promptMaps: [promptMap, ...state.promptMaps]
		}));
		libraryLogger.log('Added prompt map:', promptMap.name);
	},

	updatePromptMap: (id: string, updates: Partial<PromptMap>) => {
		libraryStore.update((state) => ({
			...state,
			promptMaps: state.promptMaps.map((map) =>
				map.id === id ? { ...map, ...updates } : map
			)
		}));
	},

	deletePromptMap: (id: string) => {
		libraryStore.update((state) => ({
			...state,
			promptMaps: state.promptMaps.filter((map) => map.id !== id)
		}));
		libraryLogger.log('Deleted prompt map:', id);
	},

	addFolder: (folder: Folder) => {
		libraryStore.update((state) => ({
			...state,
			folders: [...state.folders, folder]
		}));
		libraryLogger.log('Added folder:', folder.name);
	},

	deleteFolder: (id: string) => {
		libraryStore.update((state) => ({
			...state,
			folders: state.folders.filter((f) => f.id !== id),
			// Also clear selection if deleted folder was selected
			selectedFolderId: state.selectedFolderId === id ? null : state.selectedFolderId
		}));
		libraryLogger.log('Deleted folder:', id);
	},

	setSelectedFolder: (folderId: string | null) => {
		libraryStore.update((state) => ({ ...state, selectedFolderId: folderId }));
	},

	setSearchQuery: (searchQuery: string) => {
		libraryStore.update((state) => ({ ...state, searchQuery }));
	},

	reset: () => {
		libraryStore.set(initialState);
	}
};
