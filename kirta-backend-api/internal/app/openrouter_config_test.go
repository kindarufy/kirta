package app

import (
	"kirta-backend-api/internal/config"
	"testing"
)

func TestValidateOpenRouterConfig(t *testing.T) {
	cfg := &config.Config{}
	cfg.App.OpenRouterAPIKey = "key"
	cfg.App.OpenRouterModel = "openrouter/free"

	if err := validateOpenRouterConfig(cfg); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestValidateOpenRouterConfig_MissingFields(t *testing.T) {
	cfg := &config.Config{}
	cfg.App.OpenRouterModel = "openrouter/free"
	if err := validateOpenRouterConfig(cfg); err == nil {
		t.Fatalf("expected missing key error")
	}

	cfg = &config.Config{}
	cfg.App.OpenRouterAPIKey = "key"
	if err := validateOpenRouterConfig(cfg); err == nil {
		t.Fatalf("expected missing model error")
	}
}
