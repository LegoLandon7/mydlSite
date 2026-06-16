export type LevelType = {
    level_id: number;
    name: string;
    position: number;
    link: string;
    thumbnail: string | null;
    description: string | null;
};

export type UserType = {
    discord_id: string;
    username:string;
    avatar_url: string | null;
    description: string | null;
}

export type UserListType = {
    discord_id: string;
    level_id: number;
    video_link: string;
    record: number;
}

export type apiUserType = {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
    users: UserType[];
}

/*  CREATE TABLE IF NOT EXISTS user_list (
    user_id TEXT NOT NULL,
    level_id INTEGER NOT NULL,
    video_link TEXT,
    record INTEGER NOT NULL DEFAULT 100 CHECK(record >= 1 AND record <= 100),
    PRIMARY KEY(user_id, level_id),
    FOREIGN KEY (user_id) REFERENCES users(discord_id),
    FOREIGN KEY (level_id) REFERENCES levels(level_id)

            "page":        page,
        "per_page":    50,
        "total":       total,
        "total_pages": -(-total // 50),
        "users":       [dict(row) for row in rows]
); */
