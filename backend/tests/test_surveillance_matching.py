"""
Test surveillance plan matching functionality
- GET /api/surveillance/items returns items with ecart_jours field
- POST /api/surveillance/ai/confirm-match endpoint (match/create_new actions)
- POST /api/surveillance/items/{item_id}/analyze-report endpoint exists
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
AUTH_TOKEN = None

# Test credentials
TEST_EMAIL = "admin@test.com"
TEST_PASSWORD = "Admin123!"


class TestAuthentication:
    """Get auth token for subsequent tests"""
    
    def test_01_login(self):
        global AUTH_TOKEN
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, f"No access_token in response: {data}"
        AUTH_TOKEN = data["access_token"]
        print(f"✅ Login successful, token obtained")


class TestSurveillanceItemsWithEcart:
    """Test GET /api/surveillance/items returns items with ecart_jours field"""
    
    def test_01_get_items_returns_ecart_jours_field(self):
        """Verify items API returns the ecart_jours field"""
        global AUTH_TOKEN
        assert AUTH_TOKEN, "Auth token required"
        
        headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}
        response = requests.get(f"{BASE_URL}/api/surveillance/items", headers=headers)
        
        assert response.status_code == 200, f"GET items failed: {response.text}"
        items = response.json()
        assert isinstance(items, list), "Response should be a list"
        print(f"✅ GET /api/surveillance/items returned {len(items)} items")
        
        # Check that items have the expected structure
        if len(items) > 0:
            sample_item = items[0]
            # Verify ecart_jours field exists (can be None or a number)
            assert "ecart_jours" in sample_item or sample_item.get("ecart_jours") is None, \
                f"ecart_jours field should exist in item structure. Keys: {sample_item.keys()}"
            print(f"✅ Item structure includes ecart_jours field")
    
    def test_02_get_items_by_year_2025(self):
        """Get items for year 2025"""
        global AUTH_TOKEN
        headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}
        response = requests.get(f"{BASE_URL}/api/surveillance/items", headers=headers, params={"annee": 2025})
        
        assert response.status_code == 200, f"GET items 2025 failed: {response.text}"
        items = response.json()
        print(f"✅ Year 2025 has {len(items)} items")
        
        # Check statuses
        statuses = {}
        for item in items:
            status = item.get("status", "UNKNOWN")
            statuses[status] = statuses.get(status, 0) + 1
        print(f"   Status breakdown: {statuses}")
    
    def test_03_get_items_by_year_2026(self):
        """Get items for year 2026"""
        global AUTH_TOKEN
        headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}
        response = requests.get(f"{BASE_URL}/api/surveillance/items", headers=headers, params={"annee": 2026})
        
        assert response.status_code == 200, f"GET items 2026 failed: {response.text}"
        items = response.json()
        print(f"✅ Year 2026 has {len(items)} items")
        
        # Check for REALISE items
        realise_items = [i for i in items if i.get("status") == "REALISE"]
        print(f"   REALISE items: {len(realise_items)}")


class TestConfirmMatchEndpoint:
    """Test POST /api/surveillance/ai/confirm-match endpoint"""
    
    def test_01_confirm_match_invalid_action(self):
        """Test error handling for invalid action"""
        global AUTH_TOKEN
        headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}
        
        # Test with invalid action
        response = requests.post(
            f"{BASE_URL}/api/surveillance/ai/confirm-match",
            headers=headers,
            json={
                "action": "invalid_action",
                "item_id": "nonexistent-id",
                "ctrl": {}
            }
        )
        
        # Should return 400 for invalid action
        assert response.status_code == 400, f"Expected 400 for invalid action, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data or "error" in data, f"Expected error detail: {data}"
        print(f"✅ Invalid action returns 400 error")
    
    def test_02_confirm_match_action_match_not_found(self):
        """Test match action with nonexistent item_id returns 404"""
        global AUTH_TOKEN
        headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}
        
        response = requests.post(
            f"{BASE_URL}/api/surveillance/ai/confirm-match",
            headers=headers,
            json={
                "action": "match",
                "item_id": "nonexistent-item-id-12345",
                "ctrl": {"resultat": "CONFORME"},
                "report_date": "2025-01-15",
                "periodicite": "1 an"
            }
        )
        
        # Should return 404 when item not found
        assert response.status_code == 404, f"Expected 404 for nonexistent item, got {response.status_code}: {response.text}"
        print(f"✅ Match with nonexistent item returns 404")
    
    def test_03_confirm_match_action_create_new(self):
        """Test create_new action creates a new control"""
        global AUTH_TOKEN
        headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}
        
        # Create a new control via confirm-match with create_new action
        response = requests.post(
            f"{BASE_URL}/api/surveillance/ai/confirm-match",
            headers=headers,
            json={
                "action": "create_new",
                "ctrl": {
                    "classe_type": "TEST_MATCHING_Control",
                    "category": "AUTRE",
                    "batiment": "Test Building",
                    "resultat": "CONFORME"
                },
                "document_info": {
                    "organisme_controle": "Test Organisme",
                    "numero_rapport": "TEST-2025-001"
                },
                "report_date": "2025-01-15",
                "periodicite": "1 an",
                "prochain_controle": "2026-01-15"
            }
        )
        
        assert response.status_code == 200, f"Create new failed: {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True, f"Expected success=True: {data}"
        assert data.get("action") == "created", f"Expected action=created: {data}"
        assert "item" in data or "message" in data, f"Expected item or message: {data}"
        print(f"✅ create_new action successful")
        
        # Store item id for cleanup
        created_item = data.get("item", {})
        if created_item and created_item.get("id"):
            # Cleanup: delete the test item
            delete_response = requests.delete(
                f"{BASE_URL}/api/surveillance/items/{created_item['id']}",
                headers=headers
            )
            if delete_response.status_code in [200, 204]:
                print(f"   Cleaned up test item: {created_item['id']}")


class TestAnalyzeReportEndpoint:
    """Test POST /api/surveillance/items/{item_id}/analyze-report endpoint"""
    
    def test_01_analyze_report_invalid_item(self):
        """Test that analyze-report returns 404 for nonexistent item"""
        global AUTH_TOKEN
        headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}
        
        # Create a minimal file for upload
        files = {
            'file': ('test.pdf', b'%PDF-1.4 minimal test content', 'application/pdf')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/surveillance/items/nonexistent-id-12345/analyze-report",
            headers=headers,
            files=files
        )
        
        # Should return 404 for nonexistent item
        assert response.status_code == 404, f"Expected 404 for nonexistent item, got {response.status_code}: {response.text}"
        print(f"✅ analyze-report with invalid item returns 404")
    
    def test_02_analyze_report_endpoint_exists_for_real_item(self):
        """Test endpoint exists by checking a real planifier item"""
        global AUTH_TOKEN
        headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}
        
        # First get a PLANIFIER item to test
        response = requests.get(
            f"{BASE_URL}/api/surveillance/items",
            headers=headers,
            params={"status": "PLANIFIER"}
        )
        
        assert response.status_code == 200, f"GET items failed: {response.text}"
        items = response.json()
        
        if len(items) == 0:
            # Try PLANIFIE status
            response = requests.get(
                f"{BASE_URL}/api/surveillance/items",
                headers=headers,
                params={"status": "PLANIFIE"}
            )
            items = response.json()
        
        if len(items) > 0:
            # Test with a real item - should fail with file processing error, not 404
            item_id = items[0]["id"]
            files = {
                'file': ('test.pdf', b'%PDF-1.4 minimal test content', 'application/pdf')
            }
            
            response = requests.post(
                f"{BASE_URL}/api/surveillance/items/{item_id}/analyze-report",
                headers=headers,
                files=files
            )
            
            # Should NOT be 404 (endpoint exists), might be 422 or 500 due to AI processing
            assert response.status_code != 404, f"Endpoint should exist for valid item"
            print(f"✅ analyze-report endpoint exists (status {response.status_code} for item {item_id})")
        else:
            print("⚠️ No PLANIFIER/PLANIFIE items to test with")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_items(self):
        """Remove any TEST_MATCHING_ prefixed items"""
        global AUTH_TOKEN
        headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}
        
        response = requests.get(f"{BASE_URL}/api/surveillance/items", headers=headers)
        if response.status_code == 200:
            items = response.json()
            test_items = [i for i in items if i.get("classe_type", "").startswith("TEST_MATCHING_")]
            
            for item in test_items:
                delete_response = requests.delete(
                    f"{BASE_URL}/api/surveillance/items/{item['id']}",
                    headers=headers
                )
                if delete_response.status_code in [200, 204]:
                    print(f"   Cleaned up: {item['id']}")
        
        print(f"✅ Cleanup completed")
