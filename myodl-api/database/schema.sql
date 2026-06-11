CREATE TABLE IF NOT EXISTS users (
    discord_id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    avatar_url TEXT
);

CREATE TABLE IF NOT EXISTS levels (
    level_id INTEGER PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    position INTEGER UNIQUE NOT NULL,
    link TEXT NOT NULL,
    description TEXT
);