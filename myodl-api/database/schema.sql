CREATE TABLE IF NOT EXISTS levels (
    level_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    position INTEGER UNIQUE NOT NULL,
    aredl_url TEXT,
    thumbnail_url TEXT,
    description TEXT
);

CREATE TABLE IF NOT EXISTS users (
    discord_id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    avatar_url TEXT,
    description TEXT CHECK(length(description) <= 500) DEFAULT ""
);

CREATE TABLE IF NOT EXISTS site_admins (
    discord_id TEXT PRIMARY KEY,
    owner BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (discord_id) REFERENCES users(discord_id)
);

CREATE TABLE IF NOT EXISTS user_levels (
    discord_id TEXT NOT NULL,
    level_id INTEGER NOT NULL,
    video_url TEXT,
    record INTEGER NOT NULL DEFAULT 100 CHECK(record >= 1 AND record <= 100),
    PRIMARY KEY(discord_id, level_id),
    FOREIGN KEY (discord_id) REFERENCES users(discord_id),
    FOREIGN KEY (level_id) REFERENCES levels(level_id)
);

CREATE TABLE IF NOT EXISTS user_records (
    discord_id TEXT NOT NULL REFERENCES users(discord_id),
    level_id INTEGER NOT NULL REFERENCES levels(level_id),
    record INTEGER NOT NULL DEFAULT 1 CHECK (record BETWEEN 1 AND 100),
    PRIMARY KEY (discord_id, level_id)
);

CREATE TABLE IF NOT EXISTS lists (
    list_id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_discord_id TEXT NOT NULL REFERENCES users(discord_id),
    name TEXT NOT NULL,
    description TEXT,
    community_url TEXT,
    icon_url TEXT,
    public BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS list_levels (
    list_id INTEGER NOT NULL REFERENCES lists(list_id),
    level_id INTEGER NOT NULL REFERENCES levels(level_id),
    position INTEGER DEFAULT 0,
    PRIMARY KEY(list_id, level_id)
);

CREATE TABLE IF NOT EXISTS list_members (
    list_id INTEGER NOT NULL REFERENCES lists(list_id),
    discord_id TEXT NOT NULL REFERENCES users(discord_id),
    role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('member', 'admin')),
    joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (list_id, discord_id)
);

CREATE TABLE IF NOT EXISTS list_records (
    list_id INTEGER NOT NULL REFERENCES lists(list_id),
    discord_id TEXT NOT NULL REFERENCES users(discord_id),
    level_id INTEGER NOT NULL REFERENCES levels(level_id),
    record INTEGER NOT NULL DEFAULT 1 CHECK (record BETWEEN 1 AND 100),
    PRIMARY KEY (list_id, discord_id, level_id)
);