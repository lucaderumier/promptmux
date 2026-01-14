import type { Session, User } from '@supabase/supabase-js';

export interface AuthState {
	isLoading: boolean;
	user: User | null;
	session: Session | null;
	error: string | null;
}

export type AuthMode = 'signin' | 'signup' | 'forgot-password';

export interface AuthFormData {
	email: string;
	password: string;
}
