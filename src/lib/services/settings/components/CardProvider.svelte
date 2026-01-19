<script lang="ts">
	/**
	 * Provider Card Component
	 *
	 * Displays a provider card with logo and connect button.
	 */

	import * as Card from '$lib/components/ui/card';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { IntegrationLogoBox } from '$lib/components/ui/integration-logo-box';
	import { IntegrationConnectButton } from '$lib/components/ui/integration-connect-button';
	import type { ProviderConfig, ApiKeyInfo } from '../types/settingsTypes';

	interface Props {
		config: ProviderConfig;
		apiKeyInfo?: ApiKeyInfo;
		isLoading?: boolean;
		isConnecting?: boolean;
		onConfigure: () => void;
		onRemove?: () => void;
	}

	let {
		config,
		apiKeyInfo,
		isLoading = false,
		isConnecting = false,
		onConfigure,
		onRemove
	}: Props = $props();

	const isConnected = $derived(!!apiKeyInfo);

	// Component state
	let hover = $state(false);
	let buttonHovered = $state(false);

	/**
	 * Handle button click (connect or remove)
	 */
	function handleButtonClick(event?: MouseEvent) {
		event?.stopPropagation();
		if (isConnected && onRemove) {
			onRemove();
		} else {
			onConfigure();
		}
	}

	/**
	 * Handle card click to configure
	 */
	function handleCardClick(event: MouseEvent) {
		// Only trigger if click wasn't on a button
		if (!(event.target as HTMLElement).closest('button')) {
			onConfigure();
		}
	}
</script>

<Card.Root
	class="relative overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:shadow-md cursor-pointer"
	onmouseenter={() => (hover = true)}
	onmouseleave={() => (hover = false)}
	onclick={handleCardClick}
>
	<Card.Header class="pb-3">
		{#if isLoading}
			<!-- Skeleton Loading State -->
			<div class="flex items-center gap-3">
				<Skeleton class="h-14 w-14 rounded-xl" />
				<div class="flex-1">
					<Skeleton class="h-5 w-32" />
					<Skeleton class="mt-1 h-4 w-48" />
				</div>
			</div>
		{:else}
			<div class="flex items-center gap-3">
				<!-- Provider Logo -->
				<IntegrationLogoBox
					src={config.logo}
					alt={config.name}
					size="lg"
					emphasized={buttonHovered}
				/>

				<!-- Title and Description -->
				<div class="flex flex-1 flex-col gap-0.5">
					<div class="flex items-center justify-between gap-2">
						<Card.Title class="text-base font-semibold">{config.name}</Card.Title>
						{#if isConnected && apiKeyInfo}
							<span class="font-mono text-xs text-muted-foreground">{apiKeyInfo.maskedKey}</span>
						{/if}
					</div>
					<Card.Description class="text-sm min-h-[2.5rem]">{config.description}</Card.Description>
				</div>
			</div>
		{/if}
	</Card.Header>

	<Card.Footer class="pt-2">
		{#if isLoading}
			<!-- Skeleton Loading State -->
			<Skeleton class="h-9 w-full rounded-md" />
		{:else}
			<IntegrationConnectButton
				{isConnected}
				{isConnecting}
				onclick={handleButtonClick}
				onhoverchange={(hovered) => (buttonHovered = hovered)}
			/>
		{/if}
	</Card.Footer>
</Card.Root>
