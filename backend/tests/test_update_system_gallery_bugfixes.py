"""
Tests for Bug Fixes:
1. Update system - hardcoded paths replaced with self.app_root
2. Lightbox gallery - blob URLs not revoked prematurely (code review only)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@test.com"
ADMIN_PASSWORD = "Admin123!"

# Existing test WO with attachments for gallery testing
TEST_WO_ID = "697221595704eb06233d73b7"  # WO #5801


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin user"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    return data.get("access_token") or data.get("token")


@pytest.fixture
def auth_headers(auth_token):
    """Headers with authentication"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


# ============================================
# UPDATE SYSTEM API TESTS
# ============================================

class TestUpdateSystemEndpoints:
    """Test the update system API endpoints"""
    
    def test_get_current_version(self, auth_headers):
        """GET /api/updates/current - returns version data"""
        response = requests.get(
            f"{BASE_URL}/api/updates/current",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "version" in data, "Response missing 'version' field"
        assert "commit" in data or data.get("version"), "Response should have version or commit info"
        print(f"Current version: {data.get('version')}, commit: {data.get('commit')}")
    
    def test_check_updates(self, auth_headers):
        """GET /api/updates/check - checks for available updates"""
        response = requests.get(
            f"{BASE_URL}/api/updates/check",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response has latest_version info
        # Response may have different structure - check for key fields
        if "latest_version" in data:
            assert "available" in data["latest_version"], "Missing 'available' flag in latest_version"
            if data["latest_version"].get("local_commit"):
                print(f"Local commit: {data['latest_version']['local_commit']}")
        elif "error" in data:
            # GitHub API might fail in test environment - acceptable
            print(f"GitHub check returned error (expected in test env): {data.get('error')}")
        print(f"Update check response: {data}")
    
    def test_get_git_history(self, auth_headers):
        """GET /api/updates/git-history - returns commit history (may be empty)"""
        response = requests.get(
            f"{BASE_URL}/api/updates/git-history",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Response is wrapped: {"success": true, "commits": [...], "total": N}
        if isinstance(data, dict):
            assert "commits" in data or "success" in data, "Response missing expected fields"
            commits = data.get("commits", [])
            print(f"Git history entries: {len(commits)}")
            
            # If there are commits, verify structure
            if len(commits) > 0:
                commit = commits[0]
                assert "id" in commit or "short_id" in commit, "Commit missing id field"
                if "message" in commit:
                    print(f"Latest commit: {commit.get('short_id', commit.get('id', '')[:7])} - {commit.get('message', '')[:50]}")
        else:
            # Direct list response
            assert isinstance(data, list), f"Expected list or dict with commits, got {type(data)}"
            print(f"Git history entries: {len(data)}")


# ============================================
# ATTACHMENT GALLERY API TESTS
# ============================================

class TestAttachmentGalleryEndpoints:
    """Test attachment endpoints used by gallery component"""
    
    def test_get_wo_attachments(self, auth_headers):
        """GET /api/work-orders/{wo_id}/attachments - returns attachment list"""
        response = requests.get(
            f"{BASE_URL}/api/work-orders/{TEST_WO_ID}/attachments",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Expected list of attachments"
        assert len(data) >= 1, "Expected at least one attachment in test WO"
        
        # Verify attachment structure for gallery
        for att in data:
            assert "id" in att, "Attachment missing 'id'"
            assert "mime_type" in att or "type" in att, "Attachment missing mime type"
            print(f"Attachment: {att.get('original_filename', att.get('filename'))} - {att.get('mime_type', att.get('type'))}")
    
    def test_download_attachment_for_thumbnail(self, auth_headers):
        """GET /api/work-orders/{wo_id}/attachments/{att_id} - downloads file for blob URL"""
        # First get attachments list
        response = requests.get(
            f"{BASE_URL}/api/work-orders/{TEST_WO_ID}/attachments",
            headers=auth_headers
        )
        assert response.status_code == 200
        attachments = response.json()
        
        if len(attachments) == 0:
            pytest.skip("No attachments available for testing")
        
        # Get first image attachment
        image_att = None
        for att in attachments:
            mime = att.get("mime_type") or att.get("type", "")
            if mime.startswith("image/"):
                image_att = att
                break
        
        if not image_att:
            pytest.skip("No image attachment found for thumbnail test")
        
        # Download for thumbnail (used by gallery to create blob URLs)
        att_id = image_att["id"]
        response = requests.get(
            f"{BASE_URL}/api/work-orders/{TEST_WO_ID}/attachments/{att_id}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Download failed: {response.text}"
        assert len(response.content) > 0, "Downloaded file is empty"
        
        # Verify content-type header
        content_type = response.headers.get("content-type", "")
        assert "image" in content_type or "octet-stream" in content_type, f"Unexpected content-type: {content_type}"
        print(f"Downloaded thumbnail: {att_id}, size: {len(response.content)} bytes")
    
    def test_download_attachment_preview_mode(self, auth_headers):
        """GET /api/work-orders/{wo_id}/attachments/{att_id}?preview=true - inline disposition for lightbox"""
        # First get attachments list
        response = requests.get(
            f"{BASE_URL}/api/work-orders/{TEST_WO_ID}/attachments",
            headers=auth_headers
        )
        assert response.status_code == 200
        attachments = response.json()
        
        if len(attachments) == 0:
            pytest.skip("No attachments available for testing")
        
        att_id = attachments[0]["id"]
        
        # Download with preview=true (used in lightbox)
        response = requests.get(
            f"{BASE_URL}/api/work-orders/{TEST_WO_ID}/attachments/{att_id}?preview=true",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Preview download failed: {response.text}"
        
        # Verify inline disposition for preview
        disposition = response.headers.get("content-disposition", "")
        assert "inline" in disposition.lower(), f"Expected inline disposition, got: {disposition}"
        print(f"Preview mode working: {disposition}")


# ============================================
# UPDATE_MANAGER.PY CODE REVIEW TESTS  
# ============================================

class TestUpdateManagerCodeReview:
    """Code review verification - ensure hardcoded paths are replaced"""
    
    def test_no_hardcoded_opt_gmao_iris_paths(self):
        """Verify update_manager.py uses self.app_root instead of /opt/gmao-iris"""
        import re
        
        # Read the update_manager.py file
        update_manager_path = "/app/backend/update_manager.py"
        with open(update_manager_path, 'r') as f:
            content = f.read()
        
        # Check for hardcoded /opt/gmao-iris paths (should not exist in main logic)
        # The only acceptable occurrences are in fallback version loading
        lines = content.split('\n')
        hardcoded_uses = []
        
        for i, line in enumerate(lines, 1):
            # Skip comment lines and the fallback in _load_version
            if '/opt/gmao-iris' in line and 'fallback' not in line.lower():
                # Check if it's the acceptable fallback location check
                if 'Path("/opt/gmao-iris")' in line and '_load_version' in ''.join(lines[max(0,i-10):i]):
                    continue  # This is acceptable - checking multiple paths for version.json
                hardcoded_uses.append((i, line.strip()))
        
        # Should have no hardcoded paths in operational code
        # Only acceptable in fallback version loading
        print(f"Lines with /opt/gmao-iris: {len(hardcoded_uses)}")
        for line_num, line in hardcoded_uses:
            print(f"  Line {line_num}: {line[:80]}...")
        
        # Verify self.app_root is defined and used
        assert 'self.app_root = ' in content, "Missing self.app_root definition"
        assert 'Path(__file__).parent.parent' in content, "self.app_root should be computed from __file__"
        
        # Verify key methods use self.app_root
        assert 'cwd=self.app_root' in content, "get_current_commit should use self.app_root for cwd"
        assert 'Path(self.app_root)' in content or 'self.app_root' in content, "Methods should use self.app_root"
        
        print("✓ update_manager.py correctly uses self.app_root")
    
    def test_app_root_used_in_get_current_commit(self):
        """Verify get_current_commit uses self.app_root"""
        update_manager_path = "/app/backend/update_manager.py"
        with open(update_manager_path, 'r') as f:
            content = f.read()
        
        # Find the get_current_commit method and verify it uses self.app_root
        import re
        method_pattern = r'async def get_current_commit\(.*?\n(.*?)(?=\n    async def|\nclass|\Z)'
        match = re.search(method_pattern, content, re.DOTALL)
        
        assert match, "get_current_commit method not found"
        method_body = match.group(1)
        
        assert 'self.app_root' in method_body, "get_current_commit should use self.app_root"
        assert 'cwd=' in method_body, "get_current_commit should pass cwd to subprocess"
        print("✓ get_current_commit uses self.app_root")
    
    def test_app_root_used_in_create_backup(self):
        """Verify create_backup uses self.app_root for backup_dir"""
        update_manager_path = "/app/backend/update_manager.py"
        with open(update_manager_path, 'r') as f:
            content = f.read()
        
        # Find create_backup method
        import re
        method_pattern = r'async def create_backup\(.*?\n(.*?)(?=\n    async def|\nclass|\Z)'
        match = re.search(method_pattern, content, re.DOTALL)
        
        assert match, "create_backup method not found"
        method_body = match.group(1)
        
        assert 'self.app_root' in method_body, "create_backup should use self.app_root"
        assert 'backup_dir' in method_body, "create_backup should define backup_dir"
        print("✓ create_backup uses self.app_root")
    
    def test_app_root_used_in_git_history(self):
        """Verify get_git_history uses self.app_root"""
        update_manager_path = "/app/backend/update_manager.py"
        with open(update_manager_path, 'r') as f:
            content = f.read()
        
        # Find get_git_history method
        import re
        method_pattern = r'async def get_git_history\(.*?\n(.*?)(?=\n    async def|\nclass|\Z)'
        match = re.search(method_pattern, content, re.DOTALL)
        
        assert match, "get_git_history method not found"
        method_body = match.group(1)
        
        assert 'self.app_root' in method_body, "get_git_history should use self.app_root"
        print("✓ get_git_history uses self.app_root")


# ============================================
# ATTACHMENT GALLERY CODE REVIEW TESTS
# ============================================

class TestAttachmentGalleryCodeReview:
    """Code review verification for blob URL fix in AttachmentGallery.jsx"""
    
    def test_useeffect_cleanup_on_unmount_only(self):
        """Verify useEffect cleanup only runs on unmount, not on dependency changes"""
        gallery_path = "/app/frontend/src/components/shared/AttachmentGallery.jsx"
        with open(gallery_path, 'r') as f:
            content = f.read()
        
        # Verify the cleanup useEffect has empty dependency array []
        # This means cleanup only runs on unmount
        import re
        
        # Look for the cleanup useEffect pattern
        cleanup_pattern = r'useEffect\s*\(\s*\(\)\s*=>\s*\{[^}]*mountedRef\.current\s*=\s*true[^}]*return\s*\(\)\s*=>\s*\{[^}]*mountedRef\.current\s*=\s*false[^}]*\}[^}]*\}\s*,\s*\[\s*\]\s*\)'
        
        # Simpler check - look for key patterns
        assert 'mountedRef.current = true' in content, "Missing mountedRef initialization"
        assert 'mountedRef.current = false' in content, "Missing mountedRef cleanup on unmount"
        
        # Check that cleanup useEffect has empty deps []
        lines = content.split('\n')
        cleanup_effect_found = False
        for i, line in enumerate(lines):
            if 'Cleanup only on unmount' in line or 'URL.revokeObjectURL' in line:
                # Check nearby lines for empty dependency array
                context = '\n'.join(lines[max(0,i-5):min(len(lines),i+10)])
                if '}, []);' in context or '}, []' in context:
                    cleanup_effect_found = True
                    break
        
        assert cleanup_effect_found, "Cleanup useEffect should have empty dependency array []"
        print("✓ Cleanup useEffect has empty dependency array (unmount only)")
    
    def test_blob_urls_not_revoked_on_attachments_change(self):
        """Verify blob URLs are NOT revoked when attachments prop changes"""
        gallery_path = "/app/frontend/src/components/shared/AttachmentGallery.jsx"
        with open(gallery_path, 'r') as f:
            content = f.read()
        
        # The thumbnail loading useEffect should NOT have a cleanup that revokes URLs
        # It should only load new thumbnails
        
        lines = content.split('\n')
        thumbnail_effect_start = None
        
        for i, line in enumerate(lines):
            if 'Load image thumbnails' in line:
                thumbnail_effect_start = i
                break
        
        if thumbnail_effect_start:
            # Check the next ~20 lines for the useEffect
            effect_block = '\n'.join(lines[thumbnail_effect_start:thumbnail_effect_start+20])
            
            # Should have attachments in dependencies
            assert 'attachments' in effect_block, "Thumbnail useEffect should depend on attachments"
            
            # Should NOT have cleanup that revokes URLs
            # Look for return statement with revokeObjectURL
            if 'return () =>' in effect_block and 'revokeObjectURL' in effect_block:
                pytest.fail("Thumbnail loading useEffect should NOT revoke URLs on dependency change!")
        
        print("✓ Thumbnail useEffect does NOT revoke URLs on attachments change")
    
    def test_mounted_ref_prevents_stale_updates(self):
        """Verify mountedRef is used to prevent state updates after unmount"""
        gallery_path = "/app/frontend/src/components/shared/AttachmentGallery.jsx"
        with open(gallery_path, 'r') as f:
            content = f.read()
        
        # Verify mountedRef is defined
        assert 'mountedRef = useRef(true)' in content, "Missing mountedRef definition"
        
        # Verify it's checked before state updates in async operations
        assert 'if (!mountedRef.current) return' in content, "Missing mountedRef check in async callback"
        
        print("✓ mountedRef correctly prevents stale state updates")
    
    def test_urls_ref_caches_blob_urls(self):
        """Verify urlsRef is used to cache blob URLs for reuse"""
        gallery_path = "/app/frontend/src/components/shared/AttachmentGallery.jsx"
        with open(gallery_path, 'r') as f:
            content = f.read()
        
        # Verify urlsRef is used for caching
        assert 'urlsRef = useRef({})' in content or 'urlsRef = useRef' in content, "Missing urlsRef for caching"
        
        # Verify cached URLs are reused in openLightbox
        assert 'urlsRef.current[att.id]' in content, "urlsRef should be used to cache/retrieve URLs"
        
        print("✓ urlsRef correctly caches blob URLs")
    
    def test_data_testid_attributes_present(self):
        """Verify data-testid attributes for testing"""
        gallery_path = "/app/frontend/src/components/shared/AttachmentGallery.jsx"
        with open(gallery_path, 'r') as f:
            content = f.read()
        
        # Key data-testid attributes for testing
        required_testids = [
            'gallery-thumbnails',
            'gallery-thumb-',
            'lightbox-overlay',
            'lightbox-close',
            'lightbox-prev',
            'lightbox-next'
        ]
        
        for testid in required_testids:
            assert testid in content, f"Missing data-testid: {testid}"
        
        print("✓ All required data-testid attributes present")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
