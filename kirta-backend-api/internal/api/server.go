package api

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	httpserver "github.com/mast-se/go-lib/server/http"
)

func NewServer(ctx context.Context, g *gin.Engine, cfg httpserver.Config) *http.Server {
	s := httpserver.NewHTTPServer(ctx, cfg, g)
	return s
}
