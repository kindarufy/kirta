package storage

import (
	"context"
	"io"

	"github.com/minio/minio-go/v7"
)

type S3Storage struct {
	client *minio.Client
	bucket string
}

func New(client *minio.Client, bucket string) *S3Storage {
	return &S3Storage{
		client: client,
		bucket: bucket,
	}
}

func (s *S3Storage) UploadFile(ctx context.Context, objectKey, filePath string) error {
	_, err := s.client.FPutObject(ctx, s.bucket, objectKey, filePath, minio.PutObjectOptions{})
	return err
}

func (s *S3Storage) GetFile(ctx context.Context, objectKey string) (io.ReadCloser, int64, error) {
	obj, err := s.client.GetObject(ctx, s.bucket, objectKey, minio.GetObjectOptions{})
	if err != nil {
		return nil, 0, err
	}
	info, err := obj.Stat()
	if err != nil {
		_ = obj.Close()
		return nil, 0, err
	}
	return obj, info.Size, nil
}
