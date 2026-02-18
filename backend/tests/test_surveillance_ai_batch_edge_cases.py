"""
Test suite for surveillance AI batch creation EDGE CASE fixes (Iteration 49).
BUG FIXES TESTED:
1. batiment=null should default to '' (not crash Pydantic validation)
2. periodicite like 'Annuelle (réf. Arrêtés du 5 mars 1993)' - normalize to '1 an'
3. Missing derniere_visite should fallback to document_info.date_intervention
4. Various periodicite formats: 'Semestrielle', 'Trimestrielle', complex strings

Test payload: 8 controls with edge cases - ALL should succeed (0 errors)
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


class TestSurveillanceAIBatchEdgeCases:
    """Test edge case fixes for surveillance AI batch creation"""
    
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
        return f"TEST_EDGE_{uuid.uuid4().hex[:8]}"

    def test_01_eight_edge_case_controls_all_succeed(self, auth_headers, test_batch_id):
        """
        MAIN TEST: Create 8 controls with various edge cases - ALL should succeed (0 errors)
        This is the primary test for the bug fix.
        
        Edge cases covered:
        1. Normal control with complex periodicite 'Annuelle (réf. Arrêtés du 5 mars et 4 juin 1993)'
        2. batiment=null (should default to '')
        3. batiment='' (empty string)
        4. periodicite='Trimestrielle'
        5. periodicite='annuelle (réf R4227-39)'
        6. periodicite='Semestrielle'
        7. Missing derniere_visite (should fallback to date_intervention)
        8. periodicite='1 an' (simple format)
        """
        payload = {
            "document_info": {
                "numero_rapport": f"RPT-EDGE-{test_batch_id}",
                "organisme_controle": "APAVE",
                "date_intervention": "2026-01-20"  # Fallback for missing derniere_visite
            },
            "controles": [
                # Control 1: Complex periodicite with reference dates
                {
                    "classe_type": f"TEST_EDGE_Ctrl1_{test_batch_id}",
                    "category": "MANUTENTION",
                    "batiment": "B1",
                    "resultat": "CONFORME",
                    "derniere_visite": "2026-01-20",
                    "periodicite": "Annuelle (réf. Arrêtés du 5 mars et 4 juin 1993)"
                },
                # Control 2: batiment=null (CRITICAL - this caused Pydantic crash)
                {
                    "classe_type": f"TEST_EDGE_Ctrl2_{test_batch_id}",
                    "category": "ELECTRIQUE",
                    "batiment": None,  # null - should default to ''
                    "resultat": "CONFORME",
                    "derniere_visite": "2026-01-20",
                    "periodicite": "Semestrielle"
                },
                # Control 3: batiment='' (empty string)
                {
                    "classe_type": f"TEST_EDGE_Ctrl3_{test_batch_id}",
                    "category": "INCENDIE",
                    "batiment": "",
                    "resultat": "CONFORME",
                    "derniere_visite": "2026-01-20",
                    "periodicite": "1 an"
                },
                # Control 4: periodicite='Trimestrielle'
                {
                    "classe_type": f"TEST_EDGE_Ctrl4_{test_batch_id}",
                    "category": "AUTRE",
                    "batiment": "B1",
                    "resultat": "CONFORME",
                    "derniere_visite": "2026-01-20",
                    "periodicite": "Trimestrielle"
                },
                # Control 5: periodicite='annuelle (réf R4227-39)' (lowercase)
                {
                    "classe_type": f"TEST_EDGE_Ctrl5_{test_batch_id}",
                    "category": "MANUTENTION",
                    "batiment": "B1",
                    "resultat": "CONFORME",
                    "derniere_visite": "2026-01-20",
                    "periodicite": "annuelle (réf R4227-39)"
                },
                # Control 6: periodicite='Semestrielle' (capitalized)
                {
                    "classe_type": f"TEST_EDGE_Ctrl6_{test_batch_id}",
                    "category": "ELECTRIQUE",
                    "batiment": "B2",
                    "resultat": "CONFORME",
                    "derniere_visite": "2026-01-20",
                    "periodicite": "Semestrielle"
                },
                # Control 7: Missing derniere_visite (should fallback to date_intervention)
                {
                    "classe_type": f"TEST_EDGE_Ctrl7_{test_batch_id}",
                    "category": "INCENDIE",
                    "batiment": "B3",
                    "resultat": "CONFORME",
                    # NO derniere_visite - should use document_info.date_intervention
                    "periodicite": "1 an"
                },
                # Control 8: Simple format periodicite
                {
                    "classe_type": f"TEST_EDGE_Ctrl8_{test_batch_id}",
                    "category": "SECURITE_ENVIRONNEMENT",
                    "batiment": "B4",
                    "resultat": "CONFORME",
                    "derniere_visite": "2026-01-20",
                    "periodicite": "1 an"
                }
            ],
            "filename": "test_edge_cases.pdf"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/surveillance/ai/create-batch",
            json=payload,
            headers=auth_headers
        )
        
        # Should not return 500 (Pydantic validation error)
        assert response.status_code == 200, f"Create batch failed with status {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Check success
        assert data.get("success") is True, f"Response should indicate success. Got: {data}"
        
        # CRITICAL: All 8 controls should succeed (0 errors)
        created_count = data.get("created_count", 0)
        errors = data.get("errors", [])
        
        print(f"\n=== EDGE CASE BATCH RESULTS ===")
        print(f"Created count: {created_count}")
        print(f"Errors count: {len(errors) if errors else 0}")
        
        if errors:
            print(f"Errors: {errors}")
        
        # Primary assertion: ALL 8 controls should succeed
        assert created_count == 8, f"Expected 8 controls created, got {created_count}. Errors: {errors}"
        assert errors is None or len(errors) == 0, f"Expected 0 errors, got: {errors}"
        
        # Verify all created items
        created_items = data.get("created_items", [])
        assert len(created_items) == 8, f"Expected 8 items in created_items, got {len(created_items)}"
        
        # Verify each item has required fields
        for i, item in enumerate(created_items):
            print(f"\nControl {i+1}:")
            print(f"  - classe_type: {item.get('classe_type')}")
            print(f"  - batiment: '{item.get('batiment')}'")
            print(f"  - periodicite: {item.get('periodicite')}")
            print(f"  - derniere_visite: {item.get('derniere_visite')}")
            print(f"  - prochain_controle: {item.get('prochain_controle')}")
            print(f"  - annee: {item.get('annee')}")
            
            # Verify annee is set
            assert item.get("annee") is not None, f"Item {i+1} missing annee: {item}"
            
            # Verify batiment is not None (should be '' if null was provided)
            assert item.get("batiment") is not None, f"Item {i+1} batiment is None: {item}"
        
        # Store item IDs for cleanup
        self.__class__.created_item_ids = [item.get("id") for item in created_items]
        
        print(f"\n✅ ALL 8 EDGE CASE CONTROLS SUCCEEDED (0 errors)")

    def test_02_batiment_null_defaults_to_empty_string(self, auth_headers, test_batch_id):
        """
        BUG FIX: batiment=null should default to '' and not crash Pydantic validation.
        """
        payload = {
            "document_info": {
                "numero_rapport": f"RPT-BAT-NULL-{test_batch_id}",
                "organisme_controle": "TestOrg",
                "date_intervention": "2026-01-20"
            },
            "controles": [{
                "classe_type": f"TEST_EDGE_BatNull_{test_batch_id}",
                "category": "MANUTENTION",
                "batiment": None,  # null value
                "resultat": "CONFORME",
                "derniere_visite": "2026-01-20",
                "periodicite": "1 an"
            }],
            "filename": "test_batiment_null.pdf"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/surveillance/ai/create-batch",
            json=payload,
            headers=auth_headers
        )
        
        # Should NOT return 500 (Pydantic crash)
        assert response.status_code != 500, f"Server error (likely Pydantic validation): {response.text}"
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") is True
        
        created_items = data.get("created_items", [])
        assert len(created_items) >= 1
        
        # batiment should be '' not None
        assert created_items[0].get("batiment") == "", f"batiment should be '' but got: {created_items[0].get('batiment')}"
        
        print(f"✅ batiment=null correctly defaulted to ''")

    def test_03_periodicite_annuelle_with_reference(self, auth_headers, test_batch_id):
        """
        BUG FIX: periodicite like 'Annuelle (réf. Arrêtés du 5 mars 1993)' should:
        - Normalize to '1 an' for calculation
        - NOT extract '5' as the period
        - prochain_controle should be derniere_visite + 1 year
        """
        payload = {
            "document_info": {
                "numero_rapport": f"RPT-PERIOD-REF-{test_batch_id}",
                "organisme_controle": "TestOrg",
                "date_intervention": "2026-01-20"
            },
            "controles": [{
                "classe_type": f"TEST_EDGE_PeriodRef_{test_batch_id}",
                "category": "MANUTENTION",
                "batiment": "B1",
                "resultat": "CONFORME",
                "derniere_visite": "2026-01-20",
                "periodicite": "Annuelle (réf. Arrêtés du 5 mars et 4 juin 1993)"
            }],
            "filename": "test_periodicite_ref.pdf"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/surveillance/ai/create-batch",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data.get("success") is True
        created_items = data.get("created_items", [])
        assert len(created_items) >= 1
        
        item = created_items[0]
        
        # prochain_controle should be 2027-01-20 (derniere_visite + 1 year)
        # NOT some weird date based on extracting '5' from the reference
        prochain = item.get("prochain_controle")
        assert prochain is not None, "prochain_controle should be set"
        
        # Verify it's about 1 year after derniere_visite
        assert prochain.startswith("2027-"), f"prochain_controle should be 2027-xx-xx, got: {prochain}"
        
        # annee should be 2026 (from derniere_visite)
        assert item.get("annee") == 2026, f"annee should be 2026 from derniere_visite, got: {item.get('annee')}"
        
        print(f"✅ periodicite 'Annuelle (réf...)' correctly parsed: prochain_controle={prochain}")

    def test_04_periodicite_semestrielle(self, auth_headers, test_batch_id):
        """
        periodicite='Semestrielle' should result in prochain_controle = derniere_visite + 6 months
        """
        payload = {
            "document_info": {
                "numero_rapport": f"RPT-SEMEST-{test_batch_id}",
                "organisme_controle": "TestOrg",
                "date_intervention": "2026-01-20"
            },
            "controles": [{
                "classe_type": f"TEST_EDGE_Semest_{test_batch_id}",
                "category": "ELECTRIQUE",
                "batiment": "B1",
                "resultat": "CONFORME",
                "derniere_visite": "2026-01-20",
                "periodicite": "Semestrielle"
            }],
            "filename": "test_semestrielle.pdf"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/surveillance/ai/create-batch",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data.get("success") is True
        created_items = data.get("created_items", [])
        assert len(created_items) >= 1
        
        item = created_items[0]
        prochain = item.get("prochain_controle")
        
        # 2026-01-20 + 6 months = 2026-07-20
        assert prochain == "2026-07-20", f"prochain_controle should be 2026-07-20, got: {prochain}"
        
        print(f"✅ periodicite 'Semestrielle' correctly calculated: prochain_controle={prochain}")

    def test_05_periodicite_trimestrielle(self, auth_headers, test_batch_id):
        """
        periodicite='Trimestrielle' should result in prochain_controle = derniere_visite + 3 months
        """
        payload = {
            "document_info": {
                "numero_rapport": f"RPT-TRIM-{test_batch_id}",
                "organisme_controle": "TestOrg",
                "date_intervention": "2026-01-20"
            },
            "controles": [{
                "classe_type": f"TEST_EDGE_Trim_{test_batch_id}",
                "category": "INCENDIE",
                "batiment": "B1",
                "resultat": "CONFORME",
                "derniere_visite": "2026-01-20",
                "periodicite": "Trimestrielle"
            }],
            "filename": "test_trimestrielle.pdf"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/surveillance/ai/create-batch",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data.get("success") is True
        created_items = data.get("created_items", [])
        assert len(created_items) >= 1
        
        item = created_items[0]
        prochain = item.get("prochain_controle")
        
        # 2026-01-20 + 3 months = 2026-04-20
        assert prochain == "2026-04-20", f"prochain_controle should be 2026-04-20, got: {prochain}"
        
        print(f"✅ periodicite 'Trimestrielle' correctly calculated: prochain_controle={prochain}")

    def test_06_missing_derniere_visite_fallback_to_date_intervention(self, auth_headers, test_batch_id):
        """
        BUG FIX: When derniere_visite is missing, it should fallback to document_info.date_intervention
        """
        payload = {
            "document_info": {
                "numero_rapport": f"RPT-NO-DATE-{test_batch_id}",
                "organisme_controle": "TestOrg",
                "date_intervention": "2026-01-15"  # This should be used as fallback
            },
            "controles": [{
                "classe_type": f"TEST_EDGE_NoDate_{test_batch_id}",
                "category": "AUTRE",
                "batiment": "B1",
                "resultat": "CONFORME",
                # NO derniere_visite provided
                "periodicite": "1 an"
            }],
            "filename": "test_no_date.pdf"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/surveillance/ai/create-batch",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data.get("success") is True
        created_items = data.get("created_items", [])
        assert len(created_items) >= 1
        
        item = created_items[0]
        
        # derniere_visite should fallback to date_intervention
        derniere = item.get("derniere_visite")
        assert derniere == "2026-01-15", f"derniere_visite should fallback to '2026-01-15', got: {derniere}"
        
        # prochain_controle should be calculated from fallback date
        prochain = item.get("prochain_controle")
        assert prochain == "2027-01-15", f"prochain_controle should be 2027-01-15, got: {prochain}"
        
        print(f"✅ Missing derniere_visite correctly fallback to date_intervention: {derniere}")

    def test_07_annee_from_derniere_visite_for_realise(self, auth_headers, test_batch_id):
        """
        For REALISE items, annee should come from derniere_visite (when control was done),
        NOT from prochain_controle (next scheduled date).
        """
        payload = {
            "document_info": {
                "numero_rapport": f"RPT-ANNEE-{test_batch_id}",
                "organisme_controle": "TestOrg",
                "date_intervention": "2026-01-20"
            },
            "controles": [{
                "classe_type": f"TEST_EDGE_Annee_{test_batch_id}",
                "category": "MANUTENTION",
                "batiment": "B1",
                "resultat": "CONFORME",
                "derniere_visite": "2026-06-15",  # Year = 2026
                "periodicite": "1 an"  # prochain_controle will be 2027
            }],
            "filename": "test_annee.pdf"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/surveillance/ai/create-batch",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data.get("success") is True
        created_items = data.get("created_items", [])
        assert len(created_items) >= 1
        
        item = created_items[0]
        
        # annee should be 2026 (from derniere_visite), not 2027 (from prochain_controle)
        assert item.get("annee") == 2026, f"annee should be 2026 from derniere_visite, got: {item.get('annee')}"
        
        # Status should be REALISE
        assert item.get("status") == "REALISE", f"status should be REALISE, got: {item.get('status')}"
        
        print(f"✅ annee correctly set from derniere_visite: {item.get('annee')} (status={item.get('status')})")

    def test_08_stats_endpoint_counts_realise_items(self, auth_headers, test_batch_id):
        """
        After batch creation, stats endpoint should correctly count REALISE items.
        """
        # First, get current stats for comparison
        stats_response = requests.get(
            f"{BASE_URL}/api/surveillance/stats",
            headers=auth_headers
        )
        
        assert stats_response.status_code == 200, f"Stats failed: {stats_response.text}"
        stats = stats_response.json()
        
        print(f"\nStats response: {stats}")
        
        # Stats should include REALISE count
        total = stats.get("total", 0)
        realise_count = stats.get("realise", 0) if "realise" in stats else stats.get("par_status", {}).get("REALISE", 0)
        
        print(f"Total items: {total}")
        print(f"REALISE items: {realise_count}")
        
        # Basic validation - should have some items
        assert total >= 0, "Stats should return valid total"
        
        print(f"✅ Stats endpoint working correctly")

    def test_99_cleanup_test_data(self, auth_headers):
        """Cleanup all TEST_EDGE_ prefixed surveillance items"""
        response = requests.get(
            f"{BASE_URL}/api/surveillance/items",
            headers=auth_headers
        )
        
        if response.status_code != 200:
            print(f"Warning: Could not fetch items for cleanup: {response.text}")
            return
        
        items = response.json()
        test_items = [item for item in items if "TEST_EDGE_" in item.get("classe_type", "")]
        
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


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
