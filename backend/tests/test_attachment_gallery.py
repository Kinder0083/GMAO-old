"""
Test file for AttachmentGallery feature - WO #5801 attachments
Tests backend API endpoints for work order attachments
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test WO ID with attachments
TEST_WO_ID = "697221595704eb06233d73b7"  # WO #5801


class TestAttachmentGalleryBackend:
    """Test attachment APIs for gallery feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_wo_attachments_list(self):
        """Test: GET work order attachments returns list with 3 items"""
        response = requests.get(
            f"{BASE_URL}/api/work-orders/{TEST_WO_ID}/attachments",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        attachments = response.json()
        assert isinstance(attachments, list), "Response should be a list"
        assert len(attachments) == 3, f"Expected 3 attachments, got {len(attachments)}"
        
        # Verify each attachment has required fields for gallery
        for att in attachments:
            assert "id" in att, "Missing id field"
            assert "original_filename" in att, "Missing original_filename"
            assert "mime_type" in att, "Missing mime_type"
    
    def test_attachment_has_image_types(self):
        """Test: Attachments include image types for thumbnail display"""
        response = requests.get(
            f"{BASE_URL}/api/work-orders/{TEST_WO_ID}/attachments",
            headers=self.headers
        )
        assert response.status_code == 200
        
        attachments = response.json()
        mime_types = [att["mime_type"] for att in attachments]
        
        # Should have image types for gallery thumbnails
        assert "image/png" in mime_types, "Missing PNG image"
        assert "image/jpeg" in mime_types, "Missing JPEG image"
    
    def test_attachment_has_text_type(self):
        """Test: Attachments include text type for icon placeholder"""
        response = requests.get(
            f"{BASE_URL}/api/work-orders/{TEST_WO_ID}/attachments",
            headers=self.headers
        )
        assert response.status_code == 200
        
        attachments = response.json()
        mime_types = [att["mime_type"] for att in attachments]
        
        assert "text/plain" in mime_types, "Missing text file"
    
    def test_download_image_attachment(self):
        """Test: Download image attachment for gallery thumbnail loading"""
        # First get the attachment ID for test_image.png
        list_response = requests.get(
            f"{BASE_URL}/api/work-orders/{TEST_WO_ID}/attachments",
            headers=self.headers
        )
        attachments = list_response.json()
        
        image_att = next((a for a in attachments if a["original_filename"] == "test_image.png"), None)
        assert image_att is not None, "test_image.png not found"
        
        # Download the attachment
        download_response = requests.get(
            f"{BASE_URL}/api/work-orders/{TEST_WO_ID}/attachments/{image_att['id']}",
            headers=self.headers
        )
        assert download_response.status_code == 200, f"Download failed: {download_response.status_code}"
        assert len(download_response.content) > 0, "Downloaded content is empty"
    
    def test_download_with_preview_mode(self):
        """Test: Download with preview=true returns inline disposition (for lightbox)"""
        list_response = requests.get(
            f"{BASE_URL}/api/work-orders/{TEST_WO_ID}/attachments",
            headers=self.headers
        )
        attachments = list_response.json()
        
        image_att = next((a for a in attachments if a["original_filename"] == "test_image.png"), None)
        assert image_att is not None
        
        # Download with preview mode
        preview_response = requests.get(
            f"{BASE_URL}/api/work-orders/{TEST_WO_ID}/attachments/{image_att['id']}?preview=true",
            headers=self.headers
        )
        assert preview_response.status_code == 200
        
        # Check Content-Disposition is inline (for lightbox display)
        content_disposition = preview_response.headers.get("Content-Disposition", "")
        assert "inline" in content_disposition, f"Expected 'inline' disposition, got: {content_disposition}"
    
    def test_download_without_preview_mode(self):
        """Test: Download without preview returns attachment disposition (for download)"""
        list_response = requests.get(
            f"{BASE_URL}/api/work-orders/{TEST_WO_ID}/attachments",
            headers=self.headers
        )
        attachments = list_response.json()
        
        image_att = next((a for a in attachments if a["original_filename"] == "test_image.png"), None)
        assert image_att is not None
        
        # Download without preview mode
        download_response = requests.get(
            f"{BASE_URL}/api/work-orders/{TEST_WO_ID}/attachments/{image_att['id']}",
            headers=self.headers
        )
        assert download_response.status_code == 200
        
        # Check Content-Disposition is attachment
        content_disposition = download_response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disposition, f"Expected 'attachment' disposition, got: {content_disposition}"
    
    def test_attachment_size_field(self):
        """Test: Attachments have size field for gallery file info display"""
        response = requests.get(
            f"{BASE_URL}/api/work-orders/{TEST_WO_ID}/attachments",
            headers=self.headers
        )
        assert response.status_code == 200
        
        attachments = response.json()
        for att in attachments:
            assert "size" in att, f"Missing size field in {att.get('original_filename')}"
            assert isinstance(att["size"], int), "Size should be integer"
    
    def test_attachment_uploaded_at_field(self):
        """Test: Attachments have uploaded_at field for gallery timestamp display"""
        response = requests.get(
            f"{BASE_URL}/api/work-orders/{TEST_WO_ID}/attachments",
            headers=self.headers
        )
        assert response.status_code == 200
        
        attachments = response.json()
        for att in attachments:
            assert "uploaded_at" in att, f"Missing uploaded_at field in {att.get('original_filename')}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
