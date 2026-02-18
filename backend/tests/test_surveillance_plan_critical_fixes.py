"""
Test suite for Surveillance Plan critical fixes (Iteration 51):
1. POST /api/surveillance/ai/create-batch: prochain_controle = derniere_visite + periodicite (NOT derniere_visite)
2. POST /api/surveillance/ai/create-batch: status = REALISE for AI-created items  
3. POST /api/surveillance/ai/create-batch: annee = year of derniere_visite (2026)
4. POST /api/surveillance/ai/create-batch: recurring future items with status PLANIFIER
5. POST /api/surveillance/check-due-dates: MUST NOT change status (no updated_count)
6. POST /api/surveillance/check-due-dates: alerts only for NON-REALISE items before prochain_controle
7. GET /api/surveillance/stats: REALISE items in pourcentage_realisation
8. Verify check-due-dates after create-batch does NOT change REALISE to PLANIFIER
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSurveillancePlanCriticalFixes:
    """Comprehensive test for surveillance plan bug fixes"""
    
    token = None
    created_item_ids = []
    headers = None
    
    @pytest.fixture(autouse=True, scope="class")
    def setup_auth(self, request):
        """Authenticate and store token for all tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        TestSurveillancePlanCriticalFixes.token = response.json().get("access_token")
        assert TestSurveillancePlanCriticalFixes.token, "No access_token in response"
        
        TestSurveillancePlanCriticalFixes.headers = {
            "Authorization": f"Bearer {TestSurveillancePlanCriticalFixes.token}",
            "Content-Type": "application/json"
        }
        request.cls.headers = TestSurveillancePlanCriticalFixes.headers
    
    def test_01_create_batch_prochain_controle_is_derniere_visite_plus_periodicite(self, request):
        """
        CRITICAL FIX #1:
        When creating via /api/surveillance/ai/create-batch:
        - derniere_visite = 2026-01-15
        - periodicite = 1 an
        - Expected prochain_controle = 2027-01-15 (derniere_visite + 1 year, NOT derniere_visite)
        """
        payload = {
            "controles": [
                {
                    "classe_type": "TEST_CRITICAL_FIX_prochain_controle",
                    "category": "ELECTRIQUE",
                    "batiment": "TEST_BAT_A",
                    "periodicite": "1 an",
                    "executant": "APAVE",
                    "description": "Test: prochain_controle should be derniere_visite + periodicite",
                    "derniere_visite": "2026-01-15",
                    "resultat": "CONFORME"
                }
            ],
            "document_info": {
                "numero_rapport": "TEST-CRIT-001",
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
        TestSurveillancePlanCriticalFixes.created_item_ids.append(main_item["id"])
        
        # CRITICAL: prochain_controle = derniere_visite + periodicite = 2027-01-15
        expected_prochain = "2027-01-15"
        assert main_item.get("prochain_controle") == expected_prochain, \
            f"FAIL: prochain_controle should be {expected_prochain} (derniere_visite + 1 an), got {main_item.get('prochain_controle')}"
        
        print(f"✅ TEST_01 PASSED: prochain_controle = {main_item.get('prochain_controle')} (derniere_visite + periodicite)")
    
    def test_02_create_batch_status_is_realise(self, request):
        """
        CRITICAL FIX #2:
        Items created via AI create-batch should have status = REALISE
        """
        payload = {
            "controles": [
                {
                    "classe_type": "TEST_CRITICAL_FIX_status_realise",
                    "category": "INCENDIE",
                    "batiment": "TEST_BAT_B",
                    "periodicite": "6 mois",
                    "executant": "SOCOTEC",
                    "description": "Test: status should be REALISE",
                    "derniere_visite": "2026-01-20",
                    "resultat": "CONFORME"
                }
            ],
            "document_info": {
                "numero_rapport": "TEST-CRIT-002",
                "organisme_controle": "SOCOTEC"
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/surveillance/ai/create-batch",
            json=payload,
            headers=request.cls.headers
        )
        
        assert response.status_code == 200, f"Create batch failed: {response.text}"
        data = response.json()
        
        main_item = data["created_items"][0]
        TestSurveillancePlanCriticalFixes.created_item_ids.append(main_item["id"])
        
        assert main_item.get("status") == "REALISE", \
            f"FAIL: status should be REALISE, got {main_item.get('status')}"
        
        print(f"✅ TEST_02 PASSED: status = {main_item.get('status')}")
    
    def test_03_create_batch_annee_is_year_of_derniere_visite(self, request):
        """
        CRITICAL FIX #3:
        annee should be the year of derniere_visite (2026), not prochain_controle year
        """
        payload = {
            "controles": [
                {
                    "classe_type": "TEST_CRITICAL_FIX_annee",
                    "category": "MANUTENTION",
                    "batiment": "TEST_BAT_C",
                    "periodicite": "1 an",
                    "executant": "DEKRA",
                    "description": "Test: annee should be 2026 (derniere_visite year)",
                    "derniere_visite": "2026-03-10",
                    "resultat": "CONFORME"
                }
            ],
            "document_info": {
                "numero_rapport": "TEST-CRIT-003",
                "organisme_controle": "DEKRA"
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/surveillance/ai/create-batch",
            json=payload,
            headers=request.cls.headers
        )
        
        assert response.status_code == 200, f"Create batch failed: {response.text}"
        data = response.json()
        
        main_item = data["created_items"][0]
        TestSurveillancePlanCriticalFixes.created_item_ids.append(main_item["id"])
        
        # annee should be 2026 (year of derniere_visite), NOT 2027
        assert main_item.get("annee") == 2026, \
            f"FAIL: annee should be 2026 (derniere_visite year), got {main_item.get('annee')}"
        
        print(f"✅ TEST_03 PASSED: annee = {main_item.get('annee')}")
    
    def test_04_create_batch_generates_recurring_with_status_planifier(self, request):
        """
        CRITICAL FIX #4:
        Future recurring items should have status = PLANIFIER
        """
        payload = {
            "controles": [
                {
                    "classe_type": "TEST_CRITICAL_FIX_recurring",
                    "category": "MMRI",
                    "batiment": "TEST_BAT_D",
                    "periodicite": "1 an",
                    "executant": "BUREAU VERITAS",
                    "description": "Test: recurring items should be PLANIFIER",
                    "derniere_visite": "2026-02-01",
                    "resultat": "CONFORME"
                }
            ],
            "document_info": {
                "numero_rapport": "TEST-CRIT-004",
                "organisme_controle": "BUREAU VERITAS"
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/surveillance/ai/create-batch",
            json=payload,
            headers=request.cls.headers
        )
        
        assert response.status_code == 200, f"Create batch failed: {response.text}"
        data = response.json()
        
        main_item = data["created_items"][0]
        TestSurveillancePlanCriticalFixes.created_item_ids.append(main_item["id"])
        
        # Wait and check for recurring item in 2027
        response = requests.get(
            f"{BASE_URL}/api/surveillance/items?annee=2027",
            headers=request.cls.headers
        )
        
        assert response.status_code == 200, f"Get items failed: {response.text}"
        items_2027 = response.json()
        
        recurring = [i for i in items_2027 if "TEST_CRITICAL_FIX_recurring" in i.get("classe_type", "")]
        
        assert len(recurring) >= 1, "No recurring control found for 2027"
        
        recurring_item = recurring[0]
        TestSurveillancePlanCriticalFixes.created_item_ids.append(recurring_item["id"])
        
        # Recurring item should have status PLANIFIER
        assert recurring_item.get("status") == "PLANIFIER", \
            f"FAIL: Recurring item status should be PLANIFIER, got {recurring_item.get('status')}"
        
        # Recurring item prochain_controle should be 2027-02-01
        assert recurring_item.get("prochain_controle") == "2027-02-01", \
            f"FAIL: Recurring item prochain_controle should be 2027-02-01, got {recurring_item.get('prochain_controle')}"
        
        print(f"✅ TEST_04 PASSED: Recurring item status = {recurring_item.get('status')}, prochain_controle = {recurring_item.get('prochain_controle')}")
    
    def test_05_check_due_dates_does_not_change_status(self, request):
        """
        CRITICAL FIX #5:
        POST /api/surveillance/check-due-dates should NOT change any status.
        Response should NOT contain 'updated_count'.
        Response should contain 'alerts_count' and 'alerts'.
        """
        response = requests.post(
            f"{BASE_URL}/api/surveillance/check-due-dates",
            headers=request.cls.headers
        )
        
        assert response.status_code == 200, f"Check due dates failed: {response.text}"
        data = response.json()
        
        # Should NOT have updated_count
        assert "updated_count" not in data, \
            f"FAIL: check-due-dates should NOT have 'updated_count' in response, got {data}"
        
        # Should have alerts_count
        assert "alerts_count" in data, \
            f"FAIL: check-due-dates should have 'alerts_count', got {data.keys()}"
        
        # Should have alerts array
        assert "alerts" in data, \
            f"FAIL: check-due-dates should have 'alerts' array, got {data.keys()}"
        
        print(f"✅ TEST_05 PASSED: check-due-dates returns alerts_count={data.get('alerts_count')}, no updated_count")
    
    def test_06_check_due_dates_only_alerts_non_realise_before_prochain_controle(self, request):
        """
        CRITICAL FIX #6:
        check-due-dates should ONLY alert for:
        - Items with status != REALISE
        - Items where today is BEFORE prochain_controle (not after)
        - Items where today is within duree_rappel_echeance days BEFORE prochain_controle
        """
        import time
        
        # Create a PLANIFIER item with prochain_controle in the future (within reminder period)
        future_date = (datetime.now() + timedelta(days=20)).strftime("%Y-%m-%d")
        
        payload = {
            "classe_type": "TEST_CRITICAL_FIX_alert_check",
            "category": "SECURITE_ENVIRONNEMENT",
            "batiment": "TEST_BAT_E",
            "periodicite": "1 an",
            "responsable": "MAINT",
            "executant": "APAVE",
            "prochain_controle": future_date,
            "status": "PLANIFIER",
            "duree_rappel_echeance": 30
        }
        
        # Retry logic for transient 520 errors
        response = None
        for attempt in range(3):
            response = requests.post(
                f"{BASE_URL}/api/surveillance/items",
                json=payload,
                headers=request.cls.headers
            )
            if response.status_code != 520:
                break
            time.sleep(2)
        
        assert response.status_code == 200, f"Create item failed after retries: {response.text}"
        new_item = response.json()
        TestSurveillancePlanCriticalFixes.created_item_ids.append(new_item["id"])
        
        # Now call check-due-dates
        response = requests.post(
            f"{BASE_URL}/api/surveillance/check-due-dates",
            headers=request.cls.headers
        )
        
        assert response.status_code == 200, f"Check due dates failed: {response.text}"
        data = response.json()
        
        alerts = data.get("alerts", [])
        
        # Our PLANIFIER item should be in alerts (within 30 days)
        our_alert = next((a for a in alerts if a.get("id") == new_item["id"]), None)
        assert our_alert is not None, \
            f"FAIL: PLANIFIER item with prochain_controle in {future_date} should be in alerts"
        
        # No REALISE items should be in alerts
        realise_alerts = [a for a in alerts if a.get("status") == "REALISE"]
        assert len(realise_alerts) == 0, \
            f"FAIL: REALISE items should NOT be in alerts, found {len(realise_alerts)}"
        
        print(f"✅ TEST_06 PASSED: Alerts contain only non-REALISE items before prochain_controle")
    
    def test_07_stats_count_realise_correctly(self, request):
        """
        CRITICAL FIX #7:
        GET /api/surveillance/stats should correctly count REALISE items in pourcentage_realisation.
        """
        response = requests.get(
            f"{BASE_URL}/api/surveillance/stats",
            headers=request.cls.headers
        )
        
        assert response.status_code == 200, f"Stats failed: {response.text}"
        data = response.json()
        
        global_stats = data.get("global", {})
        
        total = global_stats.get("total", 0)
        realises = global_stats.get("realises", 0)
        pourcentage = global_stats.get("pourcentage_realisation", 0)
        
        assert total > 0, "Total should be > 0"
        
        # Verify percentage calculation
        if total > 0:
            expected_pct = round((realises / total * 100), 1)
            assert pourcentage == expected_pct, \
                f"FAIL: pourcentage_realisation should be {expected_pct}, got {pourcentage}"
        
        print(f"✅ TEST_07 PASSED: Stats - {realises}/{total} REALISE ({pourcentage}%)")
    
    def test_08_check_due_dates_after_create_batch_does_not_change_realise(self, request):
        """
        CRITICAL FIX #8:
        Calling check-due-dates AFTER create-batch should NOT change REALISE items to PLANIFIER.
        This was the critical bug where percentage never updated because check-due-dates
        was resetting REALISE items.
        """
        # Create a REALISE item via AI batch
        payload = {
            "controles": [
                {
                    "classe_type": "TEST_CRITICAL_FIX_no_status_change",
                    "category": "EXTRACTION",
                    "batiment": "TEST_BAT_F",
                    "periodicite": "1 an",
                    "executant": "QUALICONSULT",
                    "description": "Test: REALISE should stay REALISE after check-due-dates",
                    "derniere_visite": "2026-01-10",
                    "resultat": "CONFORME"
                }
            ],
            "document_info": {
                "numero_rapport": "TEST-CRIT-008",
                "organisme_controle": "QUALICONSULT"
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/surveillance/ai/create-batch",
            json=payload,
            headers=request.cls.headers
        )
        
        assert response.status_code == 200, f"Create batch failed: {response.text}"
        data = response.json()
        
        main_item = data["created_items"][0]
        item_id = main_item["id"]
        TestSurveillancePlanCriticalFixes.created_item_ids.append(item_id)
        
        # Verify initial status is REALISE
        assert main_item.get("status") == "REALISE", "Initial status should be REALISE"
        
        # Call check-due-dates
        response = requests.post(
            f"{BASE_URL}/api/surveillance/check-due-dates",
            headers=request.cls.headers
        )
        
        assert response.status_code == 200, f"Check due dates failed: {response.text}"
        
        # Verify item status is STILL REALISE (not changed to PLANIFIER)
        response = requests.get(
            f"{BASE_URL}/api/surveillance/items/{item_id}",
            headers=request.cls.headers
        )
        
        assert response.status_code == 200, f"Get item failed: {response.text}"
        item_after = response.json()
        
        assert item_after.get("status") == "REALISE", \
            f"CRITICAL BUG: REALISE item status changed to {item_after.get('status')} after check-due-dates"
        
        print(f"✅ TEST_08 PASSED: REALISE status preserved after check-due-dates call")
    
    def test_09_six_month_periodicite(self, request):
        """
        Test: 6 mois periodicite should calculate prochain_controle correctly.
        derniere_visite = 2026-01-15, periodicite = 6 mois
        Expected: prochain_controle = 2026-07-15
        """
        payload = {
            "controles": [
                {
                    "classe_type": "TEST_CRITICAL_FIX_6_mois",
                    "category": "INCENDIE",
                    "batiment": "TEST_BAT_G",
                    "periodicite": "6 mois",
                    "executant": "APAVE",
                    "description": "Test: 6 mois periodicite",
                    "derniere_visite": "2026-01-15",
                    "resultat": "CONFORME"
                }
            ],
            "document_info": {
                "numero_rapport": "TEST-CRIT-009",
                "organisme_controle": "APAVE"
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/surveillance/ai/create-batch",
            json=payload,
            headers=request.cls.headers
        )
        
        assert response.status_code == 200, f"Create batch failed: {response.text}"
        data = response.json()
        
        main_item = data["created_items"][0]
        TestSurveillancePlanCriticalFixes.created_item_ids.append(main_item["id"])
        
        # prochain_controle = 2026-01-15 + 6 mois = 2026-07-15
        expected_prochain = "2026-07-15"
        assert main_item.get("prochain_controle") == expected_prochain, \
            f"FAIL: prochain_controle should be {expected_prochain}, got {main_item.get('prochain_controle')}"
        
        print(f"✅ TEST_09 PASSED: 6 mois periodicite - prochain_controle = {main_item.get('prochain_controle')}")
    
    def test_99_cleanup(self, request):
        """Cleanup all test data created during testing"""
        # Get all items for cleanup (2026 and 2027)
        for year in [2026, 2027]:
            response = requests.get(
                f"{BASE_URL}/api/surveillance/items?annee={year}",
                headers=request.cls.headers
            )
            if response.status_code == 200:
                items = response.json()
                for item in items:
                    if "TEST_CRITICAL_FIX" in item.get("classe_type", ""):
                        TestSurveillancePlanCriticalFixes.created_item_ids.append(item["id"])
        
        # Also get items without year filter
        response = requests.get(
            f"{BASE_URL}/api/surveillance/items",
            headers=request.cls.headers
        )
        if response.status_code == 200:
            items = response.json()
            for item in items:
                if "TEST_CRITICAL_FIX" in item.get("classe_type", ""):
                    TestSurveillancePlanCriticalFixes.created_item_ids.append(item["id"])
        
        # Remove duplicates
        unique_ids = list(set(TestSurveillancePlanCriticalFixes.created_item_ids))
        
        deleted = 0
        for item_id in unique_ids:
            response = requests.delete(
                f"{BASE_URL}/api/surveillance/items/{item_id}",
                headers=request.cls.headers
            )
            if response.status_code in [200, 204]:
                deleted += 1
        
        print(f"✅ TEST_99 CLEANUP: Deleted {deleted}/{len(unique_ids)} test items")
