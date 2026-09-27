CREATE TABLE users (id TEXT PRIMARY KEY, handle TEXT NOT NULL, name TEXT NOT NULL, avatar_url TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE scores (user_id TEXT NOT NULL REFERENCES users(id), level_id TEXT NOT NULL, score INTEGER NOT NULL, stars INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL, PRIMARY KEY (user_id, level_id));
CREATE INDEX scores_level_score ON scores(level_id, score DESC);
