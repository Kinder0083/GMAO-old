"""
Tests for Documentations page refactoring:
- Form templates API
- Pole details with tree structure
- Admin-only access to form templates page
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://maintenance-ai-3.preview.emergentagent.com').rstrip('/')

class TestDocumentationsRefonte:
    """Tests for Documentations page refactoring"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "password"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data["access_token"]
        self.user = data["user"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        self.pole_id = "e2e1974a-cfde-447c-ae69-39d611e874d6"  # Maintenance pole
    
    # ==================== FORM TEMPLATES API ====================
    
    def test_get_form_templates(self):
        """Test GET /api/documentations/form-templates returns default templates"""
        response = requests.get(
            f"{BASE_URL}/api/documentations/form-templates",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        templates = response.json()
        assert isinstance(templates, list), "Response should be a list"
        assert len(templates) >= 2, "Should have at least 2 default templates"
        
        # Verify default templates exist
        template_types = [t["type"] for t in templates]
        assert "BON_TRAVAIL" in template_types, "Should have BON_TRAVAIL template"
        assert "AUTORISATION" in template_types, "Should have AUTORISATION template"
        
        # Verify template structure
        for template in templates:
            assert "id" in template, "Template should have id"
            assert "nom" in template, "Template should have nom"
            assert "type" in template, "Template should have type"
            assert "actif" in template, "Template should have actif"
            assert "is_system" in template, "Template should have is_system"
        
        print(f"✓ Found {len(templates)} form templates")
    
    def test_form_templates_default_values(self):
        """Test that default templates have correct values"""
        response = requests.get(
            f"{BASE_URL}/api/documentations/form-templates",
            headers=self.headers
        )
        assert response.status_code == 200
        
        templates = response.json()
        
        # Find BON_TRAVAIL template
        bon_travail = next((t for t in templates if t["type"] == "BON_TRAVAIL"), None)
        assert bon_travail is not None, "BON_TRAVAIL template not found"
        assert bon_travail["nom"] == "Bon de travail", f"Wrong name: {bon_travail['nom']}"
        assert bon_travail["is_system"] == True, "Should be system template"
        assert bon_travail["actif"] == True, "Should be active"
        
        # Find AUTORISATION template
        autorisation = next((t for t in templates if t["type"] == "AUTORISATION"), None)
        assert autorisation is not None, "AUTORISATION template not found"
        assert autorisation["nom"] == "Autorisation particulière", f"Wrong name: {autorisation['nom']}"
        assert autorisation["is_system"] == True, "Should be system template"
        assert autorisation["actif"] == True, "Should be active"
        
        print("✓ Default templates have correct values")
    
    # ==================== POLES API ====================
    
    def test_get_poles_list(self):
        """Test GET /api/documentations/poles returns poles with documents and bons"""
        response = requests.get(
            f"{BASE_URL}/api/documentations/poles",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        poles = response.json()
        assert isinstance(poles, list), "Response should be a list"
        
        # Verify pole structure includes documents and bons_travail
        for pole in poles:
            assert "id" in pole, "Pole should have id"
            assert "nom" in pole, "Pole should have nom"
            assert "documents" in pole, "Pole should have documents array"
            assert "bons_travail" in pole, "Pole should have bons_travail array"
            assert isinstance(pole["documents"], list), "documents should be a list"
            assert isinstance(pole["bons_travail"], list), "bons_travail should be a list"
        
        print(f"✓ Found {len(poles)} poles with documents and bons_travail")
    
    def test_get_pole_details(self):
        """Test GET /api/documentations/poles/{pole_id} returns pole with tree data"""
        response = requests.get(
            f"{BASE_URL}/api/documentations/poles/{self.pole_id}",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        pole = response.json()
        
        # Verify pole structure
        assert pole["id"] == self.pole_id, "Wrong pole ID"
        assert "nom" in pole, "Pole should have nom"
        assert "documents" in pole, "Pole should have documents"
        assert "bons_travail" in pole, "Pole should have bons_travail"
        
        # Verify documents structure
        for doc in pole.get("documents", []):
            assert "id" in doc, "Document should have id"
            assert "titre" in doc or "fichier_nom" in doc, "Document should have titre or fichier_nom"
            assert "created_at" in doc, "Document should have created_at"
        
        # Verify bons_travail structure
        for bon in pole.get("bons_travail", []):
            assert "id" in bon, "Bon should have id"
            assert "created_at" in bon, "Bon should have created_at"
        
        print(f"✓ Pole '{pole['nom']}' has {len(pole.get('documents', []))} documents and {len(pole.get('bons_travail', []))} bons")
    
    def test_get_pole_not_found(self):
        """Test GET /api/documentations/poles/{invalid_id} returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/documentations/poles/invalid-pole-id-12345",
            headers=self.headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid pole ID returns 404")
    
    # ==================== DOCUMENTS API ====================
    
    def test_get_documents_by_pole(self):
        """Test GET /api/documentations/documents?pole_id={pole_id}"""
        response = requests.get(
            f"{BASE_URL}/api/documentations/documents?pole_id={self.pole_id}",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        documents = response.json()
        assert isinstance(documents, list), "Response should be a list"
        
        # All documents should belong to the specified pole
        for doc in documents:
            assert doc.get("pole_id") == self.pole_id, f"Document {doc['id']} has wrong pole_id"
        
        print(f"✓ Found {len(documents)} documents for pole {self.pole_id}")
    
    # ==================== BONS DE TRAVAIL API ====================
    
    def test_get_bons_travail_by_pole(self):
        """Test GET /api/documentations/bons-travail?pole_id={pole_id}"""
        response = requests.get(
            f"{BASE_URL}/api/documentations/bons-travail?pole_id={self.pole_id}",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        bons = response.json()
        assert isinstance(bons, list), "Response should be a list"
        
        # All bons should belong to the specified pole
        for bon in bons:
            assert bon.get("pole_id") == self.pole_id, f"Bon {bon['id']} has wrong pole_id"
        
        print(f"✓ Found {len(bons)} bons de travail for pole {self.pole_id}")
    
    # ==================== ADMIN PERMISSIONS ====================
    
    def test_admin_can_access_form_templates(self):
        """Test that admin user can access form templates"""
        assert self.user["role"] == "ADMIN", "Test user should be admin"
        
        response = requests.get(
            f"{BASE_URL}/api/documentations/form-templates",
            headers=self.headers
        )
        assert response.status_code == 200, f"Admin should access form templates: {response.text}"
        print("✓ Admin can access form templates")
    
    def test_create_form_template_admin_only(self):
        """Test POST /api/documentations/form-templates (admin only)"""
        # Create a test template
        template_data = {
            "nom": "TEST_Template_Pytest",
            "type": "BON_TRAVAIL",
            "description": "Test template created by pytest",
            "actif": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/documentations/form-templates",
            headers=self.headers,
            json=template_data
        )
        assert response.status_code == 200, f"Failed to create template: {response.text}"
        
        created = response.json()
        assert created["nom"] == template_data["nom"], "Wrong name"
        assert created["type"] == template_data["type"], "Wrong type"
        assert created["is_system"] == False, "Should not be system template"
        
        # Cleanup: Delete the test template
        delete_response = requests.delete(
            f"{BASE_URL}/api/documentations/form-templates/{created['id']}",
            headers=self.headers
        )
        assert delete_response.status_code == 200, f"Failed to delete test template: {delete_response.text}"
        
        print("✓ Admin can create and delete form templates")
    
    def test_cannot_delete_system_template(self):
        """Test that system templates cannot be deleted"""
        # Get templates to find a system one
        response = requests.get(
            f"{BASE_URL}/api/documentations/form-templates",
            headers=self.headers
        )
        templates = response.json()
        
        system_template = next((t for t in templates if t.get("is_system")), None)
        assert system_template is not None, "No system template found"
        
        # Try to delete system template
        delete_response = requests.delete(
            f"{BASE_URL}/api/documentations/form-templates/{system_template['id']}",
            headers=self.headers
        )
        assert delete_response.status_code == 400, f"Should not be able to delete system template: {delete_response.status_code}"
        
        print("✓ System templates cannot be deleted")
    
    def test_cannot_modify_system_template(self):
        """Test that system templates cannot be modified"""
        # Get templates to find a system one
        response = requests.get(
            f"{BASE_URL}/api/documentations/form-templates",
            headers=self.headers
        )
        templates = response.json()
        
        system_template = next((t for t in templates if t.get("is_system")), None)
        assert system_template is not None, "No system template found"
        
        # Try to modify system template
        update_response = requests.put(
            f"{BASE_URL}/api/documentations/form-templates/{system_template['id']}",
            headers=self.headers,
            json={"nom": "Modified Name"}
        )
        assert update_response.status_code == 400, f"Should not be able to modify system template: {update_response.status_code}"
        
        print("✓ System templates cannot be modified")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
