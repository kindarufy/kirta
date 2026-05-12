package svcerrs

import (
	"errors"
	"fmt"
)

var (
	ErrFileTooLarge       = errors.New("file too large")
	ErrLangIsNotSupported = errors.New("scan for language is not supported")
	ErrFindingNotFound    = errors.New("sca finding not found")
)

type FileValidationErr struct {
	FileName string
	Size     int64
	Err      error
}

type LangErr struct {
	TargetLang string
	Err        error
}

func (e LangErr) Error() string {
	return fmt.Sprintf("lang error: %s (%s)", e.Err.Error(), e.TargetLang)
}

func NewLangErr(targetLang string, err error) error {
	return LangErr{
		TargetLang: targetLang,
		Err:        err,
	}
}
func (f FileValidationErr) Error() string {
	return fmt.Sprintf("file validation error: file=%s size=%d error=%s", f.FileName, f.Size, f.Err.Error())
}

func NewFileValidationErr(fileName string, size int64, err error) FileValidationErr {
	return FileValidationErr{
		FileName: fileName,
		Size:     size,
		Err:      err,
	}
}
