package app

import (
	"context"
	"fmt"
	"io"
	"kirta-backend-api/internal/api"
	"kirta-backend-api/internal/api/routes"
	"kirta-backend-api/internal/config"
	"kirta-backend-api/internal/persistance/db"
	"kirta-backend-api/internal/service"
	"kirta-backend-api/internal/service/exploitability"
	"kirta-backend-api/internal/service/sca"
	"kirta-backend-api/internal/storage"
	"kirta-backend-api/migrations"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/golang-migrate/migrate/v4"
	pgxmigrate "github.com/golang-migrate/migrate/v4/database/pgx/v5"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/mast-se/go-lib/logger"
	miniocfg "github.com/mast-se/go-lib/minio"
	"github.com/mast-se/go-lib/postgres"
	httpserver "github.com/mast-se/go-lib/server/http"
	"github.com/minio/minio-go/v7"
)

type App struct {
	closer io.Closer
	s      *http.Server
}

type Runner interface {
	Run() error
	Shutdown(ctx context.Context) error
}

func (a *App) Run() error {
	if err := a.s.ListenAndServe(); err != nil {
		return err
	}
	return nil
}

func (a *App) Shutdown(ctx context.Context) error {
	_ = a.closer.Close()
	return a.s.Shutdown(ctx)
}

func runMigrations(pool *pgxpool.Pool) error {
	srcDriver, err := iofs.New(migrations.FS, "migrations")
	if err != nil {
		return fmt.Errorf("migrations source: %w", err)
	}
	sqlDB := stdlib.OpenDBFromPool(pool)
	dbDriver, err := pgxmigrate.WithInstance(sqlDB, &pgxmigrate.Config{})
	if err != nil {
		return fmt.Errorf("migrations db driver: %w", err)
	}
	m, err := migrate.NewWithInstance("iofs", srcDriver, "pgx5", dbDriver)
	if err != nil {
		return fmt.Errorf("migrate instance: %w", err)
	}
	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("migrate up: %w", err)
	}
	return nil
}

func New(ctx context.Context, cfg *config.Config) (Runner, error) {
	if err := validateOpenRouterConfig(cfg); err != nil {
		return nil, err
	}

	log, closer, err := logger.New(&cfg.Logger)
	if err != nil {
		return nil, err
	}
	pool, err := postgres.New(ctx, &cfg.Postgres)
	if err != nil {
		return nil, err
	}
	if err := runMigrations(pool); err != nil {
		return nil, fmt.Errorf("run migrations: %w", err)
	}

	s3Client, err := miniocfg.New(cfg.Minio)
	if err != nil {
		return nil, fmt.Errorf("minio client: %w", err)
	}
	exists, err := s3Client.BucketExists(ctx, cfg.App.BucketName)
	if err != nil {
		return nil, fmt.Errorf("check bucket: %w", err)
	}
	if !exists {
		if err := s3Client.MakeBucket(ctx, cfg.App.BucketName, minio.MakeBucketOptions{}); err != nil {
			return nil, fmt.Errorf("make bucket: %w", err)
		}
	}
	s3Store := storage.New(s3Client, cfg.App.BucketName)

	gin.SetMode(gin.ReleaseMode)
	g := gin.New()
	g.Use(api.RequestLogMiddleware(log), gin.Recovery())

	scanRepo := db.NewScanRepository(pool)

	scaScanner := sca.NewScanner(cfg.App.GrypePath, cfg.App.ScaPath, cfg.App.GraphPath)
	exploitabilityEnricher := exploitability.New(exploitability.Config{
		APIKey:       cfg.App.OpenRouterAPIKey,
		Model:        cfg.App.OpenRouterModel,
		BaseURL:      cfg.App.OpenRouterBaseURL,
		Timeout:      cfg.App.OpenRouterTimeout,
		CallMapFiles: cfg.App.OpenRouterCallMapFiles,
		CallMapCalls: cfg.App.OpenRouterCallMapCalls,
	})
	scanner := service.NewScanner(scaScanner, cfg.App.SyftPath, scanRepo, s3Store, exploitabilityEnricher)

	scanApiHandler := api.NewScanHandler(log, scanner)

	routes.RegisterGinRoutes(g, scanApiHandler)

	server := httpserver.NewHTTPServer(ctx, cfg.Http, g)
	return &App{
		closer: closer,
		s:      server,
	}, nil
}

func validateOpenRouterConfig(cfg *config.Config) error {
	if strings.TrimSpace(cfg.App.OpenRouterAPIKey) == "" {
		return fmt.Errorf("app.openrouter_api_key is required")
	}
	if strings.TrimSpace(cfg.App.OpenRouterModel) == "" {
		return fmt.Errorf("app.openrouter_model is required")
	}
	return nil
}
