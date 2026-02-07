"""
Tests for Presqu'accident (Near Miss) module refactoring
Tests the new ID format, simplified form, treatment dialog, and new statuses
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://gmao-iris-webrtc.preview.emergentagent.com').rstrip('/')

class TestPresquAccidentModule:
    """Test suite for Presqu'accident module refactoring"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: authenticate and get token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "password"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        token = login_response.json().get("access_token")
        assert token, "No access token received"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.user_id = login_response.json().get("user", {}).get("id")
        yield
        
    def test_stats_endpoint_returns_5_stat_categories(self):
        """Test: Stats endpoint returns all 5 stat categories (total, a_traiter, en_cours, termine, risque_residuel)"""
        response = self.session.get(f"{BASE_URL}/api/presqu-accident/stats")
        assert response.status_code == 200, f"Stats endpoint failed: {response.text}"
        
        data = response.json()
        assert "global" in data, "Missing 'global' key in stats response"
        
        global_stats = data["global"]
        # Verify all 5 stat categories exist
        assert "total" in global_stats, "Missing 'total' in global stats"
        assert "a_traiter" in global_stats, "Missing 'a_traiter' in global stats"
        assert "en_cours" in global_stats, "Missing 'en_cours' in global stats"
        assert "termine" in global_stats, "Missing 'termine' in global stats"
        assert "risque_residuel" in global_stats, "Missing 'risque_residuel' in global stats"
        
        # Verify values are integers
        assert isinstance(global_stats["total"], int), "total should be integer"
        assert isinstance(global_stats["a_traiter"], int), "a_traiter should be integer"
        assert isinstance(global_stats["en_cours"], int), "en_cours should be integer"
        assert isinstance(global_stats["termine"], int), "termine should be integer"
        assert isinstance(global_stats["risque_residuel"], int), "risque_residuel should be integer"
        
        print(f"✅ Stats returned: total={global_stats['total']}, a_traiter={global_stats['a_traiter']}, en_cours={global_stats['en_cours']}, termine={global_stats['termine']}, risque_residuel={global_stats['risque_residuel']}")
    
    def test_create_presqu_accident_generates_formatted_numero(self):
        """Test: Creating a presqu'accident generates a numero in format YYYY-NNN"""
        # Create a new presqu'accident with minimal required fields
        create_payload = {
            "titre": "TEST_Presqu_accident_numero_format",
            "description": "Test description for numero format verification",
            "date_incident": datetime.now().strftime("%Y-%m-%d"),
            "lieu": "Test Location",
            "service": "QHSE",
            "severite": "MOYEN"
        }
        
        response = self.session.post(f"{BASE_URL}/api/presqu-accident/items", json=create_payload)
        assert response.status_code in [200, 201], f"Create failed: {response.text}"
        
        data = response.json()
        assert "id" in data, "No ID returned"
        assert "numero" in data, "No numero returned"
        
        numero = data.get("numero")
        # Verify format YYYY-NNN (e.g., 2026-001)
        if numero:
            parts = numero.split("-")
            assert len(parts) == 2, f"Numero format invalid: {numero}, expected YYYY-NNN"
            year_part = parts[0]
            num_part = parts[1]
            assert len(year_part) == 4, f"Year part should be 4 digits: {year_part}"
            assert year_part.isdigit(), f"Year part should be numeric: {year_part}"
            assert len(num_part) == 3, f"Number part should be 3 digits: {num_part}"
            assert num_part.isdigit(), f"Number part should be numeric: {num_part}"
            print(f"✅ Created presqu'accident with numero: {numero}")
        
        # Cleanup
        item_id = data.get("id")
        if item_id:
            self.session.delete(f"{BASE_URL}/api/presqu-accident/items/{item_id}")
    
    def test_create_form_does_not_require_treatment_fields(self):
        """Test: Creation form doesn't require Actions de prévention, Responsable action, Date échéance action, Commentaire"""
        # Create without treatment fields - should succeed
        create_payload = {
            "titre": "TEST_Presqu_accident_no_treatment_fields",
            "description": "Test without treatment fields",
            "date_incident": datetime.now().strftime("%Y-%m-%d"),
            "lieu": "Test Location",
            "service": "PRODUCTION",
            "severite": "FAIBLE"
            # Intentionally NOT including: actions_preventions, responsable_action, date_echeance_action, commentaire_traitement
        }
        
        response = self.session.post(f"{BASE_URL}/api/presqu-accident/items", json=create_payload)
        assert response.status_code in [200, 201], f"Create without treatment fields failed: {response.text}"
        
        data = response.json()
        assert "id" in data, "No ID returned"
        print(f"✅ Created presqu'accident without treatment fields successfully")
        
        # Cleanup
        item_id = data.get("id")
        if item_id:
            self.session.delete(f"{BASE_URL}/api/presqu-accident/items/{item_id}")
    
    def test_update_with_treatment_fields(self):
        """Test: Treatment dialog fields can be updated (Actions de prévention, Responsable action, Date échéance action, Commentaire, Status)"""
        # First create a presqu'accident
        create_payload = {
            "titre": "TEST_Presqu_accident_treatment_update",
            "description": "Test for treatment update",
            "date_incident": datetime.now().strftime("%Y-%m-%d"),
            "lieu": "Test Location",
            "service": "MAINTENANCE",
            "severite": "ELEVE"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/presqu-accident/items", json=create_payload)
        assert create_response.status_code in [200, 201], f"Create failed: {create_response.text}"
        
        item_id = create_response.json().get("id")
        assert item_id, "No ID returned"
        
        # Update with treatment fields
        update_payload = {
            "actions_preventions": "Test prevention actions",
            "responsable_action": "Test Responsable",
            "date_echeance_action": "2026-02-15",
            "commentaire_traitement": "Test treatment comment",
            "status": "EN_COURS"
        }
        
        update_response = self.session.put(f"{BASE_URL}/api/presqu-accident/items/{item_id}", json=update_payload)
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        # Verify the update
        get_response = self.session.get(f"{BASE_URL}/api/presqu-accident/items")
        assert get_response.status_code == 200
        
        items = get_response.json()
        updated_item = next((i for i in items if i.get("id") == item_id), None)
        assert updated_item, "Updated item not found"
        
        assert updated_item.get("actions_preventions") == "Test prevention actions", "actions_preventions not updated"
        assert updated_item.get("responsable_action") == "Test Responsable", "responsable_action not updated"
        assert updated_item.get("status") == "EN_COURS", "status not updated"
        
        print(f"✅ Treatment fields updated successfully")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/presqu-accident/items/{item_id}")
    
    def test_status_values_can_be_updated_to_new_statuses(self):
        """Test: Status field can be updated to new status values (A_TRAITER, EN_COURS, TERMINE, RISQUE_RESIDUEL)"""
        # Note: New presqu'accidents always start as A_TRAITER by design
        # Status changes happen via the treatment dialog (update endpoint)
        
        # Create a presqu'accident (will start as A_TRAITER)
        create_payload = {
            "titre": "TEST_Status_update_test",
            "description": "Test for status update",
            "date_incident": datetime.now().strftime("%Y-%m-%d"),
            "lieu": "Test Location",
            "service": "QHSE",
            "severite": "MOYEN"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/presqu-accident/items", json=create_payload)
        assert create_response.status_code in [200, 201], f"Create failed: {create_response.text}"
        
        item_id = create_response.json().get("id")
        assert item_id, "No ID returned"
        
        # Verify initial status is A_TRAITER
        assert create_response.json().get("status") == "A_TRAITER", "Initial status should be A_TRAITER"
        
        # Test updating to each status
        new_statuses = ["EN_COURS", "TERMINE", "RISQUE_RESIDUEL", "A_TRAITER"]
        
        for status in new_statuses:
            update_response = self.session.put(f"{BASE_URL}/api/presqu-accident/items/{item_id}", json={"status": status})
            assert update_response.status_code == 200, f"Update to status {status} failed: {update_response.text}"
            
            # Verify the status was updated
            list_response = self.session.get(f"{BASE_URL}/api/presqu-accident/items")
            items = list_response.json()
            item = next((i for i in items if i.get("id") == item_id), None)
            assert item, "Item not found"
            assert item.get("status") == status, f"Status mismatch: expected {status}, got {item.get('status')}"
        
        print(f"✅ All 4 new statuses can be set via update: {new_statuses}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/presqu-accident/items/{item_id}")
    
    def test_filter_by_new_statuses(self):
        """Test: Items can be filtered by new status values"""
        # Get items with status filter
        for status in ["A_TRAITER", "EN_COURS", "TERMINE", "RISQUE_RESIDUEL"]:
            response = self.session.get(f"{BASE_URL}/api/presqu-accident/items", params={"status": status})
            assert response.status_code == 200, f"Filter by status {status} failed: {response.text}"
            
            items = response.json()
            # Verify all returned items have the correct status
            for item in items:
                assert item.get("status") == status, f"Item with wrong status returned: expected {status}, got {item.get('status')}"
        
        print(f"✅ Status filtering works for all 4 new statuses")
    
    def test_list_items_returns_numero_field_for_new_items(self):
        """Test: List endpoint returns items with numero field (old items may not have it)"""
        # Note: Old presqu'accidents don't have numero field - only new ones do
        
        # Create a new item to ensure we have at least one with numero
        create_payload = {
            "titre": "TEST_Numero_field_test",
            "description": "Test for numero field",
            "date_incident": datetime.now().strftime("%Y-%m-%d"),
            "lieu": "Test Location",
            "service": "QHSE",
            "severite": "MOYEN"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/presqu-accident/items", json=create_payload)
        assert create_response.status_code in [200, 201], f"Create failed: {create_response.text}"
        
        new_item_id = create_response.json().get("id")
        new_item_numero = create_response.json().get("numero")
        
        # Verify the new item has numero
        assert new_item_numero, "New item should have numero field"
        
        response = self.session.get(f"{BASE_URL}/api/presqu-accident/items")
        assert response.status_code == 200, f"List failed: {response.text}"
        
        items = response.json()
        
        # Find our new item and verify it has numero
        new_item = next((i for i in items if i.get("id") == new_item_id), None)
        assert new_item, "New item not found in list"
        assert new_item.get("numero") == new_item_numero, "Numero mismatch"
        
        # Count items with and without numero
        with_numero = len([i for i in items if i.get("numero")])
        without_numero = len([i for i in items if not i.get("numero")])
        
        print(f"✅ List returns {len(items)} items: {with_numero} with numero, {without_numero} without (old items)")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/presqu-accident/items/{new_item_id}")
    
    def test_get_single_item_returns_all_fields(self):
        """Test: Single item GET returns all required fields including treatment fields"""
        # First create an item
        create_payload = {
            "titre": "TEST_Single_item_fields",
            "description": "Test for single item fields",
            "date_incident": datetime.now().strftime("%Y-%m-%d"),
            "lieu": "Test Location",
            "service": "LOGISTIQUE",
            "severite": "CRITIQUE",
            "actions_preventions": "Test actions",
            "responsable_action": "Test responsable",
            "date_echeance_action": "2026-03-01",
            "commentaire_traitement": "Test comment"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/presqu-accident/items", json=create_payload)
        assert create_response.status_code in [200, 201], f"Create failed: {create_response.text}"
        
        item_id = create_response.json().get("id")
        
        # Get the item from list
        list_response = self.session.get(f"{BASE_URL}/api/presqu-accident/items")
        assert list_response.status_code == 200
        
        items = list_response.json()
        item = next((i for i in items if i.get("id") == item_id), None)
        assert item, "Created item not found in list"
        
        # Verify all fields are present
        required_fields = ["id", "numero", "titre", "description", "date_incident", "lieu", "service", "severite", "status"]
        treatment_fields = ["actions_preventions", "responsable_action", "date_echeance_action", "commentaire_traitement"]
        
        for field in required_fields:
            assert field in item, f"Missing required field: {field}"
        
        for field in treatment_fields:
            assert field in item, f"Missing treatment field: {field}"
        
        print(f"✅ Single item contains all required and treatment fields")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/presqu-accident/items/{item_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
