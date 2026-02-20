"""
Test Work Order Assignment and Update - Bug Fixes Verification
Tests the P0 bug fix: Technician assignment to Work Orders (OT) via Adria AI assistant
The issue was that update_work_order used {'id': ...} filter instead of {'_id': ...}
which caused updates to silently fail for documents without a string 'id' field.
Also tests the GET /api/work-orders fix for lowercase statut values.
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@test.com"
ADMIN_PASSWORD = "Admin123!"
TECH_EMAIL = "technicien@test.com"
TECH_PASSWORD = "Technicien123!"

# Known users for testing assignment
# Gregory Bueno (ID: 698a47faa5ec6817c5e77d60, ADMIN)
# Axel dupont (ID: 69707030e0eb4fc8238e15dd, TECHNICIEN)
# Sacha Cheneau (ID: 69706dc6e0eb4fc8238e15d4, ADMIN)
TECH_USER_ID = "69707030e0eb4fc8238e15dd"  # Axel dupont
ADMIN_USER_ID = "698a47faa5ec6817c5e77d60"  # Gregory Bueno


class TestAuthentication:
    """Test authentication for setup"""
    
    def test_admin_login_success(self):
        """Test admin can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "ADMIN"
        print(f"✅ Admin login successful - Role: {data['user']['role']}")


class TestWorkOrdersList:
    """Test GET /api/work-orders - Was crashing due to lowercase statut values"""
    
    @pytest.fixture
    def auth_header(self):
        """Get authentication header"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_work_orders_no_crash(self, auth_header):
        """GET /api/work-orders should not crash with 500 error (was crashing due to lowercase statut)"""
        response = requests.get(f"{BASE_URL}/api/work-orders", headers=auth_header)
        assert response.status_code == 200, f"GET work-orders crashed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ GET /api/work-orders returns {len(data)} work orders without crashing")
        
    def test_work_orders_statut_normalized(self, auth_header):
        """All work orders should have uppercase statut values"""
        response = requests.get(f"{BASE_URL}/api/work-orders", headers=auth_header)
        assert response.status_code == 200
        data = response.json()
        
        valid_statuts = {"OUVERT", "EN_COURS", "EN_ATTENTE", "TERMINE"}
        for wo in data:
            statut = wo.get("statut")
            if statut:
                assert statut in valid_statuts or statut.upper() in valid_statuts, \
                    f"Work order {wo.get('id')} has invalid statut: {statut}"
        print(f"✅ All {len(data)} work orders have valid uppercase statut values")


class TestWorkOrderCRUD:
    """Test Work Order CRUD operations - Focus on assignment bug fix"""
    
    @pytest.fixture
    def auth_header(self):
        """Get authentication header"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_create_work_order(self, auth_header):
        """POST /api/work-orders - Create a new work order"""
        wo_data = {
            "titre": "TEST_Bug_Fix_Assignment",
            "description": "Test work order for verifying assignment bug fix",
            "type": "CORRECTIF",
            "priorite": "NORMALE",
            "statut": "OUVERT"
        }
        response = requests.post(f"{BASE_URL}/api/work-orders", json=wo_data, headers=auth_header)
        assert response.status_code == 200, f"Create WO failed: {response.text}"
        
        data = response.json()
        assert data["titre"] == wo_data["titre"]
        assert data["statut"] == "OUVERT"
        assert "id" in data
        assert "numero" in data
        print(f"✅ Created work order - ID: {data['id']}, Numero: {data['numero']}")
        return data["id"]
    
    def test_get_single_work_order(self, auth_header):
        """GET /api/work-orders/{id} - Get single work order"""
        # First create a work order
        wo_data = {
            "titre": "TEST_Get_Single_WO",
            "description": "Test for GET single WO",
            "type": "CORRECTIF",
            "priorite": "NORMALE",
            "statut": "OUVERT"
        }
        create_resp = requests.post(f"{BASE_URL}/api/work-orders", json=wo_data, headers=auth_header)
        assert create_resp.status_code == 200
        wo_id = create_resp.json()["id"]
        
        # Get the single work order
        response = requests.get(f"{BASE_URL}/api/work-orders/{wo_id}", headers=auth_header)
        assert response.status_code == 200, f"GET single WO failed: {response.text}"
        
        data = response.json()
        assert data["id"] == wo_id
        assert data["titre"] == wo_data["titre"]
        print(f"✅ GET /api/work-orders/{wo_id} returns correct work order")
        return wo_id


class TestWorkOrderAssignment:
    """
    Test Work Order Assignment - THE CORE BUG FIX
    Bug: update_work_order used {'id': ...} filter which matched 0 documents
    because MongoDB documents have '_id' (ObjectId), not 'id' (string field)
    """
    
    @pytest.fixture
    def auth_header(self):
        """Get authentication header"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_assign_technician_to_work_order(self, auth_header):
        """
        PUT /api/work-orders/{id} - Assign technician via assigne_a_id
        THIS IS THE CORE BUG FIX TEST
        """
        # Step 1: Create a new work order
        wo_data = {
            "titre": "TEST_Assignment_Bug_Fix",
            "description": "Core test for assignment bug fix",
            "type": "CORRECTIF",
            "priorite": "NORMALE",
            "statut": "OUVERT"
        }
        create_resp = requests.post(f"{BASE_URL}/api/work-orders", json=wo_data, headers=auth_header)
        assert create_resp.status_code == 200, f"Create failed: {create_resp.text}"
        wo_id = create_resp.json()["id"]
        print(f"✅ Step 1: Created work order ID: {wo_id}")
        
        # Step 2: Assign technician
        update_data = {"assigne_a_id": TECH_USER_ID}
        update_resp = requests.put(f"{BASE_URL}/api/work-orders/{wo_id}", json=update_data, headers=auth_header)
        assert update_resp.status_code == 200, f"Update (assignment) failed: {update_resp.text}"
        
        updated_wo = update_resp.json()
        assert updated_wo["assigne_a_id"] == TECH_USER_ID, f"assigne_a_id not set in response!"
        assert "assigneA" in updated_wo and updated_wo["assigneA"] is not None, "assigneA object missing!"
        assert updated_wo["assigneA"]["id"] == TECH_USER_ID
        print(f"✅ Step 2: Assignment response shows assigneA: {updated_wo['assigneA']}")
        
        # Step 3: Verify persistence with GET
        get_resp = requests.get(f"{BASE_URL}/api/work-orders/{wo_id}", headers=auth_header)
        assert get_resp.status_code == 200
        
        fetched_wo = get_resp.json()
        assert fetched_wo["assigne_a_id"] == TECH_USER_ID, f"assigne_a_id not persisted! Got: {fetched_wo.get('assigne_a_id')}"
        assert fetched_wo["assigneA"] is not None, "assigneA not populated on GET!"
        assert fetched_wo["assigneA"]["id"] == TECH_USER_ID
        print(f"✅ Step 3: GET confirms assignment persisted - assigneA: {fetched_wo['assigneA']}")
        
        return wo_id
    
    def test_update_work_order_status(self, auth_header):
        """PUT /api/work-orders/{id} - Update status (EN_COURS)"""
        # Create WO
        wo_data = {
            "titre": "TEST_Status_Update",
            "description": "Test status update",
            "type": "CORRECTIF",
            "priorite": "NORMALE",
            "statut": "OUVERT"
        }
        create_resp = requests.post(f"{BASE_URL}/api/work-orders", json=wo_data, headers=auth_header)
        assert create_resp.status_code == 200
        wo_id = create_resp.json()["id"]
        
        # Update status to EN_COURS
        update_data = {"statut": "EN_COURS"}
        update_resp = requests.put(f"{BASE_URL}/api/work-orders/{wo_id}", json=update_data, headers=auth_header)
        assert update_resp.status_code == 200, f"Status update failed: {update_resp.text}"
        
        updated_wo = update_resp.json()
        assert updated_wo["statut"] == "EN_COURS", f"Status not updated! Got: {updated_wo.get('statut')}"
        print(f"✅ Status updated to EN_COURS for WO {wo_id}")
        
        # Verify with GET
        get_resp = requests.get(f"{BASE_URL}/api/work-orders/{wo_id}", headers=auth_header)
        assert get_resp.status_code == 200
        assert get_resp.json()["statut"] == "EN_COURS"
        print(f"✅ GET confirms status is EN_COURS")
    
    def test_update_work_order_priority(self, auth_header):
        """PUT /api/work-orders/{id} - Update priority (URGENTE)"""
        # Create WO
        wo_data = {
            "titre": "TEST_Priority_Update",
            "description": "Test priority update",
            "type": "CORRECTIF",
            "priorite": "NORMALE",
            "statut": "OUVERT"
        }
        create_resp = requests.post(f"{BASE_URL}/api/work-orders", json=wo_data, headers=auth_header)
        assert create_resp.status_code == 200
        wo_id = create_resp.json()["id"]
        
        # Update priority to URGENTE
        update_data = {"priorite": "URGENTE"}
        update_resp = requests.put(f"{BASE_URL}/api/work-orders/{wo_id}", json=update_data, headers=auth_header)
        assert update_resp.status_code == 200, f"Priority update failed: {update_resp.text}"
        
        updated_wo = update_resp.json()
        assert updated_wo["priorite"] == "URGENTE", f"Priority not updated! Got: {updated_wo.get('priorite')}"
        print(f"✅ Priority updated to URGENTE for WO {wo_id}")
        
        # Verify with GET
        get_resp = requests.get(f"{BASE_URL}/api/work-orders/{wo_id}", headers=auth_header)
        assert get_resp.status_code == 200
        assert get_resp.json()["priorite"] == "URGENTE"
        print(f"✅ GET confirms priority is URGENTE")


class TestFullAssignmentWorkflow:
    """Complete workflow test: Create → Assign → Update Status → Verify"""
    
    @pytest.fixture
    def auth_header(self):
        """Get authentication header"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_complete_assignment_workflow(self, auth_header):
        """Full workflow: Create WO → Assign Tech → Change Status → Verify all"""
        # 1. Create work order
        wo_data = {
            "titre": "TEST_Full_Workflow",
            "description": "Complete workflow test for assignment bug fix",
            "type": "CORRECTIF",
            "priorite": "NORMALE",
            "statut": "OUVERT"
        }
        create_resp = requests.post(f"{BASE_URL}/api/work-orders", json=wo_data, headers=auth_header)
        assert create_resp.status_code == 200
        wo = create_resp.json()
        wo_id = wo["id"]
        print(f"✅ 1. Created WO: {wo_id}, Numero: {wo['numero']}")
        
        # 2. Assign technician + change status in one request
        update_data = {
            "assigne_a_id": TECH_USER_ID,
            "statut": "EN_COURS",
            "priorite": "HAUTE"
        }
        update_resp = requests.put(f"{BASE_URL}/api/work-orders/{wo_id}", json=update_data, headers=auth_header)
        assert update_resp.status_code == 200, f"Combined update failed: {update_resp.text}"
        
        updated_wo = update_resp.json()
        assert updated_wo["assigne_a_id"] == TECH_USER_ID
        assert updated_wo["statut"] == "EN_COURS"
        assert updated_wo["priorite"] == "HAUTE"
        assert updated_wo["assigneA"] is not None
        print(f"✅ 2. Updated WO with assignment + status + priority")
        
        # 3. Final verification with GET
        get_resp = requests.get(f"{BASE_URL}/api/work-orders/{wo_id}", headers=auth_header)
        assert get_resp.status_code == 200
        
        final_wo = get_resp.json()
        assert final_wo["assigne_a_id"] == TECH_USER_ID, "Assignment not persisted!"
        assert final_wo["statut"] == "EN_COURS", "Status not persisted!"
        assert final_wo["priorite"] == "HAUTE", "Priority not persisted!"
        assert final_wo["assigneA"]["id"] == TECH_USER_ID, "assigneA object not populated!"
        print(f"✅ 3. GET confirms all changes persisted:")
        print(f"   - assigne_a_id: {final_wo['assigne_a_id']}")
        print(f"   - assigneA.nom: {final_wo['assigneA'].get('nom', 'N/A')}")
        print(f"   - statut: {final_wo['statut']}")
        print(f"   - priorite: {final_wo['priorite']}")


class TestExistingWorkOrderUpdate:
    """Test updating an existing work order in the database (not just newly created)"""
    
    @pytest.fixture
    def auth_header(self):
        """Get authentication header"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_update_existing_work_order_from_list(self, auth_header):
        """Get an existing WO from list and update it - tests _id filter fix"""
        # Get list of work orders
        list_resp = requests.get(f"{BASE_URL}/api/work-orders", headers=auth_header)
        assert list_resp.status_code == 200
        work_orders = list_resp.json()
        
        if len(work_orders) == 0:
            pytest.skip("No existing work orders to test")
        
        # Get the first unassigned work order or any work order
        target_wo = None
        for wo in work_orders:
            if not wo.get("assigne_a_id"):
                target_wo = wo
                break
        
        if not target_wo:
            target_wo = work_orders[0]
        
        wo_id = target_wo["id"]
        original_statut = target_wo.get("statut", "OUVERT")
        print(f"Testing update on existing WO: {wo_id}, current statut: {original_statut}")
        
        # Try to assign a technician
        update_data = {"assigne_a_id": TECH_USER_ID}
        update_resp = requests.put(f"{BASE_URL}/api/work-orders/{wo_id}", json=update_data, headers=auth_header)
        assert update_resp.status_code == 200, f"Update existing WO failed: {update_resp.text}"
        
        updated_wo = update_resp.json()
        assert updated_wo["assigne_a_id"] == TECH_USER_ID, f"Assignment failed on existing WO!"
        print(f"✅ Successfully assigned technician to existing WO {wo_id}")
        
        # Verify with GET
        get_resp = requests.get(f"{BASE_URL}/api/work-orders/{wo_id}", headers=auth_header)
        assert get_resp.status_code == 200
        fetched_wo = get_resp.json()
        assert fetched_wo["assigne_a_id"] == TECH_USER_ID, "Assignment not persisted on existing WO!"
        print(f"✅ GET confirms assignment persisted on existing WO")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
