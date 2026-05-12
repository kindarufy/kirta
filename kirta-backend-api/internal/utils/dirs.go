package utils

import "os"

func CreateSafetyTempDir() (string, error) {
	p, err := os.MkdirTemp("", "source-code-*")
	if err != nil {
		return "", err
	}
	return p, nil
}
