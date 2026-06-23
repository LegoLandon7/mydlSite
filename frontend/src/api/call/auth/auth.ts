import { create } from "zustand";
import { API_URL } from "../../global";
import type { AuthState } from "../../types/auth";

async function fetchMe() {
    const res = await fetch(`${API_URL}/auth/me`, { credentials: "include" });

    if (!res.ok) {
        if (res.status === 401) return null;
        throw new Error("Failed to fetch user");
    }

    return res.json();
}

async function logoutRequest() {
    await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
    });
}

export const useAuth = create<AuthState>((set) => ({
    user: null,
    loading: false,
    initialized: false,

    loadUser: async () => {
        set({ loading: true });

        try {
            const user = await fetchMe();
            set({ user, initialized: true });
        } catch {
            set({ user: null, initialized: true });
        } finally {
            set({ loading: false });
        }
    },

    logout: async () => {
        await logoutRequest();
        set({ user: null });
    },
}));