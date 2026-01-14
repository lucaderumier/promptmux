import { writable } from 'svelte/store';
import type { AuthState, AuthFormData } from '../types/authTypes';
import type { SupabaseClient } from '@supabase/supabase-js';
import { authLogger } from '$lib/utils/debugLogger';

const initialState: AuthState = {
	isLoading: true,
	user: null,
	session: null,
	error: null
};

export const authStore = writable<AuthState>(initialState);

export const authHandlers = {
	setLoading: (isLoading: boolean) => {
		authStore.update((state) => ({ ...state, isLoading }));
	},

	setError: (error: string | null) => {
		authStore.update((state) => ({ ...state, error, isLoading: false }));
	},

	signInWithEmail: async (supabase: SupabaseClient, data: AuthFormData) => {
		authStore.update((state) => ({ ...state, isLoading: true, error: null }));

		try {
			authLogger.log('Signing in with email:', data.email);
			const { error } = await supabase.auth.signInWithPassword({
				email: data.email,
				password: data.password
			});

			if (error) throw error;
			authLogger.log('Sign in successful');
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to sign in';
			authLogger.error('Sign in error:', message);
			authStore.update((state) => ({ ...state, error: message, isLoading: false }));
			throw error;
		}
	},

	signUpWithEmail: async (supabase: SupabaseClient, data: AuthFormData) => {
		authStore.update((state) => ({ ...state, isLoading: true, error: null }));

		try {
			authLogger.log('Signing up with email:', data.email);
			const { error } = await supabase.auth.signUp({
				email: data.email,
				password: data.password
			});

			if (error) throw error;
			authLogger.log('Sign up successful - check email for confirmation');
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to sign up';
			authLogger.error('Sign up error:', message);
			authStore.update((state) => ({ ...state, error: message, isLoading: false }));
			throw error;
		}
	},

	signInWithOAuth: async (supabase: SupabaseClient, provider: 'google' | 'github') => {
		authStore.update((state) => ({ ...state, isLoading: true, error: null }));

		try {
			authLogger.log('Signing in with OAuth:', provider);
			const { error } = await supabase.auth.signInWithOAuth({
				provider,
				options: {
					redirectTo: `${window.location.origin}/auth/callback`
				}
			});

			if (error) throw error;
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to sign in with OAuth';
			authLogger.error('OAuth error:', message);
			authStore.update((state) => ({ ...state, error: message, isLoading: false }));
			throw error;
		}
	},

	signOut: async (supabase: SupabaseClient) => {
		authStore.update((state) => ({ ...state, isLoading: true, error: null }));

		try {
			authLogger.log('Signing out');
			const { error } = await supabase.auth.signOut();
			if (error) throw error;
			authStore.set({ ...initialState, isLoading: false });
			authLogger.log('Sign out successful');
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to sign out';
			authLogger.error('Sign out error:', message);
			authStore.update((state) => ({ ...state, error: message, isLoading: false }));
			throw error;
		}
	},

	resetPassword: async (supabase: SupabaseClient, email: string) => {
		authStore.update((state) => ({ ...state, isLoading: true, error: null }));

		try {
			authLogger.log('Sending password reset email:', email);
			const { error } = await supabase.auth.resetPasswordForEmail(email, {
				redirectTo: `${window.location.origin}/auth/callback?type=recovery`
			});

			if (error) throw error;
			authLogger.log('Password reset email sent');
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to send reset email';
			authLogger.error('Password reset error:', message);
			authStore.update((state) => ({ ...state, error: message, isLoading: false }));
			throw error;
		}
	},

	updateFromSession: (session: AuthState['session'], user: AuthState['user']) => {
		authStore.update((state) => ({
			...state,
			session,
			user,
			isLoading: false,
			error: null
		}));
	}
};
