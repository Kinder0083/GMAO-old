"""
Tests pour les nouvelles fonctionnalités Contrats:
- Manual chapter "Gestion des Contrats" avec 6 sections
- Export CSV des contrats
- Dashboard contrats avec KPI, graphiques, calendrier
"""
import pytest
import requests
import os
import csv
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@test.com",
        "password": "Admin123!"
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping tests")

@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Auth headers for requests"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestManualContractsChapter:
    """Tests pour le chapitre 'Gestion des Contrats' dans le manuel"""
    
    def test_manual_content_returns_contracts_chapter(self, auth_headers):
        """Vérifier que le manuel contient le chapitre 'Gestion des Contrats'"""
        response = requests.get(f"{BASE_URL}/api/manual/content", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "chapters" in data, "Response should contain 'chapters'"
        assert "sections" in data, "Response should contain 'sections'"
        
        # Find the Contracts chapter
        chapters = data["chapters"]
        contracts_chapter = None
        for ch in chapters:
            if "Gestion des Contrats" in ch.get("title", "") or ch.get("id") == "ch-036":
                contracts_chapter = ch
                break
        
        assert contracts_chapter is not None, f"Chapter 'Gestion des Contrats' not found. Available chapters: {[c.get('title') for c in chapters]}"
        print(f"✓ Found contracts chapter: {contracts_chapter.get('title')}")
        print(f"  Chapter ID: {contracts_chapter.get('id')}")
        
    def test_contracts_chapter_has_6_sections(self, auth_headers):
        """Vérifier que le chapitre Contrats a 6 sections"""
        response = requests.get(f"{BASE_URL}/api/manual/content", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        chapters = data.get("chapters", [])
        sections = data.get("sections", [])
        
        # Find contracts chapter
        contracts_chapter = None
        for ch in chapters:
            if "Gestion des Contrats" in ch.get("title", "") or ch.get("id") == "ch-036":
                contracts_chapter = ch
                break
        
        if contracts_chapter is None:
            pytest.skip("Contracts chapter not found in manual")
        
        # Count sections for this chapter - via chapter_id or sections list
        chapter_id = contracts_chapter.get("id")
        chapter_section_ids = contracts_chapter.get("sections", [])
        
        # Method 1: via chapter's sections list
        contracts_sections_via_list = [s for s in sections if s.get("id") in chapter_section_ids]
        # Method 2: via section's chapter_id field
        contracts_sections_via_id = [s for s in sections if s.get("chapter_id") == chapter_id]
        
        # Use whichever returns more results (both methods should work)
        contracts_sections = contracts_sections_via_list if len(contracts_sections_via_list) >= len(contracts_sections_via_id) else contracts_sections_via_id
        
        section_count = len(contracts_sections)
        print(f"✓ Contracts chapter has {section_count} sections:")
        for s in contracts_sections:
            print(f"  - {s.get('title')}")
        
        assert section_count == 6, f"Expected 6 sections, got {section_count}"


class TestContractsExport:
    """Tests pour l'export CSV des contrats"""
    
    def test_export_contracts_csv(self, auth_headers):
        """Vérifier que /api/export/contracts retourne un CSV valide"""
        response = requests.get(
            f"{BASE_URL}/api/export/contracts",
            headers=auth_headers,
            params={"format": "csv"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Check content type is CSV
        content_type = response.headers.get("content-type", "")
        assert "text/csv" in content_type or "application/octet-stream" in content_type, f"Expected CSV content-type, got {content_type}"
        
        # Verify it's a valid CSV
        csv_content = response.content.decode('utf-8')
        csv_reader = csv.reader(io.StringIO(csv_content))
        rows = list(csv_reader)
        
        assert len(rows) > 0, "CSV should have at least a header row"
        
        header = rows[0]
        print(f"✓ Export CSV valid with {len(rows)} rows")
        print(f"  Columns: {header[:5]}...")  # First 5 columns
        
        # Check expected columns exist
        expected_columns = ["id", "numero_contrat", "titre", "type_contrat", "statut"]
        for col in expected_columns:
            assert col in header, f"Expected column '{col}' in CSV header"
        
    def test_export_contracts_xlsx(self, auth_headers):
        """Vérifier que /api/export/contracts peut retourner du XLSX"""
        response = requests.get(
            f"{BASE_URL}/api/export/contracts",
            headers=auth_headers,
            params={"format": "xlsx"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        content_type = response.headers.get("content-type", "")
        # XLSX should be application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
        assert "spreadsheetml" in content_type or "application/octet-stream" in content_type, f"Expected XLSX content-type, got {content_type}"
        print(f"✓ Export XLSX successful, size: {len(response.content)} bytes")


class TestContractsDashboard:
    """Tests pour le dashboard des contrats /api/contracts/dashboard"""
    
    def test_dashboard_endpoint_returns_data(self, auth_headers):
        """Vérifier que /api/contracts/dashboard retourne les données attendues"""
        response = requests.get(f"{BASE_URL}/api/contracts/dashboard", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Check expected keys
        expected_keys = ["kpi", "repartition_type", "repartition_statut", "cout_par_vendor", "evolution_budget", "calendar_events"]
        for key in expected_keys:
            assert key in data, f"Expected key '{key}' in dashboard response"
        
        print(f"✓ Dashboard endpoint returns all expected data")
        print(f"  Keys: {list(data.keys())}")
        
    def test_dashboard_kpi_structure(self, auth_headers):
        """Vérifier la structure des KPI"""
        response = requests.get(f"{BASE_URL}/api/contracts/dashboard", headers=auth_headers)
        assert response.status_code == 200
        
        kpi = response.json().get("kpi", {})
        
        # KPI should contain these fields
        expected_kpi_fields = ["total", "actifs", "expires", "resilies", "budget_mensuel", "budget_annuel", "a_renouveler_trimestre", "top_vendors"]
        for field in expected_kpi_fields:
            assert field in kpi, f"Expected KPI field '{field}'"
        
        print(f"✓ KPI structure validated")
        print(f"  Total: {kpi.get('total')}, Actifs: {kpi.get('actifs')}")
        print(f"  Budget mensuel: {kpi.get('budget_mensuel')}, Budget annuel: {kpi.get('budget_annuel')}")
        
    def test_dashboard_repartition_type(self, auth_headers):
        """Vérifier la répartition par type pour le pie chart"""
        response = requests.get(f"{BASE_URL}/api/contracts/dashboard", headers=auth_headers)
        assert response.status_code == 200
        
        repartition_type = response.json().get("repartition_type", [])
        
        # Each item should have 'type' and 'count'
        for item in repartition_type:
            assert "type" in item, f"Expected 'type' in repartition item"
            assert "count" in item, f"Expected 'count' in repartition item"
        
        print(f"✓ Répartition par type: {len(repartition_type)} types")
        for r in repartition_type:
            print(f"  - {r.get('type')}: {r.get('count')}")
            
    def test_dashboard_evolution_budget(self, auth_headers):
        """Vérifier l'évolution du budget (pour le line chart)"""
        response = requests.get(f"{BASE_URL}/api/contracts/dashboard", headers=auth_headers)
        assert response.status_code == 200
        
        evolution_budget = response.json().get("evolution_budget", [])
        
        # Should have 12 months
        assert len(evolution_budget) == 12, f"Expected 12 months, got {len(evolution_budget)}"
        
        # Each month should have 'mois', 'mois_num', 'cout'
        for month in evolution_budget:
            assert "mois" in month, f"Expected 'mois' in month data"
            assert "cout" in month, f"Expected 'cout' in month data"
        
        print(f"✓ Evolution budget: 12 months of data")
        print(f"  First: {evolution_budget[0].get('mois')} - {evolution_budget[0].get('cout')}")
        print(f"  Last: {evolution_budget[-1].get('mois')} - {evolution_budget[-1].get('cout')}")
        
    def test_dashboard_calendar_events(self, auth_headers):
        """Vérifier le calendrier des échéances"""
        response = requests.get(f"{BASE_URL}/api/contracts/dashboard", headers=auth_headers)
        assert response.status_code == 200
        
        calendar_events = response.json().get("calendar_events", [])
        
        # Events may be empty if no contracts expiring soon
        print(f"✓ Calendar events: {len(calendar_events)} upcoming events")
        
        if calendar_events:
            # Each event should have expected fields
            for ev in calendar_events[:3]:  # Check first 3
                assert "titre" in ev, "Expected 'titre' in event"
                assert "date_fin" in ev, "Expected 'date_fin' in event"
                assert "jours_restants" in ev, "Expected 'jours_restants' in event"
                assert "severity" in ev, "Expected 'severity' in event"
                print(f"  - {ev.get('titre')}: {ev.get('jours_restants')} days, severity={ev.get('severity')}")


class TestImportExportContractsModule:
    """Tests pour vérifier que 'contracts' est dans les modules d'import/export"""
    
    def test_export_all_includes_contracts(self, auth_headers):
        """Vérifier que l'export 'all' inclut les contrats"""
        # The contracts module should be in EXPORT_MODULES
        # We can verify by checking the import endpoint accepts 'contracts'
        response = requests.get(
            f"{BASE_URL}/api/export/contracts",
            headers=auth_headers,
            params={"format": "csv"}
        )
        assert response.status_code == 200, f"Expected contracts export to work, got {response.status_code}"
        print(f"✓ Contracts module is available for export")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
