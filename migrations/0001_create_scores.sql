CREATE TABLE scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 12),
  score INTEGER NOT NULL CHECK(score BETWEEN 0 AND 13),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_scores_leaderboard
ON scores(score DESC, created_at ASC, id ASC);
