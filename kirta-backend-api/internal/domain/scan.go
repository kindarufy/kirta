package domain

import "time"

type ScaReport []ScaFinding

type ScanInfo struct {
	ID         int64       `json:"id"`
	Repository string      `json:"repository"`
	Status     string      `json:"status"`
	Manifest   []byte      `json:"manifest"`
	SHA256     string      `json:"sha256"`
	TotalSLOC  int         `json:"sloc"`
	Langs      []Langs     `json:"langs"`
	Libraries  []Libraries `json:"libraries"`
	ScaReport  ScaReport   `json:"sca_report"`

	CreatedAt  time.Time `json:"created_at"`
	FinishedAt time.Time `json:"finished_at"`
}

type ScanBaseInfo struct {
	ID         int64     `json:"id"`
	Repository string    `json:"repository"`
	Status     string    `json:"status"`
	TotalSLOC  int       `json:"sloc"`
	SHA256     string    `json:"sha256"`
	CreatedAt  time.Time `json:"created_at"`
	FinishedAt time.Time `json:"finished_at"`
}

type Langs struct {
	Lang string `json:"lang"`
	Sloc int    `json:"sloc"`
}
type Libraries struct {
	Package string `json:"package"`
	Version string `json:"version"`
}
