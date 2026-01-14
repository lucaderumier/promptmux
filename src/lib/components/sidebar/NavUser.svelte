<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { ChevronsUpDown, LogOut, User, Settings, Key } from '@lucide/svelte';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import { useSidebar } from '$lib/components/ui/sidebar';
	import { authHandlers } from '$lib/services/auth';
	import { cn } from '$lib/utils/cn';
	import type { SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';

	interface Props {
		user: SupabaseUser | null;
		supabase: SupabaseClient;
	}

	let { user, supabase }: Props = $props();

	const sidebar = useSidebar();

	const displayName = $derived(
		user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
	);

	const profilePicture = $derived(user?.user_metadata?.avatar_url || '');
	const email = $derived(user?.email || '');

	function getInitials(name: string): string {
		if (!name) return 'U';
		return name
			.split(' ')
			.map((word) => word[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}

	const initials = $derived(getInitials(displayName));

	const isProfileActive = $derived($page.url.pathname === '/app/profile');
	const isSettingsActive = $derived($page.url.pathname === '/app/settings');
	const isApiKeysActive = $derived($page.url.pathname === '/app/api-keys');

	async function handleLogout() {
		await authHandlers.signOut(supabase);
		goto('/');
	}

	function handleProfileClick() {
		goto('/app/profile');
	}

	function handleSettingsClick() {
		goto('/app/settings');
	}

	function handleApiKeysClick() {
		goto('/app/api-keys');
	}
</script>

<Sidebar.Menu>
	<Sidebar.MenuItem>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Sidebar.MenuButton
						{...props}
						size="lg"
						class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
					>
						<Avatar.Root class="h-8 w-8 rounded-lg">
							<Avatar.Image src={profilePicture} alt={displayName} />
							<Avatar.Fallback class="rounded-lg">{initials}</Avatar.Fallback>
						</Avatar.Root>
						<div class="grid flex-1 text-left text-sm leading-tight">
							<span class="truncate font-medium">{displayName}</span>
							<span class="truncate text-xs">{email}</span>
						</div>
						<ChevronsUpDown class="ml-auto size-4" />
					</Sidebar.MenuButton>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content
				class="w-[var(--bits-dropdown-menu-anchor-width)] min-w-56 rounded-lg"
				side={sidebar.isMobile ? 'bottom' : 'right'}
				align="end"
				sideOffset={4}
			>
				<DropdownMenu.Label class="p-0 font-normal">
					<div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
						<Avatar.Root class="h-8 w-8 rounded-lg">
							<Avatar.Image src={profilePicture} alt={displayName} />
							<Avatar.Fallback class="rounded-lg">{initials}</Avatar.Fallback>
						</Avatar.Root>
						<div class="grid flex-1 text-left text-sm leading-tight">
							<span class="truncate font-medium">{displayName}</span>
							<span class="truncate text-xs">{email}</span>
						</div>
					</div>
				</DropdownMenu.Label>
				<DropdownMenu.Separator />
				<DropdownMenu.Group>
					<DropdownMenu.Item
						onSelect={handleProfileClick}
						class={cn(
							'cursor-pointer gap-2 p-2',
							isProfileActive && 'bg-accent text-accent-foreground font-medium'
						)}
					>
						<User class="size-4" />
						Profile
					</DropdownMenu.Item>
					<DropdownMenu.Item
						onSelect={handleSettingsClick}
						class={cn(
							'cursor-pointer gap-2 p-2',
							isSettingsActive && 'bg-accent text-accent-foreground font-medium'
						)}
					>
						<Settings class="size-4" />
						Settings
					</DropdownMenu.Item>
					<DropdownMenu.Item
						onSelect={handleApiKeysClick}
						class={cn(
							'cursor-pointer gap-2 p-2',
							isApiKeysActive && 'bg-accent text-accent-foreground font-medium'
						)}
					>
						<Key class="size-4" />
						API Keys
					</DropdownMenu.Item>
				</DropdownMenu.Group>
				<DropdownMenu.Separator />
				<DropdownMenu.Item onSelect={handleLogout} class="logout-button cursor-pointer gap-2 p-2">
					<LogOut class="size-4" />
					Log out
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</Sidebar.MenuItem>
</Sidebar.Menu>

<style>
	:global(.logout-button svg) {
		color: hsl(var(--destructive)) !important;
	}

	:global(.logout-button:hover) {
		background-color: hsl(var(--destructive)) !important;
		color: white !important;
	}

	:global(.logout-button:hover svg) {
		color: white !important;
	}
</style>
