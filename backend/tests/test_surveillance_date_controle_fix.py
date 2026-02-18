"""
Test suite for verifying surveillance date controle fix (Bug Fix Critical):
1. For REALISE items, prochain_controle = derniere_visite (NOT derniere_visite + periodicite)
2. For REALISE items, annee = year from derniere_visite (2026, not 2027)
3. Future recurring controls are correctly generated with status PLANIFIER
4. Stats endpoint correctly counts REALISE items by status alone (no date condition)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSurveillanceDateControleFix:
    """Test the critical bug fix: prochain_controle = derniere_visite for REALISE items"""
    
    token = None
    created_item_ids = []
    
    @pytest.fixture(autouse=True, scope="class")
    def setup_auth(self, request):
        """Authenticate and store token for all tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        TestSurveillanceDateControleFix.token = response.json().get("access_token")
        assert TestSurveillanceDateControleFix.token, "No access_token in response"
        
        request.cls.headers = {
            "Authorization": f"Bearer {TestSurveillanceDateControleFix.token}",
            "Content-Type": "application/json"
        }
    
    def test_01_create_realise_item_with_periodicite_1an(self, request):
        """
        BUG FIX VERIFICATION #1:
        Create item with status REALISE, derniere_visite=2026-01-15, periodicite='1 an'
        Expected: prochain_controle = '2026-01-15' (NOT 2027-01-15)
        Expected: annee = 2026 (year of derniere_visite)
        """
        payload = {
            "controles": [
                {
                    "classe_type": "TEST_DATE_FIX_Item_1an",
                    "category": "ELECTRIQUE",
                    "batiment": "TEST_BUILDING",
                    "periodicite": "1 an",
                    "executant": "APAVE",
                    "description": "Test item for date fix verification - 1 an periodicite",
                    "derniere_visite": "2026-01-15",
                    "resultat": "CONFORME"
                }
            ],
            "document_info": {
                "numero_rapport": "TEST-RPT-001",
                "organisme_controle": "APAVE",
                "date_intervention": "2026-01-15"
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/surveillance/ai/create-batch",
            json=payload,
            headers=request.cls.headers
        )
        
        assert response.status_code == 200, f"Create batch failed: {response.text}"
        data = response.json()
        
        assert data.get("success") is True, f"API returned success=False: {data}"
        assert len(data.get("created_items", [])) >= 1, "No items created"
        
        main_item = data["created_items"][0]
        TestSurveillanceDateControleFix.created_item_ids.append(main_item["id"])
        
        # CRITICAL ASSERTION: prochain_controle = derniere_visite for REALISE
        assert main_item.get("prochain_controle") == "2026-01-15", \
            f"BUG: prochain_controle should be 2026-01-15 (derniere_visite), got {main_item.get('prochain_controle')}"
        
        # CRITICAL ASSERTION: annee = 2026 (year of derniere_visite)
        assert main_item.get("annee") == 2026, \
            f"BUG: annee should be 2026, got {main_item.get('annee')}"
        
        # Verify status is REALISE
        assert main_item.get("status") == "REALISE", \
            f"Status should be REALISE, got {main_item.get('status')}"
        
        print(f"✅ TEST_01 PASSED: prochain_controle={main_item.get('prochain_controle')}, annee={main_item.get('annee')}")
    
    def test_02_recurring_control_generated_for_2027(self, request):
        """
        Verify that a recurring control for 2027 was also generated with status PLANIFIER.
        """
        # Get all items with our test classe_type
        response = requests.get(
            f"{BASE_URL}/api/surveillance/items?annee=2027",
            headers=request.cls.headers
        )
        
        assert response.status_code == 200, f"Get items failed: {response.text}"
        items = response.json()
        
        # Find recurring control for our test item
        recurring = [i for i in items if "TEST_DATE_FIX_Item_1an" in i.get("classe_type", "")]
        
        assert len(recurring) >= 1, "No recurring control found for 2027"
        
        recurring_item = recurring[0]
        TestSurveillanceDateControleFix.created_item_ids.append(recurring_item["id"])
        
        # Recurring control should have prochain_controle = 2027-01-15 (derniere_visite + 1 an)
        assert recurring_item.get("prochain_controle") == "2027-01-15", \
            f"Recurring control prochain_controle should be 2027-01-15, got {recurring_item.get('prochain_controle')}"
        
        # Recurring control should have status PLANIFIER
        assert recurring_item.get("status") == "PLANIFIER", \
            f"Recurring control status should be PLANIFIER, got {recurring_item.get('status')}"
        
        # annee should be 2027
        assert recurring_item.get("annee") == 2027, \
            f"Recurring control annee should be 2027, got {recurring_item.get('annee')}"
        
        print(f"✅ TEST_02 PASSED: Recurring control for 2027 with status PLANIFIER generated correctly")
    
    def test_03_create_multiple_items_batch(self, request):
        """
        Robustness test: Create 2+ items in a single batch call.
        Verify all items have correct prochain_controle = derniere_visite.
        """
        payload = {
            "controles": [
                {
                    "classe_type": "TEST_DATE_FIX_Multi_1",
                    "category": "INCENDIE",
                    "batiment": "BATIMENT_A",
                    "periodicite": "6 mois",
                    "executant": "SOCOTEC",
                    "description": "Test multi item 1",
                    "derniere_visite": "2026-03-20",
                    "resultat": "CONFORME"
                },
                {
                    "classe_type": "TEST_DATE_FIX_Multi_2",
                    "category": "MANUTENTION",
                    "batiment": "BATIMENT_B",
                    "periodicite": "1 an",
                    "executant": "BUREAU VERITAS",
                    "description": "Test multi item 2",
                    "derniere_visite": "2026-02-10",
                    "resultat": "AVEC_RESERVES"
                }
            ],
            "document_info": {
                "numero_rapport": "TEST-RPT-002",
                "organisme_controle": "MULTI_ORGANISMES",
                "date_intervention": "2026-03-01"
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/surveillance/ai/create-batch",
            json=payload,
            headers=request.cls.headers
        )
        
        assert response.status_code == 200, f"Create batch failed: {response.text}"
        data = response.json()
        
        assert data.get("success") is True, f"API returned success=False: {data}"
        created = data.get("created_items", [])
        assert len(created) >= 2, f"Expected 2 items created, got {len(created)}"
        
        for item in created:
            TestSurveillanceDateControleFix.created_item_ids.append(item["id"])
            
            # Each REALISE item should have prochain_controle = derniere_visite
            assert item.get("prochain_controle") == item.get("derniere_visite"), \
                f"BUG: {item.get('classe_type')} - prochain_controle ({item.get('prochain_controle')}) != derniere_visite ({item.get('derniere_visite')})"
            
            # Status should be REALISE
            assert item.get("status") == "REALISE", \
                f"{item.get('classe_type')} status should be REALISE"
        
        print(f"✅ TEST_03 PASSED: {len(created)} items created with correct prochain_controle = derniere_visite")
    
    def test_04_stats_count_realise_by_status_only(self, request):
        """
        Verify stats endpoint counts REALISE items by status alone (no date condition).
        """
        response = requests.get(
            f"{BASE_URL}/api/surveillance/stats?annee=2026",
            headers=request.cls.headers
        )
        
        assert response.status_code == 200, f"Stats failed: {response.text}"
        data = response.json()
        
        global_stats = data.get("global", {})
        
        # Should have REALISE count > 0 (at least our test items)
        realises = global_stats.get("realises", 0)
        total = global_stats.get("total", 0)
        
        assert total > 0, "Total count should be > 0"
        assert realises > 0, f"REALISE count should be > 0, got {realises}"
        
        # Percentage should be calculated correctly
        pourcentage = global_stats.get("pourcentage_realisation", 0)
        expected_pct = round((realises / total * 100), 1) if total > 0 else 0
        assert pourcentage == expected_pct, \
            f"Pourcentage mismatch: expected {expected_pct}, got {pourcentage}"
        
        print(f"✅ TEST_04 PASSED: Stats - {realises}/{total} REALISE ({pourcentage}%)")
    
    def test_05_get_item_verify_date_display_logic(self, request):
        """
        Verify that for a REALISE item, the date field logic works correctly:
        - For REALISE items: display derniere_visite as the control date
        - The API should return both derniere_visite and prochain_controle for frontend to decide
        """
        response = requests.get(
            f"{BASE_URL}/api/surveillance/items?annee=2026",
            headers=request.cls.headers
        )
        
        assert response.status_code == 200, f"Get items failed: {response.text}"
        items = response.json()
        
        test_items = [i for i in items if i.get("classe_type", "").startswith("TEST_DATE_FIX")]
        
        for item in test_items:
            if item.get("status") == "REALISE":
                # For REALISE, both prochain_controle and derniere_visite should be same
                assert item.get("prochain_controle") == item.get("derniere_visite"), \
                    f"REALISE item {item.get('classe_type')}: prochain_controle != derniere_visite"
                
                # Add recurring items to cleanup list
                TestSurveillanceDateControleFix.created_item_ids.append(item["id"])
        
        print(f"✅ TEST_05 PASSED: {len(test_items)} test items verified for date display logic")
    
    def test_99_cleanup(self, request):
        """Cleanup all test data created during testing"""
        # Also get items from 2027 for cleanup
        response = requests.get(
            f"{BASE_URL}/api/surveillance/items?annee=2027",
            headers=request.cls.headers
        )
        if response.status_code == 200:
            items_2027 = response.json()
            for item in items_2027:
                if "TEST_DATE_FIX" in item.get("classe_type", ""):
                    TestSurveillanceDateControleFix.created_item_ids.append(item["id"])
        
        # Remove duplicates
        unique_ids = list(set(TestSurveillanceDateControleFix.created_item_ids))
        
        deleted = 0
        for item_id in unique_ids:
            response = requests.delete(
                f"{BASE_URL}/api/surveillance/items/{item_id}",
                headers=request.cls.headers
            )
            if response.status_code in [200, 204]:
                deleted += 1
        
        print(f"✅ TEST_99 CLEANUP: Deleted {deleted} test items")
        
        # Verify cleanup
        response = requests.get(
            f"{BASE_URL}/api/surveillance/items",
            headers=request.cls.headers
        )
        if response.status_code == 200:
            remaining = [i for i in response.json() if "TEST_DATE_FIX" in i.get("classe_type", "")]
            assert len(remaining) == 0, f"Cleanup incomplete: {len(remaining)} items remaining"
