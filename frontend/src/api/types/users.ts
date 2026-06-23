import type { Level } from "./levels";
import type { List } from "./lists";

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
}

export type UserLevels = {
    user: User;
    levels: Level[]
}

export type UserRecord = {
    level: Level;
    record: number;
}

export type UserRecords = {
    user: User;
    records: UserRecord[];
}

export type UserLists = {
    user: User;
    lists: List[];
}

export type UserAdmin = {
    user: User;
    admin: boolean;
    owner: boolean;
}

export type UserAdmins = {
    count: number;
    admins: UserAdmin[];
}

export type UserDetails = {
    user: User;
    levels: Level[];
    records: UserRecord[];
    lists: List[];
    admin: boolean;
    owner: boolean;
}

// class User(BaseModel):
//     discord_id: str
//     username: str
//     avatar_url: str | None = None
//     description: str | None = None

// class UserResponse(BaseModel):
//     total: int
//     limit: int
//     offset: int
//     users: list[User]

// class UserLevels(BaseModel):
//     user: User
//     levels: list[Level]

// class UserRecord(BaseModel):
//     level: Level
//     record: int

// class UserRecords(BaseModel):
//     user: User
//     records: list[UserRecord]

// class UserAdmin(BaseModel):
//     user: User
//     admin: bool
//     owner: bool

// class UserAdmins(BaseModel):
//     count: int
//     admins: list[UserAdmin]

// class UserDetails(BaseModel):
//     user: User
//     levels: list[Level] | None = None
//     records: list[UserRecord] | None = None
//     admin: bool
//     owner: bool