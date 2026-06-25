import type { Level } from './levels';
import type { List } from './lists';

export type User = {
    discord_id: string;
    username: string;
    avatar_url?: string;
    description?: string;
};

export type UserResponse = {
    total: number;
    limit: number;
    offset: number;
    users: User[];
};

export type UserLevelEntry = {
    level: Level;
    video_url?: string;
    record: number;
};

export type UserLevels = {
    user: User;
    levels: UserLevelEntry[];
};

export type UserRecord = {
    level: Level;
    record: number;
};

export type UserRecords = {
    user: User;
    records: UserRecord[];
};

export type UserLists = {
    user: User;
    lists: List[];
};

export type UserAdmin = {
    user: User;
    admin: boolean;
    owner: boolean;
};

export type UserAdmins = {
    count: number;
    admins: UserAdmin[];
};

export type UserDetails = {
    user: User;
    levels: UserLevelEntry[];
    records: UserRecord[];
    lists: List[];
    admin: boolean;
    owner: boolean;
};