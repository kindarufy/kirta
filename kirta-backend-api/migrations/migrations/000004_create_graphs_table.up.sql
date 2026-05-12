CREATE TABLE IF NOT EXISTS kirta.graphs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    scan_id BIGINT NOT NULL REFERENCES kirta.scans(id) ON DELETE CASCADE,
    package TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT '',
    call_map JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (scan_id, package, version)
);

CREATE INDEX IF NOT EXISTS idx_graphs_scan_id ON kirta.graphs(scan_id);
