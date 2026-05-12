package routes

import (
	"kirta-backend-api/internal/api"
	"net/http"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

var apiVersionV1 = "/v1"

func RegisterGinRoutes(router *gin.Engine, handler *api.ScanHandler) {
	// CORS первым
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	v1 := router.Group(apiVersionV1)
	{
		// Явный handler для preflight-запросов
		v1.OPTIONS("/*path", func(c *gin.Context) {
			c.Status(http.StatusNoContent)
		})

		v1.POST("/scan", handler.StartScanScan)
		v1.GET("/scans", handler.GetScansBaseList)
		v1.GET("/scans/:id", handler.GetScanByID)
		v1.POST("/scans/:id/findings/:finding_id/explanation", handler.ExplainScanFinding)
		v1.GET("/scans/:id/graphs", handler.GetScanGraphByLibrary)
		v1.GET("/scans/:id/files/*filepath", handler.GetScanFile)
	}
}
