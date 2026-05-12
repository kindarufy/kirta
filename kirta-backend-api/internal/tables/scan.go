package tables

import "time"

type Scan struct {
	ID          int64      `db:"id"`
	ProjectName string     `db:"project_name"`
	SLOC        int64      `db:"sloc"`
	SHA256      string     `db:"sha256"`
	Manifest    []byte     `db:"manifest"`
	Libs        []byte     `db:"libs"`
	Languages   []byte     `db:"languages"`
	SCA         []byte     `db:"sca"`
	CreatedAt   time.Time  `db:"created_at"`
	FinishedAt  *time.Time `db:"finished_at"`
}
