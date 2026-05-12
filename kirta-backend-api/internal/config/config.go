package config

import (
	"os"
	"time"

	"github.com/mast-se/go-lib/logger"
	"github.com/mast-se/go-lib/minio"
	"github.com/mast-se/go-lib/postgres"
	httpserver "github.com/mast-se/go-lib/server/http"
	"go.yaml.in/yaml/v3"
)

type Config struct {
	Postgres postgres.Config   `yaml:"postgres"`
	Minio    minio.Config      `yaml:"minio"`
	Logger   logger.Config     `yaml:"logger"`
	Http     httpserver.Config `yaml:"http"`
	App      App               `yaml:"app"`
}

type App struct {
	GrypePath              string        `yaml:"grype_path"`
	SyftPath               string        `yaml:"syft_path"`
	ScaPath                string        `yaml:"sca_path"`
	GraphPath              string        `yaml:"graph_path"`
	BucketName             string        `yaml:"bucket_name"`
	OpenRouterAPIKey       string        `yaml:"openrouter_api_key"`
	OpenRouterModel        string        `yaml:"openrouter_model"`
	OpenRouterBaseURL      string        `yaml:"openrouter_base_url"`
	OpenRouterTimeout      time.Duration `yaml:"openrouter_timeout"`
	OpenRouterCallMapFiles int           `yaml:"openrouter_callmap_max_files"`
	OpenRouterCallMapCalls int           `yaml:"openrouter_callmap_max_calls"`
}

func New(configPath string) (*Config, error) {

	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil, err
	}

	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, err
	}
	applyDefaults(&cfg)
	return &cfg, nil
}

func applyDefaults(cfg *Config) {
	if cfg.App.OpenRouterBaseURL == "" {
		cfg.App.OpenRouterBaseURL = "https://openrouter.ai/api/v1"
	}
	if cfg.App.OpenRouterTimeout <= 0 {
		cfg.App.OpenRouterTimeout = 20 * time.Second
	}
	if cfg.App.OpenRouterCallMapFiles <= 0 {
		cfg.App.OpenRouterCallMapFiles = 20
	}
	if cfg.App.OpenRouterCallMapCalls <= 0 {
		cfg.App.OpenRouterCallMapCalls = 200
	}
}
