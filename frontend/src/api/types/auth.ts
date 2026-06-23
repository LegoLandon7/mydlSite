import type { User } from './users'

export type AuthState = {
    user: User | null;
    loading: boolean;
    initialized: boolean;

    loadUser: () => Promise<void>;
    logout: () => Promise<void>;
};