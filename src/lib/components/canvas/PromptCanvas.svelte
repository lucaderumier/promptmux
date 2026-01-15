<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import DotBackground from '$lib/components/ui/DotBackground.svelte';
	import PromptCard from './PromptCard.svelte';
	import ResponseCard from './ResponseCard.svelte';
	import FollowUpCard from './FollowUpCard.svelte';
	import ModelSelector from './ModelSelector.svelte';
	import ConnectionLines from './ConnectionLines.svelte';
	import { Minus, Plus, Crosshair, Save, Loader2, FilePlus } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { libraryHandlers } from '$lib/services/library';
	import { fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import {
		canvasStore,
		canvasHandlers,
		responseNodesArray,
		followUpNodesArray,
		canvasEdges
	} from '$lib/services/canvas/stores/canvasStore';
	import type { ResponseNode, FollowUpNode, CanvasEdge } from '$lib/services/canvas/types/canvasTypes';
	import type { ModelConfig, Provider } from '$lib/llm/types';

	interface Props {
		configuredProviders?: Provider[];
	}

	let { configuredProviders = [] }: Props = $props();

	// Zoom constants
	const ZOOM_MIN = 0.25;
	const ZOOM_MAX = 2.0;
	const ZOOM_STEP = 0.01;

	// Card dimensions
	const PROMPT_CARD_WIDTH = 400;
	const PROMPT_CARD_HEIGHT = 380; // Approximate height with header
	const RESPONSE_CARD_WIDTH = 400;
	const NODE_OFFSET_X = 250; // Horizontal offset for new nodes

	// Zoom and pan state
	let zoomScale = $state(1.0);
	let panX = $state(0);
	let panY = $state(0);

	// Viewport reference
	let viewportRef: HTMLDivElement | null = $state(null);
	let promptCardRef: HTMLDivElement | null = $state(null);

	// Dragging state for canvas pan
	let isDragging = $state(false);
	let dragStartX = $state(0);
	let dragStartY = $state(0);
	let dragStartPanX = $state(0);
	let dragStartPanY = $state(0);
	const dragThreshold = 5;

	// Dragging state for cards (prompt or response)
	let draggingNodeId = $state<string | null>(null); // 'prompt' or node id
	let nodeDragStartX = $state(0);
	let nodeDragStartY = $state(0);
	let nodeDragStartPosX = $state(0);
	let nodeDragStartPosY = $state(0);

	// Track if initial positioning is complete
	let hasInitiallyPositioned = $state(false);

	// Model selector state
	let selectorOpenForNode = $state<string | null>(null);

	// Save dialog state
	let saveDialogOpen = $state(false);
	let saveName = $state('');
	let isSaving = $state(false);
	let saveError = $state<string | null>(null);

	// Subscribe to store
	let promptValue = $state('');
	let promptPosition = $state({ x: 0, y: 0 });
	let responseNodes = $state<ResponseNode[]>([]);
	let followUpNodes = $state<FollowUpNode[]>([]);
	let edges = $state<CanvasEdge[]>([]);
	let hoveredNodeId = $state<string | null>(null);

	$effect(() => {
		const unsubscribe = canvasStore.subscribe((state) => {
			promptValue = state.prompt;
			promptPosition = state.promptPosition;
			hoveredNodeId = state.hoveredNodeId;
		});
		return unsubscribe;
	});

	$effect(() => {
		const unsubscribe = responseNodesArray.subscribe((nodes) => {
			responseNodes = nodes;
		});
		return unsubscribe;
	});

	$effect(() => {
		const unsubscribe = followUpNodesArray.subscribe((nodes) => {
			followUpNodes = nodes;
		});
		return unsubscribe;
	});

	$effect(() => {
		const unsubscribe = canvasEdges.subscribe((e) => {
			edges = e;
		});
		return unsubscribe;
	});

	// Calculate prompt card rect for connection lines
	const promptCardRect = $derived.by(() => {
		// Position relative to canvas center, accounting for prompt position
		return {
			x: promptPosition.x - PROMPT_CARD_WIDTH / 2,
			y: promptPosition.y - PROMPT_CARD_HEIGHT / 2,
			width: PROMPT_CARD_WIDTH,
			height: PROMPT_CARD_HEIGHT
		};
	});

	// Zoom controls
	function zoomIn() {
		zoomScale = Math.min(ZOOM_MAX, zoomScale + ZOOM_STEP);
	}

	function zoomOut() {
		zoomScale = Math.max(ZOOM_MIN, zoomScale - ZOOM_STEP);
	}

	function resetView() {
		zoomScale = 1.0;
		panX = 0;
		panY = 0;
	}

	// Mouse wheel zoom
	function handleWheel(e: WheelEvent) {
		e.preventDefault();

		const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
		const newScale = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoomScale + delta));

		if (newScale !== zoomScale && viewportRef) {
			const rect = viewportRef.getBoundingClientRect();
			const mouseX = e.clientX - rect.left;
			const mouseY = e.clientY - rect.top;

			const viewportCenterX = rect.width / 2;
			const viewportCenterY = rect.height / 2;

			const relX = mouseX - viewportCenterX - panX;
			const relY = mouseY - viewportCenterY - panY;

			const scaleFactor = newScale / zoomScale;
			panX -= relX * (scaleFactor - 1);
			panY -= relY * (scaleFactor - 1);

			zoomScale = newScale;
		}
	}

	// Drag to pan canvas
	function handleMouseDown(e: MouseEvent) {
		if (e.button !== 0) return;

		// Don't start drag if clicking on interactive elements or cards
		const target = e.target as HTMLElement;
		if (target.closest('textarea, input, button, [data-slot="card"], [data-slot="response-card"], [data-slot="prompt-card"], [data-slot="followup-card"]')) {
			return;
		}

		isDragging = false;
		dragStartX = e.clientX;
		dragStartY = e.clientY;
		dragStartPanX = panX;
		dragStartPanY = panY;

		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
	}

	function handleMouseMove(e: MouseEvent) {
		// Handle card dragging (prompt or response node)
		if (draggingNodeId) {
			const deltaX = (e.clientX - nodeDragStartX) / zoomScale;
			const deltaY = (e.clientY - nodeDragStartY) / zoomScale;

			if (draggingNodeId === 'prompt') {
				canvasHandlers.setPromptPosition({
					x: nodeDragStartPosX + deltaX,
					y: nodeDragStartPosY + deltaY
				});
			} else {
				canvasHandlers.updateNodePosition(draggingNodeId, {
					x: nodeDragStartPosX + deltaX,
					y: nodeDragStartPosY + deltaY
				});
			}
			return;
		}

		// Handle canvas panning
		const deltaX = e.clientX - dragStartX;
		const deltaY = e.clientY - dragStartY;

		if (!isDragging && (Math.abs(deltaX) > dragThreshold || Math.abs(deltaY) > dragThreshold)) {
			isDragging = true;
		}

		if (isDragging) {
			panX = dragStartPanX + deltaX;
			panY = dragStartPanY + deltaY;
		}
	}

	function handleMouseUp() {
		isDragging = false;
		draggingNodeId = null;
		document.removeEventListener('mousemove', handleMouseMove);
		document.removeEventListener('mouseup', handleMouseUp);
	}

	// Handle prompt card drag start
	function handlePromptDragStart(e: MouseEvent) {
		draggingNodeId = 'prompt';
		nodeDragStartX = e.clientX;
		nodeDragStartY = e.clientY;
		nodeDragStartPosX = promptPosition.x;
		nodeDragStartPosY = promptPosition.y;

		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
	}

	// Handle response card drag start
	function handleNodeDragStart(nodeId: string, e: MouseEvent) {
		const node = responseNodes.find((n) => n.id === nodeId);
		if (!node) return;

		draggingNodeId = nodeId;
		nodeDragStartX = e.clientX;
		nodeDragStartY = e.clientY;
		nodeDragStartPosX = node.position.x;
		nodeDragStartPosY = node.position.y;

		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
	}

	// Add new response node
	function handleAddNode() {
		// Calculate position for new node relative to prompt card position
		const existingNodes = responseNodes.length;
		const baseX = promptPosition.x + PROMPT_CARD_WIDTH / 2 + NODE_OFFSET_X;
		const baseY = promptPosition.y - PROMPT_CARD_HEIGHT / 2;
		const verticalOffset = existingNodes * 120; // Stack nodes vertically

		const nodeId = canvasHandlers.addResponseNode({
			x: baseX,
			y: baseY + verticalOffset
		});

		// Open model selector for the new node
		selectorOpenForNode = nodeId;
	}

	// Handle model selection
	function handleModelSelect(nodeId: string, model: ModelConfig) {
		canvasHandlers.setNodeModel(nodeId, model.id, model.provider, model.name);
		selectorOpenForNode = null;
	}

	// Handle get response for a single node
	async function handleGetResponse(nodeId: string) {
		const node = responseNodes.find((n) => n.id === nodeId);
		if (!node || !node.modelId || !promptValue.trim()) return;

		// Set this specific node to loading
		canvasHandlers.setNodeLoading(nodeId);

		try {
			const response = await fetch('/api/llm/generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					prompt: promptValue,
					models: [
						{
							id: node.modelId,
							name: node.modelName,
							provider: node.provider
						}
					]
				})
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Failed to generate response');
			}

			const data = await response.json();
			const resp = data.responses[0];

			if (resp.error) {
				canvasHandlers.setNodeError(nodeId, resp.error);
			} else {
				canvasHandlers.setNodeResponse(nodeId, resp.response, resp.latencyMs, {
					promptTokens: resp.promptTokens,
					completionTokens: resp.completionTokens,
					costCents: resp.costCents
				});
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : 'An error occurred';
			canvasHandlers.setNodeError(nodeId, message);
		}
	}

	// Check if a node can get a response
	function canNodeGetResponse(node: ResponseNode): boolean {
		// For root prompt responses
		if (node.parentNodeType === 'prompt') {
			return Boolean(
				promptValue.trim() && node.modelId && node.status !== 'loading' && node.status !== 'selecting'
			);
		}
		// For follow-up responses
		const followUp = followUpNodes.find((f) => f.id === node.parentNodeId);
		return Boolean(
			followUp?.prompt.trim() && node.modelId && node.status !== 'loading' && node.status !== 'selecting'
		);
	}

	// === Follow-up handlers ===

	// Card dimensions for positioning
	const FOLLOWUP_CARD_WIDTH = 400;
	const FOLLOWUP_OFFSET_X = 250;

	// Add follow-up from a response node
	function handleAddFollowUp(responseId: string) {
		const responseNode = responseNodes.find((n) => n.id === responseId);
		if (!responseNode || responseNode.status !== 'done') return;

		// Position follow-up to the right of the response
		const followUpId = canvasHandlers.addFollowUpNode([responseId], {
			x: responseNode.position.x + FOLLOWUP_CARD_WIDTH + FOLLOWUP_OFFSET_X,
			y: responseNode.position.y
		});

		// Focus the follow-up for editing
		toast.success('Follow-up added', {
			description: 'Enter your follow-up question'
		});
	}

	// Handle follow-up card drag start
	function handleFollowUpDragStart(nodeId: string, e: MouseEvent) {
		const node = followUpNodes.find((n) => n.id === nodeId);
		if (!node) return;

		draggingNodeId = nodeId;
		nodeDragStartX = e.clientX;
		nodeDragStartY = e.clientY;
		nodeDragStartPosX = node.position.x;
		nodeDragStartPosY = node.position.y;

		document.addEventListener('mousemove', handleFollowUpMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
	}

	// Handle mouse move for follow-up dragging
	function handleFollowUpMouseMove(e: MouseEvent) {
		if (!draggingNodeId) return;

		const deltaX = (e.clientX - nodeDragStartX) / zoomScale;
		const deltaY = (e.clientY - nodeDragStartY) / zoomScale;

		// Check if it's a follow-up node
		const isFollowUp = followUpNodes.some((n) => n.id === draggingNodeId);
		if (isFollowUp) {
			canvasHandlers.updateFollowUpPosition(draggingNodeId, {
				x: nodeDragStartPosX + deltaX,
				y: nodeDragStartPosY + deltaY
			});
		}
	}

	// Add response node to a follow-up
	function handleAddFollowUpResponseNode(followUpId: string) {
		const followUp = followUpNodes.find((n) => n.id === followUpId);
		if (!followUp) return;

		// Calculate position based on existing children
		const existingChildren = followUp.childResponseIds.length;
		const baseX = followUp.position.x + FOLLOWUP_CARD_WIDTH + NODE_OFFSET_X;
		const baseY = followUp.position.y;
		const verticalOffset = existingChildren * 120;

		const nodeId = canvasHandlers.addFollowUpResponseNode(followUpId, {
			x: baseX,
			y: baseY + verticalOffset
		});

		// Open model selector
		selectorOpenForNode = nodeId;
	}

	// Get response for a follow-up response node (uses conversation history)
	async function handleGetFollowUpResponse(nodeId: string) {
		const node = responseNodes.find((n) => n.id === nodeId);
		if (!node || !node.modelId || node.parentNodeType !== 'followup') return;

		const followUp = followUpNodes.find((f) => f.id === node.parentNodeId);
		if (!followUp || !followUp.prompt.trim()) return;

		// Build conversation history
		const messages = canvasHandlers.buildConversationHistory(followUp.id, 'followup');

		// Set node to loading
		canvasHandlers.setNodeLoading(nodeId);

		try {
			const response = await fetch('/api/llm/generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					messages: messages.map((m) => ({ role: m.role, content: m.content })),
					models: [
						{
							id: node.modelId,
							name: node.modelName,
							provider: node.provider
						}
					]
				})
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Failed to generate response');
			}

			const data = await response.json();
			const resp = data.responses[0];

			if (resp.error) {
				canvasHandlers.setNodeError(nodeId, resp.error);
			} else {
				canvasHandlers.setNodeResponse(nodeId, resp.response, resp.latencyMs, {
					promptTokens: resp.promptTokens,
					completionTokens: resp.completionTokens,
					costCents: resp.costCents
				});
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : 'An error occurred';
			canvasHandlers.setNodeError(nodeId, message);
		}
	}

	// Unified handler that routes to correct response function
	function handleGetResponseUnified(nodeId: string) {
		const node = responseNodes.find((n) => n.id === nodeId);
		if (!node) return;

		if (node.parentNodeType === 'followup') {
			handleGetFollowUpResponse(nodeId);
		} else {
			handleGetResponse(nodeId);
		}
	}

	// Cleanup on unmount
	$effect(() => {
		return () => {
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		};
	});

	// Mark as positioned after mount
	$effect(() => {
		if (!hasInitiallyPositioned) {
			requestAnimationFrame(() => {
				hasInitiallyPositioned = true;
			});
		}
	});

	// Sync prompt with store
	function handlePromptChange(value: string) {
		canvasHandlers.setPrompt(value);
	}

	// Check if canvas can be saved
	const canSave = $derived(
		promptValue.trim().length > 0 &&
			responseNodes.some((n) => n.modelId && n.response)
	);

	// Check if canvas has content
	const hasContent = $derived(
		promptValue.trim().length > 0 || responseNodes.length > 0 || followUpNodes.length > 0
	);

	// New canvas - clear with undo support
	function newCanvas() {
		canvasHandlers.clearCanvas();
		toast.success('Canvas cleared', {
			description: 'Press Cmd+Z to undo'
		});
	}

	// Handle undo
	function handleUndo() {
		const success = canvasHandlers.undo();
		if (success) {
			toast.success('Undo successful');
		}
	}

	// Keyboard shortcuts
	$effect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			// Cmd+Z or Ctrl+Z for undo
			if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
				e.preventDefault();
				handleUndo();
			}
		}

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	});

	// Open save dialog
	function openSaveDialog() {
		// Generate default name from prompt (first 50 chars)
		saveName = promptValue.trim().slice(0, 50) || 'Untitled';
		saveError = null;
		saveDialogOpen = true;
	}

	// Handle save
	async function handleSave() {
		if (!saveName.trim() || isSaving) return;

		isSaving = true;
		saveError = null;

		try {
			const response = await fetch('/api/library/save', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: saveName.trim(),
					prompt: promptValue,
					promptPosition,
					responses: responseNodes
						.filter((n) => n.modelId)
						.map((n) => ({
							id: n.id, // Client-side ID for linking
							provider: n.provider,
							model: n.modelId,
							modelName: n.modelName,
							response: n.response,
							latencyMs: n.latencyMs,
							promptTokens: n.promptTokens,
							completionTokens: n.completionTokens,
							costCents: n.costCents,
							rating: n.rating,
							notes: n.notes,
							liked: n.liked,
							position: n.position,
							parentNodeId: n.parentNodeId,
							parentNodeType: n.parentNodeType
						})),
					followUps: followUpNodes.map((f) => ({
						id: f.id, // Client-side ID for linking
						prompt: f.prompt,
						position: f.position,
						depth: f.depth,
						parentResponseIds: f.parentResponseIds
					}))
				})
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.message || 'Failed to save');
			}

			const data = await response.json();

			// Add to library store
			libraryHandlers.addPromptMap({
				id: data.promptMapId,
				userId: '',
				folderId: null,
				name: saveName.trim(),
				prompt: promptValue,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			});

			// Refresh sidebar to show the new item
			invalidateAll();

			toast.success('Saved to library');
			saveDialogOpen = false;
		} catch (err) {
			saveError = err instanceof Error ? err.message : 'Failed to save';
		} finally {
			isSaving = false;
		}
	}
</script>

<div class="relative h-full w-full overflow-hidden" bind:this={viewportRef}>
	<!-- Transformable Canvas Area -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="absolute inset-0"
		class:cursor-grabbing={isDragging}
		class:cursor-grab={!isDragging && !draggingNodeId}
		onwheel={handleWheel}
		onmousedown={handleMouseDown}
		role="application"
		aria-label="Prompt canvas"
	>
		<!-- Transform wrapper for zoom and pan -->
		<div
			class="absolute inset-0"
			class:transition-transform={!isDragging && !draggingNodeId && hasInitiallyPositioned}
			style="transform: translate3d({panX}px, {panY}px, 0) scale({zoomScale}); transform-origin: center center; will-change: transform;"
		>
			<!-- Dot Background -->
			<div class="absolute -inset-[200%]">
				<DotBackground size={20} dotSize={1} color="hsl(var(--muted-foreground))" opacity={0.2} />
			</div>

			<!-- Connection Lines (drawn in canvas space) -->
			<div class="absolute left-1/2 top-1/2">
				<ConnectionLines
					{promptCardRect}
					{responseNodes}
					{followUpNodes}
					{edges}
					{hoveredNodeId}
					onHoverNode={(id: string | null) => canvasHandlers.setHoveredNode(id)}
				/>
			</div>

			<!-- Prompt Card -->
			<div
				class="absolute left-1/2 top-1/2"
				style="transform: translate(calc({promptPosition.x}px - 50%), calc({promptPosition.y}px - 50%));"
			>
				<div class="canvas-appear" bind:this={promptCardRef}>
					<PromptCard
						bind:value={promptValue}
						onchange={handlePromptChange}
						onAddNode={handleAddNode}
						onDragStart={handlePromptDragStart}
					/>
				</div>
			</div>

			<!-- Response Nodes -->
			{#each responseNodes as node (node.id)}
				<div
					class="absolute left-1/2 top-1/2"
					style="transform: translate({node.position.x}px, {node.position.y}px);"
				>
					<div class="canvas-appear">
						<ResponseCard
							{node}
							onRemove={() => canvasHandlers.removeResponseNode(node.id)}
							onDragStart={(e) => handleNodeDragStart(node.id, e)}
							onGetResponse={() => handleGetResponseUnified(node.id)}
							onToggleLike={() => canvasHandlers.toggleLike(node.id)}
							onAddFollowUp={() => handleAddFollowUp(node.id)}
							canGetResponse={canNodeGetResponse(node)}
						/>
					</div>
				</div>
			{/each}

			<!-- Follow-up Nodes -->
			{#each followUpNodes as node (node.id)}
				<div
					class="absolute left-1/2 top-1/2"
					style="transform: translate({node.position.x}px, {node.position.y}px);"
				>
					<div class="canvas-appear">
						<FollowUpCard
							{node}
							onPromptChange={(prompt) => canvasHandlers.setFollowUpPrompt(node.id, prompt)}
							onAddNode={() => handleAddFollowUpResponseNode(node.id)}
							onRemove={() => canvasHandlers.removeFollowUpNode(node.id)}
							onDragStart={(e) => handleFollowUpDragStart(node.id, e)}
							depthWarning={canvasHandlers.checkDepthWarning(node.id)}
						/>
					</div>
				</div>
			{/each}

			<!-- Floating Model Selectors (on connection lines) -->
			{#each responseNodes as node (node.id)}
				{#if node.status === 'selecting'}
					{@const parentIsFollowUp = node.parentNodeType === 'followup'}
					{@const followUpParent = parentIsFollowUp ? followUpNodes.find((f) => f.id === node.parentNodeId) : null}
					{@const sourceRect = parentIsFollowUp && followUpParent
						? { x: followUpParent.position.x, y: followUpParent.position.y, width: FOLLOWUP_CARD_WIDTH, height: 300 }
						: promptCardRect}
					{@const midX = sourceRect ? (sourceRect.x + sourceRect.width + node.position.x) / 2 : 0}
					{@const midY = sourceRect ? (sourceRect.y + sourceRect.height / 2 + node.position.y + 200) / 2 : 0}
					<div
						class="absolute left-1/2 top-1/2"
						style="transform: translate({midX}px, {midY}px);"
					>
						<ModelSelector
							open={selectorOpenForNode === node.id}
							onOpenChange={(open) => {
								if (!open && selectorOpenForNode === node.id) {
									// If closed without selecting, remove the node
									if (!node.modelId) {
										canvasHandlers.removeResponseNode(node.id);
									}
									selectorOpenForNode = null;
								}
							}}
							onSelect={(model) => handleModelSelect(node.id, model)}
							{configuredProviders}
						>
							<button
								class="flex h-8 items-center gap-1.5 rounded-full border bg-card px-3 shadow-md transition-all hover:bg-accent"
							>
								<span class="text-sm font-medium">Select model</span>
							</button>
						</ModelSelector>
					</div>
				{/if}
			{/each}
		</div>
	</div>

	<!-- Zoom Controls -->
	<div
		class="absolute bottom-4 left-4 z-50 flex items-center gap-1 rounded-lg border bg-card/90 px-2 py-1.5 shadow-lg backdrop-blur-sm"
		in:fade={{ duration: 300, delay: 200, easing: cubicOut }}
	>
		<button
			onclick={zoomOut}
			class="rounded p-1.5 transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
			title="Zoom out"
			disabled={zoomScale <= ZOOM_MIN}
		>
			<Minus class="h-4 w-4" />
		</button>

		<span class="min-w-[3.5rem] text-center text-sm font-medium tabular-nums">
			{Math.round(zoomScale * 100)}%
		</span>

		<button
			onclick={zoomIn}
			class="rounded p-1.5 transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
			title="Zoom in"
			disabled={zoomScale >= ZOOM_MAX}
		>
			<Plus class="h-4 w-4" />
		</button>

		<div class="mx-1 h-4 w-px bg-border"></div>

		<button
			onclick={resetView}
			class="rounded p-1.5 transition-colors hover:bg-accent"
			title="Reset view"
		>
			<Crosshair class="h-4 w-4" />
		</button>
	</div>

	<!-- Action Buttons -->
	<div
		class="absolute bottom-4 right-4 z-50 flex gap-2"
		in:fade={{ duration: 300, delay: 200, easing: cubicOut }}
	>
		<Button
			variant="outline"
			onclick={newCanvas}
			disabled={!hasContent}
			class="gap-2 shadow-lg"
		>
			<FilePlus class="h-4 w-4" />
			New Canvas
		</Button>
		<Button
			onclick={openSaveDialog}
			disabled={!canSave}
			class="gap-2 shadow-lg"
		>
			<Save class="h-4 w-4" />
			Save to Library
		</Button>
	</div>

	<!-- Save Dialog -->
	<Dialog.Root bind:open={saveDialogOpen}>
		<Dialog.Content class="sm:max-w-[425px]">
			<Dialog.Header>
				<Dialog.Title>Save to Library</Dialog.Title>
				<Dialog.Description>
					Give this prompt map a name to save it to your library.
				</Dialog.Description>
			</Dialog.Header>
			<div class="grid gap-4 py-4">
				<div class="grid gap-2">
					<Label for="name">Name</Label>
					<Input
						id="name"
						bind:value={saveName}
						placeholder="Enter a name..."
						onkeydown={(e) => e.key === 'Enter' && handleSave()}
					/>
				</div>
				{#if saveError}
					<p class="text-sm text-destructive">{saveError}</p>
				{/if}
			</div>
			<Dialog.Footer>
				<Button variant="outline" onclick={() => (saveDialogOpen = false)}>
					Cancel
				</Button>
				<Button onclick={handleSave} disabled={!saveName.trim() || isSaving}>
					{#if isSaving}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						Saving...
					{:else}
						Save
					{/if}
				</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
</div>

<style>
	.transition-transform {
		transition: transform 0.15s ease-out;
	}

	.canvas-appear {
		animation: canvasFadeScale 0.3s cubic-bezier(0.33, 1, 0.68, 1) forwards;
	}

	@keyframes canvasFadeScale {
		from {
			opacity: 0;
			transform: scale(0.95);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
</style>
