import { API_URL } from '../../global'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { User, UserResponse, UserDetails } from '../../types/users'

const PAGE_LIMIT = 20;
const MAX_CACHED_PAGES = 10;
const MAX_CACHED_USERS = 10;
const CACHE_TIME = 10 * 60 * 1000; // 10 minutes

type CachedPage = {
    total: number;
    users: User[];
    fetchedAt: number;
};

type CachedUserDetails = {
    details: UserDetails;
    fetchedAt: number;
};

type UsersState = {
    // page cache: key = offset (0, 20, 40, ...)
    pages: Record<number, CachedPage>;
    pageOrder: number[]; // LRU order of offsets

    // individual user details cache: key = discord_id
    userDetails: Record<string, CachedUserDetails>;
    userOrder: string[]; // LRU order of discord_ids

    loadingPage: boolean;
    loadingUser: boolean;

    // actions
    loadPage: (offset?: number, force?: boolean) => Promise<UserResponse>;
    loadUserDetails: (discord_id: string, force?: boolean) => Promise<UserDetails>;
    getPage: (offset: number) => CachedPage | null;
    getUserDetails: (discord_id: string) => UserDetails | null;
};

function evictLRU<T>(
    cache: Record<string | number, T>,
    order: (string | number)[],
    maxSize: number
): { cache: Record<string | number, T>; order: (string | number)[] } {
    if (order.length <= maxSize) return { cache, order };

    const toEvict = order.slice(0, order.length - maxSize);
    const newCache = { ...cache };
    toEvict.forEach((key) => delete newCache[key]);
    return { cache: newCache, order: order.slice(order.length - maxSize) };
}

export const useUsers = create<UsersState>()(
    persist(
        (set, get) => ({
            pages: {},
            pageOrder: [],
            userDetails: {},
            userOrder: [],
            loadingPage: false,
            loadingUser: false,

            getPage: (offset: number) => {
                const cached = get().pages[offset];
                if (!cached) return null;
                if (Date.now() - cached.fetchedAt > CACHE_TIME) return null;
                return cached;
            },

            getUserDetails: (discord_id: string) => {
                const cached = get().userDetails[discord_id];
                if (!cached) return null;
                if (Date.now() - cached.fetchedAt > CACHE_TIME) return null;
                return cached.details;
            },

            loadPage: async (offset = 0, force = false) => {
                const { getPage, loadingPage } = get();
                if (loadingPage) return Promise.reject("Already loading");

                const cached = getPage(offset);
                if (!force && cached) {
                    return { total: cached.total, limit: PAGE_LIMIT, offset, users: cached.users };
                }

                set({ loadingPage: true });
                try {
                    const res = await fetch(`${API_URL}/users/?limit=${PAGE_LIMIT}&offset=${offset}`);
                    if (!res.ok) throw new Error("Failed to fetch users");

                    const data: UserResponse = await res.json();

                    set((state) => {
                        const newOrder = [
                            ...state.pageOrder.filter((o) => o !== offset),
                            offset,
                        ];

                        const { cache: evictedPages, order: evictedOrder } = evictLRU(
                            { ...state.pages, [offset]: { total: data.total, users: data.users, fetchedAt: Date.now() } },
                            newOrder,
                            MAX_CACHED_PAGES
                        );

                        return {
                            pages: evictedPages as Record<number, CachedPage>,
                            pageOrder: evictedOrder as number[],
                            loadingPage: false,
                        };
                    });

                    return data;
                } catch (err) {
                    set({ loadingPage: false });
                    throw err;
                }
            },

            loadUserDetails: async (discord_id: string, force = false) => {
                const { getUserDetails, loadingUser } = get();
                if (loadingUser) return Promise.reject("Already loading");

                const cached = getUserDetails(discord_id);
                if (!force && cached) return cached;

                set({ loadingUser: true });
                try {
                    const res = await fetch(`${API_URL}/users/${discord_id}/details`);
                    if (!res.ok) throw new Error("Failed to fetch user details");

                    const details: UserDetails = await res.json();

                    set((state) => {
                        const newOrder = [
                            ...state.userOrder.filter((id) => id !== discord_id),
                            discord_id,
                        ];

                        const { cache: evictedUsers, order: evictedOrder } = evictLRU(
                            { ...state.userDetails, [discord_id]: { details, fetchedAt: Date.now() } },
                            newOrder,
                            MAX_CACHED_USERS
                        );

                        return {
                            userDetails: evictedUsers as Record<string, CachedUserDetails>,
                            userOrder: evictedOrder as string[],
                            loadingUser: false,
                        };
                    });

                    return details;
                } catch (err) {
                    set({ loadingUser: false });
                    throw err;
                }
            },
        }),
        {
            name: 'users-cache',
            partialize: (state) => ({
                pages: state.pages,
                pageOrder: state.pageOrder,
                userDetails: state.userDetails,
                userOrder: state.userOrder,
            }),
        }
    )
);