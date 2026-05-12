package service

import (
	"context"
	"errors"
	"kirta-backend-api/internal/domain"
	"kirta-backend-api/internal/service/svcerrs"
	"strings"
	"testing"
)

type mockExploitabilityEnricher struct {
	results map[string]struct {
		exploitable bool
		explanation string
		err         error
	}
}

func (m *mockExploitabilityEnricher) Enrich(_ context.Context, finding domain.ScaFinding, _ []domain.CallMap) (bool, string, error) {
	res, ok := m.results[finding.Package+"@"+finding.Version]
	if !ok {
		return false, "", errors.New("not found")
	}
	return res.exploitable, res.explanation, res.err
}

type mockScanRepository struct {
	scan   domain.ScanInfo
	graph  domain.Graph
	err    error
	saved  bool
	savedS domain.ScaReport
}

func (m *mockScanRepository) CreateScan(context.Context, *domain.ScanInfo) error { return nil }
func (m *mockScanRepository) CreateGraphs(context.Context, int64, []domain.Graph) error {
	return nil
}
func (m *mockScanRepository) GetScansBaseList(context.Context) ([]domain.ScanBaseInfo, error) {
	return nil, nil
}
func (m *mockScanRepository) GetScanByID(context.Context, int64) (domain.ScanInfo, error) {
	return m.scan, nil
}
func (m *mockScanRepository) GetGraphByLibrary(context.Context, int64, string, string) (domain.Graph, error) {
	return m.graph, m.err
}
func (m *mockScanRepository) UpdateScanScaReport(_ context.Context, _ int64, sca domain.ScaReport) error {
	m.saved = true
	m.savedS = sca
	return nil
}

type mockStorage struct{}

func (m *mockStorage) UploadFile(context.Context, string, string) error { return nil }
func (m *mockStorage) GetFile(context.Context, string) (interface{ Close() error }, int64, error) {
	return nil, 0, nil
}

func TestExplainFinding_Success(t *testing.T) {
	repo := &mockScanRepository{
		scan: domain.ScanInfo{
			ScaReport: domain.ScaReport{
				{ID: 1, Package: "lib-a", Version: "1.0.0", Cve: []string{"CVE-1"}},
			},
		},
		graph: domain.Graph{
			CallMap: []domain.CallMap{{File: "a.py"}},
		},
	}
	svc := &Scanner{
		scanRepo: repo,
		exploitability: &mockExploitabilityEnricher{
			results: map[string]struct {
				exploitable bool
				explanation string
				err         error
			}{
				"lib-a@1.0.0": {exploitable: true, explanation: "Есть достижимый вызов."},
			},
		},
	}

	finding, err := svc.ExplainFinding(context.Background(), 10, 1)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if finding.Exploitable != domain.ExploitableStatusExploitable {
		t.Fatalf("unexpected status: %s", finding.Exploitable)
	}
	if finding.Explanation == "" {
		t.Fatalf("expected explanation")
	}
	if !repo.saved {
		t.Fatalf("expected persisted report")
	}
}

func TestExplainFinding_EmptyCallMap(t *testing.T) {
	repo := &mockScanRepository{
		scan: domain.ScanInfo{
			ScaReport: domain.ScaReport{
				{ID: 1, Package: "lib-a", Version: "1.0.0", Cve: []string{"CVE-1"}},
			},
		},
		graph: domain.Graph{CallMap: []domain.CallMap{}},
	}
	svc := &Scanner{scanRepo: repo, exploitability: &mockExploitabilityEnricher{}}

	finding, err := svc.ExplainFinding(context.Background(), 10, 1)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if finding.Exploitable != domain.ExploitableStatusNotExploitable {
		t.Fatalf("unexpected status: %s", finding.Exploitable)
	}
	if finding.Explanation != "В проекте не найдено подтверждённых вызовов уязвимого пакета." {
		t.Fatalf("unexpected explanation: %q", finding.Explanation)
	}
}

func TestExplainFinding_NotFound(t *testing.T) {
	repo := &mockScanRepository{
		scan: domain.ScanInfo{ScaReport: domain.ScaReport{}},
	}
	svc := &Scanner{scanRepo: repo, exploitability: &mockExploitabilityEnricher{}}
	_, err := svc.ExplainFinding(context.Background(), 1, 42)
	if !errors.Is(err, svcerrs.ErrFindingNotFound) {
		t.Fatalf("expected ErrFindingNotFound, got %v", err)
	}
}

func TestBuildFallbackExplanation(t *testing.T) {
	finding := domain.ScaFinding{Cve: []string{"CVE-2026-3333"}}
	withProviderErr := buildFallbackExplanation(finding, false, "provider_error")
	if withProviderErr == "" {
		t.Fatalf("expected non-empty fallback for provider_error")
	}
	if !strings.Contains(withProviderErr, "CVE-2026-3333") {
		t.Fatalf("expected cve in fallback")
	}

	withEmptyCallMap := buildFallbackExplanation(finding, true, "empty_call_map")
	expected := "В проекте не найдено подтверждённых вызовов уязвимого пакета."
	if withEmptyCallMap != expected {
		t.Fatalf("unexpected empty_call_map fallback: %q", withEmptyCallMap)
	}
}
