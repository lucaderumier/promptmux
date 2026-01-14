export interface Folder {
	id: string;
	userId: string;
	parentId: string | null;
	name: string;
	createdAt: string;
}

export interface PromptMap {
	id: string;
	userId: string;
	folderId: string | null;
	name: string;
	prompt: string;
	createdAt: string;
	updatedAt: string;
	// Populated from model_responses
	responses?: SavedModelResponse[];
}

export interface SavedModelResponse {
	id: string;
	promptMapId: string;
	provider: string;
	model: string;
	response: string;
	rating: number | null;
	notes: string | null;
	latencyMs: number | null;
	createdAt: string;
}

export interface LibraryState {
	promptMaps: PromptMap[];
	folders: Folder[];
	isLoading: boolean;
	error: string | null;
	selectedFolderId: string | null;
	searchQuery: string;
}
