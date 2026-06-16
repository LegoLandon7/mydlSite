import type { apiUserType, UserType, UserListType } from "../util/types";

const API_URL = import.meta.env.VITE_API_URL;
const API_ENDPOINT = `${API_URL}/users`

interface CacheEntry<T> {data: T; timestamp: number;}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const usersCache = new Map<number, CacheEntry<apiUserType>>();
const userListCache = new Map<string, CacheEntry<UserListType>>();

function isExpired(entry: CacheEntry<unknown>): boolean {
    return Date.now() - entry.timestamp > CACHE_TTL;
}

export function getUsersCache(page: number): apiUserType | null {
    const entry = usersCache.get(page);
    if (!entry || isExpired(entry)) return null;
    return entry.data;
}

export function setUsersCache(page: number, data: apiUserType) {
    usersCache.set(page, { data, timestamp: Date.now() });
}

export function getUserListCache(discord_id: string): UserListType | null {
    const entry = userListCache.get(discord_id);
    if (!entry || isExpired(entry)) return null;
    return entry.data;
}

export function setUserListCache(discord_id: string, data: UserListType) {
    userListCache.set(discord_id, { data, timestamp: Date.now() });
}

export async function fetchUsers(page: number): Promise<apiUserType> {
    const cached = getUsersCache(page);
    if (cached) return cached;

    const res = await fetch(`${API_ENDPOINT}?page=${page}`);
    const data: apiUserType = await res.json();
    setUsersCache(page, data);
    return data;
}

export async function searchUsers(q: string): Promise<UserType[]> {
    const res = await fetch(`${API_ENDPOINT}/search?q=${encodeURIComponent(q)}`);
    const data: UserType[] = await res.json();
    return data;
}