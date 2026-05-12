package sca

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"kirta-backend-api/internal/domain"
	"os"
	"os/exec"
	"path/filepath"
)

type Scanner struct {
	grypePath string
	scaPath   string
	graphPath string
}

func NewScanner(grypePath, scaPath, graphPath string) *Scanner {
	return &Scanner{
		grypePath: grypePath,
		scaPath:   scaPath,
		graphPath: graphPath,
	}
}

type graphLibrary struct {
	Package string `json:"package"`
	Version string `json:"version"`
}

func (s *Scanner) StartSCA(
	ctx context.Context,
	pathToUnpackedDir,
	pathToSBOM string,
) ([]domain.ScaFinding, []domain.Graph, error) {
	scaReportFile := filepath.Join(filepath.Dir(pathToSBOM), "sca-report.json")

	grypeCmd := exec.CommandContext(ctx, s.grypePath, "sbom:"+pathToSBOM, "--output", "json")
	grypeCmd.Stderr = os.Stderr
	var grypeOut bytes.Buffer
	grypeCmd.Stdout = &grypeOut
	if err := grypeCmd.Run(); err != nil {
		return nil, nil, err
	}
	if err := os.WriteFile(scaReportFile, grypeOut.Bytes(), 0o644); err != nil {
		return nil, nil, err
	}

	scaData, err := runPythonScript(ctx, s.scaPath, "--sca", scaReportFile)
	if err != nil {
		return nil, nil, err
	}

	var findings []domain.ScaFinding
	if err := json.Unmarshal(scaData, &findings); err != nil {
		return nil, nil, err
	}

	libraries := make([]graphLibrary, 0, len(findings))
	seenLibraries := make(map[string]struct{}, len(findings))
	for _, finding := range findings {
		key := finding.Package + "\x00" + finding.Version
		if _, ok := seenLibraries[key]; ok {
			continue
		}
		seenLibraries[key] = struct{}{}
		libraries = append(libraries, graphLibrary{
			Package: finding.Package,
			Version: finding.Version,
		})
	}

	libsData, err := json.Marshal(libraries)
	if err != nil {
		return nil, nil, err
	}
	libsFile := filepath.Join(filepath.Dir(pathToSBOM), "sca-libraries.json")
	if err := os.WriteFile(libsFile, libsData, 0o644); err != nil {
		return nil, nil, err
	}

	graphData, err := runPythonScript(
		ctx,
		s.graphPath,
		"--dir",
		pathToUnpackedDir,
		"--libs",
		libsFile,
	)
	if err != nil {
		return findings, buildEmptyGraphs(libraries), nil
	}

	var graphs []domain.Graph
	if err := json.Unmarshal(graphData, &graphs); err != nil {
		return findings, buildEmptyGraphs(libraries), nil
	}
	return findings, ensureGraphsForLibraries(libraries, graphs), nil
}

func runPythonScript(ctx context.Context, scriptPath string, args ...string) ([]byte, error) {
	interpreters := []string{"python3", "python"}
	var lastErr error

	for i, interp := range interpreters {
		cmdArgs := append([]string{scriptPath}, args...)
		cmd := exec.CommandContext(ctx, interp, cmdArgs...)
		var out bytes.Buffer
		cmd.Stdout = &out
		cmd.Stderr = os.Stderr

		if err := cmd.Run(); err != nil {
			lastErr = err

			var execErr *exec.Error
			if errors.Is(err, exec.ErrNotFound) || errors.As(err, &execErr) {
				if i < len(interpreters)-1 {
					continue
				}
			}

			return nil, fmt.Errorf("%s %s failed: %w", interp, scriptPath, err)
		}

		return out.Bytes(), nil
	}

	return nil, fmt.Errorf("python interpreter failed for %s: %w", scriptPath, lastErr)
}

func buildEmptyGraphs(libraries []graphLibrary) []domain.Graph {
	graphs := make([]domain.Graph, 0, len(libraries))
	for _, library := range libraries {
		graphs = append(graphs, domain.Graph{
			Package: library.Package,
			Version: library.Version,
			CallMap: []domain.CallMap{},
		})
	}
	return graphs
}

func ensureGraphsForLibraries(libraries []graphLibrary, graphs []domain.Graph) []domain.Graph {
	byKey := make(map[string]domain.Graph, len(graphs))
	for _, graph := range graphs {
		key := graph.Package + "\x00" + graph.Version
		byKey[key] = graph
	}

	result := make([]domain.Graph, 0, len(libraries))
	for _, library := range libraries {
		key := library.Package + "\x00" + library.Version
		if graph, ok := byKey[key]; ok {
			result = append(result, graph)
			continue
		}
		result = append(result, domain.Graph{
			Package: library.Package,
			Version: library.Version,
			CallMap: []domain.CallMap{},
		})
	}

	return result
}
