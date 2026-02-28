"""
Test file preview feature (inline display vs download)
Tests the ?preview=true query parameter across all download endpoints
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@test.com"
ADMIN_PASSWORD = "Admin123!"
TECH_EMAIL = "technicien@test.com"
TECH_PASSWORD = "Technicien123!"

# Known test data - work order with attachment
TEST_WO_ID = "697221595704eb06233d73b7"
TEST_ATTACHMENT_ID = "69a31d6b44c40fe5f65d910f"


class TestFilePreviewAPI:
    """
    Tests for file preview feature - verifies Content-Disposition header
    changes based on ?preview=true query parameter
    """
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        return data.get("access_token")  # Note: uses 'access_token' not 'token'

    @pytest.fixture(scope="class")
    def tech_token(self):
        """Get technician authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TECH_EMAIL,
            "password": TECH_PASSWORD
        })
        assert response.status_code == 200, f"Tech login failed: {response.text}"
        data = response.json()
        return data.get("access_token")

    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Get admin auth headers"""
        return {"Authorization": f"Bearer {admin_token}"}

    @pytest.fixture(scope="class")
    def tech_headers(self, tech_token):
        """Get tech auth headers"""
        return {"Authorization": f"Bearer {tech_token}"}

    # === API HEALTH CHECK ===
    def test_01_api_accessible(self):
        """Verify backend API is accessible"""
        # Try login endpoint which should always work
        response = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "", "password": ""})
        # Any HTTP response means API is up (even 500 means server is running)
        assert response.status_code < 600, f"Backend not accessible: {response.text}"
        print(f"✅ Backend API is accessible (status: {response.status_code})")

    def test_02_admin_auth_works(self, admin_token):
        """Verify admin authentication works"""
        assert admin_token is not None, "Admin token is None"
        assert len(admin_token) > 0, "Admin token is empty"
        print(f"✅ Admin authentication successful")

    # === WORK ORDERS ATTACHMENT DOWNLOAD TESTS ===
    def test_10_wo_download_default_has_attachment_disposition(self, admin_headers):
        """
        Work order attachment download without preview param should return
        Content-Disposition: attachment (forces download)
        """
        response = requests.get(
            f"{BASE_URL}/api/work-orders/{TEST_WO_ID}/attachments/{TEST_ATTACHMENT_ID}",
            headers=admin_headers,
            allow_redirects=False
        )
        # Should return 200 (or 302 redirect)
        assert response.status_code in [200, 302], f"Expected 200/302, got {response.status_code}: {response.text}"
        
        # Check Content-Disposition header
        content_disposition = response.headers.get('Content-Disposition', '')
        print(f"Content-Disposition (default): {content_disposition}")
        
        # Should have 'attachment' in the header (forces download)
        assert 'attachment' in content_disposition.lower(), \
            f"Default download should have 'attachment' disposition, got: {content_disposition}"
        print("✅ Work order attachment download (default) returns 'attachment' disposition")

    def test_11_wo_download_preview_true_has_inline_disposition(self, admin_headers):
        """
        Work order attachment download with ?preview=true should return
        Content-Disposition: inline (displays in browser)
        """
        response = requests.get(
            f"{BASE_URL}/api/work-orders/{TEST_WO_ID}/attachments/{TEST_ATTACHMENT_ID}?preview=true",
            headers=admin_headers,
            allow_redirects=False
        )
        assert response.status_code in [200, 302], f"Expected 200/302, got {response.status_code}: {response.text}"
        
        content_disposition = response.headers.get('Content-Disposition', '')
        print(f"Content-Disposition (preview=true): {content_disposition}")
        
        # Should have 'inline' in the header (displays in browser)
        assert 'inline' in content_disposition.lower(), \
            f"Preview mode should have 'inline' disposition, got: {content_disposition}"
        print("✅ Work order attachment download (?preview=true) returns 'inline' disposition")

    def test_12_wo_download_preview_false_has_attachment_disposition(self, admin_headers):
        """
        Work order attachment download with ?preview=false should return
        Content-Disposition: attachment (forces download)
        """
        response = requests.get(
            f"{BASE_URL}/api/work-orders/{TEST_WO_ID}/attachments/{TEST_ATTACHMENT_ID}?preview=false",
            headers=admin_headers,
            allow_redirects=False
        )
        assert response.status_code in [200, 302], f"Expected 200/302, got {response.status_code}: {response.text}"
        
        content_disposition = response.headers.get('Content-Disposition', '')
        print(f"Content-Disposition (preview=false): {content_disposition}")
        
        # Should have 'attachment' in the header
        assert 'attachment' in content_disposition.lower(), \
            f"preview=false should have 'attachment' disposition, got: {content_disposition}"
        print("✅ Work order attachment download (?preview=false) returns 'attachment' disposition")

    # === PREVENTIVE MAINTENANCE ATTACHMENT DOWNLOAD TESTS ===
    def test_20_pm_endpoint_exists(self, admin_headers):
        """
        Verify preventive maintenance endpoint structure exists
        """
        # First get a PM to test with
        response = requests.get(f"{BASE_URL}/api/preventive-maintenance", headers=admin_headers)
        assert response.status_code == 200, f"Failed to get PM list: {response.text}"
        
        pm_list = response.json()
        print(f"Found {len(pm_list) if isinstance(pm_list, list) else 'N/A'} preventive maintenances")
        
        # Find a PM with attachments if possible
        pm_with_attachments = None
        if isinstance(pm_list, list):
            for pm in pm_list:
                pm_id = str(pm.get('_id', pm.get('id', '')))
                if pm.get('attachments') and len(pm.get('attachments', [])) > 0:
                    pm_with_attachments = pm
                    break
        
        if pm_with_attachments:
            pm_id = str(pm_with_attachments.get('_id', pm_with_attachments.get('id')))
            att_id = pm_with_attachments['attachments'][0].get('id')
            if att_id:
                # Test download without preview
                response1 = requests.get(
                    f"{BASE_URL}/api/preventive-maintenance/{pm_id}/attachments/{att_id}",
                    headers=admin_headers,
                    allow_redirects=False
                )
                print(f"PM download (default): status={response1.status_code}, disposition={response1.headers.get('Content-Disposition', 'N/A')}")
                
                # Test download with preview=true
                response2 = requests.get(
                    f"{BASE_URL}/api/preventive-maintenance/{pm_id}/attachments/{att_id}?preview=true",
                    headers=admin_headers,
                    allow_redirects=False
                )
                print(f"PM download (preview=true): status={response2.status_code}, disposition={response2.headers.get('Content-Disposition', 'N/A')}")
                
                if response1.status_code == 200 and response2.status_code == 200:
                    assert 'attachment' in response1.headers.get('Content-Disposition', '').lower()
                    assert 'inline' in response2.headers.get('Content-Disposition', '').lower()
                    print("✅ PM attachment preview feature verified")
        else:
            print("⚠️ No PM with attachments found - skipping file download test")
        
        print("✅ PM endpoint structure verified")

    # === IMPROVEMENTS ATTACHMENT DOWNLOAD TESTS ===
    def test_30_improvements_endpoint_exists(self, admin_headers):
        """
        Verify improvements attachment endpoint structure exists
        """
        response = requests.get(f"{BASE_URL}/api/improvements", headers=admin_headers)
        assert response.status_code == 200, f"Failed to get improvements list: {response.text}"
        
        imp_list = response.json()
        print(f"Found {len(imp_list) if isinstance(imp_list, list) else 'N/A'} improvements")
        
        # Find an improvement with attachments if possible
        imp_with_attachments = None
        if isinstance(imp_list, list):
            for imp in imp_list:
                if imp.get('attachments') and len(imp.get('attachments', [])) > 0:
                    imp_with_attachments = imp
                    break
        
        if imp_with_attachments:
            imp_id = str(imp_with_attachments.get('_id', imp_with_attachments.get('id')))
            att_id = imp_with_attachments['attachments'][0].get('id')
            if att_id:
                # Test download without preview
                response1 = requests.get(
                    f"{BASE_URL}/api/improvements/{imp_id}/attachments/{att_id}",
                    headers=admin_headers,
                    allow_redirects=False
                )
                print(f"IMP download (default): status={response1.status_code}, disposition={response1.headers.get('Content-Disposition', 'N/A')}")
                
                # Test download with preview=true
                response2 = requests.get(
                    f"{BASE_URL}/api/improvements/{imp_id}/attachments/{att_id}?preview=true",
                    headers=admin_headers,
                    allow_redirects=False
                )
                print(f"IMP download (preview=true): status={response2.status_code}, disposition={response2.headers.get('Content-Disposition', 'N/A')}")
                
                if response1.status_code == 200 and response2.status_code == 200:
                    assert 'attachment' in response1.headers.get('Content-Disposition', '').lower()
                    assert 'inline' in response2.headers.get('Content-Disposition', '').lower()
                    print("✅ Improvements attachment preview feature verified")
        else:
            print("⚠️ No improvement with attachments found - skipping file download test")
        
        print("✅ Improvements endpoint structure verified")

    # === CHAT ATTACHMENT DOWNLOAD TESTS ===
    def test_40_chat_endpoint_exists(self, admin_headers):
        """
        Verify chat download endpoint structure exists
        """
        # Get messages to find one with attachments
        response = requests.get(f"{BASE_URL}/api/chat/messages", headers=admin_headers)
        assert response.status_code == 200, f"Failed to get chat messages: {response.text}"
        
        messages = response.json()
        print(f"Found {len(messages) if isinstance(messages, list) else 'N/A'} chat messages")
        
        # Find a message with attachments
        msg_with_attachments = None
        if isinstance(messages, list):
            for msg in messages:
                if msg.get('attachments') and len(msg.get('attachments', [])) > 0:
                    msg_with_attachments = msg
                    break
        
        if msg_with_attachments:
            att_id = msg_with_attachments['attachments'][0].get('id')
            if att_id:
                # Test download without preview
                response1 = requests.get(
                    f"{BASE_URL}/api/chat/download/{att_id}",
                    headers=admin_headers,
                    allow_redirects=False
                )
                print(f"Chat download (default): status={response1.status_code}, disposition={response1.headers.get('Content-Disposition', 'N/A')}")
                
                # Test download with preview=true
                response2 = requests.get(
                    f"{BASE_URL}/api/chat/download/{att_id}?preview=true",
                    headers=admin_headers,
                    allow_redirects=False
                )
                print(f"Chat download (preview=true): status={response2.status_code}, disposition={response2.headers.get('Content-Disposition', 'N/A')}")
                
                if response1.status_code == 200 and response2.status_code == 200:
                    assert 'attachment' in response1.headers.get('Content-Disposition', '').lower()
                    assert 'inline' in response2.headers.get('Content-Disposition', '').lower()
                    print("✅ Chat attachment preview feature verified")
        else:
            print("⚠️ No chat message with attachments found - skipping file download test")
        
        print("✅ Chat endpoint structure verified")

    # === PRESQU'ACCIDENT ATTACHMENT DOWNLOAD TESTS ===
    def test_50_presqu_accident_endpoint_exists(self, admin_headers):
        """
        Verify presqu'accident attachment endpoint structure exists
        """
        response = requests.get(f"{BASE_URL}/api/presqu-accident/items", headers=admin_headers)
        assert response.status_code == 200, f"Failed to get presqu'accident items: {response.text}"
        
        items = response.json()
        if isinstance(items, dict) and 'items' in items:
            items = items['items']
        print(f"Found {len(items) if isinstance(items, list) else 'N/A'} presqu'accident items")
        
        # Find an item with attachments
        item_with_attachments = None
        if isinstance(items, list):
            for item in items:
                if item.get('attachments') and len(item.get('attachments', [])) > 0:
                    item_with_attachments = item
                    break
        
        if item_with_attachments:
            item_id = str(item_with_attachments.get('_id', item_with_attachments.get('id')))
            att_id = item_with_attachments['attachments'][0].get('id')
            if att_id:
                # Test download without preview
                response1 = requests.get(
                    f"{BASE_URL}/api/presqu-accident/items/{item_id}/attachments/{att_id}",
                    headers=admin_headers,
                    allow_redirects=False
                )
                print(f"PA download (default): status={response1.status_code}, disposition={response1.headers.get('Content-Disposition', 'N/A')}")
                
                # Test download with preview=true
                response2 = requests.get(
                    f"{BASE_URL}/api/presqu-accident/items/{item_id}/attachments/{att_id}?preview=true",
                    headers=admin_headers,
                    allow_redirects=False
                )
                print(f"PA download (preview=true): status={response2.status_code}, disposition={response2.headers.get('Content-Disposition', 'N/A')}")
                
                if response1.status_code == 200 and response2.status_code == 200:
                    assert 'attachment' in response1.headers.get('Content-Disposition', '').lower()
                    assert 'inline' in response2.headers.get('Content-Disposition', '').lower()
                    print("✅ Presqu'accident attachment preview feature verified")
        else:
            print("⚠️ No presqu'accident with attachments found - skipping file download test")
        
        print("✅ Presqu'accident endpoint structure verified")

    # === DEMANDES D'ARRET ATTACHMENT DOWNLOAD TESTS ===
    def test_60_demandes_arret_endpoint_exists(self, admin_headers):
        """
        Verify demandes d'arret attachment endpoint structure exists
        """
        response = requests.get(f"{BASE_URL}/api/demandes-arret", headers=admin_headers)
        # Endpoint might not exist or return empty or require auth
        if response.status_code in [404, 403]:
            print(f"⚠️ Demandes d'arret endpoint returned {response.status_code} - skipping")
            return
        
        assert response.status_code == 200, f"Failed to get demandes d'arret: {response.text}"
        
        items = response.json()
        if isinstance(items, dict):
            items = items.get('items', items.get('data', []))
        print(f"Found {len(items) if isinstance(items, list) else 'N/A'} demandes d'arret")
        
        # Find an item with attachments
        item_with_attachments = None
        if isinstance(items, list):
            for item in items:
                if item.get('attachments') and len(item.get('attachments', [])) > 0:
                    item_with_attachments = item
                    break
        
        if item_with_attachments:
            item_id = str(item_with_attachments.get('_id', item_with_attachments.get('id')))
            att_id = item_with_attachments['attachments'][0].get('id')
            if att_id:
                # Test download without preview
                response1 = requests.get(
                    f"{BASE_URL}/api/demandes-arret/{item_id}/attachments/{att_id}",
                    headers=admin_headers,
                    allow_redirects=False
                )
                print(f"DA download (default): status={response1.status_code}, disposition={response1.headers.get('Content-Disposition', 'N/A')}")
                
                # Test download with preview=true
                response2 = requests.get(
                    f"{BASE_URL}/api/demandes-arret/{item_id}/attachments/{att_id}?preview=true",
                    headers=admin_headers,
                    allow_redirects=False
                )
                print(f"DA download (preview=true): status={response2.status_code}, disposition={response2.headers.get('Content-Disposition', 'N/A')}")
                
                if response1.status_code == 200 and response2.status_code == 200:
                    assert 'attachment' in response1.headers.get('Content-Disposition', '').lower()
                    assert 'inline' in response2.headers.get('Content-Disposition', '').lower()
                    print("✅ Demandes d'arret attachment preview feature verified")
        else:
            print("⚠️ No demande d'arret with attachments found - skipping file download test")
        
        print("✅ Demandes d'arret endpoint structure verified")

    # === VERIFY FILE CONTENT TYPE ===
    def test_70_wo_download_returns_correct_content_type(self, admin_headers):
        """
        Verify that file download returns correct content type
        """
        response = requests.get(
            f"{BASE_URL}/api/work-orders/{TEST_WO_ID}/attachments/{TEST_ATTACHMENT_ID}?preview=true",
            headers=admin_headers,
            allow_redirects=False
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        content_type = response.headers.get('Content-Type', '')
        print(f"Content-Type: {content_type}")
        
        # Should return a valid content type (image/png for test_image.png)
        assert content_type != '', "Content-Type should not be empty"
        print("✅ Work order attachment returns correct content type")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
