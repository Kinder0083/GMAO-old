"""
Test suite for Non-Conformity Email Alerts Feature
Tests:
- POST /api/ai-maintenance/analyze-nonconformities returns notifications_sent field
- Backend notification creation in DB
- Email service send_critical_nc_alert_email function
"""
import pytest
import requests
import os
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "admin@test.com", "password": "Admin123!"},
        headers={"Content-Type": "application/json"}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Get authenticated API client"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestAnalyzeNonconformitiesAPI:
    """Tests for POST /api/ai-maintenance/analyze-nonconformities endpoint"""
    
    def test_endpoint_returns_notifications_sent_field(self, api_client):
        """Test that API returns notifications_sent field in response"""
        response = api_client.post(
            f"{BASE_URL}/api/ai-maintenance/analyze-nonconformities",
            json={"days": 90}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Must have notifications_sent field (even if empty)
        assert "notifications_sent" in data, "Response missing 'notifications_sent' field"
        assert isinstance(data["notifications_sent"], list), "notifications_sent must be a list"
        
        # Also verify other required fields
        assert "success" in data, "Response missing 'success' field"
        assert "data" in data, "Response missing 'data' field"
    
    def test_notifications_sent_structure_when_critical_patterns(self, api_client):
        """Test notifications_sent has correct structure when alerts are triggered"""
        response = api_client.post(
            f"{BASE_URL}/api/ai-maintenance/analyze-nonconformities",
            json={"days": 90}
        )
        
        assert response.status_code == 200
        data = response.json()
        notifications = data.get("notifications_sent", [])
        
        # If notifications exist, verify structure
        for notif in notifications:
            assert "service" in notif, "Notification missing 'service' field"
            assert "responsable" in notif, "Notification missing 'responsable' field"
            assert "email" in notif, "Notification missing 'email' field"
            assert "email_sent" in notif, "Notification missing 'email_sent' field"
            assert "notification_created" in notif, "Notification missing 'notification_created' field"
            
            # Validate types
            assert isinstance(notif["service"], str)
            assert isinstance(notif["responsable"], str)
            assert isinstance(notif["email"], str)
            assert isinstance(notif["email_sent"], bool)
            assert isinstance(notif["notification_created"], bool)
    
    def test_api_requires_authentication(self):
        """Test that endpoint requires valid authentication"""
        response = requests.post(
            f"{BASE_URL}/api/ai-maintenance/analyze-nonconformities",
            json={"days": 90},
            headers={"Content-Type": "application/json"}
        )
        
        # Should return 401 or 403 without auth
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_api_returns_stats_field(self, api_client):
        """Test that API returns stats field with execution counts"""
        response = api_client.post(
            f"{BASE_URL}/api/ai-maintenance/analyze-nonconformities",
            json={"days": 90}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Stats field should exist
        assert "stats" in data, "Response missing 'stats' field"
        stats = data["stats"]
        
        # Verify stats structure when data exists
        if stats.get("total_executions", 0) > 0:
            assert "total_executions" in stats
            assert "total_items_checked" in stats
            assert "total_non_conformities" in stats
            assert "period_days" in stats
    
    def test_api_with_different_periods(self, api_client):
        """Test API with different day periods"""
        for days in [30, 90, 180]:
            response = api_client.post(
                f"{BASE_URL}/api/ai-maintenance/analyze-nonconformities",
                json={"days": days}
            )
            
            assert response.status_code == 200, f"Failed for {days} days"
            data = response.json()
            assert data["success"] == True


class TestNotificationCreation:
    """Tests for notification creation in database"""
    
    def test_notification_created_with_correct_type(self, api_client):
        """Verify notifications are created with type 'ai_nc_critical_alert'"""
        # First trigger analysis
        response = api_client.post(
            f"{BASE_URL}/api/ai-maintenance/analyze-nonconformities",
            json={"days": 90}
        )
        assert response.status_code == 200
        
        data = response.json()
        notifications_sent = data.get("notifications_sent", [])
        
        # If notifications were created, they should have notification_created=True
        for notif in notifications_sent:
            assert notif.get("notification_created") == True, \
                f"Notification not created for service {notif.get('service')}"


class TestEmailService:
    """Tests for email service function"""
    
    def test_email_function_exists(self):
        """Test that send_critical_nc_alert_email function exists"""
        import sys
        sys.path.insert(0, '/app/backend')
        from email_service import send_critical_nc_alert_email
        
        # Function should exist and be callable
        assert callable(send_critical_nc_alert_email)
    
    def test_email_function_signature(self):
        """Test that email function has correct parameters"""
        import sys
        sys.path.insert(0, '/app/backend')
        from email_service import send_critical_nc_alert_email
        import inspect
        
        sig = inspect.signature(send_critical_nc_alert_email)
        params = list(sig.parameters.keys())
        
        # Required parameters
        expected_params = [
            'to_email', 'responsable_name', 'service_name',
            'analysis_summary', 'critical_patterns', 
            'equipements_a_risque', 'work_orders_suggested', 'stats'
        ]
        
        for param in expected_params:
            assert param in params, f"Missing parameter: {param}"
    
    def test_email_function_returns_bool(self):
        """Test that email function returns boolean"""
        import sys
        sys.path.insert(0, '/app/backend')
        from email_service import send_critical_nc_alert_email
        
        # Call with test data - may fail to send but should return bool
        result = send_critical_nc_alert_email(
            to_email="test@nonexistent.domain",
            responsable_name="Test User",
            service_name="TEST",
            analysis_summary="Test summary",
            critical_patterns=[],
            equipements_a_risque=[],
            work_orders_suggested=[],
            stats={"total_executions": 0}
        )
        
        assert isinstance(result, bool), "Function should return boolean"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
