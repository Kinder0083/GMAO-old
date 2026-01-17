"""
Test suite for Attachments feature on Presqu'accident and Preventive Maintenance
Tests the new attachment upload/download/delete functionality added to both modules
"""
import pytest
import requests
import os
import uuid
import tempfile

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@test.com"
TEST_PASSWORD = "password"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "access_token" in data, "No access_token in response"
    return data["access_token"]


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Create authenticated session"""
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    })
    return session


@pytest.fixture(scope="module")
def test_file():
    """Create a temporary test file for upload tests"""
    content = b"Test file content for attachment testing - " + str(uuid.uuid4()).encode()
    with tempfile.NamedTemporaryFile(mode='wb', suffix='.txt', delete=False) as f:
        f.write(content)
        temp_path = f.name
    yield temp_path
    # Cleanup
    if os.path.exists(temp_path):
        os.remove(temp_path)


# ==================== PRESQU'ACCIDENT ATTACHMENT TESTS ====================

class TestPresquAccidentAttachments:
    """Tests for Presqu'accident attachment endpoints"""
    
    # Known presqu'accident ID from context
    PRESQU_ACCIDENT_ID = "94a7e5a8-79f8-4a7b-8f5f-6f31288fb029"
    uploaded_attachment_id = None
    
    def test_01_get_presqu_accident_exists(self, api_client):
        """Verify the presqu'accident item exists"""
        response = api_client.get(f"{BASE_URL}/api/presqu-accident/items/{self.PRESQU_ACCIDENT_ID}")
        assert response.status_code == 200, f"Presqu'accident not found: {response.text}"
        data = response.json()
        assert data.get("id") == self.PRESQU_ACCIDENT_ID
        print(f"✓ Presqu'accident found: {data.get('titre', 'N/A')}")
    
    def test_02_get_attachments_empty(self, api_client):
        """GET /api/presqu-accident/items/{id}/attachments - should return empty list initially"""
        response = api_client.get(f"{BASE_URL}/api/presqu-accident/items/{self.PRESQU_ACCIDENT_ID}/attachments")
        assert response.status_code == 200, f"Failed to get attachments: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Current attachments count: {len(data)}")
    
    def test_03_upload_attachment(self, api_client, test_file):
        """POST /api/presqu-accident/items/{id}/attachments - upload a file"""
        with open(test_file, 'rb') as f:
            files = {'file': ('test_presqu_accident_attachment.txt', f, 'text/plain')}
            # Remove Content-Type header for multipart upload
            headers = {"Authorization": api_client.headers["Authorization"]}
            response = requests.post(
                f"{BASE_URL}/api/presqu-accident/items/{self.PRESQU_ACCIDENT_ID}/attachments",
                files=files,
                headers=headers
            )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Upload should return success=True"
        assert "attachment" in data, "Response should contain attachment info"
        
        attachment = data["attachment"]
        assert "id" in attachment, "Attachment should have an id"
        assert attachment.get("original_filename") == "test_presqu_accident_attachment.txt"
        
        # Store for later tests
        TestPresquAccidentAttachments.uploaded_attachment_id = attachment["id"]
        print(f"✓ Attachment uploaded with ID: {attachment['id']}")
    
    def test_04_get_attachments_after_upload(self, api_client):
        """GET /api/presqu-accident/items/{id}/attachments - verify attachment appears in list"""
        response = api_client.get(f"{BASE_URL}/api/presqu-accident/items/{self.PRESQU_ACCIDENT_ID}/attachments")
        assert response.status_code == 200, f"Failed to get attachments: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) >= 1, "Should have at least 1 attachment after upload"
        
        # Find our uploaded attachment
        found = False
        for att in data:
            if att.get("id") == TestPresquAccidentAttachments.uploaded_attachment_id:
                found = True
                assert att.get("original_filename") == "test_presqu_accident_attachment.txt"
                break
        
        assert found, "Uploaded attachment not found in list"
        print(f"✓ Attachment verified in list, total: {len(data)}")
    
    def test_05_download_attachment(self, api_client):
        """GET /api/presqu-accident/items/{id}/attachments/{attachment_id} - download file"""
        attachment_id = TestPresquAccidentAttachments.uploaded_attachment_id
        assert attachment_id, "No attachment ID from previous test"
        
        headers = {"Authorization": api_client.headers["Authorization"]}
        response = requests.get(
            f"{BASE_URL}/api/presqu-accident/items/{self.PRESQU_ACCIDENT_ID}/attachments/{attachment_id}",
            headers=headers
        )
        
        assert response.status_code == 200, f"Download failed: {response.text}"
        assert len(response.content) > 0, "Downloaded file should have content"
        print(f"✓ Attachment downloaded, size: {len(response.content)} bytes")
    
    def test_06_delete_attachment(self, api_client):
        """DELETE /api/presqu-accident/items/{id}/attachments/{attachment_id} - delete file"""
        attachment_id = TestPresquAccidentAttachments.uploaded_attachment_id
        assert attachment_id, "No attachment ID from previous test"
        
        response = api_client.delete(
            f"{BASE_URL}/api/presqu-accident/items/{self.PRESQU_ACCIDENT_ID}/attachments/{attachment_id}"
        )
        
        assert response.status_code == 200, f"Delete failed: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Delete should return success=True"
        print(f"✓ Attachment deleted successfully")
    
    def test_07_verify_attachment_deleted(self, api_client):
        """Verify attachment no longer exists after deletion"""
        response = api_client.get(f"{BASE_URL}/api/presqu-accident/items/{self.PRESQU_ACCIDENT_ID}/attachments")
        assert response.status_code == 200
        data = response.json()
        
        # Verify our attachment is gone
        for att in data:
            assert att.get("id") != TestPresquAccidentAttachments.uploaded_attachment_id, \
                "Deleted attachment should not appear in list"
        print(f"✓ Attachment deletion verified, remaining: {len(data)}")


# ==================== PREVENTIVE MAINTENANCE ATTACHMENT TESTS ====================

class TestPreventiveMaintenanceAttachments:
    """Tests for Preventive Maintenance attachment endpoints"""
    
    # We'll get a PM ID dynamically
    pm_id = None
    uploaded_attachment_id = None
    
    def test_01_get_preventive_maintenances(self, api_client):
        """Get list of preventive maintenances to find one for testing"""
        response = api_client.get(f"{BASE_URL}/api/preventive-maintenance")
        assert response.status_code == 200, f"Failed to get PMs: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should have at least one preventive maintenance"
        
        # Use the first one for testing
        TestPreventiveMaintenanceAttachments.pm_id = data[0].get("id")
        print(f"✓ Found {len(data)} preventive maintenances, using ID: {TestPreventiveMaintenanceAttachments.pm_id}")
    
    def test_02_get_attachments_initial(self, api_client):
        """GET /api/preventive-maintenance/{id}/attachments - get current attachments"""
        pm_id = TestPreventiveMaintenanceAttachments.pm_id
        assert pm_id, "No PM ID from previous test"
        
        response = api_client.get(f"{BASE_URL}/api/preventive-maintenance/{pm_id}/attachments")
        assert response.status_code == 200, f"Failed to get attachments: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Current PM attachments count: {len(data)}")
    
    def test_03_upload_attachment(self, api_client, test_file):
        """POST /api/preventive-maintenance/{id}/attachments - upload a file"""
        pm_id = TestPreventiveMaintenanceAttachments.pm_id
        assert pm_id, "No PM ID from previous test"
        
        with open(test_file, 'rb') as f:
            files = {'file': ('test_pm_attachment.txt', f, 'text/plain')}
            headers = {"Authorization": api_client.headers["Authorization"]}
            response = requests.post(
                f"{BASE_URL}/api/preventive-maintenance/{pm_id}/attachments",
                files=files,
                headers=headers
            )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Upload should return success=True"
        assert "attachment" in data, "Response should contain attachment info"
        
        attachment = data["attachment"]
        assert "id" in attachment, "Attachment should have an id"
        assert attachment.get("original_filename") == "test_pm_attachment.txt"
        
        TestPreventiveMaintenanceAttachments.uploaded_attachment_id = attachment["id"]
        print(f"✓ PM Attachment uploaded with ID: {attachment['id']}")
    
    def test_04_get_attachments_after_upload(self, api_client):
        """GET /api/preventive-maintenance/{id}/attachments - verify attachment in list"""
        pm_id = TestPreventiveMaintenanceAttachments.pm_id
        response = api_client.get(f"{BASE_URL}/api/preventive-maintenance/{pm_id}/attachments")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1, "Should have at least 1 attachment"
        
        found = False
        for att in data:
            if att.get("id") == TestPreventiveMaintenanceAttachments.uploaded_attachment_id:
                found = True
                break
        
        assert found, "Uploaded attachment not found in list"
        print(f"✓ PM Attachment verified in list, total: {len(data)}")
    
    def test_05_download_attachment(self, api_client):
        """GET /api/preventive-maintenance/{id}/attachments/{attachment_id} - download"""
        pm_id = TestPreventiveMaintenanceAttachments.pm_id
        attachment_id = TestPreventiveMaintenanceAttachments.uploaded_attachment_id
        assert attachment_id, "No attachment ID from previous test"
        
        headers = {"Authorization": api_client.headers["Authorization"]}
        response = requests.get(
            f"{BASE_URL}/api/preventive-maintenance/{pm_id}/attachments/{attachment_id}",
            headers=headers
        )
        
        assert response.status_code == 200, f"Download failed: {response.text}"
        assert len(response.content) > 0, "Downloaded file should have content"
        print(f"✓ PM Attachment downloaded, size: {len(response.content)} bytes")
    
    def test_06_delete_attachment(self, api_client):
        """DELETE /api/preventive-maintenance/{id}/attachments/{attachment_id} - delete"""
        pm_id = TestPreventiveMaintenanceAttachments.pm_id
        attachment_id = TestPreventiveMaintenanceAttachments.uploaded_attachment_id
        assert attachment_id, "No attachment ID from previous test"
        
        response = api_client.delete(
            f"{BASE_URL}/api/preventive-maintenance/{pm_id}/attachments/{attachment_id}"
        )
        
        assert response.status_code == 200, f"Delete failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print(f"✓ PM Attachment deleted successfully")
    
    def test_07_verify_attachment_deleted(self, api_client):
        """Verify PM attachment no longer exists"""
        pm_id = TestPreventiveMaintenanceAttachments.pm_id
        response = api_client.get(f"{BASE_URL}/api/preventive-maintenance/{pm_id}/attachments")
        assert response.status_code == 200
        data = response.json()
        
        for att in data:
            assert att.get("id") != TestPreventiveMaintenanceAttachments.uploaded_attachment_id
        print(f"✓ PM Attachment deletion verified")


# ==================== ERROR HANDLING TESTS ====================

class TestAttachmentErrorHandling:
    """Test error handling for attachment endpoints"""
    
    def test_presqu_accident_not_found(self, api_client):
        """Test 404 for non-existent presqu'accident"""
        fake_id = "non-existent-id-12345"
        response = api_client.get(f"{BASE_URL}/api/presqu-accident/items/{fake_id}/attachments")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Presqu'accident 404 error handled correctly")
    
    def test_pm_not_found(self, api_client):
        """Test 404 for non-existent preventive maintenance"""
        fake_id = "000000000000000000000000"  # Valid ObjectId format but doesn't exist
        response = api_client.get(f"{BASE_URL}/api/preventive-maintenance/{fake_id}/attachments")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Preventive maintenance 404 error handled correctly")
    
    def test_attachment_not_found_presqu_accident(self, api_client):
        """Test 404 for non-existent attachment on presqu'accident"""
        presqu_id = "94a7e5a8-79f8-4a7b-8f5f-6f31288fb029"
        fake_attachment_id = "non-existent-attachment"
        
        headers = {"Authorization": api_client.headers["Authorization"]}
        response = requests.get(
            f"{BASE_URL}/api/presqu-accident/items/{presqu_id}/attachments/{fake_attachment_id}",
            headers=headers
        )
        assert response.status_code == 404
        print("✓ Presqu'accident attachment 404 handled correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
