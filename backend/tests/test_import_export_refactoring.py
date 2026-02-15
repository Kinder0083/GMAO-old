"""
Test cases for Import/Export page refactoring validation.
Verifies that the split of ImportExport.jsx (988 lines) into 4 files works correctly:
- ImportExport.jsx (orchestrator 51 lines)
- ImportExportTab.jsx (298 lines)
- BackupTab.jsx (429 lines)
- importExportModules.js (107 lines)

All original functionality should remain identical after refactoring.
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestBackendExportEndpoints:
    """Test backend export endpoints to ensure they still work after refactoring"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_export_all_returns_valid_zip(self):
        """Test GET /api/export/all?format=xlsx returns valid ZIP"""
        response = requests.get(
            f"{BASE_URL}/api/export/all",
            params={"format": "xlsx"},
            headers=self.headers
        )
        assert response.status_code == 200, f"Export all failed: {response.status_code}"
        
        # Verify content type is application/zip
        content_type = response.headers.get('content-type', '')
        assert 'zip' in content_type.lower() or 'octet-stream' in content_type.lower(), \
            f"Expected zip content type, got: {content_type}"
        
        # Verify it's actually a valid ZIP (starts with PK)
        assert response.content[:2] == b'PK', "Response is not a valid ZIP file"
    
    def test_export_equipments_returns_xlsx(self):
        """Test GET /api/export/equipments?format=xlsx returns valid XLSX"""
        response = requests.get(
            f"{BASE_URL}/api/export/equipments",
            params={"format": "xlsx"},
            headers=self.headers
        )
        assert response.status_code == 200, f"Export equipments failed: {response.status_code}"
        
        # XLSX files also start with PK (they are ZIP archives)
        assert response.content[:2] == b'PK', "Response is not a valid XLSX file"


class TestBackendBackupEndpoints:
    """Test backend backup endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_backup_run_succeeds(self):
        """Test POST /api/backup/run manual backup"""
        response = requests.post(
            f"{BASE_URL}/api/backup/run",
            headers=self.headers
        )
        assert response.status_code == 200, f"Backup run failed: {response.status_code}"
        
        data = response.json()
        assert data.get("status") == "success", f"Backup status is not success: {data}"
        assert "file_size" in data, "file_size missing from response"
        assert "module_count" in data, "module_count missing from response"
        assert "file_count" in data, "file_count missing from response"
        
        # Verify reasonable values
        assert data["file_size"] > 0, "file_size should be greater than 0"
        assert data["module_count"] > 0, "module_count should be greater than 0"
    
    def test_backup_schedules_list(self):
        """Test GET /api/backup/schedules returns list"""
        response = requests.get(
            f"{BASE_URL}/api/backup/schedules",
            headers=self.headers
        )
        assert response.status_code == 200, f"Get schedules failed: {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Schedules response should be a list"
    
    def test_backup_history_list(self):
        """Test GET /api/backup/history returns list"""
        response = requests.get(
            f"{BASE_URL}/api/backup/history",
            params={"limit": 10},
            headers=self.headers
        )
        assert response.status_code == 200, f"Get history failed: {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "History response should be a list"
    
    def test_drive_status(self):
        """Test GET /api/backup/drive/status returns status object"""
        response = requests.get(
            f"{BASE_URL}/api/backup/drive/status",
            headers=self.headers
        )
        assert response.status_code == 200, f"Get drive status failed: {response.status_code}"
        
        data = response.json()
        assert "connected" in data, "connected field missing from drive status"


class TestBackendImportEndpoints:
    """Test backend import endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_import_endpoint_exists(self):
        """Test POST /api/import/all endpoint exists (may fail with no file, but endpoint should exist)"""
        response = requests.post(
            f"{BASE_URL}/api/import/all",
            headers=self.headers
        )
        # 422 means endpoint exists but validation failed (expected without file)
        # 400 means bad request (endpoint exists)
        assert response.status_code in [400, 422], \
            f"Import endpoint should return 400/422 without file, got: {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
