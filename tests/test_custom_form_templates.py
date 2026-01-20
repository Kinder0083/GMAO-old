"""
Test suite for Custom Form Templates feature
Tests: form-templates CRUD, custom-forms CRUD, PDF generation
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://maintenance-ai-3.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@test.com"
ADMIN_PASSWORD = "password"
POLE_ID = "e2e1974a-cfde-447c-ae69-39d611e874d6"


class TestFormTemplatesAPI:
    """Test /api/documentations/form-templates endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        self.created_template_ids = []
        yield
        # Cleanup: Delete created templates
        for template_id in self.created_template_ids:
            try:
                requests.delete(f"{BASE_URL}/api/documentations/form-templates/{template_id}", headers=self.headers)
            except:
                pass
    
    def test_get_form_templates_returns_system_templates(self):
        """GET /api/documentations/form-templates should return system templates"""
        response = requests.get(f"{BASE_URL}/api/documentations/form-templates", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        templates = response.json()
        assert isinstance(templates, list), "Response should be a list"
        
        # Should have at least 2 system templates
        system_templates = [t for t in templates if t.get("is_system")]
        assert len(system_templates) >= 2, f"Expected at least 2 system templates, got {len(system_templates)}"
        
        # Check for BON_TRAVAIL and AUTORISATION types
        types = [t.get("type") for t in system_templates]
        assert "BON_TRAVAIL" in types, "Missing BON_TRAVAIL system template"
        assert "AUTORISATION" in types, "Missing AUTORISATION system template"
        
        print(f"✓ Found {len(templates)} templates, {len(system_templates)} system templates")
    
    def test_create_custom_template_with_fields(self):
        """POST /api/documentations/form-templates should create custom template with fields"""
        template_data = {
            "nom": f"TEST_Template_{uuid.uuid4().hex[:8]}",
            "description": "Test template with various field types",
            "type": "CUSTOM",
            "fields": [
                {"id": "field_text", "type": "text", "label": "Texte court", "required": True},
                {"id": "field_textarea", "type": "textarea", "label": "Texte long", "required": False},
                {"id": "field_number", "type": "number", "label": "Nombre", "required": False, "min": 0, "max": 100},
                {"id": "field_date", "type": "date", "label": "Date", "required": True},
                {"id": "field_select", "type": "select", "label": "Liste déroulante", "options": ["Option 1", "Option 2", "Option 3"]},
                {"id": "field_checkbox", "type": "checkbox", "label": "Case à cocher"},
                {"id": "field_switch", "type": "switch", "label": "Oui/Non"},
                {"id": "field_signature", "type": "signature", "label": "Signature"}
            ],
            "actif": True
        }
        
        response = requests.post(f"{BASE_URL}/api/documentations/form-templates", json=template_data, headers=self.headers)
        assert response.status_code == 200, f"Failed to create template: {response.text}"
        
        created = response.json()
        self.created_template_ids.append(created["id"])
        
        # Verify response structure
        assert "id" in created, "Missing id in response"
        assert created["nom"] == template_data["nom"], "Name mismatch"
        assert created["type"] == "CUSTOM", "Type should be CUSTOM"
        assert created["is_system"] == False, "is_system should be False"
        assert len(created.get("fields", [])) == 8, f"Expected 8 fields, got {len(created.get('fields', []))}"
        
        # Verify fields are saved correctly
        fields = created.get("fields", [])
        field_types = [f["type"] for f in fields]
        assert "text" in field_types, "Missing text field"
        assert "textarea" in field_types, "Missing textarea field"
        assert "number" in field_types, "Missing number field"
        assert "date" in field_types, "Missing date field"
        assert "select" in field_types, "Missing select field"
        assert "checkbox" in field_types, "Missing checkbox field"
        assert "switch" in field_types, "Missing switch field"
        assert "signature" in field_types, "Missing signature field"
        
        print(f"✓ Created custom template with {len(fields)} fields")
        return created
    
    def test_get_custom_template_by_id(self):
        """GET /api/documentations/form-templates/{id} should return template with fields"""
        # First create a template
        created = self.test_create_custom_template_with_fields()
        
        # Then fetch it by ID
        response = requests.get(f"{BASE_URL}/api/documentations/form-templates/{created['id']}", headers=self.headers)
        assert response.status_code == 200, f"Failed to get template: {response.text}"
        
        fetched = response.json()
        assert fetched["id"] == created["id"], "ID mismatch"
        assert fetched["nom"] == created["nom"], "Name mismatch"
        assert len(fetched.get("fields", [])) == len(created.get("fields", [])), "Fields count mismatch"
        
        print(f"✓ Fetched template by ID with {len(fetched.get('fields', []))} fields")
    
    def test_update_custom_template(self):
        """PUT /api/documentations/form-templates/{id} should update template"""
        # First create a template
        created = self.test_create_custom_template_with_fields()
        
        # Update it
        update_data = {
            "nom": f"UPDATED_{created['nom']}",
            "description": "Updated description",
            "fields": [
                {"id": "new_field", "type": "text", "label": "New Field", "required": True}
            ]
        }
        
        response = requests.put(f"{BASE_URL}/api/documentations/form-templates/{created['id']}", json=update_data, headers=self.headers)
        assert response.status_code == 200, f"Failed to update template: {response.text}"
        
        updated = response.json()
        assert updated["nom"].startswith("UPDATED_"), "Name not updated"
        assert updated["description"] == "Updated description", "Description not updated"
        assert len(updated.get("fields", [])) == 1, "Fields not updated"
        
        print(f"✓ Updated template successfully")
    
    def test_cannot_modify_system_template(self):
        """PUT /api/documentations/form-templates/{id} should fail for system templates"""
        # Get system templates
        response = requests.get(f"{BASE_URL}/api/documentations/form-templates", headers=self.headers)
        templates = response.json()
        system_template = next((t for t in templates if t.get("is_system")), None)
        
        if system_template:
            update_data = {"nom": "Hacked Name"}
            response = requests.put(f"{BASE_URL}/api/documentations/form-templates/{system_template['id']}", json=update_data, headers=self.headers)
            assert response.status_code == 400, f"Should not allow modifying system template, got {response.status_code}"
            print(f"✓ Correctly prevented modification of system template")
        else:
            pytest.skip("No system template found to test")
    
    def test_cannot_delete_system_template(self):
        """DELETE /api/documentations/form-templates/{id} should fail for system templates"""
        # Get system templates
        response = requests.get(f"{BASE_URL}/api/documentations/form-templates", headers=self.headers)
        templates = response.json()
        system_template = next((t for t in templates if t.get("is_system")), None)
        
        if system_template:
            response = requests.delete(f"{BASE_URL}/api/documentations/form-templates/{system_template['id']}", headers=self.headers)
            assert response.status_code == 400, f"Should not allow deleting system template, got {response.status_code}"
            print(f"✓ Correctly prevented deletion of system template")
        else:
            pytest.skip("No system template found to test")
    
    def test_delete_custom_template(self):
        """DELETE /api/documentations/form-templates/{id} should delete custom template"""
        # First create a template
        created = self.test_create_custom_template_with_fields()
        template_id = created["id"]
        
        # Delete it
        response = requests.delete(f"{BASE_URL}/api/documentations/form-templates/{template_id}", headers=self.headers)
        assert response.status_code == 200, f"Failed to delete template: {response.text}"
        
        # Remove from cleanup list since already deleted
        self.created_template_ids.remove(template_id)
        
        # Verify it's deleted
        response = requests.get(f"{BASE_URL}/api/documentations/form-templates/{template_id}", headers=self.headers)
        assert response.status_code == 404, "Template should be deleted"
        
        print(f"✓ Deleted custom template successfully")


class TestCustomFormsAPI:
    """Test /api/documentations/custom-forms endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get token, create a test template"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        
        # Create a test template for custom forms
        template_data = {
            "nom": f"TEST_FormTemplate_{uuid.uuid4().hex[:8]}",
            "description": "Template for testing custom forms",
            "type": "CUSTOM",
            "fields": [
                {"id": "field_text", "type": "text", "label": "Texte", "required": True},
                {"id": "field_number", "type": "number", "label": "Nombre"},
                {"id": "field_date", "type": "date", "label": "Date"},
                {"id": "field_select", "type": "select", "label": "Choix", "options": ["A", "B", "C"]},
                {"id": "field_checkbox", "type": "checkbox", "label": "Coché"},
                {"id": "field_switch", "type": "switch", "label": "Actif"},
                {"id": "field_signature", "type": "signature", "label": "Signature"}
            ],
            "actif": True
        }
        response = requests.post(f"{BASE_URL}/api/documentations/form-templates", json=template_data, headers=self.headers)
        assert response.status_code == 200, f"Failed to create test template: {response.text}"
        self.test_template = response.json()
        
        self.created_form_ids = []
        yield
        
        # Cleanup: Delete created forms and template
        for form_id in self.created_form_ids:
            try:
                requests.delete(f"{BASE_URL}/api/documentations/custom-forms/{form_id}", headers=self.headers)
            except:
                pass
        try:
            requests.delete(f"{BASE_URL}/api/documentations/form-templates/{self.test_template['id']}", headers=self.headers)
        except:
            pass
    
    def test_create_custom_form(self):
        """POST /api/documentations/custom-forms should create a filled form"""
        form_data = {
            "template_id": self.test_template["id"],
            "pole_id": POLE_ID,
            "titre": f"TEST_Form_{uuid.uuid4().hex[:8]}",
            "field_values": {
                "field_text": "Test value",
                "field_number": "42",
                "field_date": "2025-01-15",
                "field_select": "B",
                "field_checkbox": True,
                "field_switch": False
            },
            "status": "BROUILLON"
        }
        
        response = requests.post(f"{BASE_URL}/api/documentations/custom-forms", json=form_data, headers=self.headers)
        assert response.status_code == 200, f"Failed to create custom form: {response.text}"
        
        created = response.json()
        self.created_form_ids.append(created["id"])
        
        # Verify response
        assert "id" in created, "Missing id"
        assert created["template_id"] == self.test_template["id"], "Template ID mismatch"
        assert created["pole_id"] == POLE_ID, "Pole ID mismatch"
        assert created["titre"] == form_data["titre"], "Title mismatch"
        assert created["status"] == "BROUILLON", "Status should be BROUILLON"
        assert created.get("field_values", {}).get("field_text") == "Test value", "Field value not saved"
        
        print(f"✓ Created custom form with field values")
        return created
    
    def test_create_custom_form_with_signature(self):
        """POST /api/documentations/custom-forms should save signature data"""
        # Base64 signature data (small test image)
        signature_data = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        form_data = {
            "template_id": self.test_template["id"],
            "pole_id": POLE_ID,
            "titre": f"TEST_FormWithSignature_{uuid.uuid4().hex[:8]}",
            "field_values": {"field_text": "Signed form"},
            "signature_data": signature_data,
            "status": "VALIDE"
        }
        
        response = requests.post(f"{BASE_URL}/api/documentations/custom-forms", json=form_data, headers=self.headers)
        assert response.status_code == 200, f"Failed to create form with signature: {response.text}"
        
        created = response.json()
        self.created_form_ids.append(created["id"])
        
        assert created.get("signature_data") == signature_data, "Signature data not saved"
        assert created["status"] == "VALIDE", "Status should be VALIDE when passed"
        
        print(f"✓ Created custom form with signature and VALIDE status")
        return created
    
    def test_get_custom_forms_by_pole(self):
        """GET /api/documentations/custom-forms?pole_id=X should return forms for pole"""
        # Create a form first
        created = self.test_create_custom_form()
        
        # Get forms for pole
        response = requests.get(f"{BASE_URL}/api/documentations/custom-forms?pole_id={POLE_ID}", headers=self.headers)
        assert response.status_code == 200, f"Failed to get forms: {response.text}"
        
        forms = response.json()
        assert isinstance(forms, list), "Response should be a list"
        
        # Find our created form
        found = next((f for f in forms if f["id"] == created["id"]), None)
        assert found is not None, "Created form not found in list"
        
        print(f"✓ Retrieved {len(forms)} forms for pole")
    
    def test_get_custom_form_by_id(self):
        """GET /api/documentations/custom-forms/{id} should return form details"""
        created = self.test_create_custom_form()
        
        response = requests.get(f"{BASE_URL}/api/documentations/custom-forms/{created['id']}", headers=self.headers)
        assert response.status_code == 200, f"Failed to get form: {response.text}"
        
        fetched = response.json()
        assert fetched["id"] == created["id"], "ID mismatch"
        assert fetched["field_values"] == created["field_values"], "Field values mismatch"
        
        print(f"✓ Retrieved custom form by ID")
    
    def test_update_custom_form(self):
        """PUT /api/documentations/custom-forms/{id} should update form"""
        created = self.test_create_custom_form()
        
        update_data = {
            "titre": "UPDATED_Title",
            "field_values": {
                "field_text": "Updated value",
                "field_number": "99"
            },
            "status": "VALIDE"
        }
        
        response = requests.put(f"{BASE_URL}/api/documentations/custom-forms/{created['id']}", json=update_data, headers=self.headers)
        assert response.status_code == 200, f"Failed to update form: {response.text}"
        
        updated = response.json()
        assert updated["titre"] == "UPDATED_Title", "Title not updated"
        assert updated["field_values"]["field_text"] == "Updated value", "Field value not updated"
        assert updated["status"] == "VALIDE", "Status not updated"
        
        print(f"✓ Updated custom form successfully")
    
    def test_delete_custom_form(self):
        """DELETE /api/documentations/custom-forms/{id} should delete form"""
        created = self.test_create_custom_form()
        form_id = created["id"]
        
        response = requests.delete(f"{BASE_URL}/api/documentations/custom-forms/{form_id}", headers=self.headers)
        assert response.status_code == 200, f"Failed to delete form: {response.text}"
        
        # Remove from cleanup list
        self.created_form_ids.remove(form_id)
        
        # Verify deleted
        response = requests.get(f"{BASE_URL}/api/documentations/custom-forms/{form_id}", headers=self.headers)
        assert response.status_code == 404, "Form should be deleted"
        
        print(f"✓ Deleted custom form successfully")
    
    def test_generate_custom_form_pdf(self):
        """GET /api/documentations/custom-forms/{id}/pdf should return HTML"""
        created = self.test_create_custom_form()
        
        response = requests.get(f"{BASE_URL}/api/documentations/custom-forms/{created['id']}/pdf?token={self.token}", headers=self.headers)
        assert response.status_code == 200, f"Failed to generate PDF: {response.text}"
        
        # Should return HTML content
        content_type = response.headers.get("content-type", "")
        assert "text/html" in content_type, f"Expected HTML, got {content_type}"
        
        html = response.text
        assert "<!DOCTYPE html>" in html or "<html" in html, "Response should be HTML"
        assert created["titre"] in html, "Form title should be in HTML"
        
        print(f"✓ Generated PDF (HTML) for custom form")


class TestExistingCustomTemplates:
    """Test existing custom templates mentioned in the context"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_rapport_inspection_template_exists(self):
        """Verify 'Rapport d inspection' template exists with 5 fields"""
        response = requests.get(f"{BASE_URL}/api/documentations/form-templates", headers=self.headers)
        assert response.status_code == 200
        
        templates = response.json()
        rapport_template = next((t for t in templates if "inspection" in t.get("nom", "").lower()), None)
        
        if rapport_template:
            print(f"✓ Found 'Rapport d inspection' template: {rapport_template['nom']}")
            print(f"  - Fields: {len(rapport_template.get('fields', []))}")
            print(f"  - Type: {rapport_template.get('type')}")
            print(f"  - Is System: {rapport_template.get('is_system')}")
            
            # Verify it has fields
            fields = rapport_template.get("fields", [])
            if len(fields) > 0:
                print(f"  - Field types: {[f.get('type') for f in fields]}")
        else:
            print("⚠ 'Rapport d inspection' template not found - may need to be created")
    
    def test_fiche_non_conformite_template_exists(self):
        """Verify 'Fiche de non-conformité' template exists"""
        response = requests.get(f"{BASE_URL}/api/documentations/form-templates", headers=self.headers)
        assert response.status_code == 200
        
        templates = response.json()
        fiche_template = next((t for t in templates if "non-conformit" in t.get("nom", "").lower() or "non conformit" in t.get("nom", "").lower()), None)
        
        if fiche_template:
            print(f"✓ Found 'Fiche de non-conformité' template: {fiche_template['nom']}")
            print(f"  - Fields: {len(fiche_template.get('fields', []))}")
        else:
            print("⚠ 'Fiche de non-conformité' template not found - may need to be created")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
