"""
Tests for Contracts (Contrats) API - FSAO Iris
Tests CRUD operations, stats, alerts, file upload/download
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestContractsAuth:
    """Test authentication for contracts endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token before each test"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@test.com", "password": "Admin123!"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json().get("access_token")
        assert self.token, "No access_token in login response"
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_contracts_requires_auth(self):
        """GET /api/contracts requires authentication"""
        response = requests.get(f"{BASE_URL}/api/contracts")
        assert response.status_code in [401, 403], f"Should require auth, got {response.status_code}"
    
    def test_get_contracts_with_auth(self):
        """GET /api/contracts returns 200 with valid auth"""
        response = requests.get(f"{BASE_URL}/api/contracts", headers=self.headers)
        assert response.status_code == 200, f"Should return 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"


class TestContractsCRUD:
    """Test CRUD operations on contracts"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token before each test"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@test.com", "password": "Admin123!"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.created_contract_ids = []
    
    def teardown_method(self, method):
        """Clean up created contracts after each test"""
        for contract_id in self.created_contract_ids:
            try:
                requests.delete(f"{BASE_URL}/api/contracts/{contract_id}", headers=self.headers)
            except:
                pass
    
    def test_create_contract(self):
        """POST /api/contracts creates a new contract"""
        payload = {
            "numero_contrat": "TEST-CTR-001",
            "titre": "Test Contract for Pytest",
            "type_contrat": "maintenance",
            "statut": "actif",
            "date_debut": "2026-01-01",
            "date_fin": "2026-12-31",
            "montant_total": 10000,
            "periodicite_paiement": "mensuel",
            "montant_periode": 833.33,
            "fournisseur_nom": "Test Fournisseur SA",
            "alerte_echeance_jours": 30
        }
        
        response = requests.post(f"{BASE_URL}/api/contracts", json=payload, headers=self.headers)
        assert response.status_code == 200, f"Should return 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain id"
        assert data["numero_contrat"] == "TEST-CTR-001"
        assert data["titre"] == "Test Contract for Pytest"
        assert data["type_contrat"] == "maintenance"
        assert data["statut"] == "actif"
        assert data["montant_total"] == 10000
        
        self.created_contract_ids.append(data["id"])
    
    def test_get_contract_by_id(self):
        """GET /api/contracts/{id} returns a specific contract"""
        # First create a contract
        payload = {
            "numero_contrat": "TEST-CTR-002",
            "titre": "Test Get By ID",
            "type_contrat": "service"
        }
        create_response = requests.post(f"{BASE_URL}/api/contracts", json=payload, headers=self.headers)
        assert create_response.status_code == 200
        contract_id = create_response.json()["id"]
        self.created_contract_ids.append(contract_id)
        
        # Get the contract
        response = requests.get(f"{BASE_URL}/api/contracts/{contract_id}", headers=self.headers)
        assert response.status_code == 200, f"Should return 200, got {response.status_code}"
        
        data = response.json()
        assert data["id"] == contract_id
        assert data["numero_contrat"] == "TEST-CTR-002"
        assert data["titre"] == "Test Get By ID"
    
    def test_update_contract(self):
        """PUT /api/contracts/{id} updates a contract"""
        # Create a contract
        payload = {
            "numero_contrat": "TEST-CTR-003",
            "titre": "Original Title",
            "type_contrat": "maintenance"
        }
        create_response = requests.post(f"{BASE_URL}/api/contracts", json=payload, headers=self.headers)
        assert create_response.status_code == 200
        contract_id = create_response.json()["id"]
        self.created_contract_ids.append(contract_id)
        
        # Update the contract
        update_payload = {
            "titre": "Updated Title",
            "statut": "en_renouvellement",
            "montant_total": 15000
        }
        response = requests.put(f"{BASE_URL}/api/contracts/{contract_id}", json=update_payload, headers=self.headers)
        assert response.status_code == 200, f"Should return 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["titre"] == "Updated Title"
        assert data["statut"] == "en_renouvellement"
        assert data["montant_total"] == 15000
        
        # Verify with GET
        verify_response = requests.get(f"{BASE_URL}/api/contracts/{contract_id}", headers=self.headers)
        verify_data = verify_response.json()
        assert verify_data["titre"] == "Updated Title"
    
    def test_delete_contract(self):
        """DELETE /api/contracts/{id} deletes a contract"""
        # Create a contract
        payload = {
            "numero_contrat": "TEST-CTR-004",
            "titre": "Contract to Delete",
            "type_contrat": "prestation"
        }
        create_response = requests.post(f"{BASE_URL}/api/contracts", json=payload, headers=self.headers)
        assert create_response.status_code == 200
        contract_id = create_response.json()["id"]
        
        # Delete the contract
        response = requests.delete(f"{BASE_URL}/api/contracts/{contract_id}", headers=self.headers)
        assert response.status_code == 200, f"Should return 200, got {response.status_code}"
        
        # Verify it's deleted
        verify_response = requests.get(f"{BASE_URL}/api/contracts/{contract_id}", headers=self.headers)
        assert verify_response.status_code == 404, "Deleted contract should return 404"


class TestContractsStats:
    """Test contracts statistics endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token before each test"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@test.com", "password": "Admin123!"}
        )
        assert login_response.status_code == 200
        self.token = login_response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_stats(self):
        """GET /api/contracts/stats returns statistics"""
        response = requests.get(f"{BASE_URL}/api/contracts/stats", headers=self.headers)
        assert response.status_code == 200, f"Should return 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "total" in data
        assert "actifs" in data
        assert "expires" in data
        assert "resilies" in data
        assert "expirant_bientot" in data
        assert "cout_mensuel" in data
        assert "cout_annuel" in data
        
        # Values should be numbers
        assert isinstance(data["total"], int)
        assert isinstance(data["actifs"], int)
        assert isinstance(data["cout_mensuel"], (int, float))
        assert isinstance(data["cout_annuel"], (int, float))


class TestContractsAlerts:
    """Test contracts alerts endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token before each test"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@test.com", "password": "Admin123!"}
        )
        assert login_response.status_code == 200
        self.token = login_response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_alerts(self):
        """GET /api/contracts/alerts returns alerts list"""
        response = requests.get(f"{BASE_URL}/api/contracts/alerts", headers=self.headers)
        assert response.status_code == 200, f"Should return 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # If there are alerts, check structure
        if len(data) > 0:
            alert = data[0]
            assert "id" in alert
            assert "contract_id" in alert
            assert "type" in alert
            assert "titre" in alert
            assert "severity" in alert
            assert "message" in alert


class TestContractsFilters:
    """Test contracts filtering"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token before each test"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@test.com", "password": "Admin123!"}
        )
        assert login_response.status_code == 200
        self.token = login_response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_filter_by_statut(self):
        """GET /api/contracts?statut=actif filters by status"""
        response = requests.get(f"{BASE_URL}/api/contracts", params={"statut": "actif"}, headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        for contract in data:
            assert contract["statut"] == "actif", f"All contracts should be 'actif', got {contract['statut']}"
    
    def test_filter_by_type(self):
        """GET /api/contracts?type_contrat=maintenance filters by type"""
        response = requests.get(f"{BASE_URL}/api/contracts", params={"type_contrat": "maintenance"}, headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        for contract in data:
            assert contract["type_contrat"] == "maintenance"
    
    def test_search_filter(self):
        """GET /api/contracts?search=xxx filters by search term"""
        response = requests.get(f"{BASE_URL}/api/contracts", params={"search": "CTR-2026"}, headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        # Search should match numero_contrat, titre, or fournisseur_nom
        assert isinstance(data, list)


class TestContractsFileUpload:
    """Test file upload/download for contracts"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token before each test"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@test.com", "password": "Admin123!"}
        )
        assert login_response.status_code == 200
        self.token = login_response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.created_contract_ids = []
    
    def teardown_method(self, method):
        """Clean up created contracts after each test"""
        for contract_id in self.created_contract_ids:
            try:
                requests.delete(f"{BASE_URL}/api/contracts/{contract_id}", headers=self.headers)
            except:
                pass
    
    def test_upload_file_to_contract(self):
        """POST /api/contracts/{id}/upload uploads a file"""
        # Create a contract first
        payload = {
            "numero_contrat": "TEST-CTR-UPLOAD",
            "titre": "Test Upload Contract",
            "type_contrat": "maintenance"
        }
        create_response = requests.post(f"{BASE_URL}/api/contracts", json=payload, headers=self.headers)
        assert create_response.status_code == 200
        contract_id = create_response.json()["id"]
        self.created_contract_ids.append(contract_id)
        
        # Create a test file in memory
        test_file_content = b"Test file content for contract upload"
        files = {"file": ("test_document.txt", io.BytesIO(test_file_content), "text/plain")}
        
        # Upload the file
        upload_response = requests.post(
            f"{BASE_URL}/api/contracts/{contract_id}/upload",
            files=files,
            headers={"Authorization": f"Bearer {self.token}"}
        )
        assert upload_response.status_code == 200, f"Upload should return 200, got {upload_response.status_code}: {upload_response.text}"
        
        upload_data = upload_response.json()
        assert "id" in upload_data
        assert upload_data["filename"] == "test_document.txt"
        
        # Verify the file is attached to the contract
        contract_response = requests.get(f"{BASE_URL}/api/contracts/{contract_id}", headers=self.headers)
        contract_data = contract_response.json()
        assert "pieces_jointes" in contract_data
        assert len(contract_data["pieces_jointes"]) >= 1
        
        return contract_id, upload_data["id"]
    
    def test_download_file_from_contract(self):
        """GET /api/contracts/{id}/download/{file_id} downloads a file"""
        # Create and upload first
        payload = {
            "numero_contrat": "TEST-CTR-DOWNLOAD",
            "titre": "Test Download Contract",
            "type_contrat": "service"
        }
        create_response = requests.post(f"{BASE_URL}/api/contracts", json=payload, headers=self.headers)
        assert create_response.status_code == 200
        contract_id = create_response.json()["id"]
        self.created_contract_ids.append(contract_id)
        
        # Upload a file
        test_content = b"Download test content"
        files = {"file": ("download_test.txt", io.BytesIO(test_content), "text/plain")}
        upload_response = requests.post(
            f"{BASE_URL}/api/contracts/{contract_id}/upload",
            files=files,
            headers={"Authorization": f"Bearer {self.token}"}
        )
        assert upload_response.status_code == 200
        file_id = upload_response.json()["id"]
        
        # Download the file
        download_response = requests.get(
            f"{BASE_URL}/api/contracts/{contract_id}/download/{file_id}",
            headers=self.headers
        )
        assert download_response.status_code == 200, f"Download should return 200, got {download_response.status_code}"
        assert download_response.content == test_content


class TestContractsVendorIntegration:
    """Test vendor selection and pre-fill in contracts"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token before each test"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@test.com", "password": "Admin123!"}
        )
        assert login_response.status_code == 200
        self.token = login_response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_vendors_api_accessible(self):
        """GET /api/vendors is accessible for contract vendor selection"""
        response = requests.get(f"{BASE_URL}/api/vendors", headers=self.headers)
        assert response.status_code == 200, f"Vendors API should be accessible, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Vendors should return a list"


class TestContractsNoObjectId:
    """Test that no MongoDB ObjectId leaks into API responses"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token before each test"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@test.com", "password": "Admin123!"}
        )
        assert login_response.status_code == 200
        self.token = login_response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_contracts_list_no_objectid(self):
        """GET /api/contracts should not have _id field"""
        response = requests.get(f"{BASE_URL}/api/contracts", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        for contract in data:
            assert "_id" not in contract, f"Contract should not have _id field: {contract}"
            assert "id" in contract, "Contract should have 'id' field"
    
    def test_contract_detail_no_objectid(self):
        """GET /api/contracts/{id} should not have _id field"""
        # Get list first
        list_response = requests.get(f"{BASE_URL}/api/contracts", headers=self.headers)
        if list_response.json():
            contract_id = list_response.json()[0]["id"]
            
            detail_response = requests.get(f"{BASE_URL}/api/contracts/{contract_id}", headers=self.headers)
            assert detail_response.status_code == 200
            
            data = detail_response.json()
            assert "_id" not in data, f"Contract detail should not have _id: {data}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
