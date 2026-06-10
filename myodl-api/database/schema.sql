CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    email TEXT,
    avatar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS levels (
    level_id INTEGER PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    position INTEGER UNIQUE NOT NULL,
    link TEXT NOT NULL,
    description TEXT
);