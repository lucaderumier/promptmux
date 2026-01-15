<script lang="ts">
	import type { ResponseNode, FollowUpNode, CanvasEdge } from '$lib/services/canvas/types/canvasTypes';
	import { PROVIDER_CONFIGS } from '$lib/services/settings/types/settingsTypes';

	interface Props {
		promptCardRect: { x: number; y: number; width: number; height: number } | null;
		responseNodes: ResponseNode[];
		followUpNodes: FollowUpNode[];
		edges: CanvasEdge[];
		hoveredNodeId: string | null;
		onHoverNode?: (nodeId: string | null) => void;
	}

	let { promptCardRect, responseNodes, followUpNodes, edges, hoveredNodeId, onHoverNode }: Props = $props();

	// SVG offset (SVG is positioned at -2000, -2000 from center)
	const SVG_OFFSET = 2000;

	// Card dimensions
	const CARD_WIDTH = 400;
	const RESPONSE_CARD_HEIGHT = 400;
	const FOLLOWUP_CARD_HEIGHT = 300;
	const PROMPT_CARD_HEIGHT = 380;

	// Get node bounds by ID
	function getNodeBounds(nodeId: string, nodeType: string): { x: number; y: number; width: number; height: number } | null {
		if (nodeType === 'prompt') {
			return promptCardRect;
		}
		if (nodeType === 'response') {
			const node = responseNodes.find((n) => n.id === nodeId);
			if (node) {
				return {
					x: node.position.x,
					y: node.position.y,
					width: CARD_WIDTH,
					height: RESPONSE_CARD_HEIGHT
				};
			}
		}
		if (nodeType === 'followup') {
			const node = followUpNodes.find((n) => n.id === nodeId);
			if (node) {
				return {
					x: node.position.x,
					y: node.position.y,
					width: CARD_WIDTH,
					height: FOLLOWUP_CARD_HEIGHT
				};
			}
		}
		return null;
	}

	// Calculate bezier path between two rects
	function calculatePath(
		source: { x: number; y: number; width: number; height: number },
		target: { x: number; y: number; width: number; height: number }
	): string {
		// Start point: right edge of source, vertically centered
		const startX = source.x + source.width + SVG_OFFSET;
		const startY = source.y + source.height / 2 + SVG_OFFSET;

		// End point: left edge of target, vertically centered
		const endX = target.x + SVG_OFFSET;
		const endY = target.y + target.height / 2 + SVG_OFFSET;

		// Control points for bezier curve
		const dx = endX - startX;
		const controlOffset = Math.min(Math.abs(dx) * 0.4, 150);

		const cp1x = startX + controlOffset;
		const cp1y = startY;
		const cp2x = endX - controlOffset;
		const cp2y = endY;

		return `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
	}

	// Calculate label position (middle of the curve)
	function calculateLabelPosition(
		source: { x: number; y: number; width: number; height: number },
		target: { x: number; y: number; width: number; height: number }
	): { x: number; y: number } {
		const startX = source.x + source.width + SVG_OFFSET;
		const startY = source.y + source.height / 2 + SVG_OFFSET;
		const endX = target.x + SVG_OFFSET;
		const endY = target.y + target.height / 2 + SVG_OFFSET;

		return {
			x: (startX + endX) / 2,
			y: (startY + endY) / 2
		};
	}

	function getProviderLogo(provider: string | null): string | null {
		if (!provider) return null;
		const config = PROVIDER_CONFIGS.find((p) => p.id === provider);
		return config?.logo || null;
	}

	// Get label info for an edge
	function getEdgeLabel(edge: CanvasEdge): { text: string; logo: string | null } | null {
		// For edges ending at response nodes, show the model name
		if (edge.targetType === 'response') {
			const responseNode = responseNodes.find((n) => n.id === edge.targetId);
			if (responseNode?.modelId && responseNode.modelName) {
				return {
					text: responseNode.modelName,
					logo: getProviderLogo(responseNode.provider)
				};
			}
		}
		// For edges ending at follow-up nodes, no label needed (or could show "Follow-up")
		return null;
	}

	// Computed edge data for rendering
	const edgeData = $derived(
		edges
			.map((edge) => {
				const sourceBounds = getNodeBounds(edge.sourceId, edge.sourceType);
				const targetBounds = getNodeBounds(edge.targetId, edge.targetType);

				if (!sourceBounds || !targetBounds) return null;

				const path = calculatePath(sourceBounds, targetBounds);
				const labelPos = calculateLabelPosition(sourceBounds, targetBounds);
				const label = getEdgeLabel(edge);

				// For hover detection, we associate with the target node
				const hoverNodeId = edge.targetId;
				const isHovered = hoveredNodeId === hoverNodeId;

				return {
					edge,
					path,
					labelPos,
					label,
					hoverNodeId,
					isHovered
				};
			})
			.filter(Boolean) as {
			edge: CanvasEdge;
			path: string;
			labelPos: { x: number; y: number };
			label: { text: string; logo: string | null } | null;
			hoverNodeId: string;
			isHovered: boolean;
		}[]
	);
</script>

<svg
	class="pointer-events-none absolute"
	style="left: -2000px; top: -2000px; width: 4000px; height: 4000px;"
>
	<defs>
		<!-- Arrow marker for normal state -->
		<marker
			id="arrowhead"
			markerWidth="10"
			markerHeight="7"
			refX="9"
			refY="3.5"
			orient="auto"
		>
			<polygon
				points="0 0, 10 3.5, 0 7"
				fill="currentColor"
				class="text-muted-foreground"
			/>
		</marker>
		<!-- Arrow marker for hover state -->
		<marker
			id="arrowhead-hover"
			markerWidth="10"
			markerHeight="7"
			refX="9"
			refY="3.5"
			orient="auto"
		>
			<polygon
				points="0 0, 10 3.5, 0 7"
				fill="currentColor"
				class="text-primary"
			/>
		</marker>
		<!-- Arrow marker for follow-up edges (dashed style) -->
		<marker
			id="arrowhead-followup"
			markerWidth="10"
			markerHeight="7"
			refX="9"
			refY="3.5"
			orient="auto"
		>
			<polygon
				points="0 0, 10 3.5, 0 7"
				fill="currentColor"
				class="text-muted-foreground/70"
			/>
		</marker>
	</defs>

	{#each edgeData as { edge, path, labelPos, label, hoverNodeId, isHovered } (edge.id)}
		{@const isFollowUpEdge = edge.sourceType === 'response' && edge.targetType === 'followup'}

		<!-- Connection line -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<g
			class="pointer-events-auto cursor-pointer"
			onmouseenter={() => onHoverNode?.(hoverNodeId)}
			onmouseleave={() => onHoverNode?.(null)}
		>
			<!-- Invisible wider path for easier hover detection -->
			<path
				d={path}
				fill="none"
				stroke="transparent"
				stroke-width="20"
			/>

			<!-- Visible path -->
			<path
				d={path}
				fill="none"
				stroke="currentColor"
				stroke-width={isHovered ? 2.5 : 2}
				stroke-linecap="round"
				stroke-dasharray={isFollowUpEdge ? '6 4' : 'none'}
				marker-end={isHovered ? 'url(#arrowhead-hover)' : isFollowUpEdge ? 'url(#arrowhead-followup)' : 'url(#arrowhead)'}
				class="transition-all duration-150 {isHovered ? 'text-primary' : isFollowUpEdge ? 'text-muted-foreground/70' : 'text-muted-foreground'}"
			/>
		</g>

		<!-- Label on the line (for response edges with model selected) -->
		{#if label}
			<foreignObject
				x={labelPos.x - 70}
				y={labelPos.y - 14}
				width="140"
				height="28"
				class="pointer-events-none"
			>
				<div
					class="flex h-full items-center justify-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs shadow-sm transition-all"
					class:border-primary={isHovered}
					class:shadow-md={isHovered}
				>
					{#if label.logo}
						<img src={label.logo} alt="" class="h-3.5 w-3.5" />
					{/if}
					<span class="truncate font-medium">{label.text}</span>
				</div>
			</foreignObject>
		{/if}
	{/each}
</svg>
