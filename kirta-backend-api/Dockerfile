# syntax=docker/dockerfile:1

# =============================================================================
# Stage 1 - Build the Go binary
# =============================================================================
FROM golang:1.26-bookworm AS builder

WORKDIR /build

COPY go.mod go.sum ./
COPY vendor/     ./vendor/
COPY cmd/        ./cmd/
COPY internal/   ./internal/
COPY migrations/ ./migrations/
COPY docs/       ./docs/

RUN CGO_ENABLED=0 GOOS=linux \
    go build -mod=vendor -trimpath -ldflags="-s -w" \
    -o kirta-backend-api ./cmd/main.go

# =============================================================================
# Stage 2 - Runtime image
# =============================================================================
FROM debian:bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        python3 \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --system kirta \
    && useradd --system --gid kirta --no-create-home kirta

WORKDIR /app

COPY --from=builder /build/kirta-backend-api ./kirta-backend-api

COPY grype ./grype
COPY syft  ./syft

# graph.py imports tracer.py helper functions
COPY tracer.py ./tracer.py
COPY sca.py ./sca.py
COPY graph.py ./graph.py

COPY config.yaml ./config.yaml

RUN chmod +x /app/grype /app/syft \
    && chown -R kirta:kirta /app

USER kirta

EXPOSE 8080

ENTRYPOINT ["./kirta-backend-api"]
