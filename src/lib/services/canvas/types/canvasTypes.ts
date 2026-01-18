import type { Provider } from '$lib/llm/types';

// Node type identifiers for the canvas graph
export type CanvasNodeType = 'prompt' | 'response' | 'followup';

// Message format for multi-turn conversations (Vercel AI SDK compatible)
export interface ConversationMessage {
	role: 'user' | 'assistant';
	content: string;
	nodeId: string; // Reference to source node for tracing
}

// Follow-up prompt node - can have multiple parent responses (DAG support)
export interface FollowUpNode {
	id: string;
	type: 'followup';
	position: NodePosition;
	prompt: string;
	parentResponseIds: string[]; // Array for multi-parent merge
	childResponseIds: string[]; // Response nodes generated from this follow-up
	status: 'editing' | 'ready' | 'generating';
	depth: number; // Track conversation depth for warnings
}

// Edge representation for canvas graph connections
export interface CanvasEdge {
	id: string;
	sourceId: string;
	sourceType: CanvasNodeType;
	targetId: string;
	targetType: CanvasNodeType;
}

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
	// Multi-turn support: track parent node for conversation history
	parentNodeId: string; // ID of prompt or follow-up that generated this
	parentNodeType: 'prompt' | 'followup';
}

export interface CanvasState {
	prompt: string;
	promptId: string; // Explicit ID for the root prompt node
	promptPosition: NodePosition;
	responseNodes: Map<string, ResponseNode>;
	// Multi-turn support
	followUpNodes: Map<string, FollowUpNode>;
	edges: CanvasEdge[];
	// Context warning thresholds
	maxDepthWarningThreshold: number; // Default: 5
	// UI state
	isGenerating: boolean;
	error: string | null;
	hoveredNodeId: string | null;
	// Loaded canvas tracking
	loadedPromptMapId: string | null; // ID of canvas loaded from library
	loadedPromptMapName: string | null; // Name of loaded canvas
	isModified: boolean; // True if canvas changed since load
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
