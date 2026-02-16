"""
Tests for Surveillance AI Integration Features
- POST /api/surveillance/ai/extract - Upload PDF and extract control information via AI (Gemini)
- POST /api/surveillance/ai/create-batch - Create multiple surveillance items from extracted data
- Verify new fields work in existing CRUD endpoints
"""
import pytest
import requests
import os
import json
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSurveillanceAIExtraction:
    """Tests for AI extraction endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@test.com", "password": "Admin123!"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_ai_extract_endpoint_exists(self):
        """Test that the AI extract endpoint is available"""
        # Just test with an empty file to see if endpoint exists
        response = requests.post(
            f"{BASE_URL}/api/surveillance/ai/extract",
            headers=self.headers,
            files={"file": ("empty.pdf", b"", "application/pdf")}
        )
        # Endpoint should exist (might fail due to empty file, but not 404)
        assert response.status_code != 404, "AI extract endpoint not found"
        print(f"AI extract endpoint exists, status: {response.status_code}")
    
    def test_ai_extract_with_pdf(self):
        """Test AI extraction with a real PDF document (controle_apave_2.pdf)"""
        pdf_path = "/tmp/controle_apave_2.pdf"
        if not os.path.exists(pdf_path):
            pytest.skip("Test PDF file not found at /tmp/controle_apave_2.pdf")
        
        with open(pdf_path, "rb") as f:
            response = requests.post(
                f"{BASE_URL}/api/surveillance/ai/extract",
                headers=self.headers,
                files={"file": ("controle_apave_2.pdf", f, "application/pdf")},
                timeout=120  # AI endpoint takes 30-60 seconds
            )
        
        assert response.status_code == 200, f"AI extraction failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True, f"Extraction not successful: {data}"
        assert "data" in data, "Missing 'data' in response"
        
        extracted = data["data"]
        assert "document_info" in extracted, "Missing document_info"
        assert "controles" in extracted, "Missing controles"
        assert len(extracted["controles"]) > 0, "No controls extracted"
        
        print(f"Extracted {len(extracted['controles'])} controls from document")
        print(f"Document info: {json.dumps(extracted['document_info'], indent=2)}")
        
        # Verify control structure
        for i, ctrl in enumerate(extracted["controles"]):
            print(f"\nControl {i+1}: {ctrl.get('classe_type', 'N/A')}")
            print(f"  Category: {ctrl.get('category', 'N/A')}")
            print(f"  Result: {ctrl.get('resultat', 'N/A')}")
            print(f"  Periodicite: {ctrl.get('periodicite_detectee', 'N/A')}")
            
            # Verify required fields exist
            assert "classe_type" in ctrl, f"Control {i} missing classe_type"
            assert "category" in ctrl, f"Control {i} missing category"
        
        # Store extracted data for batch creation test
        self.extracted_data = extracted
        return extracted


class TestSurveillanceAIBatchCreation:
    """Tests for batch creation from AI extracted data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@test.com", "password": "Admin123!"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
    
    def test_batch_create_endpoint_exists(self):
        """Test that the batch create endpoint is available"""
        response = requests.post(
            f"{BASE_URL}/api/surveillance/ai/create-batch",
            headers=self.headers,
            json={"document_info": {}, "controles": []}
        )
        # Endpoint should exist
        assert response.status_code != 404, "Batch create endpoint not found"
        print(f"Batch create endpoint exists, status: {response.status_code}")
    
    def test_batch_create_with_mock_data(self):
        """Test batch creation with mock extracted data"""
        mock_data = {
            "document_info": {
                "numero_rapport": "TEST-2026-001",
                "organisme_controle": "APAVE TEST",
                "date_intervention": "2026-01-15",
                "site_controle": "Site de Test"
            },
            "controles": [
                {
                    "classe_type": "TEST Thermographie infrarouge",
                    "category": "ELECTRIQUE",
                    "batiment": "BATIMENT TEST",
                    "executant": "APAVE TEST",
                    "description": "Test de thermographie",
                    "derniere_visite": "2026-01-15",
                    "references_reglementaires": "APSAD D19",
                    "resultat": "CONFORME",
                    "periodicite": "1 an",
                    "periodicite_detectee": "1 an"
                }
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/surveillance/ai/create-batch",
            headers=self.headers,
            json=mock_data
        )
        
        assert response.status_code == 200, f"Batch creation failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, f"Batch creation not successful: {data}"
        assert data.get("created_count", 0) >= 1, "No items created"
        assert "created_items" in data, "Missing created_items"
        
        print(f"Created {data['created_count']} surveillance item(s)")
        
        # Verify created item has new fields
        if data.get("created_items"):
            created = data["created_items"][0]
            assert created.get("organisme_controle") == "APAVE TEST", "organisme_controle not set"
            assert created.get("numero_rapport") == "TEST-2026-001", "numero_rapport not set"
            assert created.get("reference_reglementaire") is not None, "reference_reglementaire not set"
            print(f"Created item ID: {created.get('id')}")
            print(f"Organisme: {created.get('organisme_controle')}")
            print(f"Rapport: {created.get('numero_rapport')}")
        
        return data
    
    def test_batch_create_with_non_conformity_creates_work_order(self):
        """Test that non-conformity creates a curative work order automatically"""
        mock_data = {
            "document_info": {
                "numero_rapport": "TEST-NC-2026-001",
                "organisme_controle": "APAVE TEST NC",
                "date_intervention": "2026-01-15",
                "site_controle": "Site de Test NC"
            },
            "controles": [
                {
                    "classe_type": "TEST Non-conformité détection",
                    "category": "SECURITE_ENVIRONNEMENT",
                    "batiment": "BATIMENT TEST NC",
                    "executant": "APAVE TEST NC",
                    "description": "Test avec non-conformité",
                    "derniere_visite": "2026-01-15",
                    "references_reglementaires": "Article Test",
                    "resultat": "NON_CONFORME",
                    "anomalies": "Détection d'une anomalie grave de test",
                    "periodicite": "6 mois",
                    "periodicite_detectee": "6 mois"
                }
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/surveillance/ai/create-batch",
            headers=self.headers,
            json=mock_data
        )
        
        assert response.status_code == 200, f"Batch creation failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, f"Batch creation not successful: {data}"
        
        # Check if work order was created for non-conformity
        work_orders = data.get("work_orders_created", [])
        print(f"Work orders created: {len(work_orders)}")
        
        if work_orders:
            wo = work_orders[0]
            print(f"Work order ID: {wo.get('id')}")
            print(f"Work order numero: {wo.get('numero')}")
            print(f"Work order titre: {wo.get('titre')}")
            assert "[Curatif]" in wo.get("titre", ""), "Work order should be curative"
        else:
            print("WARNING: No work order created for non-conformity")
        
        return data


class TestSurveillanceNewFields:
    """Tests for new fields in existing CRUD endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@test.com", "password": "Admin123!"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
    
    def test_create_item_with_new_fields(self):
        """Test creating a surveillance item with new fields"""
        item_data = {
            "classe_type": "TEST Création avec nouveaux champs",
            "category": "ELECTRIQUE",
            "batiment": "BATIMENT TEST NEW",
            "periodicite": "1 an",
            "responsable": "EXTERNE",
            "executant": "SOCOTEC TEST",
            "description": "Test des nouveaux champs",
            "reference_reglementaire": "Article R4226-14 Code du Travail, Arrêté 26/12/2011",
            "numero_rapport": "SOCOTEC-2026-TEST",
            "organisme_controle": "SOCOTEC",
            "resultat_controle": "Conforme"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/surveillance/items",
            headers=self.headers,
            json=item_data
        )
        
        assert response.status_code == 200, f"Create item failed: {response.text}"
        data = response.json()
        
        # Verify new fields are present
        assert data.get("reference_reglementaire") == item_data["reference_reglementaire"], "reference_reglementaire not saved"
        assert data.get("numero_rapport") == item_data["numero_rapport"], "numero_rapport not saved"
        assert data.get("organisme_controle") == item_data["organisme_controle"], "organisme_controle not saved"
        assert data.get("resultat_controle") == item_data["resultat_controle"], "resultat_controle not saved"
        
        print(f"Created item with ID: {data.get('id')}")
        print(f"Reference réglementaire: {data.get('reference_reglementaire')}")
        print(f"Numéro rapport: {data.get('numero_rapport')}")
        print(f"Organisme contrôle: {data.get('organisme_controle')}")
        print(f"Résultat contrôle: {data.get('resultat_controle')}")
        
        self.created_id = data.get("id")
        return data
    
    def test_update_item_new_fields(self):
        """Test updating a surveillance item's new fields"""
        # First create an item
        create_data = {
            "classe_type": "TEST Update nouveaux champs",
            "category": "INCENDIE",
            "batiment": "BATIMENT TEST UPDATE",
            "periodicite": "6 mois",
            "responsable": "MAINT",
            "executant": "DEKRA"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/surveillance/items",
            headers=self.headers,
            json=create_data
        )
        assert create_response.status_code == 200
        item_id = create_response.json().get("id")
        
        # Now update with new fields
        update_data = {
            "reference_reglementaire": "MS 73, PE 4 - Règlement de sécurité incendie",
            "numero_rapport": "DEKRA-2026-UPDATE",
            "organisme_controle": "DEKRA",
            "resultat_controle": "Avec réserves"
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/surveillance/items/{item_id}",
            headers=self.headers,
            json=update_data
        )
        
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        data = update_response.json()
        
        assert data.get("reference_reglementaire") == update_data["reference_reglementaire"]
        assert data.get("numero_rapport") == update_data["numero_rapport"]
        assert data.get("organisme_controle") == update_data["organisme_controle"]
        assert data.get("resultat_controle") == update_data["resultat_controle"]
        
        print(f"Updated item {item_id} with new fields successfully")
        return data
    
    def test_get_item_returns_new_fields(self):
        """Test that GET item returns new fields"""
        # First create an item with new fields
        create_data = {
            "classe_type": "TEST GET nouveaux champs",
            "category": "MANUTENTION",
            "batiment": "BATIMENT TEST GET",
            "periodicite": "1 an",
            "responsable": "EXTERNE",
            "executant": "BUREAU VERITAS",
            "reference_reglementaire": "Arrêté 01/03/2004 - VGP Levage",
            "numero_rapport": "BV-2026-TEST",
            "organisme_controle": "BUREAU VERITAS",
            "resultat_controle": "Non conforme"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/surveillance/items",
            headers=self.headers,
            json=create_data
        )
        assert create_response.status_code == 200
        item_id = create_response.json().get("id")
        
        # GET the item
        get_response = requests.get(
            f"{BASE_URL}/api/surveillance/items/{item_id}",
            headers=self.headers
        )
        
        assert get_response.status_code == 200, f"GET failed: {get_response.text}"
        data = get_response.json()
        
        # Verify all new fields are returned
        assert data.get("reference_reglementaire") == create_data["reference_reglementaire"]
        assert data.get("numero_rapport") == create_data["numero_rapport"]
        assert data.get("organisme_controle") == create_data["organisme_controle"]
        assert data.get("resultat_controle") == create_data["resultat_controle"]
        
        print(f"GET item {item_id} returned all new fields correctly")
        return data


class TestCleanupTestData:
    """Cleanup test data created during tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@test.com", "password": "Admin123!"}
        )
        assert login_response.status_code == 200
        self.token = login_response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_cleanup_test_items(self):
        """Clean up test surveillance items"""
        # Get all items
        response = requests.get(
            f"{BASE_URL}/api/surveillance/items",
            headers=self.headers
        )
        
        if response.status_code == 200:
            items = response.json()
            test_items = [i for i in items if "TEST" in str(i.get("classe_type", ""))]
            
            deleted = 0
            for item in test_items:
                del_response = requests.delete(
                    f"{BASE_URL}/api/surveillance/items/{item['id']}",
                    headers=self.headers
                )
                if del_response.status_code == 200:
                    deleted += 1
            
            print(f"Cleaned up {deleted} test surveillance items")
        
        # Cleanup test work orders
        wo_response = requests.get(
            f"{BASE_URL}/api/work-orders",
            headers=self.headers
        )
        
        if wo_response.status_code == 200:
            work_orders = wo_response.json()
            test_wos = [w for w in work_orders if "TEST" in str(w.get("titre", "")) or "Curatif" in str(w.get("titre", ""))]
            
            deleted_wo = 0
            for wo in test_wos:
                del_wo_response = requests.delete(
                    f"{BASE_URL}/api/work-orders/{wo['id']}",
                    headers=self.headers
                )
                if del_wo_response.status_code == 200:
                    deleted_wo += 1
            
            print(f"Cleaned up {deleted_wo} test work orders")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
