CREATE TABLE scores_next (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 12),
  score INTEGER NOT NULL CHECK(score BETWEEN 0 AND 2250),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT INTO scores_next (id, name, score, created_at)
SELECT id, name, score, created_at
FROM scores;

DROP TABLE scores;
ALTER TABLE scores_next RENAME TO scores;

CREATE INDEX idx_scores_leaderboard
ON scores(score DESC, created_at ASC, id ASC);
