"""
Test suite for the Explorer View feature in Documentations module
Tests:
- Explorer view mode button presence
- GET /api/documentations/poles - list poles
- GET /api/documentations/poles/{pole_id}/explorer - explorer contents with breadcrumb, folders, documents, bons
- POST /api/documentations/poles/{pole_id}/folders - create folder
- PUT /api/documentations/folders/{folder_id} - update/rename folder
- DELETE /api/documentations/folders/{folder_id} - delete folder
- PUT /api/documentations/documents/{doc_id}/move - move document
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_token():
    """Login and get auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@test.com",
        "password": "Admin123!"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "token" in data
    return data["token"]

@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}

class TestDocumentationsExplorerAPI:
    """Test explorer view API endpoints"""

    def test_get_poles_list(self, auth_headers):
        """Test GET /api/documentations/poles returns poles with documents and bons"""
        response = requests.get(f"{BASE_URL}/api/documentations/poles", headers=auth_headers)
        assert response.status_code == 200
        poles = response.json()
        assert isinstance(poles, list)
        print(f"✅ Found {len(poles)} pole(s)")
        
        # Check that each pole has documents and bons_travail arrays
        if len(poles) > 0:
            pole = poles[0]
            assert "id" in pole
            assert "nom" in pole
            assert "documents" in pole
            assert "bons_travail" in pole
            print(f"✅ Pole structure verified: {pole.get('nom')} - {len(pole.get('documents', []))} docs, {len(pole.get('bons_travail', []))} bons")

    def test_get_explorer_contents_root(self, auth_headers):
        """Test GET /api/documentations/poles/{pole_id}/explorer - root level"""
        # First get a pole
        response = requests.get(f"{BASE_URL}/api/documentations/poles", headers=auth_headers)
        assert response.status_code == 200
        poles = response.json()
        
        if len(poles) == 0:
            pytest.skip("No poles available for testing")
        
        pole_id = poles[0]["id"]
        
        # Get explorer contents at root
        response = requests.get(f"{BASE_URL}/api/documentations/poles/{pole_id}/explorer", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "pole" in data
        assert "folders" in data
        assert "documents" in data
        assert "bons_travail" in data
        assert "breadcrumb" in data
        
        # Verify breadcrumb starts with pole
        assert len(data["breadcrumb"]) >= 1
        assert data["breadcrumb"][0]["type"] == "pole"
        assert data["breadcrumb"][0]["id"] == pole_id
        
        print(f"✅ Explorer root contents: {len(data['folders'])} folders, {len(data['documents'])} docs, {len(data['bons_travail'])} bons")
        print(f"✅ Breadcrumb: {[b['name'] for b in data['breadcrumb']]}")
        
        return pole_id

    def test_create_folder_in_pole(self, auth_headers):
        """Test POST /api/documentations/poles/{pole_id}/folders - create folder"""
        # Get a pole
        response = requests.get(f"{BASE_URL}/api/documentations/poles", headers=auth_headers)
        assert response.status_code == 200
        poles = response.json()
        
        if len(poles) == 0:
            pytest.skip("No poles available")
        
        pole_id = poles[0]["id"]
        folder_name = f"TEST_Dossier_{uuid.uuid4().hex[:6]}"
        
        # Create folder
        response = requests.post(
            f"{BASE_URL}/api/documentations/poles/{pole_id}/folders",
            headers=auth_headers,
            json={"name": folder_name, "parent_id": None}
        )
        assert response.status_code == 200, f"Create folder failed: {response.text}"
        folder = response.json()
        
        assert "id" in folder
        assert folder["name"] == folder_name
        assert folder["pole_id"] == pole_id
        assert folder["parent_id"] is None
        
        print(f"✅ Created folder: {folder['name']} (id: {folder['id']})")
        
        # Verify folder appears in explorer
        response = requests.get(f"{BASE_URL}/api/documentations/poles/{pole_id}/explorer", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        folder_ids = [f["id"] for f in data["folders"]]
        assert folder["id"] in folder_ids, "Created folder not found in explorer"
        
        print(f"✅ Folder verified in explorer contents")
        
        return folder

    def test_rename_folder(self, auth_headers):
        """Test PUT /api/documentations/folders/{folder_id} - rename folder"""
        # Create a folder first
        response = requests.get(f"{BASE_URL}/api/documentations/poles", headers=auth_headers)
        poles = response.json()
        if len(poles) == 0:
            pytest.skip("No poles available")
        
        pole_id = poles[0]["id"]
        
        # Create folder
        response = requests.post(
            f"{BASE_URL}/api/documentations/poles/{pole_id}/folders",
            headers=auth_headers,
            json={"name": f"TEST_ToRename_{uuid.uuid4().hex[:6]}", "parent_id": None}
        )
        assert response.status_code == 200
        folder = response.json()
        
        # Rename folder
        new_name = f"TEST_Renamed_{uuid.uuid4().hex[:6]}"
        response = requests.put(
            f"{BASE_URL}/api/documentations/folders/{folder['id']}",
            headers=auth_headers,
            json={"name": new_name}
        )
        assert response.status_code == 200, f"Rename folder failed: {response.text}"
        updated = response.json()
        
        assert updated["name"] == new_name
        print(f"✅ Folder renamed from '{folder['name']}' to '{new_name}'")
        
        return folder["id"]

    def test_delete_folder(self, auth_headers):
        """Test DELETE /api/documentations/folders/{folder_id} - delete folder"""
        # Create a folder first
        response = requests.get(f"{BASE_URL}/api/documentations/poles", headers=auth_headers)
        poles = response.json()
        if len(poles) == 0:
            pytest.skip("No poles available")
        
        pole_id = poles[0]["id"]
        
        # Create folder
        response = requests.post(
            f"{BASE_URL}/api/documentations/poles/{pole_id}/folders",
            headers=auth_headers,
            json={"name": f"TEST_ToDelete_{uuid.uuid4().hex[:6]}", "parent_id": None}
        )
        assert response.status_code == 200
        folder = response.json()
        
        # Delete folder
        response = requests.delete(
            f"{BASE_URL}/api/documentations/folders/{folder['id']}",
            headers=auth_headers
        )
        assert response.status_code == 200
        result = response.json()
        assert result["success"] == True
        
        print(f"✅ Folder '{folder['name']}' deleted successfully")
        
        # Verify folder no longer in explorer
        response = requests.get(f"{BASE_URL}/api/documentations/poles/{pole_id}/explorer", headers=auth_headers)
        data = response.json()
        folder_ids = [f["id"] for f in data["folders"]]
        assert folder["id"] not in folder_ids, "Deleted folder still found in explorer"
        
        print(f"✅ Verified folder removed from explorer")

    def test_explorer_with_folder_id(self, auth_headers):
        """Test GET /api/documentations/poles/{pole_id}/explorer with folder_id param"""
        # Get a pole
        response = requests.get(f"{BASE_URL}/api/documentations/poles", headers=auth_headers)
        poles = response.json()
        if len(poles) == 0:
            pytest.skip("No poles available")
        
        pole_id = poles[0]["id"]
        
        # Create a folder
        response = requests.post(
            f"{BASE_URL}/api/documentations/poles/{pole_id}/folders",
            headers=auth_headers,
            json={"name": f"TEST_Navigate_{uuid.uuid4().hex[:6]}", "parent_id": None}
        )
        assert response.status_code == 200
        folder = response.json()
        
        # Get explorer contents inside the folder
        response = requests.get(
            f"{BASE_URL}/api/documentations/poles/{pole_id}/explorer",
            headers=auth_headers,
            params={"folder_id": folder["id"]}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify breadcrumb includes the folder
        assert len(data["breadcrumb"]) >= 2
        breadcrumb_names = [b["name"] for b in data["breadcrumb"]]
        assert folder["name"] in breadcrumb_names
        
        # Verify current_folder_id matches
        assert data.get("current_folder_id") == folder["id"]
        
        print(f"✅ Explorer navigation to folder works. Breadcrumb: {breadcrumb_names}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/documentations/folders/{folder['id']}", headers=auth_headers)

    def test_nested_folders(self, auth_headers):
        """Test creating nested folders (subfolder inside folder)"""
        # Get a pole
        response = requests.get(f"{BASE_URL}/api/documentations/poles", headers=auth_headers)
        poles = response.json()
        if len(poles) == 0:
            pytest.skip("No poles available")
        
        pole_id = poles[0]["id"]
        
        # Create parent folder
        response = requests.post(
            f"{BASE_URL}/api/documentations/poles/{pole_id}/folders",
            headers=auth_headers,
            json={"name": f"TEST_Parent_{uuid.uuid4().hex[:6]}", "parent_id": None}
        )
        assert response.status_code == 200
        parent_folder = response.json()
        
        # Create child folder inside parent
        response = requests.post(
            f"{BASE_URL}/api/documentations/poles/{pole_id}/folders",
            headers=auth_headers,
            json={"name": f"TEST_Child_{uuid.uuid4().hex[:6]}", "parent_id": parent_folder["id"]}
        )
        assert response.status_code == 200
        child_folder = response.json()
        
        assert child_folder["parent_id"] == parent_folder["id"]
        
        print(f"✅ Nested folder created: {parent_folder['name']} > {child_folder['name']}")
        
        # Verify child appears when navigating to parent
        response = requests.get(
            f"{BASE_URL}/api/documentations/poles/{pole_id}/explorer",
            headers=auth_headers,
            params={"folder_id": parent_folder["id"]}
        )
        assert response.status_code == 200
        data = response.json()
        
        child_ids = [f["id"] for f in data["folders"]]
        assert child_folder["id"] in child_ids
        
        print(f"✅ Child folder found in parent explorer view")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/documentations/folders/{child_folder['id']}", headers=auth_headers)
        requests.delete(f"{BASE_URL}/api/documentations/folders/{parent_folder['id']}", headers=auth_headers)

    def test_move_document_endpoint_exists(self, auth_headers):
        """Test that PUT /api/documentations/documents/{doc_id}/move endpoint exists"""
        # We'll just verify the endpoint returns proper error for non-existent doc
        fake_doc_id = "non-existent-doc-id"
        response = requests.put(
            f"{BASE_URL}/api/documentations/documents/{fake_doc_id}/move",
            headers=auth_headers,
            json={"folder_id": None}
        )
        # Should return 404 for non-existent document, not 405 or 500
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print(f"✅ Move document endpoint exists and returns proper 404 for non-existent doc")

    def test_folders_endpoint(self, auth_headers):
        """Test GET /api/documentations/poles/{pole_id}/folders endpoint"""
        response = requests.get(f"{BASE_URL}/api/documentations/poles", headers=auth_headers)
        poles = response.json()
        if len(poles) == 0:
            pytest.skip("No poles available")
        
        pole_id = poles[0]["id"]
        
        # Get folders in pole
        response = requests.get(
            f"{BASE_URL}/api/documentations/poles/{pole_id}/folders",
            headers=auth_headers
        )
        assert response.status_code == 200
        folders = response.json()
        assert isinstance(folders, list)
        
        print(f"✅ Folders endpoint works. Found {len(folders)} folder(s) at root level")


class TestCleanup:
    """Cleanup test folders created during tests"""
    
    def test_cleanup_test_folders(self, auth_headers):
        """Delete all TEST_ prefixed folders"""
        response = requests.get(f"{BASE_URL}/api/documentations/poles", headers=auth_headers)
        poles = response.json()
        
        deleted_count = 0
        for pole in poles:
            response = requests.get(
                f"{BASE_URL}/api/documentations/poles/{pole['id']}/explorer",
                headers=auth_headers
            )
            if response.status_code == 200:
                data = response.json()
                for folder in data.get("folders", []):
                    if folder.get("name", "").startswith("TEST_"):
                        requests.delete(
                            f"{BASE_URL}/api/documentations/folders/{folder['id']}",
                            headers=auth_headers
                        )
                        deleted_count += 1
        
        print(f"✅ Cleanup: Deleted {deleted_count} test folder(s)")
