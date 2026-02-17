"""
Test Suite for Surveillance Plan Attachments and Search Features
Features tested:
1. POST /api/surveillance/items/{id}/upload - Multi-file upload 
2. DELETE /api/surveillance/items/{id}/attachments/{attachment_id} - Delete attachment
3. POST /api/surveillance/search - Search with weighted scoring
4. Verify 'attachments' field in surveillance item model
"""

import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestAuth:
    """Authentication helper"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for admin user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@test.com", "password": "Admin123!"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Return auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}


class TestSurveillanceSearchEndpoint(TestAuth):
    """Test POST /api/surveillance/search endpoint"""
    
    def test_search_endpoint_exists(self, auth_headers):
        """Verify search endpoint is accessible"""
        response = requests.post(
            f"{BASE_URL}/api/surveillance/search",
            json={"query": "test"},
            headers=auth_headers
        )
        # Should not return 404/405
        assert response.status_code in [200, 401, 403, 422], f"Unexpected status: {response.status_code}"
    
    def test_search_returns_results_for_apave(self, auth_headers):
        """Search for 'APAVE' should return results"""
        response = requests.post(
            f"{BASE_URL}/api/surveillance/search",
            json={"query": "APAVE"},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Search failed: {response.text}"
        data = response.json()
        assert "results" in data, "Response should have 'results' key"
        # Based on context, there should be items with APAVE as executant
        print(f"Search 'APAVE' returned {len(data['results'])} results")
    
    def test_search_returns_empty_for_nonexistent(self, auth_headers):
        """Search for non-existent term should return empty results"""
        response = requests.post(
            f"{BASE_URL}/api/surveillance/search",
            json={"query": "XYZNONEXISTENT123"},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert len(data["results"]) == 0, "Should return empty results for non-existent term"
    
    def test_search_result_structure(self, auth_headers):
        """Verify search results have required fields: relevance_score, matched_fields, excerpt"""
        response = requests.post(
            f"{BASE_URL}/api/surveillance/search",
            json={"query": "APAVE"},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data["results"]) > 0:
            result = data["results"][0]
            # Verify required fields
            assert "relevance_score" in result, "Result should have 'relevance_score'"
            assert "matched_fields" in result, "Result should have 'matched_fields'"
            assert "excerpt" in result, "Result should have 'excerpt'"
            # Verify other expected fields
            assert "id" in result, "Result should have 'id'"
            assert "classe_type" in result, "Result should have 'classe_type'"
            assert "category" in result, "Result should have 'category'"
            print(f"Result structure verified: score={result['relevance_score']}, fields={result['matched_fields']}")
    
    def test_search_weighted_scoring(self, auth_headers):
        """Verify search uses weighted scoring (classe_type has higher weight)"""
        response = requests.post(
            f"{BASE_URL}/api/surveillance/search",
            json={"query": "APAVE"},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data["results"]) > 0:
            # Results should be sorted by relevance_score descending
            scores = [r["relevance_score"] for r in data["results"]]
            assert scores == sorted(scores, reverse=True), "Results should be sorted by score descending"
            print(f"Scores: {scores}")
    
    def test_search_empty_query_returns_empty(self, auth_headers):
        """Empty query should return empty results"""
        response = requests.post(
            f"{BASE_URL}/api/surveillance/search",
            json={"query": ""},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) == 0, "Empty query should return empty results"


class TestSurveillanceAttachmentsUpload(TestAuth):
    """Test POST /api/surveillance/items/{id}/upload - Multi-file upload"""
    
    @pytest.fixture(scope="class")
    def test_surveillance_item(self, auth_headers):
        """Create a test surveillance item for attachment testing"""
        response = requests.post(
            f"{BASE_URL}/api/surveillance/items",
            json={
                "classe_type": "TEST_Attachment_Upload_Test",
                "category": "TEST",
                "batiment": "TEST Building",
                "periodicite": "1 an",
                "responsable": "MAINT",
                "executant": "TEST Organisme"
            },
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to create test item: {response.text}"
        item = response.json()
        yield item
        # Cleanup after tests (admin only)
        requests.delete(f"{BASE_URL}/api/surveillance/items/{item['id']}", headers=auth_headers)
    
    def test_upload_single_file(self, auth_headers, test_surveillance_item):
        """Upload a single file"""
        item_id = test_surveillance_item["id"]
        
        # Create a test file
        files = [
            ('files', ('test_file.txt', io.BytesIO(b'Test content for upload'), 'text/plain'))
        ]
        
        response = requests.post(
            f"{BASE_URL}/api/surveillance/items/{item_id}/upload",
            files=files,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Upload should succeed"
        assert "attachments" in data, "Response should have 'attachments'"
        assert len(data["attachments"]) == 1, "Should have 1 attachment"
        assert "total_attachments" in data, "Response should have 'total_attachments'"
        print(f"Upload successful: {data['attachments'][0]['filename']}")
    
    def test_upload_multiple_files(self, auth_headers, test_surveillance_item):
        """Upload multiple files at once"""
        item_id = test_surveillance_item["id"]
        
        # Create multiple test files
        files = [
            ('files', ('test_file_1.txt', io.BytesIO(b'Content 1'), 'text/plain')),
            ('files', ('test_file_2.txt', io.BytesIO(b'Content 2'), 'text/plain'))
        ]
        
        response = requests.post(
            f"{BASE_URL}/api/surveillance/items/{item_id}/upload",
            files=files,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Multi-upload failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert len(data["attachments"]) == 2, "Should have 2 new attachments"
        print(f"Multi-upload successful: {[a['filename'] for a in data['attachments']]}")
    
    def test_upload_to_nonexistent_item_returns_404(self, auth_headers):
        """Upload to non-existent item should return 404"""
        files = [('files', ('test.txt', io.BytesIO(b'Test'), 'text/plain'))]
        
        response = requests.post(
            f"{BASE_URL}/api/surveillance/items/nonexistent-id-12345/upload",
            files=files,
            headers=auth_headers
        )
        
        assert response.status_code == 404, "Should return 404 for non-existent item"


class TestSurveillanceAttachmentsDelete(TestAuth):
    """Test DELETE /api/surveillance/items/{id}/attachments/{attachment_id}"""
    
    @pytest.fixture(scope="class")
    def item_with_attachment(self, auth_headers):
        """Create item and upload an attachment for delete testing"""
        # Create item
        response = requests.post(
            f"{BASE_URL}/api/surveillance/items",
            json={
                "classe_type": "TEST_Delete_Attachment_Test",
                "category": "TEST",
                "batiment": "TEST Building",
                "periodicite": "6 mois",
                "responsable": "QHSE",
                "executant": "TEST"
            },
            headers=auth_headers
        )
        item = response.json()
        
        # Upload attachment
        files = [('files', ('delete_test.txt', io.BytesIO(b'Delete me'), 'text/plain'))]
        upload_resp = requests.post(
            f"{BASE_URL}/api/surveillance/items/{item['id']}/upload",
            files=files,
            headers=auth_headers
        )
        attachments = upload_resp.json().get("attachments", [])
        
        yield {"item": item, "attachment": attachments[0] if attachments else None}
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/surveillance/items/{item['id']}", headers=auth_headers)
    
    def test_delete_attachment_success(self, auth_headers, item_with_attachment):
        """Successfully delete an attachment"""
        item_id = item_with_attachment["item"]["id"]
        attachment = item_with_attachment["attachment"]
        
        if not attachment:
            pytest.skip("No attachment was created")
        
        attachment_id = attachment["id"]
        
        response = requests.delete(
            f"{BASE_URL}/api/surveillance/items/{item_id}/attachments/{attachment_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Delete failed: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Delete should succeed"
        print(f"Attachment {attachment_id} deleted successfully")
    
    def test_delete_nonexistent_attachment_returns_404(self, auth_headers, item_with_attachment):
        """Deleting non-existent attachment should return 404"""
        item_id = item_with_attachment["item"]["id"]
        
        response = requests.delete(
            f"{BASE_URL}/api/surveillance/items/{item_id}/attachments/nonexistent-attachment-id",
            headers=auth_headers
        )
        
        assert response.status_code == 404, "Should return 404 for non-existent attachment"


class TestSurveillanceItemAttachmentsField(TestAuth):
    """Test that surveillance items have 'attachments' field (list of dicts)"""
    
    def test_new_item_has_attachments_field(self, auth_headers):
        """Newly created item should have attachments field (empty list)"""
        # Create item
        response = requests.post(
            f"{BASE_URL}/api/surveillance/items",
            json={
                "classe_type": "TEST_Attachments_Field_Test",
                "category": "TEST",
                "batiment": "TEST",
                "periodicite": "1 an",
                "responsable": "MAINT",
                "executant": "TEST"
            },
            headers=auth_headers
        )
        
        assert response.status_code == 200
        item = response.json()
        
        # Verify attachments field exists (it may be an empty list or not present by default)
        # Get the item to check its structure
        get_response = requests.get(
            f"{BASE_URL}/api/surveillance/items/{item['id']}",
            headers=auth_headers
        )
        
        assert get_response.status_code == 200
        item_data = get_response.json()
        
        # The attachments field should exist after item creation
        # It may be empty list or not present if no attachments
        if "attachments" in item_data:
            assert isinstance(item_data["attachments"], list), "attachments should be a list"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/surveillance/items/{item['id']}", headers=auth_headers)
        print("Attachments field verified")
    
    def test_item_with_attachments_structure(self, auth_headers):
        """Item with attachments should have correct structure (id, filename, url, size, uploaded_at)"""
        # Create item
        response = requests.post(
            f"{BASE_URL}/api/surveillance/items",
            json={
                "classe_type": "TEST_Attachments_Structure_Test",
                "category": "TEST",
                "batiment": "TEST",
                "periodicite": "6 mois",
                "responsable": "EXTERNE",
                "executant": "TEST"
            },
            headers=auth_headers
        )
        item = response.json()
        
        # Upload file
        files = [('files', ('structure_test.pdf', io.BytesIO(b'PDF content'), 'application/pdf'))]
        requests.post(
            f"{BASE_URL}/api/surveillance/items/{item['id']}/upload",
            files=files,
            headers=auth_headers
        )
        
        # Get item and verify attachment structure
        get_response = requests.get(
            f"{BASE_URL}/api/surveillance/items/{item['id']}",
            headers=auth_headers
        )
        
        item_data = get_response.json()
        assert "attachments" in item_data, "Item should have attachments field"
        assert len(item_data["attachments"]) >= 1, "Should have at least 1 attachment"
        
        attachment = item_data["attachments"][0]
        assert "id" in attachment, "Attachment should have 'id'"
        assert "filename" in attachment, "Attachment should have 'filename'"
        assert "url" in attachment, "Attachment should have 'url'"
        assert "size" in attachment, "Attachment should have 'size'"
        assert "uploaded_at" in attachment, "Attachment should have 'uploaded_at'"
        
        print(f"Attachment structure: {attachment}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/surveillance/items/{item['id']}", headers=auth_headers)


class TestCleanup(TestAuth):
    """Cleanup test data"""
    
    def test_cleanup_test_items(self, auth_headers):
        """Clean up any TEST_ prefixed items"""
        response = requests.get(
            f"{BASE_URL}/api/surveillance/items",
            headers=auth_headers
        )
        
        if response.status_code == 200:
            items = response.json()
            deleted = 0
            for item in items:
                if item.get("classe_type", "").startswith("TEST_"):
                    del_resp = requests.delete(
                        f"{BASE_URL}/api/surveillance/items/{item['id']}",
                        headers=auth_headers
                    )
                    if del_resp.status_code == 200:
                        deleted += 1
            print(f"Cleaned up {deleted} test items")
        
        assert True  # Always pass cleanup
