<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import type { AuthMode } from '../types/authTypes';
	import { authHandlers } from '../stores/authStore';
	import type { SupabaseClient } from '@supabase/supabase-js';

	interface Props {
		supabase: SupabaseClient;
		mode?: AuthMode;
		onModeChange?: (mode: AuthMode) => void;
		onSuccess?: () => void;
	}

	let { supabase, mode = 'signin', onModeChange, onSuccess }: Props = $props();

	let email = $state('');
	let password = $state('');
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let successMessage = $state<string | null>(null);

	const isSignUp = $derived(mode === 'signup');
	const isForgotPassword = $derived(mode === 'forgot-password');

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = null;
		successMessage = null;
		isLoading = true;

		try {
			if (isForgotPassword) {
				await authHandlers.resetPassword(supabase, email);
				successMessage = 'Check your email for a password reset link';
			} else if (isSignUp) {
				await authHandlers.signUpWithEmail(supabase, { email, password });
				successMessage = 'Check your email to confirm your account';
			} else {
				await authHandlers.signInWithEmail(supabase, { email, password });
				onSuccess?.();
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'An error occurred';
		} finally {
			isLoading = false;
		}
	}

	function switchMode(newMode: AuthMode) {
		error = null;
		successMessage = null;
		onModeChange?.(newMode);
	}
</script>

<form onsubmit={handleSubmit} class="space-y-4">
	<div class="space-y-2">
		<Label for="email">Email</Label>
		<Input
			id="email"
			type="email"
			placeholder="you@example.com"
			bind:value={email}
			required
			disabled={isLoading}
		/>
	</div>

	{#if !isForgotPassword}
		<div class="space-y-2">
			<Label for="password">Password</Label>
			<Input
				id="password"
				type="password"
				placeholder="••••••••"
				bind:value={password}
				required
				disabled={isLoading}
				minlength={6}
			/>
		</div>
	{/if}

	{#if error}
		<div class="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
			{error}
		</div>
	{/if}

	{#if successMessage}
		<div class="text-sm text-green-600 bg-green-500/10 p-3 rounded-md">
			{successMessage}
		</div>
	{/if}

	<Button type="submit" class="w-full" disabled={isLoading}>
		{#if isLoading}
			<span class="animate-spin mr-2">⏳</span>
		{/if}
		{#if isForgotPassword}
			Send Reset Link
		{:else if isSignUp}
			Create Account
		{:else}
			Sign In
		{/if}
	</Button>

	<div class="text-center text-sm text-muted-foreground space-y-2">
		{#if isForgotPassword}
			<button
				type="button"
				class="text-primary hover:underline"
				onclick={() => switchMode('signin')}
			>
				Back to sign in
			</button>
		{:else}
			<div>
				{#if isSignUp}
					Already have an account?
					<button
						type="button"
						class="text-primary hover:underline"
						onclick={() => switchMode('signin')}
					>
						Sign in
					</button>
				{:else}
					Don't have an account?
					<button
						type="button"
						class="text-primary hover:underline"
						onclick={() => switchMode('signup')}
					>
						Sign up
					</button>
				{/if}
			</div>
			{#if !isSignUp}
				<div>
					<button
						type="button"
						class="text-primary hover:underline"
						onclick={() => switchMode('forgot-password')}
					>
						Forgot your password?
					</button>
				</div>
			{/if}
		{/if}
	</div>
</form>
