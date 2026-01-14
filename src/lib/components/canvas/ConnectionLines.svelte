<script lang="ts">
	import type { ResponseNode } from '$lib/services/canvas/types/canvasTypes';
	import { PROVIDER_CONFIGS } from '$lib/services/settings/types/settingsTypes';

	interface Props {
		promptCardRect: { x: number; y: number; width: number; height: number } | null;
		responseNodes: ResponseNode[];
		hoveredNodeId: string | null;
		onHoverNode?: (nodeId: string | null) => void;
	}

	let { promptCardRect, responseNodes, hoveredNodeId, onHoverNode }: Props = $props();

	// SVG offset (SVG is positioned at -2000, -2000 from center)
	const SVG_OFFSET = 2000;

	// Card dimensions (should match actual card sizes)
	const RESPONSE_CARD_WIDTH = 400;

	// Calculate bezier path from prompt card to response node
	function calculatePath(
		promptRect: { x: number; y: number; width: number; height: number },
		nodePosition: { x: number; y: number }
	): string {
		// Start point: right edge of prompt card, vertically centered
		// Add SVG_OFFSET to convert from canvas coords to SVG coords
		const startX = promptRect.x + promptRect.width + SVG_OFFSET;
		const startY = promptRect.y + promptRect.height / 2 + SVG_OFFSET;

		// End point: left edge of response card, vertically centered
		const endX = nodePosition.x + SVG_OFFSET;
		const endY = nodePosition.y + 200 + SVG_OFFSET; // Approximate vertical center of card

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
		promptRect: { x: number; y: number; width: number; height: number },
		nodePosition: { x: number; y: number }
	): { x: number; y: number } {
		const startX = promptRect.x + promptRect.width + SVG_OFFSET;
		const startY = promptRect.y + promptRect.height / 2 + SVG_OFFSET;
		const endX = nodePosition.x + SVG_OFFSET;
		const endY = nodePosition.y + 200 + SVG_OFFSET;

		// Approximate middle of the curve (t = 0.5 on cubic bezier)
		// For simplicity, just use linear interpolation
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
</script>

<svg
	class="pointer-events-none absolute"
	style="left: -2000px; top: -2000px; width: 4000px; height: 4000px;"
>
	<defs>
		<!-- Arrow marker -->
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
	</defs>

	{#if promptCardRect}
		{#each responseNodes as node (node.id)}
			{@const isHovered = hoveredNodeId === node.id}
			{@const path = calculatePath(promptCardRect, node.position)}
			{@const labelPos = calculateLabelPosition(promptCardRect, node.position)}
			{@const logo = getProviderLogo(node.provider)}

			<!-- Connection line -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<g
				class="pointer-events-auto cursor-pointer"
				onmouseenter={() => onHoverNode?.(node.id)}
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
					marker-end={isHovered ? 'url(#arrowhead-hover)' : 'url(#arrowhead)'}
					class="transition-all duration-150"
					class:text-primary={isHovered}
					class:text-muted-foreground={!isHovered}
				/>
			</g>

			<!-- Label on the line (only if model is selected) -->
			{#if node.modelId && node.modelName}
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
						{#if logo}
							<img src={logo} alt="" class="h-3.5 w-3.5" />
						{/if}
						<span class="truncate font-medium">{node.modelName}</span>
					</div>
				</foreignObject>
			{/if}
		{/each}
	{/if}
</svg>
