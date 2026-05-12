CREATE TABLE IF NOT EXISTS kirta.scans (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_name TEXT NOT NULL,
    sloc BIGINT NOT NULL,
    status TEXT NOT NULL,
    sha256 TEXT NOT NULL,
    manifest BYTEA,
    libs JSONB,
    languages JSONB,
    sca JSONB,

    created_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ
)