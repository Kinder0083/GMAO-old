"""
Test suite for new features:
1. Changelog popup (GET /api/changelog, POST /api/changelog/mark-seen)
2. Menu badges - NEW badges (GET /api/menu-badges, POST /api/menu-badges/dismiss)
3. Update warning broadcast (POST /api/updates/broadcast-warning)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestAuth:
    """Get authentication token"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@test.com", "password": "Admin123!"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        return data["access_token"]

    def test_auth_login(self, auth_token):
        """Verify login works"""
        assert auth_token is not None
        assert len(auth_token) > 0
        print(f"✅ Login successful, token received")


class TestChangelogEndpoints:
    """Test changelog popup endpoints"""

    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@test.com", "password": "Admin123!"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_get_changelog(self, auth_token):
        """GET /api/changelog - returns entries list with unseen_count"""
        response = requests.get(
            f"{BASE_URL}/api/changelog",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Should have entries array and unseen_count
        assert "entries" in data, "Response should contain 'entries'"
        assert "unseen_count" in data, "Response should contain 'unseen_count'"
        assert isinstance(data["entries"], list), "entries should be a list"
        assert isinstance(data["unseen_count"], int), "unseen_count should be an integer"
        print(f"✅ GET /api/changelog returns {len(data['entries'])} entries, {data['unseen_count']} unseen")
    
    def test_mark_changelog_seen(self, auth_token):
        """POST /api/changelog/mark-seen - marks all entries as seen"""
        response = requests.post(
            f"{BASE_URL}/api/changelog/mark-seen",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "success" in data
        assert data["success"] == True
        print(f"✅ POST /api/changelog/mark-seen returned success: True")


class TestMenuBadgesEndpoints:
    """Test menu badges (NEW badges) endpoints"""

    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@test.com", "password": "Admin123!"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_get_menu_badges(self, auth_token):
        """GET /api/menu-badges - returns new_menu_ids list"""
        response = requests.get(
            f"{BASE_URL}/api/menu-badges",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "new_menu_ids" in data, "Response should contain 'new_menu_ids'"
        assert isinstance(data["new_menu_ids"], list), "new_menu_ids should be a list"
        
        # For first time users, should include these IDs
        expected_ids = ["mes", "mes-reports", "analytics-checklists", "service-dashboard", "cameras", "weekly-reports"]
        print(f"✅ GET /api/menu-badges returns new_menu_ids: {data['new_menu_ids']}")
        
        # Verify at least some of the expected IDs are present or list is empty (already dismissed)
        if len(data["new_menu_ids"]) > 0:
            for menu_id in data["new_menu_ids"]:
                assert menu_id in expected_ids, f"Unexpected menu ID: {menu_id}"
            print(f"✅ All returned menu IDs are valid: {data['new_menu_ids']}")
    
    def test_dismiss_menu_badges(self, auth_token):
        """POST /api/menu-badges/dismiss - marks badges as seen"""
        response = requests.post(
            f"{BASE_URL}/api/menu-badges/dismiss",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "success" in data
        assert data["success"] == True
        print(f"✅ POST /api/menu-badges/dismiss returned success: True")
    
    def test_menu_badges_after_dismiss(self, auth_token):
        """Verify badges are empty after dismissal"""
        response = requests.get(
            f"{BASE_URL}/api/menu-badges",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # After dismiss, new_menu_ids should be empty
        assert data["new_menu_ids"] == [], f"Expected empty list after dismiss, got: {data['new_menu_ids']}"
        print(f"✅ Menu badges empty after dismiss as expected")


class TestUpdateWarningBroadcast:
    """Test update warning broadcast endpoint (admin only)"""

    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@test.com", "password": "Admin123!"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_broadcast_warning(self, auth_token):
        """POST /api/updates/broadcast-warning - broadcasts warning to all users"""
        response = requests.post(
            f"{BASE_URL}/api/updates/broadcast-warning",
            params={"version": "test-1.0.0"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "success" in data, "Response should contain 'success'"
        assert data["success"] == True, "Broadcast should be successful"
        assert "connected_users" in data, "Response should contain 'connected_users'"
        assert isinstance(data["connected_users"], int), "connected_users should be an integer"
        assert "message" in data, "Response should contain 'message'"
        
        print(f"✅ POST /api/updates/broadcast-warning returned success: True")
        print(f"   Connected users: {data['connected_users']}")
        print(f"   Message: {data['message']}")


class TestUpdateStatusEndpoints:
    """Test update status endpoints"""

    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@test.com", "password": "Admin123!"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_updates_status(self, auth_token):
        """GET /api/updates/status - check for available updates"""
        response = requests.get(
            f"{BASE_URL}/api/updates/status",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        # This endpoint may return 200 or 500 depending on GitHub connectivity
        assert response.status_code in [200, 500], f"Expected 200 or 500, got {response.status_code}"
        if response.status_code == 200:
            data = response.json()
            print(f"✅ GET /api/updates/status returned: {data}")
        else:
            print(f"⚠️ GET /api/updates/status returned 500 (GitHub may be unreachable)")
    
    def test_updates_history_list(self, auth_token):
        """GET /api/updates/history-list - get update history"""
        response = requests.get(
            f"{BASE_URL}/api/updates/history-list",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "data" in data, "Response should contain 'data'"
        assert "total" in data, "Response should contain 'total'"
        assert isinstance(data["data"], list), "data should be a list"
        print(f"✅ GET /api/updates/history-list returned {data['total']} history entries")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
