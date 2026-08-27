CREATE TABLE IF NOT EXISTS saves (
  id         TEXT PRIMARY KEY,
  name       TEXT    NOT NULL,
  seed       INTEGER NOT NULL,
  payload    TEXT    NOT NULL,
  matches    INTEGER NOT NULL,
  picks      INTEGER NOT NULL,
  token      TEXT    NOT NULL,
  ip_hash    TEXT    NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS saves_created_at ON saves (created_at DESC);
CREATE INDEX IF NOT EXISTS saves_ip_hash    ON saves (ip_hash, created_at);
