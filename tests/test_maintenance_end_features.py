"""
Test suite for 'Fin Anticipée de Maintenance' and 'Maintenance Status Pending Alert' features

Features tested:
1. API /api/demandes-arret/pending-status-update - returns maintenances awaiting new status
2. API PATCH /api/equipments/{id}/status - returns requires_confirmation when maintenance in progress
3. Early maintenance termination flow
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://supervisor-crash.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@test.com"
ADMIN_PASSWORD = "password"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for API calls"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with authentication"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestPendingStatusUpdateAPI:
    """Tests for /api/demandes-arret/pending-status-update endpoint"""
    
    def test_pending_status_update_endpoint_exists(self, auth_headers):
        """Test that the pending-status-update endpoint exists and returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/demandes-arret/pending-status-update",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_pending_status_update_response_structure(self, auth_headers):
        """Test that the response has correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/demandes-arret/pending-status-update",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check response structure
        assert "count" in data, "Response should have 'count' field"
        assert "maintenances" in data, "Response should have 'maintenances' field"
        assert isinstance(data["count"], int), "count should be an integer"
        assert isinstance(data["maintenances"], list), "maintenances should be a list"
    
    def test_pending_maintenance_item_structure(self, auth_headers):
        """Test that each pending maintenance item has required fields"""
        response = requests.get(
            f"{BASE_URL}/api/demandes-arret/pending-status-update",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # If there are pending maintenances, check their structure
        if data["count"] > 0:
            maintenance = data["maintenances"][0]
            required_fields = ["id", "equipement_ids", "equipement_noms", "date_debut", "date_fin"]
            for field in required_fields:
                assert field in maintenance, f"Maintenance item should have '{field}' field"
            
            # Check that end_maintenance_token is present for status selection
            assert "end_maintenance_token" in maintenance, "Should have end_maintenance_token for status selection"


class TestEquipmentStatusUpdateAPI:
    """Tests for PATCH /api/equipments/{id}/status endpoint with maintenance confirmation"""
    
    def test_get_equipments_list(self, auth_headers):
        """Test getting list of equipments"""
        response = requests.get(
            f"{BASE_URL}/api/equipments",
            headers=auth_headers
        )
        assert response.status_code == 200
        equipments = response.json()
        assert isinstance(equipments, list), "Should return a list of equipments"
        print(f"Found {len(equipments)} equipments")
        return equipments
    
    def test_equipment_status_update_basic(self, auth_headers):
        """Test basic equipment status update (without maintenance)"""
        # First get an equipment
        response = requests.get(
            f"{BASE_URL}/api/equipments",
            headers=auth_headers
        )
        assert response.status_code == 200
        equipments = response.json()
        
        if len(equipments) == 0:
            pytest.skip("No equipments available for testing")
        
        # Find an equipment that is OPERATIONNEL (not in maintenance)
        test_equipment = None
        for eq in equipments:
            if eq.get("statut") == "OPERATIONNEL":
                test_equipment = eq
                break
        
        if not test_equipment:
            # Use first equipment
            test_equipment = equipments[0]
        
        eq_id = test_equipment["id"]
        current_status = test_equipment.get("statut", "OPERATIONNEL")
        
        # Try to update status
        response = requests.patch(
            f"{BASE_URL}/api/equipments/{eq_id}/status",
            params={"statut": current_status, "force": "false"},
            headers=auth_headers
        )
        
        # Should return 200 (either success or requires_confirmation)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Response should either have 'message' (success) or 'requires_confirmation' (maintenance in progress)
        assert "message" in data or "requires_confirmation" in data, \
            f"Response should have 'message' or 'requires_confirmation': {data}"
    
    def test_equipment_status_update_with_force(self, auth_headers):
        """Test equipment status update with force=true parameter"""
        # Get equipments
        response = requests.get(
            f"{BASE_URL}/api/equipments",
            headers=auth_headers
        )
        assert response.status_code == 200
        equipments = response.json()
        
        if len(equipments) == 0:
            pytest.skip("No equipments available for testing")
        
        # Find an equipment in maintenance
        test_equipment = None
        for eq in equipments:
            if eq.get("statut") == "EN_MAINTENANCE":
                test_equipment = eq
                break
        
        if not test_equipment:
            # Use first equipment for basic test
            test_equipment = equipments[0]
            print(f"No equipment in maintenance, using {test_equipment['nom']} for basic test")
        
        eq_id = test_equipment["id"]
        
        # Try to update status with force=true
        response = requests.patch(
            f"{BASE_URL}/api/equipments/{eq_id}/status",
            params={"statut": "OPERATIONNEL", "force": "true"},
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # With force=true, should always succeed
        assert "message" in data, f"Response should have 'message' field: {data}"


class TestEndMaintenanceAPI:
    """Tests for end-maintenance endpoints"""
    
    def test_end_maintenance_info_invalid_token(self, auth_headers):
        """Test that invalid token returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/demandes-arret/end-maintenance",
            params={"token": "invalid-token-12345"},
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404 for invalid token, got {response.status_code}"
    
    def test_end_maintenance_process_invalid_token(self, auth_headers):
        """Test that processing with invalid token returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/demandes-arret/end-maintenance",
            params={"token": "invalid-token-12345", "statut": "OPERATIONNEL"},
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404 for invalid token, got {response.status_code}"


class TestPlanningEquipementsAPI:
    """Tests for planning equipements API"""
    
    def test_get_planning_equipements(self, auth_headers):
        """Test getting planning equipements"""
        response = requests.get(
            f"{BASE_URL}/api/demandes-arret/planning/equipements",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Should return a list"
        print(f"Found {len(data)} planning entries")
    
    def test_get_planning_with_date_filter(self, auth_headers):
        """Test getting planning with date filter"""
        today = datetime.now().strftime("%Y-%m-%d")
        next_month = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/demandes-arret/planning/equipements",
            params={"date_debut": today, "date_fin": next_month},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Should return a list"


class TestDemandesArretAPI:
    """Tests for demandes-arret API"""
    
    def test_get_all_demandes(self, auth_headers):
        """Test getting all demandes d'arret"""
        response = requests.get(
            f"{BASE_URL}/api/demandes-arret/",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Should return a list"
        print(f"Found {len(data)} demandes d'arret")
        
        # Check for approved demandes with end_maintenance_token
        approved_with_token = [d for d in data if d.get("statut") == "APPROUVEE" and d.get("end_maintenance_token")]
        print(f"Found {len(approved_with_token)} approved demandes with end_maintenance_token")
    
    def test_check_end_maintenance_cron(self, auth_headers):
        """Test the check-end-maintenance cron endpoint"""
        response = requests.post(
            f"{BASE_URL}/api/demandes-arret/check-end-maintenance",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "emails_sent" in data, "Response should have 'emails_sent' field"
    
    def test_trigger_reminders(self, auth_headers):
        """Test the trigger-reminders endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/demandes-arret/trigger-reminders",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "status" in data, "Response should have 'status' field"


class TestMaintenanceConfirmationFlow:
    """Integration tests for the maintenance confirmation flow"""
    
    def test_equipment_with_active_maintenance_requires_confirmation(self, auth_headers):
        """Test that changing status of equipment with active maintenance requires confirmation"""
        # Get planning entries to find equipment with active maintenance
        response = requests.get(
            f"{BASE_URL}/api/demandes-arret/planning/equipements",
            headers=auth_headers
        )
        assert response.status_code == 200
        planning_entries = response.json()
        
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Find an active maintenance (date_debut <= today <= date_fin)
        active_maintenance = None
        for entry in planning_entries:
            date_debut = entry.get("date_debut", "")
            date_fin = entry.get("date_fin", "")
            if date_debut <= today <= date_fin:
                active_maintenance = entry
                break
        
        if not active_maintenance:
            print("No active maintenance found for today, skipping confirmation test")
            pytest.skip("No active maintenance found for today")
        
        eq_id = active_maintenance.get("equipement_id")
        print(f"Testing with equipment {eq_id} which has active maintenance")
        
        # Try to change status without force
        response = requests.patch(
            f"{BASE_URL}/api/equipments/{eq_id}/status",
            params={"statut": "OPERATIONNEL", "force": "false"},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should require confirmation
        assert data.get("requires_confirmation") == True, \
            f"Should require confirmation for equipment with active maintenance: {data}"
        assert "maintenance_info" in data, "Should include maintenance_info"
        
        print(f"Confirmation required with maintenance info: {data.get('maintenance_info')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
