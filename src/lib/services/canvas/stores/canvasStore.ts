import { writable, derived } from 'svelte/store';
import type { CanvasState, ResponseNode, NodePosition } from '../types/canvasTypes';
import type { Provider } from '$lib/llm/types';
import { canvasLogger } from '$lib/utils/debugLogger';

const initialState: CanvasState = {
	prompt: '',
	promptPosition: { x: 0, y: 0 },
	responseNodes: new Map(),
	isGenerating: false,
	error: null,
	hoveredNodeId: null
};

export const canvasStore = writable<CanvasState>(initialState);

// Undo history - stores previous states
let undoHistory: CanvasState[] = [];
const MAX_UNDO_HISTORY = 10;

// Helper to deep clone the canvas state
function cloneState(state: CanvasState): CanvasState {
	return {
		...state,
		responseNodes: new Map(state.responseNodes)
	};
}

// Derived store for response nodes as an array (easier to iterate)
export const responseNodesArray = derived(canvasStore, ($canvas) =>
	Array.from($canvas.responseNodes.values())
);

// Derived store for checking if any node is loading
export const hasLoadingNode = derived(canvasStore, ($canvas) =>
	Array.from($canvas.responseNodes.values()).some((n) => n.status === 'loading')
);

// Derived store for nodes with models selected (ready to generate)
export const readyNodes = derived(canvasStore, ($canvas) =>
	Array.from($canvas.responseNodes.values()).filter((n) => n.modelId !== null && n.status !== 'selecting')
);

// Generate unique ID for nodes
let nodeIdCounter = 0;
function generateNodeId(): string {
	return `node-${Date.now()}-${++nodeIdCounter}`;
}

export const canvasHandlers = {
	setPrompt: (prompt: string) => {
		canvasStore.update((state) => ({ ...state, prompt }));
	},

	setPromptPosition: (position: NodePosition) => {
		canvasStore.update((state) => ({ ...state, promptPosition: position }));
	},

	addResponseNode: (position: NodePosition): string => {
		const id = generateNodeId();
		const newNode: ResponseNode = {
			id,
			position,
			modelId: null,
			provider: null,
			modelName: null,
			response: '',
			status: 'selecting',
			latencyMs: null,
			promptTokens: null,
			completionTokens: null,
			costCents: null,
			rating: null,
			notes: null,
			liked: false
		};

		canvasStore.update((state) => {
			const responseNodes = new Map(state.responseNodes);
			responseNodes.set(id, newNode);
			return { ...state, responseNodes };
		});

		canvasLogger.log('Added response node:', id);
		return id;
	},

	removeResponseNode: (nodeId: string) => {
		canvasStore.update((state) => {
			const responseNodes = new Map(state.responseNodes);
			responseNodes.delete(nodeId);
			return { ...state, responseNodes };
		});
		canvasLogger.log('Removed response node:', nodeId);
	},

	updateNodePosition: (nodeId: string, position: NodePosition) => {
		canvasStore.update((state) => {
			const responseNodes = new Map(state.responseNodes);
			const node = responseNodes.get(nodeId);
			if (node) {
				responseNodes.set(nodeId, { ...node, position });
			}
			return { ...state, responseNodes };
		});
	},

	setNodeModel: (nodeId: string, modelId: string, provider: Provider, modelName: string) => {
		canvasStore.update((state) => {
			const responseNodes = new Map(state.responseNodes);
			const node = responseNodes.get(nodeId);
			if (node) {
				responseNodes.set(nodeId, {
					...node,
					modelId,
					provider,
					modelName,
					status: 'idle'
				});
			}
			return { ...state, responseNodes };
		});
		canvasLogger.log('Set model for node:', nodeId, modelId);
	},

	setHoveredNode: (nodeId: string | null) => {
		canvasStore.update((state) => ({ ...state, hoveredNodeId: nodeId }));
	},

	setNodeLoading: (nodeId: string) => {
		canvasStore.update((state) => {
			const responseNodes = new Map(state.responseNodes);
			const node = responseNodes.get(nodeId);
			if (node) {
				responseNodes.set(nodeId, {
					...node,
					status: 'loading',
					response: '',
					error: undefined
				});
			}
			return { ...state, responseNodes };
		});
		canvasLogger.log('Set node to loading:', nodeId);
	},

	startGeneration: () => {
		canvasStore.update((state) => {
			const responseNodes = new Map(state.responseNodes);

			// Set all nodes with selected models to loading state
			for (const [id, node] of responseNodes) {
				if (node.modelId && node.status !== 'selecting') {
					responseNodes.set(id, { ...node, status: 'loading', response: '', error: undefined });
				}
			}

			canvasLogger.log('Starting generation');
			return { ...state, responseNodes, isGenerating: true, error: null };
		});
	},

	setNodeResponse: (
		nodeId: string,
		response: string,
		latencyMs: number,
		usage?: { promptTokens?: number; completionTokens?: number; costCents?: number | null }
	) => {
		canvasStore.update((state) => {
			const responseNodes = new Map(state.responseNodes);
			const node = responseNodes.get(nodeId);
			if (node) {
				responseNodes.set(nodeId, {
					...node,
					response,
					latencyMs,
					promptTokens: usage?.promptTokens ?? null,
					completionTokens: usage?.completionTokens ?? null,
					costCents: usage?.costCents ?? null,
					status: 'done'
				});
			}
			return { ...state, responseNodes };
		});
	},

	setNodeError: (nodeId: string, error: string) => {
		canvasStore.update((state) => {
			const responseNodes = new Map(state.responseNodes);
			const node = responseNodes.get(nodeId);
			if (node) {
				responseNodes.set(nodeId, {
					...node,
					error,
					status: 'error'
				});
			}
			return { ...state, responseNodes };
		});
	},

	completeGeneration: () => {
		canvasStore.update((state) => ({ ...state, isGenerating: false }));
		canvasLogger.log('Generation complete');
	},

	setError: (error: string | null) => {
		canvasStore.update((state) => ({ ...state, error, isGenerating: false }));
		if (error) canvasLogger.error('Canvas error:', error);
	},

	updateRating: (nodeId: string, rating: number | null) => {
		canvasStore.update((state) => {
			const responseNodes = new Map(state.responseNodes);
			const node = responseNodes.get(nodeId);
			if (node) {
				responseNodes.set(nodeId, { ...node, rating });
			}
			return { ...state, responseNodes };
		});
	},

	updateNotes: (nodeId: string, notes: string | null) => {
		canvasStore.update((state) => {
			const responseNodes = new Map(state.responseNodes);
			const node = responseNodes.get(nodeId);
			if (node) {
				responseNodes.set(nodeId, { ...node, notes });
			}
			return { ...state, responseNodes };
		});
	},

	toggleLike: (nodeId: string) => {
		canvasStore.update((state) => {
			const responseNodes = new Map(state.responseNodes);
			const node = responseNodes.get(nodeId);
			if (node) {
				responseNodes.set(nodeId, { ...node, liked: !node.liked });
			}
			return { ...state, responseNodes };
		});
		canvasLogger.log('Toggled like for node:', nodeId);
	},

	reset: () => {
		canvasStore.set(initialState);
		nodeIdCounter = 0;
		undoHistory = [];
		canvasLogger.log('Canvas reset');
	},

	// Clear canvas with undo support
	clearCanvas: () => {
		canvasStore.update((state) => {
			// Only save to history if there's something to undo
			if (state.prompt || state.responseNodes.size > 0) {
				undoHistory.push(cloneState(state));
				if (undoHistory.length > MAX_UNDO_HISTORY) {
					undoHistory.shift();
				}
			}
			return cloneState(initialState);
		});
		nodeIdCounter = 0;
		canvasLogger.log('Canvas cleared (undo available)');
	},

	// Undo last action (restore previous state)
	undo: (): boolean => {
		if (undoHistory.length === 0) {
			canvasLogger.log('Nothing to undo');
			return false;
		}

		const previousState = undoHistory.pop()!;
		canvasStore.set(previousState);
		canvasLogger.log('Undo: restored previous state');
		return true;
	},

	// Check if undo is available
	canUndo: (): boolean => {
		return undoHistory.length > 0;
	},

	// Load a prompt map from the library
	loadPromptMap: (data: {
		prompt: string;
		promptPosition: { x: number; y: number };
		responses: {
			id?: string;
			provider: Provider;
			model: string;
			response: string;
			latencyMs: number | null;
			promptTokens?: number | null;
			completionTokens?: number | null;
			costCents?: number | null;
			rating: number | null;
			notes: string | null;
			liked?: boolean;
			position: { x: number; y: number };
		}[];
	}) => {
		const responseNodes = new Map<string, ResponseNode>();

		for (const resp of data.responses) {
			const id = resp.id || generateNodeId();
			responseNodes.set(id, {
				id,
				position: resp.position,
				modelId: resp.model,
				provider: resp.provider as Provider,
				modelName: resp.model, // Use model ID as display name for now
				response: resp.response,
				status: resp.response ? 'done' : 'idle',
				latencyMs: resp.latencyMs,
				promptTokens: resp.promptTokens ?? null,
				completionTokens: resp.completionTokens ?? null,
				costCents: resp.costCents ?? null,
				rating: resp.rating,
				notes: resp.notes,
				liked: resp.liked ?? false
			});
		}

		canvasStore.set({
			prompt: data.prompt,
			promptPosition: data.promptPosition,
			responseNodes,
			isGenerating: false,
			error: null,
			hoveredNodeId: null
		});

		canvasLogger.log('Loaded prompt map with', responseNodes.size, 'responses');
	}
};
