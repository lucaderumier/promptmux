import { writable, derived, get } from 'svelte/store';
import type {
	CanvasState,
	ResponseNode,
	NodePosition,
	FollowUpNode,
	CanvasEdge,
	ConversationMessage,
	CanvasNodeType
} from '../types/canvasTypes';
import type { Provider } from '$lib/llm/types';
import { canvasLogger } from '$lib/utils/debugLogger';

const ROOT_PROMPT_ID = 'root-prompt';

const initialState: CanvasState = {
	prompt: '',
	promptId: ROOT_PROMPT_ID,
	promptPosition: { x: 0, y: 0 },
	responseNodes: new Map(),
	followUpNodes: new Map(),
	edges: [],
	maxDepthWarningThreshold: 5,
	isGenerating: false,
	error: null,
	hoveredNodeId: null,
	loadedPromptMapId: null,
	loadedPromptMapName: null,
	isModified: false
};

export const canvasStore = writable<CanvasState>(initialState);

// Undo history - stores previous states
let undoHistory: CanvasState[] = [];
const MAX_UNDO_HISTORY = 10;

// Helper to deep clone the canvas state
function cloneState(state: CanvasState): CanvasState {
	return {
		...state,
		responseNodes: new Map(state.responseNodes),
		followUpNodes: new Map(state.followUpNodes),
		edges: [...state.edges]
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

// === Multi-turn derived stores ===

// Follow-up nodes as array
export const followUpNodesArray = derived(canvasStore, ($canvas) =>
	Array.from($canvas.followUpNodes.values())
);

// Get all edges for rendering
export const canvasEdges = derived(canvasStore, ($canvas) => $canvas.edges);

// Get max conversation depth across all follow-ups
export const maxConversationDepth = derived(canvasStore, ($canvas) => {
	let max = 0;
	for (const followUp of $canvas.followUpNodes.values()) {
		max = Math.max(max, followUp.depth);
	}
	return max;
});

// Check if any follow-up exceeds the warning threshold
export const hasDepthWarning = derived(canvasStore, ($canvas) => {
	for (const followUp of $canvas.followUpNodes.values()) {
		if (followUp.depth >= $canvas.maxDepthWarningThreshold) {
			return true;
		}
	}
	return false;
});

// Generate unique ID for nodes
let nodeIdCounter = 0;
function generateNodeId(prefix: string = 'node'): string {
	return `${prefix}-${Date.now()}-${++nodeIdCounter}`;
}

export const canvasHandlers = {
	setPrompt: (prompt: string) => {
		canvasStore.update((state) => ({ ...state, prompt, isModified: true }));
	},

	setPromptPosition: (position: NodePosition) => {
		canvasStore.update((state) => ({ ...state, promptPosition: position, isModified: true }));
	},

	addResponseNode: (
		position: NodePosition,
		parentNodeId: string = ROOT_PROMPT_ID,
		parentNodeType: 'prompt' | 'followup' = 'prompt'
	): string => {
		const id = generateNodeId('response');
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
			liked: false,
			parentNodeId,
			parentNodeType
		};

		canvasStore.update((state) => {
			const responseNodes = new Map(state.responseNodes);
			responseNodes.set(id, newNode);

			// Add edge from parent to this response
			const newEdge: CanvasEdge = {
				id: `${parentNodeId}-${id}`,
				sourceId: parentNodeId,
				sourceType: parentNodeType,
				targetId: id,
				targetType: 'response'
			};

			return {
				...state,
				responseNodes,
				edges: [...state.edges, newEdge],
				isModified: true
			};
		});

		canvasLogger.log('Added response node:', id, 'parent:', parentNodeId);
		return id;
	},

	removeResponseNode: (nodeId: string) => {
		canvasStore.update((state) => {
			const responseNodes = new Map(state.responseNodes);
			responseNodes.delete(nodeId);

			// Remove edges connected to this node
			const edges = state.edges.filter(
				(e) => e.sourceId !== nodeId && e.targetId !== nodeId
			);

			// Also remove any follow-ups that had this as their only parent
			const followUpNodes = new Map(state.followUpNodes);
			for (const [fuId, fu] of followUpNodes) {
				const updatedParents = fu.parentResponseIds.filter((id) => id !== nodeId);
				if (updatedParents.length === 0) {
					// Remove orphaned follow-up and its children
					followUpNodes.delete(fuId);
					for (const childId of fu.childResponseIds) {
						responseNodes.delete(childId);
					}
				} else if (updatedParents.length !== fu.parentResponseIds.length) {
					followUpNodes.set(fuId, { ...fu, parentResponseIds: updatedParents });
				}
			}

			return { ...state, responseNodes, followUpNodes, edges, isModified: true };
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
			return { ...state, responseNodes, isModified: true };
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
			return { ...state, responseNodes, isModified: true };
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
			return { ...state, responseNodes, isModified: true };
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
			return { ...state, responseNodes, isModified: true };
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
			return { ...state, responseNodes, isModified: true };
		});
	},

	updateNotes: (nodeId: string, notes: string | null) => {
		canvasStore.update((state) => {
			const responseNodes = new Map(state.responseNodes);
			const node = responseNodes.get(nodeId);
			if (node) {
				responseNodes.set(nodeId, { ...node, notes });
			}
			return { ...state, responseNodes, isModified: true };
		});
	},

	toggleLike: (nodeId: string) => {
		canvasStore.update((state) => {
			const responseNodes = new Map(state.responseNodes);
			const node = responseNodes.get(nodeId);
			if (node) {
				responseNodes.set(nodeId, { ...node, liked: !node.liked });
			}
			return { ...state, responseNodes, isModified: true };
		});
		canvasLogger.log('Toggled like for node:', nodeId);
	},

	// === Multi-turn: Follow-up Node Handlers ===

	addFollowUpNode: (parentResponseIds: string[], position: NodePosition): string => {
		const state = get(canvasStore);
		const id = generateNodeId('followup');

		// Calculate depth based on deepest parent
		let maxParentDepth = 0;
		for (const parentId of parentResponseIds) {
			const parentNode = state.responseNodes.get(parentId);
			if (parentNode) {
				// Find the depth by tracing back through the graph
				let depth = 1;
				let currentParentId = parentNode.parentNodeId;
				let currentParentType = parentNode.parentNodeType;

				while (currentParentType === 'followup') {
					const followUp = state.followUpNodes.get(currentParentId);
					if (followUp) {
						depth = followUp.depth + 1;
						break;
					}
					break;
				}
				maxParentDepth = Math.max(maxParentDepth, depth);
			}
		}

		const newNode: FollowUpNode = {
			id,
			type: 'followup',
			position,
			prompt: '',
			parentResponseIds,
			childResponseIds: [],
			status: 'editing',
			depth: maxParentDepth + 1
		};

		canvasStore.update((state) => {
			const followUpNodes = new Map(state.followUpNodes);
			followUpNodes.set(id, newNode);

			// Add edges from parent responses to this follow-up
			const newEdges: CanvasEdge[] = parentResponseIds.map((pid) => ({
				id: `${pid}-${id}`,
				sourceId: pid,
				sourceType: 'response' as CanvasNodeType,
				targetId: id,
				targetType: 'followup' as CanvasNodeType
			}));

			return {
				...state,
				followUpNodes,
				edges: [...state.edges, ...newEdges],
				isModified: true
			};
		});

		canvasLogger.log('Added follow-up node:', id, 'parents:', parentResponseIds);
		return id;
	},

	setFollowUpPrompt: (nodeId: string, prompt: string) => {
		canvasStore.update((state) => {
			const followUpNodes = new Map(state.followUpNodes);
			const node = followUpNodes.get(nodeId);
			if (node) {
				followUpNodes.set(nodeId, {
					...node,
					prompt,
					status: prompt.trim() ? 'ready' : 'editing'
				});
			}
			return { ...state, followUpNodes, isModified: true };
		});
	},

	setFollowUpGenerating: (nodeId: string) => {
		canvasStore.update((state) => {
			const followUpNodes = new Map(state.followUpNodes);
			const node = followUpNodes.get(nodeId);
			if (node) {
				followUpNodes.set(nodeId, { ...node, status: 'generating' });
			}
			return { ...state, followUpNodes };
		});
	},

	setFollowUpReady: (nodeId: string) => {
		canvasStore.update((state) => {
			const followUpNodes = new Map(state.followUpNodes);
			const node = followUpNodes.get(nodeId);
			if (node) {
				followUpNodes.set(nodeId, { ...node, status: 'ready' });
			}
			return { ...state, followUpNodes };
		});
	},

	updateFollowUpPosition: (nodeId: string, position: NodePosition) => {
		canvasStore.update((state) => {
			const followUpNodes = new Map(state.followUpNodes);
			const node = followUpNodes.get(nodeId);
			if (node) {
				followUpNodes.set(nodeId, { ...node, position });
			}
			return { ...state, followUpNodes, isModified: true };
		});
	},

	removeFollowUpNode: (nodeId: string) => {
		canvasStore.update((state) => {
			const followUpNodes = new Map(state.followUpNodes);
			const responseNodes = new Map(state.responseNodes);
			const node = followUpNodes.get(nodeId);

			if (node) {
				// Remove child response nodes
				for (const childId of node.childResponseIds) {
					responseNodes.delete(childId);
				}

				// Remove associated edges
				const edges = state.edges.filter(
					(e) => e.sourceId !== nodeId && e.targetId !== nodeId
				);

				followUpNodes.delete(nodeId);
				return { ...state, followUpNodes, responseNodes, edges, isModified: true };
			}
			return state;
		});
		canvasLogger.log('Removed follow-up node:', nodeId);
	},

	addFollowUpResponseNode: (followUpId: string, position: NodePosition): string => {
		const state = get(canvasStore);
		const followUp = state.followUpNodes.get(followUpId);

		if (!followUp) {
			canvasLogger.error('Follow-up not found:', followUpId);
			return '';
		}

		const id = generateNodeId('response');
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
			liked: false,
			parentNodeId: followUpId,
			parentNodeType: 'followup'
		};

		canvasStore.update((state) => {
			const responseNodes = new Map(state.responseNodes);
			responseNodes.set(id, newNode);

			// Update follow-up with child reference
			const followUpNodes = new Map(state.followUpNodes);
			const fu = followUpNodes.get(followUpId);
			if (fu) {
				followUpNodes.set(followUpId, {
					...fu,
					childResponseIds: [...fu.childResponseIds, id]
				});
			}

			// Add edge from follow-up to response
			const newEdge: CanvasEdge = {
				id: `${followUpId}-${id}`,
				sourceId: followUpId,
				sourceType: 'followup',
				targetId: id,
				targetType: 'response'
			};

			return {
				...state,
				responseNodes,
				followUpNodes,
				edges: [...state.edges, newEdge],
				isModified: true
			};
		});

		canvasLogger.log('Added response to follow-up:', id, '->', followUpId);
		return id;
	},

	// === Multi-turn: Conversation History Builder ===

	buildConversationHistory: (
		targetNodeId: string,
		targetType: 'response' | 'followup'
	): ConversationMessage[] => {
		const state = get(canvasStore);
		const messages: ConversationMessage[] = [];

		// Recursive function to traverse the DAG backwards
		function collectHistory(nodeId: string, nodeType: CanvasNodeType): void {
			if (nodeType === 'prompt') {
				// Root prompt - add as first user message
				if (state.prompt.trim()) {
					messages.unshift({
						role: 'user',
						content: state.prompt,
						nodeId: state.promptId
					});
				}
			} else if (nodeType === 'response') {
				const responseNode = state.responseNodes.get(nodeId);
				if (responseNode && responseNode.response) {
					// Add this response as assistant message
					messages.unshift({
						role: 'assistant',
						content: responseNode.response,
						nodeId
					});
					// Recurse to parent
					collectHistory(responseNode.parentNodeId, responseNode.parentNodeType);
				}
			} else if (nodeType === 'followup') {
				const followUpNode = state.followUpNodes.get(nodeId);
				if (followUpNode && followUpNode.prompt.trim()) {
					// Add this follow-up prompt as user message
					messages.unshift({
						role: 'user',
						content: followUpNode.prompt,
						nodeId
					});
					// For multi-parent: use first parent (primary path)
					// Future: could implement merge strategy selection
					if (followUpNode.parentResponseIds.length > 0) {
						collectHistory(followUpNode.parentResponseIds[0], 'response');
					}
				}
			}
		}

		collectHistory(targetNodeId, targetType);
		return messages;
	},

	// Check if a node's depth exceeds the warning threshold
	checkDepthWarning: (
		nodeId: string
	): { warn: boolean; depth: number; message: string } | null => {
		const state = get(canvasStore);
		const followUp = state.followUpNodes.get(nodeId);
		if (!followUp) return null;

		if (followUp.depth >= state.maxDepthWarningThreshold) {
			return {
				warn: true,
				depth: followUp.depth,
				message: `Conversation depth is ${followUp.depth}. Context may be getting long.`
			};
		}
		return null;
	},

	// Add a parent to an existing follow-up (for multi-parent merge)
	addFollowUpParent: (followUpId: string, responseId: string) => {
		canvasStore.update((state) => {
			const followUpNodes = new Map(state.followUpNodes);
			const node = followUpNodes.get(followUpId);
			if (node && !node.parentResponseIds.includes(responseId)) {
				followUpNodes.set(followUpId, {
					...node,
					parentResponseIds: [...node.parentResponseIds, responseId]
				});

				// Add edge
				const newEdge: CanvasEdge = {
					id: `${responseId}-${followUpId}`,
					sourceId: responseId,
					sourceType: 'response',
					targetId: followUpId,
					targetType: 'followup'
				};

				return {
					...state,
					followUpNodes,
					edges: [...state.edges, newEdge],
					isModified: true
				};
			}
			return state;
		});
		canvasLogger.log('Added parent to follow-up:', followUpId, '<-', responseId);
	},

	// Remove a parent from a follow-up
	removeFollowUpParent: (followUpId: string, responseId: string) => {
		canvasStore.update((state) => {
			const followUpNodes = new Map(state.followUpNodes);
			const node = followUpNodes.get(followUpId);
			if (node) {
				const updatedParents = node.parentResponseIds.filter((id) => id !== responseId);
				if (updatedParents.length === 0) {
					// Can't remove last parent - would orphan the follow-up
					canvasLogger.warn('Cannot remove last parent from follow-up');
					return state;
				}
				followUpNodes.set(followUpId, {
					...node,
					parentResponseIds: updatedParents
				});

				// Remove edge
				const edgeId = `${responseId}-${followUpId}`;
				const edges = state.edges.filter((e) => e.id !== edgeId);

				return { ...state, followUpNodes, edges, isModified: true };
			}
			return state;
		});
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
			if (state.prompt || state.responseNodes.size > 0 || state.followUpNodes.size > 0) {
				undoHistory.push(cloneState(state));
				if (undoHistory.length > MAX_UNDO_HISTORY) {
					undoHistory.shift();
				}
			}
			// Reset to initial state (includes clearing loaded state)
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

	// Clear loaded canvas state (called on clear/new canvas)
	clearLoadedState: () => {
		canvasStore.update((state) => ({
			...state,
			loadedPromptMapId: null,
			loadedPromptMapName: null,
			isModified: false
		}));
		canvasLogger.log('Cleared loaded state');
	},

	// Mark canvas as saved (reset modified state)
	markSaved: () => {
		canvasStore.update((state) => ({ ...state, isModified: false }));
		canvasLogger.log('Marked canvas as saved');
	},

	// Load a prompt map from the library
	loadPromptMap: (data: {
		id?: string; // Prompt map ID from library
		name?: string; // Prompt map name from library
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
			// Multi-turn support
			parentNodeId?: string;
			parentNodeType?: 'prompt' | 'followup';
		}[];
		// Multi-turn support
		followUps?: {
			id: string;
			prompt: string;
			position: { x: number; y: number };
			parentResponseIds: string[];
			childResponseIds: string[];
			depth: number;
		}[];
	}) => {
		const responseNodes = new Map<string, ResponseNode>();
		const followUpNodes = new Map<string, FollowUpNode>();
		const edges: CanvasEdge[] = [];

		// Load follow-up nodes first (if present)
		if (data.followUps) {
			for (const fu of data.followUps) {
				followUpNodes.set(fu.id, {
					id: fu.id,
					type: 'followup',
					position: fu.position,
					prompt: fu.prompt,
					parentResponseIds: fu.parentResponseIds,
					childResponseIds: fu.childResponseIds,
					status: fu.prompt ? 'ready' : 'editing',
					depth: fu.depth
				});

				// Create edges from parent responses to follow-up
				for (const parentId of fu.parentResponseIds) {
					edges.push({
						id: `${parentId}-${fu.id}`,
						sourceId: parentId,
						sourceType: 'response',
						targetId: fu.id,
						targetType: 'followup'
					});
				}
			}
		}

		// Load response nodes
		for (const resp of data.responses) {
			const id = resp.id || generateNodeId('response');
			const parentNodeId = resp.parentNodeId || ROOT_PROMPT_ID;
			const parentNodeType = resp.parentNodeType || 'prompt';

			responseNodes.set(id, {
				id,
				position: resp.position,
				modelId: resp.model,
				provider: resp.provider as Provider,
				modelName: resp.model,
				response: resp.response,
				status: resp.response ? 'done' : 'idle',
				latencyMs: resp.latencyMs,
				promptTokens: resp.promptTokens ?? null,
				completionTokens: resp.completionTokens ?? null,
				costCents: resp.costCents ?? null,
				rating: resp.rating,
				notes: resp.notes,
				liked: resp.liked ?? false,
				parentNodeId,
				parentNodeType
			});

			// Create edge from parent to response
			edges.push({
				id: `${parentNodeId}-${id}`,
				sourceId: parentNodeId,
				sourceType: parentNodeType,
				targetId: id,
				targetType: 'response'
			});
		}

		canvasStore.set({
			prompt: data.prompt,
			promptId: ROOT_PROMPT_ID,
			promptPosition: data.promptPosition,
			responseNodes,
			followUpNodes,
			edges,
			maxDepthWarningThreshold: 5,
			isGenerating: false,
			error: null,
			hoveredNodeId: null,
			loadedPromptMapId: data.id ?? null,
			loadedPromptMapName: data.name ?? null,
			isModified: false
		});

		canvasLogger.log(
			'Loaded prompt map with',
			responseNodes.size,
			'responses and',
			followUpNodes.size,
			'follow-ups',
			data.id ? `(id: ${data.id})` : '(new canvas)'
		);
	}
};
