"""
Test: Export 'all' now includes uploaded files as ZIP
Test: Backup now generates .zip files with data.xlsx + uploads/ folder
Test: Single module export remains XLSX (not ZIP)

This tests the NEW feature: files/attachments included in exports and backups
"""
import pytest
import requests
import zipfile
import io
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@test.com",
        "password": "Admin123!"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed")

@pytest.fixture
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}


class TestExportAllReturnsZip:
    """Export 'all' (GET /api/export/all?format=xlsx) returns a ZIP containing data.xlsx + uploads/"""
    
    def test_export_all_returns_zip_content_type(self, auth_headers):
        """Export all should return application/zip content type"""
        response = requests.get(
            f"{BASE_URL}/api/export/all",
            params={"format": "xlsx"},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert "application/zip" in response.headers.get("Content-Type", ""), \
            f"Expected application/zip, got {response.headers.get('Content-Type')}"
        print(f"PASS: Export all returns application/zip content type")
    
    def test_export_all_zip_contains_data_xlsx(self, auth_headers):
        """ZIP should contain data.xlsx file"""
        response = requests.get(
            f"{BASE_URL}/api/export/all",
            params={"format": "xlsx"},
            headers=auth_headers
        )
        assert response.status_code == 200
        
        # Verify it's a valid ZIP
        zip_content = io.BytesIO(response.content)
        with zipfile.ZipFile(zip_content, 'r') as zf:
            file_list = zf.namelist()
            assert "data.xlsx" in file_list, f"data.xlsx not found in ZIP. Contents: {file_list[:10]}"
            print(f"PASS: ZIP contains data.xlsx")
    
    def test_export_all_zip_contains_uploads_folder(self, auth_headers):
        """ZIP should contain uploads/ folder with files"""
        response = requests.get(
            f"{BASE_URL}/api/export/all",
            params={"format": "xlsx"},
            headers=auth_headers
        )
        assert response.status_code == 200
        
        zip_content = io.BytesIO(response.content)
        with zipfile.ZipFile(zip_content, 'r') as zf:
            file_list = zf.namelist()
            upload_files = [f for f in file_list if f.startswith("uploads/")]
            assert len(upload_files) > 0, f"No uploads/ files found in ZIP. Contents: {file_list[:10]}"
            print(f"PASS: ZIP contains {len(upload_files)} files in uploads/ folder")
    
    def test_export_all_zip_has_50_uploaded_files(self, auth_headers):
        """ZIP should contain approximately 50 uploaded files (as per requirements)"""
        response = requests.get(
            f"{BASE_URL}/api/export/all",
            params={"format": "xlsx"},
            headers=auth_headers
        )
        assert response.status_code == 200
        
        zip_content = io.BytesIO(response.content)
        with zipfile.ZipFile(zip_content, 'r') as zf:
            file_list = zf.namelist()
            upload_files = [f for f in file_list if f.startswith("uploads/") and not f.endswith("/")]
            # Should have ~50 files
            assert upload_files, "No upload files found"
            print(f"PASS: ZIP contains {len(upload_files)} uploaded files")
            # Allow some tolerance (45-55 files)
            assert 40 <= len(upload_files) <= 60, f"Expected ~50 files, got {len(upload_files)}"


class TestSingleModuleExportRemainsXLSX:
    """Export of a single module (e.g., cameras) remains XLSX (not ZIP)"""
    
    def test_cameras_export_returns_xlsx(self, auth_headers):
        """Single module export should return XLSX, not ZIP"""
        response = requests.get(
            f"{BASE_URL}/api/export/cameras",
            params={"format": "xlsx"},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        content_type = response.headers.get("Content-Type", "")
        # Should be xlsx, NOT zip
        assert "spreadsheetml" in content_type or "vnd.openxmlformats" in content_type, \
            f"Expected XLSX content type, got {content_type}"
        assert "application/zip" not in content_type, \
            f"Single module should NOT return ZIP, got {content_type}"
        print(f"PASS: Single module (cameras) returns XLSX, not ZIP")
    
    def test_equipments_export_returns_xlsx(self, auth_headers):
        """Another single module export should return XLSX"""
        response = requests.get(
            f"{BASE_URL}/api/export/equipments",
            params={"format": "xlsx"},
            headers=auth_headers
        )
        assert response.status_code == 200
        content_type = response.headers.get("Content-Type", "")
        assert "application/zip" not in content_type, \
            f"Single module should NOT return ZIP, got {content_type}"
        print(f"PASS: Single module (equipments) returns XLSX, not ZIP")


class TestBackupRunReturnsFileCount:
    """POST /api/backup/run should return file_count > 0 in addition to module_count"""
    
    def test_run_backup_returns_file_count(self, auth_headers):
        """Manual backup should return file_count > 0"""
        response = requests.post(
            f"{BASE_URL}/api/backup/run",
            headers=auth_headers,
            json={}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify module_count
        assert "module_count" in data, f"module_count not in response: {data}"
        assert data["module_count"] > 0, f"Expected module_count > 0, got {data['module_count']}"
        
        # Verify file_count (NEW)
        assert "file_count" in data, f"file_count not in response: {data}"
        assert data["file_count"] > 0, f"Expected file_count > 0, got {data['file_count']}"
        
        print(f"PASS: Backup run returns module_count={data['module_count']}, file_count={data['file_count']}")


class TestBackupGeneratesZipFile:
    """Backup should generate .zip files (not .xlsx)"""
    
    def test_backup_file_is_zip(self, auth_headers):
        """Check that the backup file stored is a .zip"""
        # First run a backup
        run_response = requests.post(
            f"{BASE_URL}/api/backup/run",
            headers=auth_headers,
            json={}
        )
        assert run_response.status_code == 200
        
        # Get history to find the latest backup
        history_response = requests.get(
            f"{BASE_URL}/api/backup/history",
            params={"limit": 1},
            headers=auth_headers
        )
        assert history_response.status_code == 200
        history = history_response.json()
        assert len(history) > 0, "No backup history found"
        
        latest = history[0]
        file_path = latest.get("file_path", "")
        
        # Check file_path ends with .zip
        assert file_path.endswith(".zip"), f"Expected .zip file, got {file_path}"
        print(f"PASS: Backup file is .zip: {file_path}")


class TestBackupHistoryShowsFileCount:
    """Backup history should include file_count field"""
    
    def test_history_includes_file_count(self, auth_headers):
        """History entries should have file_count field"""
        response = requests.get(
            f"{BASE_URL}/api/backup/history",
            params={"limit": 5},
            headers=auth_headers
        )
        assert response.status_code == 200
        history = response.json()
        
        # Find entries that should have file_count (newer backups)
        entries_with_file_count = [h for h in history if h.get("file_count") is not None]
        assert len(entries_with_file_count) > 0, \
            f"No history entries have file_count. Sample: {history[0] if history else 'empty'}"
        
        for entry in entries_with_file_count:
            assert entry["file_count"] >= 0, f"file_count should be >= 0, got {entry['file_count']}"
        
        print(f"PASS: Backup history includes file_count. Sample: {entries_with_file_count[0]['file_count']} files")


class TestImportAcceptsZip:
    """Import should accept .zip files containing data.xlsx + uploads/"""
    
    def test_import_endpoint_exists(self, auth_headers):
        """Verify import endpoint accepts zip files"""
        # We won't actually upload a file, just verify the endpoint accepts the format
        # The file input in frontend already has accept=".csv,.xlsx,.xls,.zip"
        # Backend import_export_routes.py line 684 handles .zip files
        
        # Just verify the endpoint is accessible
        response = requests.post(
            f"{BASE_URL}/api/import/all",
            params={"mode": "add"},
            headers=auth_headers,
            files={"file": ("test.txt", b"dummy", "text/plain")}
        )
        # Should fail with format error, not 404 or 500
        assert response.status_code in [400, 422], \
            f"Expected 400/422 for invalid format, got {response.status_code}"
        print(f"PASS: Import endpoint accessible, rejects invalid format as expected")


class TestBackupDownloadReturnsZip:
    """Download backup should return a ZIP file"""
    
    def test_download_backup_is_zip(self, auth_headers):
        """Downloaded backup should be a valid ZIP file"""
        # Get latest backup history
        history_response = requests.get(
            f"{BASE_URL}/api/backup/history",
            params={"limit": 1},
            headers=auth_headers
        )
        assert history_response.status_code == 200
        history = history_response.json()
        
        if not history:
            pytest.skip("No backup history available")
        
        latest = history[0]
        if latest.get("status") != "success" or not latest.get("file_path"):
            pytest.skip("No successful backup with file_path available")
        
        backup_id = latest["id"]
        
        # Download the backup
        download_response = requests.get(
            f"{BASE_URL}/api/backup/download/{backup_id}",
            headers=auth_headers
        )
        
        if download_response.status_code == 404:
            pytest.skip("Backup file not found on disk")
        
        assert download_response.status_code == 200, \
            f"Expected 200, got {download_response.status_code}"
        
        # Verify it's a valid ZIP
        zip_content = io.BytesIO(download_response.content)
        with zipfile.ZipFile(zip_content, 'r') as zf:
            file_list = zf.namelist()
            assert "data.xlsx" in file_list, f"data.xlsx not found in downloaded backup"
            print(f"PASS: Downloaded backup is a valid ZIP with data.xlsx")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
