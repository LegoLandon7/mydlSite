CREATE TABLE IF NOT EXISTS levels (
    level_id INTEGER PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    position INTEGER UNIQUE NOT NULL,
    link TEXT NOT NULL,
    thumbnail TEXT,
    description TEXT
);

CREATE TABLE IF NOT EXISTS users (
    discord_id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    avatar_url TEXT,
    description TEXT CHECK(length(description) <= 500)
);

CREATE TABLE IF NOT EXISTS groups (
    group_id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT CHECK(length(description) <= 500),
    discord_link TEXT,
    video_required INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (owner_id) REFERENCES users(discord_id)
);

CREATE TABLE IF NOT EXISTS group_members (
    group_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('admin', 'member')),
    join_status TEXT NOT NULL DEFAULT 'pending' CHECK(join_status IN ('pending', 'approved')),
    joined_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY(group_id, user_id),
    FOREIGN KEY (group_id) REFERENCES groups(group_id),
    FOREIGN KEY (user_id) REFERENCES users(discord_id)
);

CREATE TABLE IF NOT EXISTS group_list (
    group_id INTEGER NOT NULL,
    level_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    PRIMARY KEY(group_id, level_id),
    FOREIGN KEY (group_id) REFERENCES groups(group_id),
    FOREIGN KEY (level_id) REFERENCES levels(level_id)
);

CREATE TABLE IF NOT EXISTS submissions (
    submission_id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL,
    level_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    record INTEGER NOT NULL CHECK(record >= 1 AND record <= 100),
    video_link TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected')),
    submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
    reviewed_at TEXT,
    FOREIGN KEY (group_id) REFERENCES groups(group_id),
    FOREIGN KEY (level_id) REFERENCES levels(level_id),
    FOREIGN KEY (user_id) REFERENCES users(discord_id)
);

CREATE TABLE IF NOT EXISTS notifications (
    notif_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('submission_accepted', 'submission_rejected', 'join_request', 'join_approved', 'join_denied')),
    group_id INTEGER,
    submission_id INTEGER,
    read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(discord_id),
    FOREIGN KEY (group_id) REFERENCES groups(group_id),
    FOREIGN KEY (submission_id) REFERENCES submissions(submission_id)
);

CREATE TABLE IF NOT EXISTS user_list (
    user_id TEXT NOT NULL,
    level_id INTEGER NOT NULL,
    video_link TEXT,
    record INTEGER NOT NULL DEFAULT 100 CHECK(record >= 1 AND record <= 100),
    PRIMARY KEY(user_id, level_id),
    FOREIGN KEY (user_id) REFERENCES users(discord_id),
    FOREIGN KEY (level_id) REFERENCES levels(level_id)
);