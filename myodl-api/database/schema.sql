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

CREATE TABLE IF NOT EXISTS user_levels (
    user_id TEXT NOT NULL,
    level_id INTEGER NOT NULL,
    video_link TEXT,
    PRIMARY KEY(user_id, level_id),
    FOREIGN KEY (user_id) REFERENCES users(discord_id),
    FOREIGN KEY (level_id) REFERENCES levels(level_id)
);