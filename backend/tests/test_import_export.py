"""
Test Import/Export Module - FSAO Iris
Tests for export/import endpoints including new modules (M.E.S., cameras, reports, etc.)
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestImportExportAuth:
    """Tests for authentication on import/export endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication for tests"""
        self.session = requests.Session()
        # Login to get token
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@test.com", "password": "Admin123!"}
        )
        if login_response.status_code == 200:
            self.token = login_response.json().get("access_token") or login_response.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip(f"Login failed: {login_response.status_code}")
    
    def test_export_without_auth_returns_401(self):
        """Test that export endpoint returns 401 without authentication"""
        response = requests.get(f"{BASE_URL}/api/export/equipments")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✅ Export without auth returns {response.status_code}")
    
    def test_import_without_auth_returns_401(self):
        """Test that import endpoint returns 401 without authentication"""
        files = {'file': ('test.csv', 'id,name\n1,Test', 'text/csv')}
        response = requests.post(f"{BASE_URL}/api/import/equipments", files=files)
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✅ Import without auth returns {response.status_code}")


class TestExportEndpoints:
    """Tests for export endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication for tests"""
        self.session = requests.Session()
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@test.com", "password": "Admin123!"}
        )
        if login_response.status_code == 200:
            self.token = login_response.json().get("access_token") or login_response.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip(f"Login failed: {login_response.status_code}")
    
    def test_export_all_xlsx(self):
        """Test export all data in XLSX format"""
        response = self.session.get(
            f"{BASE_URL}/api/export/all",
            params={"format": "xlsx"},
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text[:500]}"
        assert "spreadsheetml" in response.headers.get("Content-Type", ""), "Expected XLSX content type"
        assert len(response.content) > 0, "Export file should not be empty"
        print(f"✅ Export all XLSX successful, size: {len(response.content)} bytes")
    
    def test_export_all_csv_returns_400(self):
        """Test that export all in CSV format returns 400 (not supported)"""
        response = self.session.get(
            f"{BASE_URL}/api/export/all",
            params={"format": "csv"},
            headers=self.headers
        )
        assert response.status_code == 400, f"Expected 400 for CSV all export, got {response.status_code}"
        print(f"✅ Export all CSV correctly returns 400")
    
    def test_export_equipments_csv(self):
        """Test export equipments module in CSV format"""
        response = self.session.get(
            f"{BASE_URL}/api/export/equipments",
            params={"format": "csv"},
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert "text/csv" in response.headers.get("Content-Type", ""), "Expected CSV content type"
        print(f"✅ Export equipments CSV successful")
    
    def test_export_equipments_xlsx(self):
        """Test export equipments module in XLSX format"""
        response = self.session.get(
            f"{BASE_URL}/api/export/equipments",
            params={"format": "xlsx"},
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert "spreadsheetml" in response.headers.get("Content-Type", ""), "Expected XLSX content type"
        print(f"✅ Export equipments XLSX successful")
    
    def test_export_cameras_csv(self):
        """Test export cameras module (new module) in CSV format"""
        response = self.session.get(
            f"{BASE_URL}/api/export/cameras",
            params={"format": "csv"},
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✅ Export cameras CSV successful")
    
    def test_export_mes_machines_xlsx(self):
        """Test export M.E.S. machines (new module) in XLSX format"""
        response = self.session.get(
            f"{BASE_URL}/api/export/mes-machines",
            params={"format": "xlsx"},
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✅ Export M.E.S. machines XLSX successful")
    
    def test_export_mes_product_references(self):
        """Test export M.E.S. product references"""
        response = self.session.get(
            f"{BASE_URL}/api/export/mes-product-references",
            params={"format": "xlsx"},
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✅ Export M.E.S. product references successful")
    
    def test_export_consignes(self):
        """Test export consignes module"""
        response = self.session.get(
            f"{BASE_URL}/api/export/consignes",
            params={"format": "xlsx"},
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✅ Export consignes successful")
    
    def test_export_reports_historique(self):
        """Test export reports historique module"""
        response = self.session.get(
            f"{BASE_URL}/api/export/reports-historique",
            params={"format": "xlsx"},
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✅ Export reports historique successful")
    
    def test_export_camera_alerts(self):
        """Test export camera alerts module"""
        response = self.session.get(
            f"{BASE_URL}/api/export/camera-alerts",
            params={"format": "csv"},
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✅ Export camera alerts successful")
    
    def test_export_invalid_module_returns_400(self):
        """Test that export with invalid module returns 400"""
        response = self.session.get(
            f"{BASE_URL}/api/export/invalid-module-xyz",
            params={"format": "csv"},
            headers=self.headers
        )
        assert response.status_code == 400, f"Expected 400 for invalid module, got {response.status_code}"
        print(f"✅ Export invalid module correctly returns 400")
    
    def test_export_demandes_arret(self):
        """Test export demandes-arret module"""
        response = self.session.get(
            f"{BASE_URL}/api/export/demandes-arret",
            params={"format": "xlsx"},
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✅ Export demandes-arret successful")
    
    def test_export_work_orders(self):
        """Test export work-orders module"""
        response = self.session.get(
            f"{BASE_URL}/api/export/work-orders",
            params={"format": "xlsx"},
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✅ Export work-orders successful")
    
    def test_export_whiteboards(self):
        """Test export whiteboards module (Communication category)"""
        response = self.session.get(
            f"{BASE_URL}/api/export/whiteboards",
            params={"format": "xlsx"},
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✅ Export whiteboards successful")
    
    def test_export_audit_logs(self):
        """Test export audit-logs module (Configuration category)"""
        response = self.session.get(
            f"{BASE_URL}/api/export/audit-logs",
            params={"format": "xlsx"},
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✅ Export audit-logs successful")


class TestImportEndpoints:
    """Tests for import endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication for tests"""
        self.session = requests.Session()
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@test.com", "password": "Admin123!"}
        )
        if login_response.status_code == 200:
            self.token = login_response.json().get("access_token") or login_response.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip(f"Login failed: {login_response.status_code}")
    
    def test_import_invalid_module_returns_400(self):
        """Test that import with invalid module returns 400"""
        files = {'file': ('test.csv', 'id,name\n1,Test', 'text/csv')}
        response = self.session.post(
            f"{BASE_URL}/api/import/invalid-module-xyz",
            files=files,
            headers=self.headers
        )
        assert response.status_code == 400, f"Expected 400 for invalid module, got {response.status_code}"
        print(f"✅ Import invalid module correctly returns 400")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
