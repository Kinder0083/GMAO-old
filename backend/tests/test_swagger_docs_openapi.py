"""
Test Suite for Swagger/OpenAPI Documentation (Iteration 7)
Tests: HTTP Basic Auth protection for Swagger UI and ReDoc, OpenAPI schema metadata
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Docs credentials
DOCS_USER = "admin"
DOCS_PASS = "atlas2024"

# API credentials for regression tests
API_EMAIL = "admin@test.com"
API_PASSWORD = "Admin123!"


class TestSwaggerDocsAuth:
    """Test Swagger UI HTTP Basic Auth protection"""
    
    def test_swagger_ui_without_auth_returns_401(self):
        """Swagger UI requires authentication"""
        response = requests.get(f"{BASE_URL}/api/docs")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_swagger_ui_with_correct_auth_returns_200(self):
        """Swagger UI accessible with correct credentials"""
        response = requests.get(f"{BASE_URL}/api/docs", auth=(DOCS_USER, DOCS_PASS))
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert "swagger-ui" in response.text.lower(), "Swagger UI HTML not found"
        assert "GMAO Atlas" in response.text, "Custom title not found"
    
    def test_swagger_ui_with_wrong_auth_returns_401(self):
        """Swagger UI rejects wrong credentials"""
        response = requests.get(f"{BASE_URL}/api/docs", auth=("wrong", "wrong"))
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


class TestReDocAuth:
    """Test ReDoc HTTP Basic Auth protection"""
    
    def test_redoc_without_auth_returns_401(self):
        """ReDoc requires authentication"""
        response = requests.get(f"{BASE_URL}/api/redoc")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_redoc_with_correct_auth_returns_200(self):
        """ReDoc accessible with correct credentials"""
        response = requests.get(f"{BASE_URL}/api/redoc", auth=(DOCS_USER, DOCS_PASS))
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert "redoc" in response.text.lower(), "ReDoc HTML not found"
        assert "GMAO Atlas" in response.text, "Custom title not found"
    
    def test_redoc_with_wrong_auth_returns_401(self):
        """ReDoc rejects wrong credentials"""
        response = requests.get(f"{BASE_URL}/api/redoc", auth=("wrong", "wrong"))
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


class TestOpenAPISchema:
    """Test OpenAPI JSON schema (publicly accessible)"""
    
    def test_openapi_json_publicly_accessible(self):
        """OpenAPI JSON does not require auth"""
        response = requests.get(f"{BASE_URL}/api/openapi.json")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_openapi_title_is_gmao_atlas_api(self):
        """OpenAPI schema has correct title"""
        response = requests.get(f"{BASE_URL}/api/openapi.json")
        data = response.json()
        assert data["info"]["title"] == "GMAO Atlas API", f"Wrong title: {data['info']['title']}"
    
    def test_openapi_version_is_2_2_0(self):
        """OpenAPI schema has version 2.2.0"""
        response = requests.get(f"{BASE_URL}/api/openapi.json")
        data = response.json()
        assert data["info"]["version"] == "2.2.0", f"Wrong version: {data['info']['version']}"
    
    def test_openapi_has_55_tags(self):
        """OpenAPI schema has 55 tags with descriptions"""
        response = requests.get(f"{BASE_URL}/api/openapi.json")
        data = response.json()
        tags = data.get("tags", [])
        assert len(tags) == 55, f"Expected 55 tags, got {len(tags)}"
    
    def test_openapi_tags_have_descriptions(self):
        """All tags have descriptions"""
        response = requests.get(f"{BASE_URL}/api/openapi.json")
        data = response.json()
        tags = data.get("tags", [])
        for tag in tags:
            assert "description" in tag, f"Tag '{tag.get('name')}' missing description"
            assert len(tag["description"]) > 0, f"Tag '{tag.get('name')}' has empty description"
    
    def test_openapi_has_contact_info(self):
        """OpenAPI schema has contact information"""
        response = requests.get(f"{BASE_URL}/api/openapi.json")
        data = response.json()
        contact = data["info"].get("contact", {})
        assert contact.get("name") == "GMAO Atlas Support"
        assert contact.get("email") == "support@gmao-atlas.fr"
    
    def test_openapi_endpoints_have_summaries(self):
        """Sample endpoints have summary/description"""
        response = requests.get(f"{BASE_URL}/api/openapi.json")
        data = response.json()
        paths = data.get("paths", {})
        
        # Check key endpoints have summaries
        key_paths = [
            ("/api/auth/login", "post"),
            ("/api/version", "get"),
            ("/api/users", "get"),
            ("/api/mes/machines", "get"),
        ]
        
        for path, method in key_paths:
            if path in paths and method in paths[path]:
                endpoint = paths[path][method]
                assert "summary" in endpoint or "description" in endpoint, \
                    f"Endpoint {method.upper()} {path} missing summary/description"


class TestRegressionEndpoints:
    """Regression tests - ensure existing endpoints still work"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": API_EMAIL, "password": API_PASSWORD}
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Login failed - cannot run authenticated tests")
    
    def test_login_still_works(self):
        """POST /api/auth/login returns token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": API_EMAIL, "password": API_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert "password" not in data.get("user", {})
        assert "hashed_password" not in data.get("user", {})
    
    def test_version_endpoint_still_works(self):
        """GET /api/version returns correct structure"""
        response = requests.get(f"{BASE_URL}/api/version")
        assert response.status_code == 200
        data = response.json()
        assert "version" in data
        assert "versionName" in data
        assert "releaseDate" in data
    
    def test_settings_with_token_still_works(self, auth_token):
        """GET /api/settings returns settings"""
        response = requests.get(
            f"{BASE_URL}/api/settings",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
    
    def test_mes_machines_still_works(self, auth_token):
        """GET /api/mes/machines returns list"""
        response = requests.get(
            f"{BASE_URL}/api/mes/machines",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_users_list_no_password_leak(self, auth_token):
        """GET /api/users doesn't leak password fields"""
        response = requests.get(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            user = data[0]
            assert "password" not in user, "Password field leaked"
            assert "hashed_password" not in user, "Hashed password field leaked"
            assert "reset_token" not in user, "Reset token field leaked"
