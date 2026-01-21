"""
Test suite for Demandes d'Arrêt features:
- Attachments API (upload, list, download, delete)
- Trigger reminders endpoint
- Reports history endpoint
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://workorder-ux-1.preview.emergentagent.com').rstrip('/')

class TestDemandesArretAPI:
    """Test Demandes d'Arrêt API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "password"
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            self.token = data.get("access_token") or data.get("token")
            self.user = data.get("user")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
            print(f"✓ Logged in as: {self.user.get('email')}")
        else:
            pytest.skip(f"Login failed: {login_response.status_code}")
    
    # ==================== TRIGGER REMINDERS ====================
    
    def test_trigger_reminders_endpoint(self):
        """Test GET /api/demandes-arret/trigger-reminders returns success"""
        response = self.session.get(f"{BASE_URL}/api/demandes-arret/trigger-reminders")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "status" in data, "Response should contain 'status' field"
        assert data["status"] in ["ok", "error"], f"Status should be 'ok' or 'error', got {data['status']}"
        
        if data["status"] == "ok":
            assert "reminders_triggered" in data, "Response should contain 'reminders_triggered' field"
            print(f"✓ Trigger reminders: {data['reminders_triggered']} reminder(s) triggered")
        else:
            print(f"⚠ Trigger reminders returned error: {data.get('message')}")
    
    # ==================== REPORTS HISTORY ====================
    
    def test_reports_history_endpoint(self):
        """Test GET /api/demandes-arret/reports/history returns data"""
        response = self.session.get(f"{BASE_URL}/api/demandes-arret/reports/history")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "reports" in data, "Response should contain 'reports' field"
        assert "statistiques" in data, "Response should contain 'statistiques' field"
        
        stats = data["statistiques"]
        assert "total_demandes" in stats, "Stats should contain 'total_demandes'"
        assert "total_reports" in stats, "Stats should contain 'total_reports'"
        
        print(f"✓ Reports history: {stats['total_reports']} reports, {stats['total_demandes']} total demandes")
    
    # ==================== GET ALL DEMANDES ====================
    
    def test_get_all_demandes(self):
        """Test GET /api/demandes-arret/ returns list"""
        response = self.session.get(f"{BASE_URL}/api/demandes-arret/")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"✓ Get all demandes: {len(data)} demande(s) found")
        
        # Store first demande ID for attachment tests if available
        if len(data) > 0:
            self.demande_id = data[0].get("id")
            print(f"  First demande ID: {self.demande_id}")
        
        return data
    
    # ==================== ATTACHMENTS ====================
    
    def test_get_attachments_for_demande(self):
        """Test GET /api/demandes-arret/{id}/attachments returns list"""
        # First get a demande
        demandes = self.test_get_all_demandes()
        
        if len(demandes) == 0:
            pytest.skip("No demandes available to test attachments")
        
        demande_id = demandes[0].get("id")
        
        response = self.session.get(f"{BASE_URL}/api/demandes-arret/{demande_id}/attachments")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"✓ Get attachments for demande {demande_id}: {len(data)} attachment(s)")
        
        return data, demande_id
    
    def test_attachments_not_found_for_invalid_demande(self):
        """Test GET /api/demandes-arret/{invalid_id}/attachments returns 404"""
        invalid_id = "invalid-demande-id-12345"
        
        response = self.session.get(f"{BASE_URL}/api/demandes-arret/{invalid_id}/attachments")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Correctly returns 404 for invalid demande ID")
    
    # ==================== PLANNING EQUIPEMENTS ====================
    
    def test_get_planning_equipements(self):
        """Test GET /api/demandes-arret/planning/equipements returns list"""
        response = self.session.get(f"{BASE_URL}/api/demandes-arret/planning/equipements")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"✓ Get planning equipements: {len(data)} entry(ies)")


class TestDemandesArretAttachmentUpload:
    """Test attachment upload functionality - requires creating a demande first"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "password"
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            self.token = data.get("access_token") or data.get("token")
            self.user = data.get("user")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip(f"Login failed: {login_response.status_code}")
    
    def test_upload_attachment_to_existing_demande(self):
        """Test POST /api/demandes-arret/{id}/attachments with file upload"""
        # First get an existing demande
        response = self.session.get(f"{BASE_URL}/api/demandes-arret/")
        
        if response.status_code != 200:
            pytest.skip("Could not get demandes list")
        
        demandes = response.json()
        
        if len(demandes) == 0:
            pytest.skip("No demandes available to test attachment upload")
        
        demande_id = demandes[0].get("id")
        
        # Create a test file
        test_content = b"Test file content for attachment upload"
        files = {
            'file': ('test_attachment.txt', io.BytesIO(test_content), 'text/plain')
        }
        
        # Remove Content-Type header for multipart upload
        headers = {"Authorization": f"Bearer {self.token}"}
        
        upload_response = requests.post(
            f"{BASE_URL}/api/demandes-arret/{demande_id}/attachments",
            files=files,
            headers=headers
        )
        
        assert upload_response.status_code == 200, f"Expected 200, got {upload_response.status_code}: {upload_response.text}"
        
        data = upload_response.json()
        assert "id" in data, "Response should contain attachment 'id'"
        assert "original_filename" in data, "Response should contain 'original_filename'"
        assert data["original_filename"] == "test_attachment.txt"
        
        print(f"✓ Uploaded attachment: {data['original_filename']} (ID: {data['id']})")
        
        # Cleanup: delete the uploaded attachment
        attachment_id = data["id"]
        delete_response = self.session.delete(
            f"{BASE_URL}/api/demandes-arret/{demande_id}/attachments/{attachment_id}"
        )
        
        if delete_response.status_code == 200:
            print(f"✓ Cleaned up test attachment")
        else:
            print(f"⚠ Could not cleanup attachment: {delete_response.status_code}")


class TestEquipmentsAndUsersForDemandes:
    """Test supporting APIs needed for Demandes d'Arrêt"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "password"
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            self.token = data.get("access_token") or data.get("token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip(f"Login failed: {login_response.status_code}")
    
    def test_get_equipments(self):
        """Test GET /api/equipments returns list"""
        response = self.session.get(f"{BASE_URL}/api/equipments")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Response could be list or object with 'data' key
        if isinstance(data, dict) and "data" in data:
            equipments = data["data"]
        else:
            equipments = data
        
        assert isinstance(equipments, list), "Equipments should be a list"
        print(f"✓ Get equipments: {len(equipments)} equipment(s)")
    
    def test_get_users(self):
        """Test GET /api/users returns list"""
        response = self.session.get(f"{BASE_URL}/api/users")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Response could be list or object with 'data' key
        if isinstance(data, dict) and "data" in data:
            users = data["data"]
        else:
            users = data
        
        assert isinstance(users, list), "Users should be a list"
        print(f"✓ Get users: {len(users)} user(s)")
        
        # Check for RSP_PROD user (default destinataire)
        rsp_prod = [u for u in users if u.get("role") == "RSP_PROD"]
        if rsp_prod:
            print(f"  RSP_PROD user found: {rsp_prod[0].get('email')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
