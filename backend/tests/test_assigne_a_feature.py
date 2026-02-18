"""
Tests for Adria AI assigne_a (technician assignment) feature
Tests the NEW functionality: assigning technicians to work orders via Adria AI
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@test.com"
ADMIN_PASSWORD = "Admin123!"

# Known test data from PRD
TECHNICIAN_NAME = "Axel dupont"
TECHNICIAN_ID = "69707030e0eb4fc8238e15dd"
EQUIPMENT_NAME = "Bioci 1"
EQUIPMENT_ID = "69706f4ce0eb4fc8238e15d9"


class TestAssigneAFeature:
    """Test technician assignment feature for work orders"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.token = token
        else:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
    
    def test_get_users_endpoint(self):
        """Test GET /api/users returns list with Axel dupont"""
        response = self.session.get(f"{BASE_URL}/api/users")
        assert response.status_code == 200, f"GET /api/users failed: {response.status_code}"
        
        users = response.json()
        assert isinstance(users, list), "Response should be a list of users"
        
        # Find Axel in the users list
        axel_user = None
        for user in users:
            full_name = f"{user.get('prenom', '')} {user.get('nom', '')}".lower()
            if 'axel' in full_name:
                axel_user = user
                break
        
        assert axel_user is not None, "Axel should exist in users list"
        print(f"Found user Axel: id={axel_user.get('id')}, name={axel_user.get('prenom')} {axel_user.get('nom')}")
    
    def test_create_work_order_with_assigne_a_id(self):
        """Test POST /api/work-orders with assigne_a_id correctly saves assigneA"""
        # First get Axel's user ID from users list
        users_response = self.session.get(f"{BASE_URL}/api/users")
        assert users_response.status_code == 200, "Failed to get users"
        
        users = users_response.json()
        axel_user = None
        for user in users:
            full_name = f"{user.get('prenom', '')} {user.get('nom', '')}".lower()
            if 'axel' in full_name:
                axel_user = user
                break
        
        assert axel_user is not None, "Axel should exist to run this test"
        axel_id = axel_user.get('id')
        
        # Create work order with assigne_a_id
        payload = {
            "titre": "TEST_OT_Assigne_A_Feature",
            "description": "Test OT for verifying assigne_a_id feature",
            "priorite": "URGENTE",
            "statut": "OUVERT",
            "assigne_a_id": axel_id,
            "equipement_id": EQUIPMENT_ID
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/work-orders", json=payload)
        assert create_response.status_code == 200, f"Create OT failed: {create_response.status_code} - {create_response.text}"
        
        created_ot = create_response.json()
        
        # Verify assigneA is populated
        assert "assigneA" in created_ot, "assigneA should be in response"
        assert created_ot.get("assigneA") is not None, "assigneA should not be None"
        assert created_ot["assigneA"].get("id") == axel_id, f"assigneA.id should be {axel_id}"
        
        # Also verify assigne_a_id is saved
        assert created_ot.get("assigne_a_id") == axel_id, "assigne_a_id should be saved"
        
        print(f"Created OT: id={created_ot.get('id')}, assigneA={created_ot.get('assigneA')}")
        
        # Cleanup - store ID for deletion
        self.created_ot_id = created_ot.get("id")
    
    def test_update_work_order_with_assigne_a_id(self):
        """Test PUT /api/work-orders/{id} with assigne_a_id correctly updates assigneA"""
        # First create an OT without assignment
        payload = {
            "titre": "TEST_OT_Update_Assigne_A",
            "description": "Test OT for update assigne_a_id feature",
            "priorite": "NORMALE",
            "statut": "OUVERT"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/work-orders", json=payload)
        assert create_response.status_code == 200, f"Create OT failed: {create_response.status_code}"
        
        created_ot = create_response.json()
        ot_id = created_ot.get("id")
        
        # Verify no assignment initially
        assert created_ot.get("assigneA") is None, "Should have no assignment initially"
        
        # Get Axel's ID
        users_response = self.session.get(f"{BASE_URL}/api/users")
        users = users_response.json()
        axel_user = None
        for user in users:
            full_name = f"{user.get('prenom', '')} {user.get('nom', '')}".lower()
            if 'axel' in full_name:
                axel_user = user
                break
        
        assert axel_user is not None, "Axel should exist"
        axel_id = axel_user.get('id')
        
        # Update OT with assigne_a_id
        update_payload = {
            "assigne_a_id": axel_id
        }
        
        update_response = self.session.put(f"{BASE_URL}/api/work-orders/{ot_id}", json=update_payload)
        assert update_response.status_code == 200, f"Update OT failed: {update_response.status_code} - {update_response.text}"
        
        updated_ot = update_response.json()
        
        # Verify assigneA is now populated
        assert "assigneA" in updated_ot, "assigneA should be in response"
        assert updated_ot.get("assigneA") is not None, "assigneA should not be None after update"
        assert updated_ot["assigneA"].get("id") == axel_id, f"assigneA.id should be {axel_id}"
        
        print(f"Updated OT: id={ot_id}, assigneA={updated_ot.get('assigneA')}")
    
    def test_get_work_order_with_assigneA_populated(self):
        """Test GET /api/work-orders/{id} returns populated assigneA"""
        # Get users to find Axel
        users_response = self.session.get(f"{BASE_URL}/api/users")
        users = users_response.json()
        axel_user = None
        for user in users:
            full_name = f"{user.get('prenom', '')} {user.get('nom', '')}".lower()
            if 'axel' in full_name:
                axel_user = user
                break
        
        assert axel_user is not None, "Axel should exist"
        axel_id = axel_user.get('id')
        
        # Create an OT with assignment
        payload = {
            "titre": "TEST_OT_Get_AssigneA",
            "description": "Test OT for GET with assigneA",
            "priorite": "HAUTE",
            "statut": "OUVERT",
            "assigne_a_id": axel_id
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/work-orders", json=payload)
        assert create_response.status_code == 200
        
        ot_id = create_response.json().get("id")
        
        # GET the OT
        get_response = self.session.get(f"{BASE_URL}/api/work-orders/{ot_id}")
        assert get_response.status_code == 200, f"GET OT failed: {get_response.status_code}"
        
        ot = get_response.json()
        
        # Verify assigneA is populated
        assert ot.get("assigneA") is not None, "assigneA should be populated on GET"
        assert ot["assigneA"].get("id") == axel_id, f"assigneA.id should match {axel_id}"
        
        print(f"GET OT: id={ot_id}, assigneA populated: {ot.get('assigneA')}")
    
    def test_ai_system_prompt_includes_assigne_a(self):
        """Verify the AI system prompt includes assigne_a field in CREATE_OT and MODIFY_OT"""
        # Read the ai_chat_routes.py to verify the system prompt
        import subprocess
        result = subprocess.run(
            ['grep', '-c', 'assigne_a', '/app/backend/ai_chat_routes.py'],
            capture_output=True, text=True
        )
        count = int(result.stdout.strip()) if result.returncode == 0 else 0
        
        assert count >= 4, f"assigne_a should appear at least 4 times in ai_chat_routes.py (found {count})"
        print(f"Found {count} occurrences of 'assigne_a' in ai_chat_routes.py")
    
    def test_list_work_orders_with_assigneA(self):
        """Test GET /api/work-orders returns OTs with populated assigneA"""
        response = self.session.get(f"{BASE_URL}/api/work-orders")
        assert response.status_code == 200, f"GET /api/work-orders failed: {response.status_code}"
        
        work_orders = response.json()
        assert isinstance(work_orders, list), "Response should be a list"
        
        # Find OTs with assigneA populated
        assigned_count = 0
        for wo in work_orders:
            if wo.get("assigneA") is not None:
                assigned_count += 1
                print(f"OT {wo.get('numero')}: assigneA = {wo.get('assigneA')}")
        
        print(f"Found {assigned_count} OTs with assigneA populated out of {len(work_orders)} total")


class TestCleanup:
    """Cleanup test data after tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_cleanup_test_work_orders(self):
        """Cleanup any TEST_ prefixed work orders created during testing"""
        response = self.session.get(f"{BASE_URL}/api/work-orders")
        if response.status_code != 200:
            pytest.skip("Could not get work orders for cleanup")
        
        work_orders = response.json()
        deleted_count = 0
        
        for wo in work_orders:
            if wo.get("titre", "").startswith("TEST_"):
                delete_response = self.session.delete(f"{BASE_URL}/api/work-orders/{wo.get('id')}")
                if delete_response.status_code in [200, 204]:
                    deleted_count += 1
                    print(f"Deleted test OT: {wo.get('titre')}")
        
        print(f"Cleaned up {deleted_count} test work orders")
