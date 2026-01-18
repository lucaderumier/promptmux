<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import * as ContextMenu from '$lib/components/ui/context-menu';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { useSidebar } from '$lib/components/ui/sidebar';
	import { Brush, Library, Key, ChevronRight, FileText, Trash2, Pencil } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import type { ComponentProps } from 'svelte';
	import type { SupabaseClient, User } from '@supabase/supabase-js';
	import NavUser from './NavUser.svelte';
	import { canvasHandlers } from '$lib/services/canvas';

	interface RecentPromptMap {
		id: string;
		name: string;
		updatedAt: string;
	}

	interface Props extends ComponentProps<typeof Sidebar.Root> {
		user: User | null;
		supabase: SupabaseClient;
		recentPromptMaps?: RecentPromptMap[];
	}

	let { ref = $bindable(null), user, supabase, recentPromptMaps = [], ...restProps }: Props = $props();

	const sidebar = useSidebar();

	// Library collapsible state - open when on library or canvas with loaded map
	let libraryOpen = $state(true);

	function isActive(href: string): boolean {
		if (href === '/app') {
			return $page.url.pathname === '/app';
		}
		return $page.url.pathname.startsWith(href);
	}

	const isLibraryActive = $derived($page.url.pathname.startsWith('/app/library'));

	// Auto-close mobile sidebar on navigation
	let previousPathname = $state($page.url.pathname);

	$effect(() => {
		const currentPathname = $page.url.pathname;

		if (previousPathname !== currentPathname && sidebar.isMobile && sidebar.openMobile) {
			setTimeout(() => {
				sidebar.setOpenMobile(false);
			}, 100);
		}

		previousPathname = currentPathname;
	});

	async function loadPromptMap(id: string) {
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
		}
	}

	function truncateName(name: string, maxLength = 20): string {
		if (name.length <= maxLength) return name;
		return name.slice(0, maxLength) + '...';
	}

	async function deletePromptMap(id: string, name: string) {
		try {
			const response = await fetch(`/api/library/${id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				throw new Error('Failed to delete');
			}

			toast.success(`Deleted "${name}"`);
			// Refresh the sidebar data
			invalidateAll();
		} catch (error) {
			console.error('Failed to delete prompt map:', error);
			toast.error('Failed to delete prompt map');
		}
	}

	// Rename dialog state
	let renameDialogOpen = $state(false);
	let renameId = $state('');
	let renameName = $state('');
	let isRenaming = $state(false);

	function openRenameDialog(id: string, currentName: string) {
		renameId = id;
		renameName = currentName;
		renameDialogOpen = true;
	}

	async function handleRename() {
		if (!renameName.trim() || isRenaming) return;

		isRenaming = true;
		try {
			const response = await fetch(`/api/library/${renameId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: renameName.trim() })
			});

			if (!response.ok) {
				throw new Error('Failed to rename');
			}

			toast.success('Renamed successfully');
			renameDialogOpen = false;
			invalidateAll();
		} catch (error) {
			console.error('Failed to rename prompt map:', error);
			toast.error('Failed to rename');
		} finally {
			isRenaming = false;
		}
	}
</script>

<Sidebar.Root bind:ref variant="inset" {...restProps}>
	<Sidebar.Content class="pt-4">
		<!-- Prompts Section -->
		<Sidebar.Group>
			<Sidebar.GroupLabel>Prompts</Sidebar.GroupLabel>
			<Sidebar.Menu>
				<!-- Canvas -->
				<Sidebar.MenuItem>
					<Sidebar.MenuButton isActive={isActive('/app') && $page.url.pathname === '/app'}>
						{#snippet child({ props })}
							<a href="/app" {...props}>
								<Brush class="size-4" />
								<span>Canvas</span>
							</a>
						{/snippet}
						{#snippet tooltipContent()}
							Canvas
						{/snippet}
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>

				<!-- Library (Collapsible) -->
				<Collapsible.Root bind:open={libraryOpen} class="group/collapsible">
					<Sidebar.MenuItem>
						<Collapsible.Trigger class="w-full">
							{#snippet child({ props })}
								<Sidebar.MenuButton {...props} isActive={isLibraryActive}>
									<Library class="size-4" />
									<span>Library</span>
									<ChevronRight class="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
								</Sidebar.MenuButton>
							{/snippet}
						</Collapsible.Trigger>
						<Collapsible.Content>
							<ul class="ml-4 border-l border-sidebar-border pl-2 pt-1">
								{#if recentPromptMaps.length === 0}
									<li class="py-1.5 px-2 text-xs text-muted-foreground">
										No saved prompts yet
									</li>
								{:else}
									{#each recentPromptMaps as promptMap (promptMap.id)}
										<li>
											<ContextMenu.Root>
												<ContextMenu.Trigger class="w-full">
													<button
														onclick={() => loadPromptMap(promptMap.id)}
														class="flex w-full items-center gap-2 rounded-md py-1.5 px-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
													>
														<FileText class="size-3.5 shrink-0 text-muted-foreground" />
														<span class="truncate">{truncateName(promptMap.name)}</span>
													</button>
												</ContextMenu.Trigger>
												<ContextMenu.Content class="w-48">
													<ContextMenu.Item
														onclick={() => openRenameDialog(promptMap.id, promptMap.name)}
													>
														<Pencil class="mr-2 h-4 w-4" />
														Rename
													</ContextMenu.Item>
													<ContextMenu.Separator />
													<ContextMenu.Item
														class="text-destructive focus:text-destructive"
														onclick={() => deletePromptMap(promptMap.id, promptMap.name)}
													>
														<Trash2 class="mr-2 h-4 w-4 text-destructive" />
														Delete
													</ContextMenu.Item>
												</ContextMenu.Content>
											</ContextMenu.Root>
										</li>
									{/each}
									<li>
										<a
											href="/app/library"
											class="flex w-full items-center gap-2 rounded-md py-1.5 px-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
										>
											<span>View all...</span>
										</a>
									</li>
								{/if}
							</ul>
						</Collapsible.Content>
					</Sidebar.MenuItem>
				</Collapsible.Root>
			</Sidebar.Menu>
		</Sidebar.Group>

		<!-- Settings Section -->
		<Sidebar.Group>
			<Sidebar.GroupLabel>Settings</Sidebar.GroupLabel>
			<Sidebar.Menu>
				<Sidebar.MenuItem>
					<Sidebar.MenuButton isActive={isActive('/app/api-keys')}>
						{#snippet child({ props })}
							<a href="/app/api-keys" {...props}>
								<Key class="size-4" />
								<span>API Keys</span>
							</a>
						{/snippet}
						{#snippet tooltipContent()}
							API Keys
						{/snippet}
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
			</Sidebar.Menu>
		</Sidebar.Group>
	</Sidebar.Content>

	<Sidebar.Footer>
		<NavUser {user} {supabase} />
	</Sidebar.Footer>
</Sidebar.Root>

<!-- Rename Dialog -->
<Dialog.Root bind:open={renameDialogOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Rename</Dialog.Title>
			<Dialog.Description>Enter a new name for this prompt map.</Dialog.Description>
		</Dialog.Header>
		<form onsubmit={(e) => { e.preventDefault(); handleRename(); }}>
			<div class="py-4">
				<Input
					bind:value={renameName}
					placeholder="Enter name..."
					disabled={isRenaming}
				/>
			</div>
			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => renameDialogOpen = false}>
					Cancel
				</Button>
				<Button type="submit" disabled={!renameName.trim() || isRenaming}>
					{isRenaming ? 'Saving...' : 'Save'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
