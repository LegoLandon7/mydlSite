import { API_URL } from '../../global'
import { create } from 'zustand'

import type { LevelsState } from '../../types/levels'
import { persist } from 'zustand/middleware';

const CACHE_TIME = 10 * 60 * 1000; // 10 minutes

export const useLevels = create<LevelsState>()(
    persist(
        (set, get) => ({
            levels: [],
            loading: false,
            lastFetched: null,

            loadLevels: async (force = false) => {
                const { lastFetched, loading } = get();

                if (loading) return;

                if (
                    !force &&
                    lastFetched &&
                    Date.now() - lastFetched < CACHE_TIME
                ) {
                    return;
                }

                set({ loading: true });

                try {
                    const res = await fetch(`${API_URL}/levels`);

                    if (!res.ok) {
                        throw new Error("Failed to fetch levels");
                    }

                    const levels = await res.json();

                    set({
                        levels,
                        lastFetched: Date.now(),
                        loading: false,
                    });
                } catch (err) {
                    set({ loading: false });
                    throw err;
                }
            },
        }),
        {
            name: "levels-cache",
            partialize: (state) => ({
                levels: state.levels,
                lastFetched: state.lastFetched,
            }),
        }
    )
);