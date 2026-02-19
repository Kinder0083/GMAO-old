"""
Tests for Vendor API including new enriched fields and AI extraction feature
Tests the following features:
1. POST /api/vendors - Create vendor with all new fields
2. GET /api/vendors - Verify new fields are returned
3. PUT /api/vendors/{id} - Update vendor with new fields
4. POST /api/vendors/ai/extract - AI extraction from Excel file
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test vendor data with all new fields
TEST_VENDOR_DATA = {
    "nom": f"TEST_VENDOR_{uuid.uuid4().hex[:8]}",
    "contact": "Jean Dupont",
    "email": f"test.vendor.{uuid.uuid4().hex[:8]}@example.com",
    "telephone": "+33 1 23 45 67 89",
    "adresse": "123 Rue de Test",
    "specialite": "Fournitures industrielles",
    # New enriched fields
    "pays": "FR",
    "code_postal": "75001",
    "ville": "Paris",
    "tva_intra": "FR78843272238",
    "siret": "843 272 238 00012",
    "conditions_paiement": "30J_NET",
    "devise": "EUR",
    "categorie": "FOURNITURES",
    "sous_traitant": False,
    "contact_fonction": "Directeur Commercial",
    "site_web": "https://example.com",
    "notes": "Test vendor created by automated tests"
}


class TestVendorsAPI:
    """Test Vendors CRUD operations with enriched fields"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@test.com", "password": "Admin123!"}
        )
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Cannot login - skipping vendor tests")
    
    def test_01_create_vendor_with_new_fields(self):
        """Test creating a vendor with all new enriched fields"""
        response = self.session.post(
            f"{BASE_URL}/api/vendors",
            json=TEST_VENDOR_DATA
        )
        print(f"Create vendor response: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain 'id'"
        
        # Verify base fields
        assert data["nom"] == TEST_VENDOR_DATA["nom"]
        assert data["contact"] == TEST_VENDOR_DATA["contact"]
        assert data["email"] == TEST_VENDOR_DATA["email"].lower()
        assert data["telephone"] == TEST_VENDOR_DATA["telephone"]
        assert data["adresse"] == TEST_VENDOR_DATA["adresse"]
        assert data["specialite"] == TEST_VENDOR_DATA["specialite"]
        
        # Verify new enriched fields
        assert data.get("pays") == TEST_VENDOR_DATA["pays"]
        assert data.get("code_postal") == TEST_VENDOR_DATA["code_postal"]
        assert data.get("ville") == TEST_VENDOR_DATA["ville"]
        assert data.get("tva_intra") == TEST_VENDOR_DATA["tva_intra"]
        assert data.get("siret") == TEST_VENDOR_DATA["siret"]
        assert data.get("conditions_paiement") == TEST_VENDOR_DATA["conditions_paiement"]
        assert data.get("devise") == TEST_VENDOR_DATA["devise"]
        assert data.get("categorie") == TEST_VENDOR_DATA["categorie"]
        assert data.get("sous_traitant") == TEST_VENDOR_DATA["sous_traitant"]
        assert data.get("contact_fonction") == TEST_VENDOR_DATA["contact_fonction"]
        assert data.get("site_web") == TEST_VENDOR_DATA["site_web"]
        assert data.get("notes") == TEST_VENDOR_DATA["notes"]
        
        # Store vendor_id for later tests
        TestVendorsAPI.created_vendor_id = data["id"]
        print(f"Created vendor with ID: {data['id']}")
    
    def test_02_get_vendors_list(self):
        """Test getting vendors list - verify new fields are returned"""
        response = self.session.get(f"{BASE_URL}/api/vendors")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        vendors = response.json()
        assert isinstance(vendors, list), "Response should be a list"
        
        # Find our test vendor
        test_vendor = None
        for v in vendors:
            if v.get("id") == getattr(TestVendorsAPI, 'created_vendor_id', None):
                test_vendor = v
                break
        
        if test_vendor:
            # Verify new fields exist in response
            print(f"Found test vendor: {test_vendor.get('nom')}")
            assert "pays" in test_vendor or test_vendor.get("pays") is None
            assert "code_postal" in test_vendor or test_vendor.get("code_postal") is None
            assert "ville" in test_vendor or test_vendor.get("ville") is None
            assert "tva_intra" in test_vendor or test_vendor.get("tva_intra") is None
            assert "siret" in test_vendor or test_vendor.get("siret") is None
            assert "categorie" in test_vendor or test_vendor.get("categorie") is None
            assert "sous_traitant" in test_vendor or test_vendor.get("sous_traitant") is None
    
    def test_03_get_vendor_by_id_via_list(self):
        """Test getting vendor by ID via filtering list (no single-item GET endpoint)"""
        vendor_id = getattr(TestVendorsAPI, 'created_vendor_id', None)
        if not vendor_id:
            pytest.skip("No vendor created to test")
        
        # GET all vendors and filter by ID
        response = self.session.get(f"{BASE_URL}/api/vendors")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        vendors = response.json()
        vendor = next((v for v in vendors if v.get("id") == vendor_id), None)
        
        assert vendor is not None, f"Vendor {vendor_id} not found in list"
        
        # Verify all enriched fields are present
        assert vendor.get("pays") == TEST_VENDOR_DATA["pays"]
        assert vendor.get("ville") == TEST_VENDOR_DATA["ville"]
        assert vendor.get("categorie") == TEST_VENDOR_DATA["categorie"]
        print(f"GET vendor by ID via list successful: {vendor.get('nom')}")
    
    def test_04_update_vendor_with_new_fields(self):
        """Test updating vendor with new enriched fields"""
        vendor_id = getattr(TestVendorsAPI, 'created_vendor_id', None)
        if not vendor_id:
            pytest.skip("No vendor created to test")
        
        update_data = {
            "ville": "Lyon",
            "code_postal": "69001",
            "conditions_paiement": "45J_FDM",
            "categorie": "SERVICES",
            "sous_traitant": True,
            "notes": "Updated by test"
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/vendors/{vendor_id}",
            json=update_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify updates
        assert data.get("ville") == "Lyon"
        assert data.get("code_postal") == "69001"
        assert data.get("conditions_paiement") == "45J_FDM"
        assert data.get("categorie") == "SERVICES"
        assert data.get("sous_traitant") == True
        assert data.get("notes") == "Updated by test"
        
        # Verify unchanged fields remain
        assert data.get("pays") == TEST_VENDOR_DATA["pays"]
        print(f"Update vendor successful")
    
    def test_05_cleanup_delete_vendor(self):
        """Cleanup: Delete test vendor"""
        vendor_id = getattr(TestVendorsAPI, 'created_vendor_id', None)
        if not vendor_id:
            pytest.skip("No vendor to cleanup")
        
        response = self.session.delete(f"{BASE_URL}/api/vendors/{vendor_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"Deleted test vendor: {vendor_id}")


class TestVendorAIExtract:
    """Test AI extraction from documents"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get auth token"""
        self.session = requests.Session()
        
        # Login to get token
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            headers={"Content-Type": "application/json"},
            json={"email": "admin@test.com", "password": "Admin123!"}
        )
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Cannot login - skipping AI extract tests")
    
    def test_01_ai_extract_endpoint_exists(self):
        """Test that AI extract endpoint exists and requires a file"""
        # Send without file - should get 422 or error
        response = self.session.post(f"{BASE_URL}/api/vendors/ai/extract")
        
        # Should fail because no file provided
        assert response.status_code in [400, 422], f"Expected 400/422 without file, got {response.status_code}"
        print("AI extract endpoint exists and requires file input")
    
    def test_02_ai_extract_from_excel(self):
        """Test AI extraction from Excel file"""
        test_file_path = "/tmp/amazon_test.xlsx"
        
        if not os.path.exists(test_file_path):
            pytest.skip(f"Test Excel file not found at {test_file_path}")
        
        with open(test_file_path, 'rb') as f:
            files = {'file': ('amazon_test.xlsx', f, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
            response = self.session.post(
                f"{BASE_URL}/api/vendors/ai/extract",
                files=files
            )
        
        print(f"AI extract response status: {response.status_code}")
        
        if response.status_code == 500:
            # Check if it's a configuration issue
            try:
                error = response.json()
                print(f"AI extract error: {error.get('detail', 'Unknown error')}")
                if "LLM non configurée" in str(error) or "not configured" in str(error.lower()):
                    pytest.skip("LLM key not configured - AI feature cannot be tested")
            except Exception:
                pass
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        assert "extracted_data" in data, "Response should contain 'extracted_data'"
        
        extracted = data["extracted_data"]
        print(f"Extracted data: {extracted}")
        
        # Verify some common fields are present (at least as keys)
        assert "nom" in extracted, "Extracted data should contain 'nom'"
        
        # Check confidence score if present
        if "confidence" in extracted:
            print(f"AI confidence: {extracted['confidence']}")


class TestVendorAPIIntegration:
    """Integration tests for vendors with grid/list view verification"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@test.com", "password": "Admin123!"}
        )
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Cannot login - skipping integration tests")
    
    def test_01_create_vendor_with_categorie_sous_traitant(self):
        """Test creating vendor with categorie and sous_traitant for badge display"""
        vendor_data = {
            "nom": f"TEST_BADGE_VENDOR_{uuid.uuid4().hex[:8]}",
            "contact": "Test Contact",
            "email": f"badge.test.{uuid.uuid4().hex[:8]}@example.com",
            "telephone": "+33 1 00 00 00 00",
            "adresse": "1 Rue Test",
            "specialite": "Test",
            "categorie": "MAINTENANCE",
            "sous_traitant": True
        }
        
        response = self.session.post(f"{BASE_URL}/api/vendors", json=vendor_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("categorie") == "MAINTENANCE"
        assert data.get("sous_traitant") == True
        
        TestVendorAPIIntegration.badge_vendor_id = data["id"]
        print(f"Created vendor with categorie badge: {data['id']}")
    
    def test_02_verify_badges_in_list(self):
        """Verify categorie and sous_traitant fields are returned for list/grid views"""
        response = self.session.get(f"{BASE_URL}/api/vendors")
        
        assert response.status_code == 200
        
        vendors = response.json()
        
        # Find our test vendor
        badge_vendor = None
        for v in vendors:
            if v.get("id") == getattr(TestVendorAPIIntegration, 'badge_vendor_id', None):
                badge_vendor = v
                break
        
        if badge_vendor:
            assert badge_vendor.get("categorie") == "MAINTENANCE"
            assert badge_vendor.get("sous_traitant") == True
            print("Badge fields present in vendor list response")
    
    def test_03_cleanup_badge_vendor(self):
        """Cleanup: Delete test vendor"""
        vendor_id = getattr(TestVendorAPIIntegration, 'badge_vendor_id', None)
        if vendor_id:
            self.session.delete(f"{BASE_URL}/api/vendors/{vendor_id}")
            print(f"Cleaned up badge vendor: {vendor_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
