import type { Provider } from '$lib/llm/types';

export interface ModelResponse {
	id: string;
	provider: Provider;
	model: string;
	response: string;
	rating: number | null;
	notes: string | null;
	latencyMs: number | null;
	status: 'idle' | 'loading' | 'done' | 'error';
	error?: string;
}

export interface NodePosition {
	x: number;
	y: number;
}

export interface ResponseNode {
	id: string;
	position: NodePosition;
	modelId: string | null; // null when in 'selecting' state
	provider: Provider | null;
	modelName: string | null;
	response: string;
	status: 'selecting' | 'idle' | 'loading' | 'done' | 'error';
	latencyMs: number | null;
	promptTokens: number | null;
	completionTokens: number | null;
	costCents: number | null; // Estimated cost in cents
	error?: string;
	rating: number | null;
	notes: string | null;
	liked: boolean;
}

export interface CanvasState {
	prompt: string;
	promptPosition: NodePosition;
	responseNodes: Map<string, ResponseNode>;
	isGenerating: boolean;
	error: string | null;
	hoveredNodeId: string | null;
}

// Legacy types for backwards compatibility
export interface PromptNodeData {
	prompt: string;
	selectedModels: string[];
}

export interface ModelNodeData {
	modelId: string;
	provider: Provider;
	modelName: string;
	response: ModelResponse | null;
}
