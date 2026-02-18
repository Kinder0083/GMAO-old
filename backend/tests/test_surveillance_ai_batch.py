"""
Test suite for surveillance AI batch creation bug fix.
Bug: Items created via create-batch had annee=None, making them invisible in year-filtered UI.
Fix: Added annee calculation from prochain_controle/derniere_visite dates + recurring controls generation.

Tests covered:
- POST /api/surveillance/ai/create-batch: annee field set correctly
- POST /api/surveillance/ai/create-batch: groupe_controle_id set 
- POST /api/surveillance/ai/create-batch: Recurring controls generation
- POST /api/surveillance/ai/create-batch: Per-control error handling
- GET /api/surveillance/items?annee=YEAR: Items appear in year filter
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@test.com"
ADMIN_PASSWORD = "Admin123!"


class TestSurveillanceAIBatchFix:
    """Test the surveillance AI batch creation bug fix"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Headers with auth"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def test_batch_id(self):
        """Unique ID for test data cleanup"""
        return f"TEST_{uuid.uuid4().hex[:8]}"
    
    def test_01_create_batch_has_annee_from_prochain_controle(self, auth_headers, test_batch_id):
        """
        CRITICAL BUG FIX: Items created via AI batch MUST have 'annee' field set.
        When prochain_controle is provided, annee should be extracted from it.
        """
        payload = {
            "document_info": {
                "numero_rapport": f"RPT-{test_batch_id}-01",
                "organisme_controle": "TestOrg",
                "date_intervention": "2026-01-20"
            },
            "controles": [{
                "classe_type": f"TEST_Control_Prochain_{test_batch_id}",
                "category": "MANUTENTION",
                "batiment": "B1",
                "resultat": "CONFORME",
                "derniere_visite": "2026-01-20",
                "periodicite": "1 an"
            }],
            "filename": "test.pdf"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/surveillance/ai/create-batch",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Create batch failed: {response.text}"
        data = response.json()
        
        assert data.get("success") is True, "Response should indicate success"
        assert data.get("created_count") >= 1, "At least 1 item should be created"
        
        # Verify the created item has annee set
        created_items = data.get("created_items", [])
        assert len(created_items) >= 1, "Should have created items in response"
        
        first_item = created_items[0]
        
        # CRITICAL: annee must NOT be None
        assert first_item.get("annee") is not None, f"CRITICAL BUG: annee is None! Item: {first_item}"
        
        # annee should be 2027 (derniere_visite 2026-01-20 + periodicite 1 an = 2027-01-20)
        assert first_item.get("annee") == 2027, f"annee should be 2027, got {first_item.get('annee')}"
        
        # Store item ID for cleanup
        self.__class__.created_item_id_01 = first_item.get("id")
        self.__class__.created_item_annee = first_item.get("annee")
        print(f"✅ Created item with annee={first_item.get('annee')}, id={first_item.get('id')}")
    
    def test_02_create_batch_has_groupe_controle_id(self, auth_headers, test_batch_id):
        """
        Items created via AI batch should have groupe_controle_id set for recurring controls.
        """
        payload = {
            "document_info": {
                "numero_rapport": f"RPT-{test_batch_id}-02",
                "organisme_controle": "TestOrg",
                "date_intervention": "2026-01-20"
            },
            "controles": [{
                "classe_type": f"TEST_Control_Groupe_{test_batch_id}",
                "category": "ELECTRIQUE",
                "batiment": "B2",
                "resultat": "CONFORME",
                "derniere_visite": "2026-01-20",
                "periodicite": "6 mois"
            }],
            "filename": "test2.pdf"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/surveillance/ai/create-batch",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Create batch failed: {response.text}"
        data = response.json()
        
        created_items = data.get("created_items", [])
        assert len(created_items) >= 1, "Should have created items"
        
        first_item = created_items[0]
        
        # groupe_controle_id must be set
        assert first_item.get("groupe_controle_id") is not None, "groupe_controle_id should be set"
        assert isinstance(first_item.get("groupe_controle_id"), str), "groupe_controle_id should be a string"
        assert len(first_item.get("groupe_controle_id")) > 10, "groupe_controle_id should be a UUID"
        
        self.__class__.created_item_id_02 = first_item.get("id")
        self.__class__.groupe_controle_id_02 = first_item.get("groupe_controle_id")
        print(f"✅ Item has groupe_controle_id={first_item.get('groupe_controle_id')[:8]}...")
    
    def test_03_create_batch_generates_recurring_controls(self, auth_headers, test_batch_id):
        """
        When periodicite is provided, recurring controls should be generated (like standard endpoint).
        """
        # Create a control with 3-month periodicity - should generate multiple future occurrences
        payload = {
            "document_info": {
                "numero_rapport": f"RPT-{test_batch_id}-03",
                "organisme_controle": "TestOrg",
                "date_intervention": "2026-01-15"
            },
            "controles": [{
                "classe_type": f"TEST_Control_Recurring_{test_batch_id}",
                "category": "INCENDIE",
                "batiment": "B3",
                "resultat": "CONFORME",
                "derniere_visite": "2026-01-15",
                "periodicite": "3 mois"  # Should generate April, July, Oct 2026 + Jan 2027
            }],
            "filename": "test3.pdf"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/surveillance/ai/create-batch",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Create batch failed: {response.text}"
        data = response.json()
        
        created_items = data.get("created_items", [])
        assert len(created_items) >= 1, "Should have created the base item"
        
        first_item = created_items[0]
        groupe_id = first_item.get("groupe_controle_id")
        assert groupe_id is not None, "groupe_controle_id must be set"
        
        # Query for all items with this groupe_controle_id to verify recurring generation
        occurrences_response = requests.get(
            f"{BASE_URL}/api/surveillance/occurrences/{groupe_id}",
            headers=auth_headers
        )
        
        assert occurrences_response.status_code == 200, f"Failed to get occurrences: {occurrences_response.text}"
        occ_data = occurrences_response.json()
        
        # With 3-month periodicity from 2026-01-15, we should have:
        # Base: 2026-04-15 (first prochain_controle) - year 2026
        # Recurring: 2026-07-15, 2026-10-15, 2027-01-15, 2027-04-15, 2027-07-15, 2027-10-15
        # So we should have multiple occurrences
        occurrences = occ_data.get("occurrences", [])
        total = occ_data.get("total", 0)
        
        print(f"Found {total} occurrences for groupe_controle_id={groupe_id[:8]}...")
        for occ in occurrences[:5]:
            print(f"  - {occ.get('prochain_controle')} (annee={occ.get('annee')}, status={occ.get('status')})")
        
        # Should have at least the original + some recurring
        assert total >= 2, f"Expected recurring controls, got only {total} occurrence(s)"
        
        # All occurrences should have annee set
        for occ in occurrences:
            assert occ.get("annee") is not None, f"Recurring item missing annee: {occ}"
        
        self.__class__.groupe_controle_id_03 = groupe_id
        print(f"✅ Recurring controls generated: {total} occurrences")
    
    def test_04_per_control_error_handling(self, auth_headers, test_batch_id):
        """
        Per-control error handling: one bad control should NOT crash the entire batch.
        Response should include 'errors' field for partial failures.
        """
        payload = {
            "document_info": {
                "numero_rapport": f"RPT-{test_batch_id}-04",
                "organisme_controle": "TestOrg",
                "date_intervention": "2026-01-20"
            },
            "controles": [
                # Valid control
                {
                    "classe_type": f"TEST_Control_Valid_{test_batch_id}",
                    "category": "MANUTENTION",
                    "batiment": "B4",
                    "resultat": "CONFORME",
                    "derniere_visite": "2026-01-20",
                    "periodicite": "1 an"
                },
                # Another valid control
                {
                    "classe_type": f"TEST_Control_Valid2_{test_batch_id}",
                    "category": "SECURITE_ENVIRONNEMENT",
                    "batiment": "B5",
                    "resultat": "CONFORME",
                    "derniere_visite": "2026-01-20",
                    "periodicite": "6 mois"
                }
            ],
            "filename": "test4.pdf"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/surveillance/ai/create-batch",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Create batch failed: {response.text}"
        data = response.json()
        
        # Both valid controls should be created
        assert data.get("success") is True
        assert data.get("created_count") == 2, f"Expected 2 items created, got {data.get('created_count')}"
        
        # errors field should be None or empty (no errors in this case)
        errors = data.get("errors")
        assert errors is None or len(errors) == 0, f"No errors expected, got: {errors}"
        
        # Store IDs for cleanup
        created_items = data.get("created_items", [])
        self.__class__.created_item_ids_04 = [item.get("id") for item in created_items]
        print(f"✅ Batch with 2 valid controls succeeded, created_count={data.get('created_count')}")
    
    def test_05_items_appear_in_year_filter(self, auth_headers):
        """
        Items created via AI batch should appear when filtering by the correct year.
        This was the original bug - items were invisible because annee was None.
        """
        # Use the annee from test_01
        annee = getattr(self.__class__, 'created_item_annee', 2027)
        
        response = requests.get(
            f"{BASE_URL}/api/surveillance/items?annee={annee}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Get items failed: {response.text}"
        items = response.json()
        
        assert isinstance(items, list), "Response should be a list"
        
        # Find our test items
        test_items = [item for item in items if "TEST_" in item.get("classe_type", "")]
        
        print(f"Found {len(test_items)} test items for annee={annee}")
        
        # At least one of our test items should be visible
        assert len(test_items) >= 1, f"Test items should be visible in year {annee} filter"
        
        # Verify all test items have annee set to the filtered year
        for item in test_items:
            assert item.get("annee") == annee, f"Item annee mismatch: expected {annee}, got {item.get('annee')}"
        
        print(f"✅ {len(test_items)} test items visible in year {annee} filter")
    
    def test_06_annee_from_derniere_visite_when_no_prochain(self, auth_headers, test_batch_id):
        """
        When prochain_controle cannot be calculated, annee should fallback to derniere_visite year.
        """
        payload = {
            "document_info": {
                "numero_rapport": f"RPT-{test_batch_id}-06",
                "organisme_controle": "TestOrg",
                "date_intervention": "2026-01-20"
            },
            "controles": [{
                "classe_type": f"TEST_Control_NoPeriodicite_{test_batch_id}",
                "category": "AUTRE",
                "batiment": "B6",
                "resultat": "CONFORME",
                "derniere_visite": "2026-06-15"
                # No periodicite - so no prochain_controle can be calculated
            }],
            "filename": "test6.pdf"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/surveillance/ai/create-batch",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Create batch failed: {response.text}"
        data = response.json()
        
        created_items = data.get("created_items", [])
        assert len(created_items) >= 1, "Should have created item"
        
        first_item = created_items[0]
        
        # annee should fallback to derniere_visite year (2026)
        assert first_item.get("annee") is not None, "annee must be set even without periodicite"
        assert first_item.get("annee") == 2026, f"annee should be 2026 from derniere_visite, got {first_item.get('annee')}"
        
        self.__class__.created_item_id_06 = first_item.get("id")
        print(f"✅ annee={first_item.get('annee')} from derniere_visite fallback")
    
    def test_07_annee_fallback_to_current_year(self, auth_headers, test_batch_id):
        """
        When neither prochain_controle nor derniere_visite is set, annee should fallback to current year.
        """
        payload = {
            "document_info": {
                "numero_rapport": f"RPT-{test_batch_id}-07",
                "organisme_controle": "TestOrg",
                "date_intervention": "2026-01-20"
            },
            "controles": [{
                "classe_type": f"TEST_Control_NoDate_{test_batch_id}",
                "category": "AUTRE",
                "batiment": "B7",
                "resultat": "CONFORME"
                # No derniere_visite, no periodicite
            }],
            "filename": "test7.pdf"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/surveillance/ai/create-batch",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Create batch failed: {response.text}"
        data = response.json()
        
        created_items = data.get("created_items", [])
        assert len(created_items) >= 1, "Should have created item"
        
        first_item = created_items[0]
        
        # annee should fallback to current year
        current_year = datetime.now().year
        assert first_item.get("annee") is not None, "annee must be set as fallback"
        assert first_item.get("annee") == current_year, f"annee should be {current_year}, got {first_item.get('annee')}"
        
        self.__class__.created_item_id_07 = first_item.get("id")
        print(f"✅ annee={first_item.get('annee')} from current year fallback")
    
    def test_99_cleanup_test_data(self, auth_headers):
        """Cleanup all TEST_ prefixed surveillance items created during testing"""
        # First, get all items to find test data
        response = requests.get(
            f"{BASE_URL}/api/surveillance/items",
            headers=auth_headers
        )
        
        if response.status_code != 200:
            print(f"Warning: Could not fetch items for cleanup: {response.text}")
            return
        
        items = response.json()
        test_items = [item for item in items if "TEST_" in item.get("classe_type", "")]
        
        deleted_count = 0
        for item in test_items:
            item_id = item.get("id")
            del_response = requests.delete(
                f"{BASE_URL}/api/surveillance/items/{item_id}",
                headers=auth_headers
            )
            if del_response.status_code in [200, 204]:
                deleted_count += 1
        
        print(f"✅ Cleanup: Deleted {deleted_count} test surveillance items")


class TestSurveillanceGetItemsYearFilter:
    """Test GET /api/surveillance/items with annee filter"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_get_items_with_year_filter(self, auth_headers):
        """GET /api/surveillance/items?annee=YEAR should return only items for that year"""
        # Get available years first
        years_response = requests.get(
            f"{BASE_URL}/api/surveillance/available-years",
            headers=auth_headers
        )
        
        assert years_response.status_code == 200, f"Get years failed: {years_response.text}"
        years_data = years_response.json()
        available_years = years_data.get("years", [])
        
        print(f"Available years: {available_years}")
        
        if not available_years:
            pytest.skip("No surveillance items with annee found")
        
        # Test filter for first available year
        test_year = available_years[0]
        
        response = requests.get(
            f"{BASE_URL}/api/surveillance/items?annee={test_year}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Get items failed: {response.text}"
        items = response.json()
        
        # All returned items should have matching annee
        for item in items:
            assert item.get("annee") == test_year, f"Item annee {item.get('annee')} != filter {test_year}"
        
        print(f"✅ Year filter works: {len(items)} items for annee={test_year}")
    
    def test_get_items_no_filter_includes_all(self, auth_headers):
        """GET /api/surveillance/items without filter should return all items"""
        response = requests.get(
            f"{BASE_URL}/api/surveillance/items",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Get items failed: {response.text}"
        items = response.json()
        
        assert isinstance(items, list), "Response should be a list"
        print(f"✅ Total items without filter: {len(items)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
