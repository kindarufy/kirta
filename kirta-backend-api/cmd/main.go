package main

import (
	"context"
	_ "kirta-backend-api/docs"
	"kirta-backend-api/internal/app"
	"kirta-backend-api/internal/config"
	"log"
	"os/signal"
	"syscall"
	"time"
)

// @title           Kirta Backend API
// @version         1.0
// @description     SCA (Software Composition Analysis) scan service — detects vulnerable dependencies and traces call-map usage in Python projects.
// @host            localhost:8080
// @BasePath        /
// @schemes         http https
func main() {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	cfgPath := "config.yaml"
	cfg, err := config.New(cfgPath)
	if err != nil {
		log.Fatal(err)
	}

	runner, err := app.New(ctx, cfg)
	if err != nil {
		log.Fatal(err)
	}
	go func() {
		runner.Run()
	}()

	<-ctx.Done()

	shutdownCtx, stop := context.WithTimeout(context.Background(), 15*time.Second)
	defer stop()
	if err := runner.Shutdown(shutdownCtx); err != nil {
		log.Fatal(err)
	}
}
