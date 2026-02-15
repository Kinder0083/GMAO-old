"""
Tests for Backup API routes
- CRUD for backup schedules
- Run backup now
- Backup history
- Backup status
- Google Drive status
- Download backup
- Validation (retention_count 1-5)
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


@pytest.fixture(scope="module")
def auth_headers():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@test.com",
        "password": "Admin123!"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    token = response.json().get("access_token") or response.json().get("token")
    return {"Authorization": f"Bearer {token}"}


class TestBackupStatus:
    """Test backup status endpoint"""

    def test_get_backup_status(self, auth_headers):
        """GET /api/backup/status - Get last backup status"""
        response = requests.get(f"{BASE_URL}/api/backup/status", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        # Should have status field
        assert "status" in data
        print(f"Backup status: {data}")

    def test_backup_status_unauthorized(self):
        """GET /api/backup/status - Should require auth"""
        response = requests.get(f"{BASE_URL}/api/backup/status")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestBackupHistory:
    """Test backup history endpoint"""

    def test_get_backup_history(self, auth_headers):
        """GET /api/backup/history - Get backup history"""
        response = requests.get(f"{BASE_URL}/api/backup/history", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Backup history count: {len(data)}")
        if len(data) > 0:
            entry = data[0]
            assert "id" in entry
            assert "status" in entry
            print(f"Latest backup: status={entry.get('status')}, started_at={entry.get('started_at')}")

    def test_backup_history_with_limit(self, auth_headers):
        """GET /api/backup/history?limit=5 - Get limited history"""
        response = requests.get(f"{BASE_URL}/api/backup/history?limit=5", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) <= 5

    def test_backup_history_unauthorized(self):
        """GET /api/backup/history - Should require auth"""
        response = requests.get(f"{BASE_URL}/api/backup/history")
        assert response.status_code in [401, 403]


class TestGoogleDriveStatus:
    """Test Google Drive status endpoint"""

    def test_get_drive_status(self, auth_headers):
        """GET /api/backup/drive/status - Get Google Drive connection status"""
        response = requests.get(f"{BASE_URL}/api/backup/drive/status", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "connected" in data
        # Should be False since no OAuth configured
        assert data["connected"] == False, "Expected connected:false since no Google OAuth configured"
        print(f"Drive status: {data}")

    def test_drive_status_unauthorized(self):
        """GET /api/backup/drive/status - Should require auth"""
        response = requests.get(f"{BASE_URL}/api/backup/drive/status")
        assert response.status_code in [401, 403]


class TestBackupSchedulesCRUD:
    """Test backup schedules CRUD operations"""

    @pytest.fixture(autouse=True)
    def setup(self, auth_headers):
        """Store auth headers for all tests"""
        self.headers = auth_headers

    def test_list_schedules(self, auth_headers):
        """GET /api/backup/schedules - List all schedules"""
        response = requests.get(f"{BASE_URL}/api/backup/schedules", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} schedule(s)")
        for s in data:
            print(f"  - Schedule {s.get('id')}: {s.get('frequency')}, enabled={s.get('enabled')}")

    def test_create_schedule_daily(self, auth_headers):
        """POST /api/backup/schedules - Create daily backup schedule"""
        payload = {
            "frequency": "daily",
            "hour": 3,
            "minute": 30,
            "destination": "local",
            "retention_count": 3,
            "email_recipient": None,
            "enabled": True
        }
        response = requests.post(f"{BASE_URL}/api/backup/schedules", json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["frequency"] == "daily"
        assert data["hour"] == 3
        assert data["retention_count"] == 3
        print(f"Created schedule: {data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/backup/schedules/{data['id']}", headers=auth_headers)

    def test_create_schedule_weekly(self, auth_headers):
        """POST /api/backup/schedules - Create weekly backup schedule"""
        payload = {
            "frequency": "weekly",
            "day_of_week": 0,  # Monday
            "hour": 2,
            "minute": 0,
            "destination": "local",
            "retention_count": 5,
            "enabled": True
        }
        response = requests.post(f"{BASE_URL}/api/backup/schedules", json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["frequency"] == "weekly"
        assert data["day_of_week"] == 0
        print(f"Created weekly schedule: {data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/backup/schedules/{data['id']}", headers=auth_headers)

    def test_create_schedule_monthly(self, auth_headers):
        """POST /api/backup/schedules - Create monthly backup schedule"""
        payload = {
            "frequency": "monthly",
            "day_of_month": 15,
            "hour": 1,
            "minute": 0,
            "destination": "local",
            "retention_count": 2,
            "enabled": True
        }
        response = requests.post(f"{BASE_URL}/api/backup/schedules", json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["frequency"] == "monthly"
        assert data["day_of_month"] == 15
        print(f"Created monthly schedule: {data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/backup/schedules/{data['id']}", headers=auth_headers)

    def test_update_schedule(self, auth_headers):
        """PUT /api/backup/schedules/{id} - Update schedule"""
        # Create first
        create_payload = {
            "frequency": "daily",
            "hour": 4,
            "minute": 0,
            "destination": "local",
            "retention_count": 3,
            "enabled": True
        }
        create_res = requests.post(f"{BASE_URL}/api/backup/schedules", json=create_payload, headers=auth_headers)
        assert create_res.status_code == 200
        schedule_id = create_res.json()["id"]
        
        # Update
        update_payload = {
            "hour": 5,
            "retention_count": 4,
            "enabled": False
        }
        response = requests.put(f"{BASE_URL}/api/backup/schedules/{schedule_id}", json=update_payload, headers=auth_headers)
        assert response.status_code == 200, f"Update failed: {response.text}"
        data = response.json()
        assert data["hour"] == 5
        assert data["retention_count"] == 4
        assert data["enabled"] == False
        print(f"Updated schedule: {schedule_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/backup/schedules/{schedule_id}", headers=auth_headers)

    def test_delete_schedule(self, auth_headers):
        """DELETE /api/backup/schedules/{id} - Delete schedule"""
        # Create first
        create_payload = {
            "frequency": "daily",
            "hour": 6,
            "minute": 0,
            "destination": "local",
            "retention_count": 3,
            "enabled": True
        }
        create_res = requests.post(f"{BASE_URL}/api/backup/schedules", json=create_payload, headers=auth_headers)
        assert create_res.status_code == 200
        schedule_id = create_res.json()["id"]
        
        # Delete
        response = requests.delete(f"{BASE_URL}/api/backup/schedules/{schedule_id}", headers=auth_headers)
        assert response.status_code == 200
        
        # Verify deleted
        get_res = requests.get(f"{BASE_URL}/api/backup/schedules", headers=auth_headers)
        schedules = get_res.json()
        assert not any(s["id"] == schedule_id for s in schedules), "Schedule should be deleted"
        print(f"Deleted schedule: {schedule_id}")

    def test_schedules_unauthorized(self):
        """Schedules endpoints should require auth"""
        response = requests.get(f"{BASE_URL}/api/backup/schedules")
        assert response.status_code in [401, 403]
        
        response = requests.post(f"{BASE_URL}/api/backup/schedules", json={})
        assert response.status_code in [401, 403]


class TestBackupValidation:
    """Test backup validation rules"""

    def test_retention_count_max_5(self, auth_headers):
        """POST /api/backup/schedules - retention_count > 5 should fail"""
        payload = {
            "frequency": "daily",
            "hour": 2,
            "minute": 0,
            "destination": "local",
            "retention_count": 6,  # Invalid - max is 5
            "enabled": True
        }
        response = requests.post(f"{BASE_URL}/api/backup/schedules", json=payload, headers=auth_headers)
        assert response.status_code == 400, f"Expected 400 for retention_count=6, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        print(f"Validation error for retention_count=6: {data['detail']}")

    def test_retention_count_min_1(self, auth_headers):
        """POST /api/backup/schedules - retention_count < 1 should fail"""
        payload = {
            "frequency": "daily",
            "hour": 2,
            "minute": 0,
            "destination": "local",
            "retention_count": 0,  # Invalid - min is 1
            "enabled": True
        }
        response = requests.post(f"{BASE_URL}/api/backup/schedules", json=payload, headers=auth_headers)
        assert response.status_code == 400, f"Expected 400 for retention_count=0, got {response.status_code}"

    def test_retention_count_valid_range(self, auth_headers):
        """POST /api/backup/schedules - retention_count 1-5 should work"""
        for count in [1, 2, 3, 4, 5]:
            payload = {
                "frequency": "daily",
                "hour": 2,
                "minute": 0,
                "destination": "local",
                "retention_count": count,
                "enabled": True
            }
            response = requests.post(f"{BASE_URL}/api/backup/schedules", json=payload, headers=auth_headers)
            assert response.status_code == 200, f"retention_count={count} should be valid"
            schedule_id = response.json()["id"]
            # Cleanup
            requests.delete(f"{BASE_URL}/api/backup/schedules/{schedule_id}", headers=auth_headers)
        print("All retention_count values 1-5 validated successfully")

    def test_gdrive_destination_without_credentials(self, auth_headers):
        """POST /api/backup/schedules - gdrive without OAuth should fail"""
        payload = {
            "frequency": "daily",
            "hour": 2,
            "minute": 0,
            "destination": "gdrive",  # Requires Google Drive connected
            "retention_count": 3,
            "enabled": True
        }
        response = requests.post(f"{BASE_URL}/api/backup/schedules", json=payload, headers=auth_headers)
        assert response.status_code == 400, f"Expected 400 for gdrive without OAuth, got {response.status_code}"
        print(f"Correctly rejected gdrive without credentials: {response.json().get('detail')}")


class TestRunBackupNow:
    """Test manual backup execution"""

    def test_run_backup_now(self, auth_headers):
        """POST /api/backup/run - Execute manual backup"""
        response = requests.post(f"{BASE_URL}/api/backup/run", headers=auth_headers)
        assert response.status_code == 200, f"Backup run failed: {response.text}"
        data = response.json()
        assert "status" in data
        if data["status"] == "success":
            assert "file_size" in data
            assert "module_count" in data
            print(f"Backup completed: {data['module_count']} modules, {data['file_size']} bytes")
        else:
            print(f"Backup status: {data}")

    def test_run_backup_unauthorized(self):
        """POST /api/backup/run - Should require auth"""
        response = requests.post(f"{BASE_URL}/api/backup/run")
        assert response.status_code in [401, 403]


class TestBackupDownload:
    """Test backup file download"""

    def test_download_backup_not_found(self, auth_headers):
        """GET /api/backup/download/{id} - Non-existent ID returns 404"""
        response = requests.get(f"{BASE_URL}/api/backup/download/000000000000000000000000", headers=auth_headers)
        assert response.status_code == 404

    def test_download_existing_backup(self, auth_headers):
        """GET /api/backup/download/{id} - Download existing backup"""
        # First get history to find an existing backup
        history_res = requests.get(f"{BASE_URL}/api/backup/history?limit=5", headers=auth_headers)
        assert history_res.status_code == 200
        history = history_res.json()
        
        if len(history) > 0:
            # Find a successful backup with file_path
            for entry in history:
                if entry.get("status") == "success" and entry.get("file_path"):
                    backup_id = entry["id"]
                    response = requests.get(f"{BASE_URL}/api/backup/download/{backup_id}", headers=auth_headers)
                    # Could be 200 (file exists) or 404 (file deleted)
                    assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
                    if response.status_code == 200:
                        assert "application" in response.headers.get("content-type", "")
                        print(f"Downloaded backup {backup_id}: {len(response.content)} bytes")
                    else:
                        print(f"Backup file not available locally: {backup_id}")
                    return
        print("No backup with file_path found to download")


class TestDriveConnect:
    """Test Google Drive OAuth connection"""

    def test_drive_connect_without_credentials(self, auth_headers):
        """GET /api/backup/drive/connect - Should fail without OAuth config"""
        response = requests.get(f"{BASE_URL}/api/backup/drive/connect", headers=auth_headers)
        # Expected 400 because GOOGLE_CLIENT_ID/SECRET not configured
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        print(f"Drive connect response: {data['detail']}")

    def test_drive_connect_unauthorized(self):
        """GET /api/backup/drive/connect - Should require auth"""
        response = requests.get(f"{BASE_URL}/api/backup/drive/connect")
        assert response.status_code in [401, 403]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
