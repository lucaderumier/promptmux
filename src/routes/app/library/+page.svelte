<script lang="ts">
	import { goto } from '$app/navigation';
	import { Search, FileText, Trash2, Loader2 } from '@lucide/svelte';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { canvasHandlers } from '$lib/services/canvas';

	interface PromptMapSummary {
		id: string;
		name: string;
		prompt: string;
		createdAt: string;
		updatedAt: string;
		responseCount: number;
	}

	let { data }: { data: { promptMaps: PromptMapSummary[] } } = $props();

	let searchQuery = $state('');
	let isLoading = $state<string | null>(null);
	let deleteId = $state<string | null>(null);
	let isDeleting = $state(false);

	const filteredPromptMaps = $derived(
		data.promptMaps.filter((pm) =>
			pm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			pm.prompt.toLowerCase().includes(searchQuery.toLowerCase())
		)
	);

	async function loadPromptMap(id: string) {
		isLoading = id;

		try {
			const response = await fetch(`/api/library/${id}`);
			if (!response.ok) {
				throw new Error('Failed to load prompt map');
			}

			const promptMap = await response.json();

			// Load into canvas store (includes follow-up data for multi-turn)
			canvasHandlers.loadPromptMap({
				id: promptMap.id,
				name: promptMap.name,
				prompt: promptMap.prompt,
				promptPosition: promptMap.promptPosition,
				responses: promptMap.responses,
				followUps: promptMap.followUps
			});

			// Navigate to canvas
			goto('/app');
		} catch (error) {
			console.error('Failed to load prompt map:', error);
		} finally {
			isLoading = null;
		}
	}

	async function deletePromptMap() {
		if (!deleteId || isDeleting) return;

		isDeleting = true;

		try {
			const response = await fetch(`/api/library/${deleteId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				throw new Error('Failed to delete');
			}

			// Remove from local data
			data.promptMaps = data.promptMaps.filter((pm) => pm.id !== deleteId);
			deleteId = null;
		} catch (error) {
			console.error('Failed to delete:', error);
		} finally {
			isDeleting = false;
		}
	}

	function formatDate(dateString: string) {
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

		if (diffDays === 0) {
			return 'Today';
		} else if (diffDays === 1) {
			return 'Yesterday';
		} else if (diffDays < 7) {
			return `${diffDays} days ago`;
		} else {
			return date.toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
			});
		}
	}
</script>

<div class="h-full flex flex-col items-center">
	<!-- Header with search -->
	<div class="w-full max-w-4xl px-4 mb-6">
		<h1 class="text-2xl font-bold mb-4 text-center">Library</h1>
		<div class="relative">
			<Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
			<Input
				type="text"
				placeholder="Search prompts..."
				class="pl-9"
				bind:value={searchQuery}
			/>
		</div>
	</div>

	<!-- List -->
	<div class="flex-1 overflow-auto w-full max-w-4xl px-4">
		{#if data.promptMaps.length === 0}
			<div class="text-center py-12">
				<FileText class="h-12 w-12 mx-auto text-muted-foreground mb-4" />
				<h2 class="text-lg font-medium mb-2">No saved prompts yet</h2>
				<p class="text-sm text-muted-foreground mb-4">
					Your saved prompt maps will appear here.
				</p>
				<Button variant="outline" onclick={() => goto('/app')}>
					Go to Canvas
				</Button>
			</div>
		{:else if filteredPromptMaps.length === 0}
			<div class="text-center py-12">
				<Search class="h-12 w-12 mx-auto text-muted-foreground mb-4" />
				<h2 class="text-lg font-medium mb-2">No results found</h2>
				<p class="text-sm text-muted-foreground">
					Try a different search term
				</p>
			</div>
		{:else}
			<ul class="space-y-1">
				{#each filteredPromptMaps as promptMap, index (promptMap.id)}
					{#if index > 0}
						<li class="px-4">
							<div class="border-t border-border/40"></div>
						</li>
					{/if}
					<li class="group">
						<button
							onclick={() => loadPromptMap(promptMap.id)}
							disabled={isLoading === promptMap.id}
							class="w-full text-left px-4 py-3 hover:bg-accent/50 rounded-lg transition-colors flex items-start gap-3"
						>
							<FileText class="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2">
									<h3 class="font-medium truncate">{promptMap.name}</h3>
									{#if isLoading === promptMap.id}
										<Loader2 class="h-4 w-4 animate-spin text-muted-foreground" />
									{/if}
								</div>
								<p class="text-sm text-muted-foreground mt-0.5">
									{formatDate(promptMap.updatedAt)} · {promptMap.responseCount} response{promptMap.responseCount !== 1 ? 's' : ''}
								</p>
							</div>
							<Button
								variant="ghost"
								size="icon"
								class="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
								onclick={(e) => {
									e.stopPropagation();
									deleteId = promptMap.id;
								}}
							>
								<Trash2 class="h-4 w-4" />
							</Button>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>

<!-- Delete Confirmation Dialog -->
<Dialog.Root open={deleteId !== null} onOpenChange={(open) => !open && (deleteId = null)}>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Delete prompt map?</Dialog.Title>
			<Dialog.Description>
				This action cannot be undone. This will permanently delete this prompt map and all its responses.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (deleteId = null)}>Cancel</Button>
			<Button
				variant="destructive"
				onclick={deletePromptMap}
			>
				{#if isDeleting}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Delete
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
