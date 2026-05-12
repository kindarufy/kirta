package domain

type ScaFinding struct {
	ID           int      `json:"id"`
	Package      string   `json:"package"`
	Version      string   `json:"version"`
	Severity     string   `json:"severity"`
	State        string   `json:"state"`
	FixedVersion []string `json:"fixed_version"`
	Cve          []string `json:"cve"`
	Description  string   `json:"description"`
	Exploitable  string   `json:"exploitable"`
	Explanation  string   `json:"explanation"`
}

const (
	ExploitableStatusExploitable    = "exploitable"
	ExploitableStatusNotExploitable = "not_exploitable"
	ExploitableStatusUnknown        = "unknown"
)

type Graph struct {
	ID      int64     `json:"id,omitempty"`
	ScanID  int64     `json:"scan_id,omitempty"`
	Package string    `json:"package"`
	Version string    `json:"version"`
	CallMap []CallMap `json:"call_map"`
}

type CallMap struct {
	File  string     `json:"file"`
	Lines []int      `json:"lines"`
	Calls []CallItem `json:"calls"`
}

type CallItem struct {
	Line       int    `json:"line"`
	Caller     string `json:"caller"`
	CallMethod string `json:"call_method"`
	Resolved   string `json:"resolved"`
	Source     string `json:"source"`
	ArgsCount  int    `json:"args_count"`
}
