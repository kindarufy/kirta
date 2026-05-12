package service

import (
	"archive/zip"
	"bufio"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"kirta-backend-api/internal/domain"
	"kirta-backend-api/internal/service/exploitability"
	"kirta-backend-api/internal/service/sca"
	"kirta-backend-api/internal/service/svcerrs"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/go-enry/go-enry/v2"
	"github.com/jackc/pgx/v5"
)

var skipDirs = map[string]struct{}{
	".git":          {},
	".hg":           {},
	".svn":          {},
	"__pycache__":   {},
	".pytest_cache": {},
	".mypy_cache":   {},
	".ruff_cache":   {},
	".tox":          {},
	".nox":          {},
	"venv":          {},
	".venv":         {},
	"env":           {},
	".env":          {},
	"site-packages": {},
	"dist":          {},
	"build":         {},
	".eggs":         {},
	".idea":         {},
	".vscode":       {},
	"node_modules":  {},
	"vendor":        {},
}

type ScanRepository interface {
	CreateScan(ctx context.Context, scan *domain.ScanInfo) error
	CreateGraphs(ctx context.Context, scanID int64, graphs []domain.Graph) error
	GetScansBaseList(ctx context.Context) ([]domain.ScanBaseInfo, error)
	GetScanByID(ctx context.Context, id int64) (domain.ScanInfo, error)
	GetGraphByLibrary(ctx context.Context, scanID int64, packageName, version string) (domain.Graph, error)
	UpdateScanScaReport(ctx context.Context, scanID int64, scaReport domain.ScaReport) error
}

type StorageClient interface {
	UploadFile(ctx context.Context, objectKey, filePath string) error
	GetFile(ctx context.Context, objectKey string) (io.ReadCloser, int64, error)
}

type Scanner struct {
	sca *sca.Scanner

	scanRepo       ScanRepository
	storage        StorageClient
	syftPath       string
	exploitability ExploitabilityEnricher
}

type ExploitabilityEnricher interface {
	Enrich(ctx context.Context, finding domain.ScaFinding, callMap []domain.CallMap) (bool, string, error)
}

func NewScanner(
	sca *sca.Scanner,
	syftPath string,
	scanRepo ScanRepository,
	storage StorageClient,
	exploitabilityEnricher ExploitabilityEnricher,
) *Scanner {
	return &Scanner{
		sca:            sca,
		syftPath:       syftPath,
		scanRepo:       scanRepo,
		storage:        storage,
		exploitability: exploitabilityEnricher,
	}
}

func (s *Scanner) Scan(ctx context.Context, pathToZip string) (domain.ScanInfo, error) {
	var scan domain.ScanInfo
	scan.CreatedAt = time.Now()

	sha256sum, err := computeSHA256(pathToZip)
	if err != nil {
		return domain.ScanInfo{}, err
	}
	scan.Repository = strings.TrimSuffix(filepath.Base(pathToZip), filepath.Ext(pathToZip))
	scan.SHA256 = sha256sum

	unpackedDir, manifest, err := unpackZip(ctx, pathToZip)
	if err != nil {
		return domain.ScanInfo{}, err
	}
	scan.Manifest = manifest

	langs, err := collectLangStat(unpackedDir)
	if err != nil {
		return domain.ScanInfo{}, err
	}
	scan.Langs = langs

	hasPython := false
	for _, l := range langs {
		if strings.EqualFold(l.Lang, "Python") {
			hasPython = true
			break
		}
	}
	if !hasPython {
		return domain.ScanInfo{}, svcerrs.NewLangErr("", svcerrs.ErrLangIsNotSupported)
	}

	scan.TotalSLOC = calculateTotalSLOC(langs)

	pathToSbom, err := s.runSyftSBOM(unpackedDir, filepath.Dir(pathToZip))
	if err != nil {
		return domain.ScanInfo{}, err
	}
	libs, err := getLibraryListFromSBOM(pathToSbom)
	if err != nil {
		return domain.ScanInfo{}, err
	}
	scan.Libraries = libs

	scaFindings, graphs, err := s.sca.StartSCA(ctx, unpackedDir, pathToSbom)
	if err != nil {
		return domain.ScanInfo{}, err
	}
	scan.ScaReport = scaFindings

	scan.FinishedAt = time.Now()
	scan.Status = "completed"
	if err := s.scanRepo.CreateScan(ctx, &scan); err != nil {
		return domain.ScanInfo{}, err
	}
	if err := s.scanRepo.CreateGraphs(ctx, scan.ID, graphs); err != nil {
		return domain.ScanInfo{}, err
	}

	seen := map[string]struct{}{}
	for _, graph := range graphs {
		for _, cm := range graph.CallMap {
			if _, ok := seen[cm.File]; ok {
				continue
			}
			seen[cm.File] = struct{}{}
			objectKey := fmt.Sprintf("scans/%d/%s", scan.ID, cm.File)
			fullPath := filepath.Join(unpackedDir, cm.File)
			_ = s.storage.UploadFile(ctx, objectKey, fullPath)
		}
	}

	return scan, nil
}

func (s *Scanner) ExplainFinding(ctx context.Context, scanID int64, findingID int) (domain.ScaFinding, error) {
	scan, err := s.scanRepo.GetScanByID(ctx, scanID)
	if err != nil {
		return domain.ScaFinding{}, err
	}

	idx := -1
	for i := range scan.ScaReport {
		if scan.ScaReport[i].ID == findingID {
			idx = i
			break
		}
	}
	if idx < 0 {
		return domain.ScaFinding{}, svcerrs.ErrFindingNotFound
	}

	finding := scan.ScaReport[idx]
	graph, err := s.scanRepo.GetGraphByLibrary(ctx, scanID, finding.Package, finding.Version)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return domain.ScaFinding{}, err
	}

	if errors.Is(err, pgx.ErrNoRows) || len(graph.CallMap) == 0 {
		finding.Exploitable = domain.ExploitableStatusNotExploitable
		finding.Explanation = buildFallbackExplanation(finding, true, "empty_call_map")
	} else {
		exploitable, explanation, enrichErr := s.exploitability.Enrich(ctx, finding, graph.CallMap)
		if enrichErr != nil {
			reason := "provider_error"
			if exploitability.IsInvalidExplanationError(enrichErr) {
				reason = "invalid_explanation"
			}
			finding.Exploitable = domain.ExploitableStatusUnknown
			finding.Explanation = buildFallbackExplanation(finding, false, reason)
			log.Printf(
				"enrichment fallback reason=%s scan_id=%d finding_id=%d package=%s version=%s cve=%s err=%v",
				reason, scanID, finding.ID, finding.Package, finding.Version, primaryCVE(finding), enrichErr,
			)
		} else if !exploitability.IsMeaningfulExplanation(explanation) {
			finding.Exploitable = domain.ExploitableStatusUnknown
			finding.Explanation = buildFallbackExplanation(finding, false, "invalid_explanation")
			log.Printf(
				"enrichment fallback reason=%s scan_id=%d finding_id=%d package=%s version=%s cve=%s err=%s",
				"invalid_explanation", scanID, finding.ID, finding.Package, finding.Version, primaryCVE(finding), "non-meaningful explanation from provider",
			)
		} else {
			if exploitable {
				finding.Exploitable = domain.ExploitableStatusExploitable
			} else {
				finding.Exploitable = domain.ExploitableStatusNotExploitable
			}
			finding.Explanation = strings.TrimSpace(explanation)
		}
	}

	scan.ScaReport[idx] = finding
	if err := s.scanRepo.UpdateScanScaReport(ctx, scanID, scan.ScaReport); err != nil {
		return domain.ScaFinding{}, err
	}
	return finding, nil
}

func buildFallbackExplanation(finding domain.ScaFinding, emptyCallMap bool, reason string) string {
	if emptyCallMap || reason == "empty_call_map" {
		return "В проекте не найдено подтверждённых вызовов уязвимого пакета."
	}

	base := fmt.Sprintf(
		"Не удалось автоматически оценить эксплуатируемость для %s. Требуется ручная проверка.",
		primaryCVE(finding),
	)

	switch reason {
	case "provider_error":
		return base + " Во время enrichment произошла ошибка провайдера."
	default:
		return base + " Получен невалидный ответ модели."
	}
}

func primaryCVE(finding domain.ScaFinding) string {
	for _, cve := range finding.Cve {
		trimmed := strings.TrimSpace(cve)
		if trimmed != "" {
			return trimmed
		}
	}
	return "неизвестного CVE"
}

func libraryKey(packageName, version string) string {
	return strings.ToLower(strings.TrimSpace(packageName)) + "\x00" + strings.TrimSpace(version)
}

func (s *Scanner) GetScansBaseList(ctx context.Context) ([]domain.ScanBaseInfo, error) {
	return s.scanRepo.GetScansBaseList(ctx)
}

func (s *Scanner) GetScanByID(ctx context.Context, id int64) (domain.ScanInfo, error) {
	return s.scanRepo.GetScanByID(ctx, id)
}

func (s *Scanner) GetGraphByLibrary(
	ctx context.Context,
	scanID int64,
	packageName,
	version string,
) (domain.Graph, error) {
	return s.scanRepo.GetGraphByLibrary(ctx, scanID, packageName, version)
}

func (s *Scanner) GetScanFile(ctx context.Context, scanID int64, filePath string) (io.ReadCloser, int64, error) {
	objectKey := fmt.Sprintf("scans/%d/%s", scanID, filePath)
	return s.storage.GetFile(ctx, objectKey)
}

func computeSHA256(path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()
	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

func (s *Scanner) runSyftSBOM(pathToDir, tmpDir string) (string, error) {
	sbomName := filepath.Base(pathToDir) + ".cdx.json"
	dst := filepath.Join(tmpDir, sbomName)
	cmd := exec.Command(s.syftPath, "scan", "dir:"+pathToDir, "--output", "cyclonedx-json="+dst)
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		return "", err
	}
	return dst, nil
}

func unpackZip(ctx context.Context, pathToZip string) (string, []byte, error) {
	arch, err := zip.OpenReader(pathToZip)
	if err != nil {
		return "", nil, err
	}
	defer func(arch *zip.ReadCloser) {
		_ = arch.Close()
	}(arch)

	parentDir := filepath.Dir(pathToZip)
	zipName := strings.TrimSuffix(filepath.Base(pathToZip), filepath.Ext(pathToZip))
	unpackedDir := filepath.Join(parentDir, zipName)

	if err := os.MkdirAll(unpackedDir, 0o755); err != nil {
		return "", nil, err
	}

	manifestByPath := map[string][]byte{}
	for _, f := range arch.File {
		select {
		case <-ctx.Done():
			return "", nil, ctx.Err()
		default:
		}

		filePath := filepath.Join(unpackedDir, f.Name)

		// Zip Slip protection
		if !strings.HasPrefix(filePath, filepath.Clean(unpackedDir)+string(os.PathSeparator)) {
			return "", nil, os.ErrPermission
		}

		if f.FileInfo().IsDir() {
			if err := os.MkdirAll(filePath, f.Mode()); err != nil {
				return "", nil, err
			}
			continue
		}

		if err := os.MkdirAll(filepath.Dir(filePath), 0o755); err != nil {
			return "", nil, err
		}

		srcFile, err := f.Open()
		if err != nil {
			return "", nil, err
		}

		if isDependencyManifestFile(f.Name) {
			content, readErr := io.ReadAll(srcFile)
			if readErr != nil {
				_ = srcFile.Close()
				return "", nil, readErr
			}
			manifestByPath[f.Name] = content
			// Reopen to copy the full file to disk
			_ = srcFile.Close()
			srcFile, err = f.Open()
			if err != nil {
				return "", nil, err
			}
		}

		dstFile, err := os.OpenFile(filePath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, f.Mode())
		if err != nil {
			_ = srcFile.Close()
			return "", nil, err
		}

		_, err = io.Copy(dstFile, srcFile)
		_ = dstFile.Close()
		_ = srcFile.Close()

		if err != nil {
			return "", nil, err
		}
	}
	return unpackedDir, buildCombinedManifest(manifestByPath), nil
}

func isDependencyManifestFile(path string) bool {
	base := strings.ToLower(filepath.Base(path))
	switch base {
	case "requirements.txt", "poetry.lock", "pyproject.toml", "pipfile", "pipfile.lock":
		return true
	}
	if strings.HasPrefix(base, "requirements") && strings.HasSuffix(base, ".txt") {
		return true
	}
	return false
}

func buildCombinedManifest(manifestByPath map[string][]byte) []byte {
	if len(manifestByPath) == 0 {
		return nil
	}

	paths := make([]string, 0, len(manifestByPath))
	for p := range manifestByPath {
		paths = append(paths, p)
	}
	sort.Strings(paths)

	var b strings.Builder
	for idx, p := range paths {
		if idx > 0 {
			b.WriteString("\n\n")
		}
		b.WriteString("# file: ")
		b.WriteString(p)
		b.WriteString("\n")
		b.Write(manifestByPath[p])
	}
	return []byte(b.String())
}

func collectLangStat(dir string) ([]domain.Langs, error) {
	stats := map[string]int{}
	err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			if _, ok := skipDirs[info.Name()]; ok {
				return filepath.SkipDir
			}

			if strings.HasSuffix(info.Name(), ".egg-info") {
				return filepath.SkipDir
			}
			return nil
		}
		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		lang := enry.GetLanguage(info.Name(), data)
		if lang == "" {
			return nil
		}
		stats[lang] += countSLOC(data)
		return nil
	})
	results := make([]domain.Langs, 0, len(stats))
	for lang, count := range stats {
		results = append(results, domain.Langs{Lang: lang, Sloc: count})
	}
	return results, err
}

func countSLOC(content []byte) int {
	scanner := bufio.NewScanner(strings.NewReader(string(content)))
	sloc := 0
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}

		sloc++
	}
	return sloc
}

func calculateTotalSLOC(langs []domain.Langs) int {
	total := 0
	for _, lang := range langs {
		total += lang.Sloc
	}
	return total
}

type syftSBOM struct {
	Components []struct {
		Package string `json:"name"`
		Version string `json:"version"`
		Type    string `json:"type"`
	} `json:"components"`
}

func getLibraryListFromSBOM(pathToSBOM string) ([]domain.Libraries, error) {

	data, err := os.ReadFile(pathToSBOM)
	if err != nil {
		return nil, err
	}
	var sourceSBOM syftSBOM
	if err := json.Unmarshal(data, &sourceSBOM); err != nil {
		return nil, err
	}
	libs := make([]domain.Libraries, 0, len(sourceSBOM.Components))
	for _, component := range sourceSBOM.Components {
		if component.Type == "library" {
			libs = append(libs, domain.Libraries{
				Package: component.Package,
				Version: component.Version,
			})
		}
	}
	return libs, nil
}
