<script lang="ts">
	import { goto } from '$app/navigation';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import { FormAuth, ButtonsOAuth, type AuthMode } from '$lib/services/auth';

	let { data } = $props();

	// Redirect to app if already authenticated
	$effect(() => {
		if (data.session) {
			goto('/app');
		}
	});

	let authMode = $state<AuthMode>('signin');

	function handleAuthSuccess() {
		goto('/app');
	}
</script>

<main class="min-h-screen bg-background flex items-center justify-center p-4">
	<Card class="w-full max-w-md">
		<CardHeader class="text-center">
			<CardTitle>
				{#if authMode === 'signin'}
					Welcome back
				{:else if authMode === 'signup'}
					Create an account
				{:else}
					Reset password
				{/if}
			</CardTitle>
			<CardDescription>
				{#if authMode === 'signin'}
					Sign in to access your saved prompts
				{:else if authMode === 'signup'}
					Get started with PromptMux
				{:else}
					We'll send you a reset link
				{/if}
			</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			{#if authMode !== 'forgot-password'}
				<ButtonsOAuth supabase={data.supabase} />

				<div class="relative">
					<div class="absolute inset-0 flex items-center">
						<Separator class="w-full" />
					</div>
					<div class="relative flex justify-center text-xs uppercase">
						<span class="bg-card px-2 text-muted-foreground">Or continue with email</span>
					</div>
				</div>
			{/if}

			<FormAuth
				supabase={data.supabase}
				mode={authMode}
				onModeChange={(mode) => (authMode = mode)}
				onSuccess={handleAuthSuccess}
			/>
		</CardContent>
	</Card>
</main>
