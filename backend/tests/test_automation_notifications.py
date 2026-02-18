"""
Test Suite: Automation Notifications Push System
Tests the new test-trigger endpoint and notification creation for automations.
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Known automation ID from context
AUTOMATION_ID = "a2498612-f32b-43e5-a172-d03eac20858f"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@test.com",
        "password": "Admin123!"
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping tests")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Create auth headers"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestAutomationTestTrigger:
    """Test automation test-trigger endpoint"""
    
    def test_automations_list(self, auth_headers):
        """Test: GET /api/automations/list returns automation list with expected structure"""
        response = requests.get(f"{BASE_URL}/api/automations/list", headers=auth_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") is True
        assert "automations" in data
        assert isinstance(data["automations"], list)
        
        # Check if our automation exists
        automation_found = False
        for auto in data["automations"]:
            if auto.get("id") == AUTOMATION_ID:
                automation_found = True
                assert "name" in auto
                assert "type" in auto
                assert "enabled" in auto
                assert "trigger_count" in auto
                print(f"Found automation: {auto.get('name')}, trigger_count: {auto.get('trigger_count')}, last_triggered: {auto.get('last_triggered')}")
                break
        
        print(f"Automation {AUTOMATION_ID} found: {automation_found}")
    
    def test_automation_test_trigger_success(self, auth_headers):
        """Test: POST /api/automations/test-trigger/{id} creates notification and increments counter"""
        # Get initial state
        list_response = requests.get(f"{BASE_URL}/api/automations/list", headers=auth_headers)
        initial_count = 0
        for auto in list_response.json().get("automations", []):
            if auto.get("id") == AUTOMATION_ID:
                initial_count = auto.get("trigger_count", 0)
                break
        
        # Trigger automation
        response = requests.post(
            f"{BASE_URL}/api/automations/test-trigger/{AUTOMATION_ID}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") is True
        assert "message" in data
        assert "notification_id" in data
        
        print(f"Test trigger response: {data}")
        
        # Verify counter was incremented
        list_response2 = requests.get(f"{BASE_URL}/api/automations/list", headers=auth_headers)
        new_count = 0
        new_last_triggered = None
        for auto in list_response2.json().get("automations", []):
            if auto.get("id") == AUTOMATION_ID:
                new_count = auto.get("trigger_count", 0)
                new_last_triggered = auto.get("last_triggered")
                break
        
        assert new_count == initial_count + 1, f"Expected trigger_count to increment from {initial_count} to {initial_count + 1}, got {new_count}"
        assert new_last_triggered is not None, "last_triggered should be set after trigger"
        
        print(f"Trigger count incremented: {initial_count} -> {new_count}")
        print(f"Last triggered: {new_last_triggered}")
    
    def test_automation_test_trigger_invalid_id(self, auth_headers):
        """Test: POST /api/automations/test-trigger with invalid ID returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/automations/test-trigger/invalid-id-12345",
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404 for invalid ID, got {response.status_code}"
        print("Invalid ID correctly returns 404")


class TestNotificationsWithAutomationType:
    """Test notifications API for automation_trigger type"""
    
    def test_notifications_list_contains_automation_trigger(self, auth_headers):
        """Test: GET /api/notifications returns notifications including automation_trigger type"""
        response = requests.get(
            f"{BASE_URL}/api/notifications",
            params={"unread_only": False, "limit": 50},
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Data could be a list directly or wrapped in 'notifications' key
        notifications = data if isinstance(data, list) else data.get("data", data)
        
        # Find automation_trigger notifications
        automation_notifs = [n for n in notifications if n.get("type") == "automation_trigger"]
        
        print(f"Total notifications: {len(notifications)}")
        print(f"Automation trigger notifications: {len(automation_notifs)}")
        
        assert len(automation_notifs) > 0, "Expected at least one automation_trigger notification after test-trigger"
        
        # Verify structure of automation notification
        notif = automation_notifs[0]
        assert "id" in notif
        assert "type" in notif
        assert notif["type"] == "automation_trigger"
        assert "title" in notif
        assert "message" in notif
        assert "metadata" in notif
        assert notif["metadata"].get("is_automation_notification") is True
        
        print(f"Sample automation notification: title='{notif.get('title')}', priority='{notif.get('priority')}'")
        print(f"Metadata: {notif.get('metadata')}")
    
    def test_notification_fields_correct(self, auth_headers):
        """Test: Automation notification has correct fields (title, message, metadata)"""
        response = requests.get(
            f"{BASE_URL}/api/notifications",
            params={"unread_only": False, "limit": 20},
            headers=auth_headers
        )
        
        data = response.json()
        notifications = data if isinstance(data, list) else data.get("data", data)
        
        # Find automation_trigger notification
        for notif in notifications:
            if notif.get("type") == "automation_trigger":
                # Check required fields
                assert "title" in notif, "Notification should have title"
                assert "Automatisation" in notif.get("title", ""), "Title should mention 'Automatisation'"
                
                assert "message" in notif, "Notification should have message"
                assert "[TEST]" in notif.get("message", "") or "TEST" in str(notif.get("metadata", {})), "Should indicate it's a test notification"
                
                metadata = notif.get("metadata", {})
                assert metadata.get("is_automation_notification") is True, "Metadata should have is_automation_notification=true"
                
                # Optional but expected fields
                if "link" in notif:
                    assert "/surveillance-ai-dashboard" in notif.get("link", ""), "Link should navigate to AI dashboard"
                
                print(f"Notification verified: {notif.get('title')}")
                print(f"Link: {notif.get('link')}")
                return
        
        pytest.fail("No automation_trigger notification found to verify")


class TestNotificationCount:
    """Test notification count endpoint"""
    
    def test_notification_count(self, auth_headers):
        """Test: GET /api/notifications/count returns unread count"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/count",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        print(f"Notification count response: {data}")
        
        # Check structure
        assert "unread_count" in data or isinstance(data.get("data", {}).get("unread_count"), int)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
