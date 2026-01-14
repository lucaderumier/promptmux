<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuSeparator,
		DropdownMenuTrigger
	} from '$lib/components/ui/dropdown-menu';
	import { Avatar, AvatarFallback } from '$lib/components/ui/avatar';
	import { authHandlers } from '$lib/services/auth';
	import type { SupabaseClient, User } from '@supabase/supabase-js';
	import { goto } from '$app/navigation';

	interface Props {
		user: User | null;
		supabase: SupabaseClient;
	}

	let { user, supabase }: Props = $props();

	const initials = $derived(
		user?.email
			?.split('@')[0]
			.slice(0, 2)
			.toUpperCase() || '??'
	);

	async function handleSignOut() {
		await authHandlers.signOut(supabase);
		goto('/');
	}
</script>

<header class="h-14 border-b bg-card flex items-center justify-between px-4">
	<div class="flex items-center gap-4">
		<!-- Page title or breadcrumb can go here -->
	</div>

	<div class="flex items-center gap-2">
		{#if user}
			<DropdownMenu>
				<DropdownMenuTrigger>
					<Button variant="ghost" class="relative h-8 w-8 rounded-full">
						<Avatar class="h-8 w-8">
							<AvatarFallback class="text-xs">{initials}</AvatarFallback>
						</Avatar>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" class="w-56">
					<div class="flex items-center justify-start gap-2 p-2">
						<div class="flex flex-col space-y-1">
							<p class="text-sm font-medium">{user.email}</p>
						</div>
					</div>
					<DropdownMenuSeparator />
					<DropdownMenuItem onSelect={() => goto('/app/settings')}>
						<span class="mr-2">⚙️</span>
						Settings
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem onSelect={handleSignOut}>
						<span class="mr-2">🚪</span>
						Sign out
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		{/if}
	</div>
</header>
