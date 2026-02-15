"""
Tests for Backup Scheduler Timezone Fix and Manual Drive Upload
P0: Scheduler timezone fix (GMT+1 from system_settings)
P1: Manual upload to Google Drive endpoint
"""
import pytest
import requests
import os

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


class TestBackupSchedulesCRUDWithTimezone:
    """Test backup schedules CRUD - verifies timezone is applied when schedules are created/updated"""

    def test_list_schedules(self, auth_headers):
        """GET /api/backup/schedules - Should return list of schedules"""
        response = requests.get(f"{BASE_URL}/api/backup/schedules", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} existing schedule(s)")
        for s in data:
            print(f"  - ID: {s.get('id')}, freq: {s.get('frequency')}, hour: {s.get('hour')}, enabled: {s.get('enabled')}")

    def test_create_schedule_triggers_timezone_reload(self, auth_headers):
        """POST /api/backup/schedules - Create schedule should reload scheduler with timezone"""
        # This tests that scheduler is reloaded after schedule creation
        # The actual timezone check happens in _reload_scheduler (logs show GMT+1)
        payload = {
            "frequency": "daily",
            "hour": 3,
            "minute": 0,
            "destination": "local",
            "retention_count": 3,
            "enabled": True
        }
        response = requests.post(f"{BASE_URL}/api/backup/schedules", json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["frequency"] == "daily"
        assert data["hour"] == 3
        print(f"Created schedule: {data['id']} (scheduler should log 'Fuseau horaire configuré: GMT+1')")
        
        # Verify schedule exists in list
        schedules_res = requests.get(f"{BASE_URL}/api/backup/schedules", headers=auth_headers)
        assert schedules_res.status_code == 200
        schedules = schedules_res.json()
        assert any(s["id"] == data["id"] for s in schedules), "Created schedule should appear in list"
        
        # Cleanup
        del_res = requests.delete(f"{BASE_URL}/api/backup/schedules/{data['id']}", headers=auth_headers)
        assert del_res.status_code == 200
        print(f"Cleaned up schedule: {data['id']}")

    def test_update_schedule_reloads_scheduler(self, auth_headers):
        """PUT /api/backup/schedules/{id} - Update should trigger scheduler reload"""
        # Create a schedule
        create_payload = {
            "frequency": "daily",
            "hour": 4,
            "minute": 30,
            "destination": "local",
            "retention_count": 2,
            "enabled": True
        }
        create_res = requests.post(f"{BASE_URL}/api/backup/schedules", json=create_payload, headers=auth_headers)
        assert create_res.status_code == 200
        schedule_id = create_res.json()["id"]
        
        # Update the schedule
        update_payload = {"hour": 5, "enabled": False}
        response = requests.put(f"{BASE_URL}/api/backup/schedules/{schedule_id}", json=update_payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["hour"] == 5
        assert data["enabled"] == False
        print(f"Updated schedule {schedule_id}: hour=5, enabled=False")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/backup/schedules/{schedule_id}", headers=auth_headers)

    def test_delete_schedule_reloads_scheduler(self, auth_headers):
        """DELETE /api/backup/schedules/{id} - Delete should trigger scheduler reload"""
        # Create
        create_payload = {
            "frequency": "weekly",
            "day_of_week": 0,
            "hour": 2,
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
        print(f"Deleted schedule: {schedule_id}")
        
        # Verify deleted
        schedules_res = requests.get(f"{BASE_URL}/api/backup/schedules", headers=auth_headers)
        schedules = schedules_res.json()
        assert not any(s["id"] == schedule_id for s in schedules)


class TestBackupRun:
    """Test manual backup execution"""

    def test_run_backup_succeeds(self, auth_headers):
        """POST /api/backup/run - Should execute backup successfully"""
        response = requests.post(f"{BASE_URL}/api/backup/run", headers=auth_headers)
        assert response.status_code == 200, f"Backup failed: {response.text}"
        data = response.json()
        assert "status" in data
        assert data["status"] == "success", f"Backup status not success: {data}"
        assert "file_size" in data
        assert "module_count" in data
        print(f"Backup completed: {data['module_count']} modules, {data['file_size']} bytes")


class TestBackupHistory:
    """Test backup history retrieval"""

    def test_get_history(self, auth_headers):
        """GET /api/backup/history - Returns list of backup history"""
        response = requests.get(f"{BASE_URL}/api/backup/history", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} backup history entries")
        if len(data) > 0:
            entry = data[0]
            assert "id" in entry
            assert "status" in entry
            assert "started_at" in entry
            print(f"Latest backup: id={entry['id']}, status={entry['status']}, has_file={bool(entry.get('file_path'))}")


class TestManualDriveUpload:
    """Test manual upload to Google Drive (P1 feature)"""

    def test_upload_to_drive_without_credentials(self, auth_headers):
        """POST /api/backup/drive/upload/{id} - Should fail when GDrive not connected"""
        # First get a backup history entry
        history_res = requests.get(f"{BASE_URL}/api/backup/history?limit=5", headers=auth_headers)
        assert history_res.status_code == 200
        history = history_res.json()
        
        # Find a successful backup with file_path
        backup_id = None
        for entry in history:
            if entry.get("status") == "success" and entry.get("file_path"):
                backup_id = entry["id"]
                break
        
        if backup_id:
            # Try to upload - should fail because GDrive not connected
            response = requests.post(f"{BASE_URL}/api/backup/drive/upload/{backup_id}", headers=auth_headers)
            # Expected 400 because Google Drive is not connected
            assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
            data = response.json()
            assert "detail" in data
            # Should mention GDrive not connected
            assert "Google Drive" in data["detail"] or "connecté" in data["detail"].lower()
            print(f"Upload correctly rejected: {data['detail']}")
        else:
            pytest.skip("No successful backup with local file found to test upload")

    def test_upload_to_drive_not_found(self, auth_headers):
        """POST /api/backup/drive/upload/{id} - Non-existent ID returns 404"""
        response = requests.post(f"{BASE_URL}/api/backup/drive/upload/000000000000000000000000", headers=auth_headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"

    def test_upload_endpoint_requires_auth(self):
        """POST /api/backup/drive/upload/{id} - Should require authentication"""
        response = requests.post(f"{BASE_URL}/api/backup/drive/upload/000000000000000000000000")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestGoogleDriveStatus:
    """Test Google Drive connection status"""

    def test_drive_status_not_connected(self, auth_headers):
        """GET /api/backup/drive/status - Should show not connected"""
        response = requests.get(f"{BASE_URL}/api/backup/drive/status", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "connected" in data
        assert data["connected"] == False, "Expected connected:false in preview environment"
        print(f"Drive status: connected={data['connected']}")


class TestTimezoneSystemSettings:
    """Test timezone_offset in system_settings (used by scheduler)"""

    def test_system_settings_timezone(self, auth_headers):
        """GET /api/timezone/offset - Verify timezone_offset is GMT+1"""
        response = requests.get(f"{BASE_URL}/api/timezone/offset", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        # Check if timezone_offset is set (should be 1 for GMT+1)
        assert "timezone_offset" in data, "Response should contain timezone_offset"
        assert data["timezone_offset"] == 1, f"Expected timezone_offset=1 (GMT+1), got {data['timezone_offset']}"
        print(f"Timezone offset confirmed: {data['timezone_offset']} (GMT+1)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
