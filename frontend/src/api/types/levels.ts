export type Level = {
    level_id: number;
    name: string;
    position: number;
    aredl_url: string;
    thumbnail_url: string | null;
    description: string | null;
}

export type LevelsState = {
    levels: Level[];
    loading: boolean;
    lastFetched: number | null;

    loadLevels: (force?: boolean) => Promise<void>;
};

// CREATE TABLE IF NOT EXISTS levels (
//     level_id INTEGER PRIMARY KEY,
//     name TEXT NOT NULL,
//     position INTEGER UNIQUE NOT NULL,
//     aredl_url TEXT,
//     thumbnail_url TEXT,
//     description TEXT
// );