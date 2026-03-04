-- Adds created_at and supporting indexes for filtered/paginated trade queries.
-- Safe to run multiple times only if adjusted by your MySQL version;
-- test in staging before production.

ALTER TABLE trades
    ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX idx_trades_created_at ON trades (created_at);
CREATE INDEX idx_trades_pair_created_at ON trades (pair, created_at);
