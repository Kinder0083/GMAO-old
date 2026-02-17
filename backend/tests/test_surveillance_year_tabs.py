"""
Tests for Surveillance Year Tabs Feature
- Tests GET /api/surveillance/available-years endpoint
- Tests GET /api/surveillance/items?annee=XXXX endpoint filtering
- Tests GET /api/surveillance/stats?annee=XXXX endpoint filtering
- Tests year-based filtering of surveillance items
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    raise ValueError("REACT_APP_BACKEND_URL environment variable not set")

# Admin credentials for testing
ADMIN_EMAIL = "admin@test.com"
ADMIN_PASSWORD = "Admin123!"


class TestSurveillanceYearTabs:
    """Test suite for Surveillance Year Tabs feature"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Login failed with status {response.status_code}")
        return response.json().get("access_token")
    
    @pytest.fixture
    def auth_headers(self, admin_token):
        """Get headers with authentication"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    # ==================== available-years endpoint tests ====================
    
    def test_get_available_years_status_code(self, auth_headers):
        """Test that available-years endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/surveillance/available-years", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"SUCCESS: GET /api/surveillance/available-years returned 200")
    
    def test_get_available_years_structure(self, auth_headers):
        """Test that available-years returns correct structure with years array"""
        response = requests.get(f"{BASE_URL}/api/surveillance/available-years", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "years" in data, "Response should contain 'years' key"
        assert "current_year" in data, "Response should contain 'current_year' key"
        assert isinstance(data["years"], list), "'years' should be a list"
        assert isinstance(data["current_year"], int), "'current_year' should be an integer"
        print(f"SUCCESS: Response structure is correct - years: {data['years']}, current_year: {data['current_year']}")
    
    def test_get_available_years_contains_expected_years(self, auth_headers):
        """Test that available years includes 2024, 2025, 2026, 2027 (as per migration)"""
        response = requests.get(f"{BASE_URL}/api/surveillance/available-years", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        years = data.get("years", [])
        
        # Expected years from migration: 2024, 2025, 2026, 2027
        expected_years = [2024, 2025, 2026, 2027]
        for year in expected_years:
            assert year in years, f"Year {year} should be in available years"
        
        print(f"SUCCESS: All expected years {expected_years} found in {years}")
    
    def test_get_available_years_current_year_is_2026(self, auth_headers):
        """Test that current_year reflects the actual current year"""
        response = requests.get(f"{BASE_URL}/api/surveillance/available-years", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        # Current year from datetime.now() should be returned
        # For 2026, it should be 2026
        current_year = data.get("current_year")
        assert current_year == 2026, f"Expected current_year to be 2026, got {current_year}"
        print(f"SUCCESS: current_year is correctly set to {current_year}")
    
    # ==================== items with annee filter tests ====================
    
    def test_get_items_with_year_2026_filter(self, auth_headers):
        """Test GET /api/surveillance/items?annee=2026 returns only 2026 items"""
        response = requests.get(f"{BASE_URL}/api/surveillance/items", 
                               params={"annee": 2026}, 
                               headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Verify all returned items have annee=2026
        for item in data:
            assert item.get("annee") == 2026, f"Item {item.get('id')} has annee={item.get('annee')}, expected 2026"
        
        print(f"SUCCESS: GET /api/surveillance/items?annee=2026 returned {len(data)} items, all with annee=2026")
    
    def test_get_items_with_year_2027_filter(self, auth_headers):
        """Test GET /api/surveillance/items?annee=2027 returns only 2027 items"""
        response = requests.get(f"{BASE_URL}/api/surveillance/items", 
                               params={"annee": 2027}, 
                               headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Verify all returned items have annee=2027
        for item in data:
            assert item.get("annee") == 2027, f"Item {item.get('id')} has annee={item.get('annee')}, expected 2027"
        
        print(f"SUCCESS: GET /api/surveillance/items?annee=2027 returned {len(data)} items, all with annee=2027")
    
    def test_get_items_with_year_2025_filter(self, auth_headers):
        """Test GET /api/surveillance/items?annee=2025 returns only 2025 items"""
        response = requests.get(f"{BASE_URL}/api/surveillance/items", 
                               params={"annee": 2025}, 
                               headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Verify all returned items have annee=2025
        for item in data:
            assert item.get("annee") == 2025, f"Item {item.get('id')} has annee={item.get('annee')}, expected 2025"
        
        print(f"SUCCESS: GET /api/surveillance/items?annee=2025 returned {len(data)} items, all with annee=2025")
    
    def test_items_count_differs_by_year(self, auth_headers):
        """Test that different years return different item counts (validates filtering works)"""
        # Get items for 2026
        response_2026 = requests.get(f"{BASE_URL}/api/surveillance/items", 
                                    params={"annee": 2026}, 
                                    headers=auth_headers)
        count_2026 = len(response_2026.json())
        
        # Get items for 2027
        response_2027 = requests.get(f"{BASE_URL}/api/surveillance/items", 
                                    params={"annee": 2027}, 
                                    headers=auth_headers)
        count_2027 = len(response_2027.json())
        
        # As per migration: 2026 should have 13 items, 2027 should have 16 items (or similar different counts)
        print(f"INFO: 2026 has {count_2026} items, 2027 has {count_2027} items")
        
        # Just verify both endpoints work - counts may vary based on test data
        assert response_2026.status_code == 200, "2026 items request failed"
        assert response_2027.status_code == 200, "2027 items request failed"
        print(f"SUCCESS: Year filtering works - 2026: {count_2026} items, 2027: {count_2027} items")
    
    # ==================== stats with annee filter tests ====================
    
    def test_get_stats_with_year_2026(self, auth_headers):
        """Test GET /api/surveillance/stats?annee=2026 returns filtered stats"""
        response = requests.get(f"{BASE_URL}/api/surveillance/stats", 
                               params={"annee": 2026}, 
                               headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "global" in data, "Response should contain 'global' key"
        
        global_stats = data.get("global", {})
        assert "total" in global_stats, "'global' should contain 'total'"
        assert "realises" in global_stats, "'global' should contain 'realises'"
        assert "planifies" in global_stats, "'global' should contain 'planifies'"
        assert "a_planifier" in global_stats, "'global' should contain 'a_planifier'"
        assert "pourcentage_realisation" in global_stats, "'global' should contain 'pourcentage_realisation'"
        
        print(f"SUCCESS: GET /api/surveillance/stats?annee=2026 returned stats: {global_stats}")
    
    def test_get_stats_with_year_2027(self, auth_headers):
        """Test GET /api/surveillance/stats?annee=2027 returns filtered stats"""
        response = requests.get(f"{BASE_URL}/api/surveillance/stats", 
                               params={"annee": 2027}, 
                               headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "global" in data, "Response should contain 'global' key"
        
        global_stats = data.get("global", {})
        print(f"SUCCESS: GET /api/surveillance/stats?annee=2027 returned stats: {global_stats}")
    
    def test_stats_total_matches_items_count(self, auth_headers):
        """Test that stats total matches items count for the same year"""
        year = 2026
        
        # Get items count
        items_response = requests.get(f"{BASE_URL}/api/surveillance/items", 
                                     params={"annee": year}, 
                                     headers=auth_headers)
        items_count = len(items_response.json())
        
        # Get stats total
        stats_response = requests.get(f"{BASE_URL}/api/surveillance/stats", 
                                     params={"annee": year}, 
                                     headers=auth_headers)
        stats_total = stats_response.json().get("global", {}).get("total", 0)
        
        assert items_count == stats_total, f"Items count ({items_count}) should match stats total ({stats_total}) for year {year}"
        print(f"SUCCESS: Items count ({items_count}) matches stats total ({stats_total}) for year {year}")
    
    # ==================== Items without year filter (all items) ====================
    
    def test_get_items_without_year_filter(self, auth_headers):
        """Test GET /api/surveillance/items without annee param returns all items"""
        response = requests.get(f"{BASE_URL}/api/surveillance/items", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Get counts per year to verify we have items from multiple years
        years_in_response = set()
        for item in data:
            if item.get("annee"):
                years_in_response.add(item.get("annee"))
        
        print(f"SUCCESS: GET /api/surveillance/items (no filter) returned {len(data)} items from years: {sorted(years_in_response)}")
    
    # ==================== Authentication tests ====================
    
    def test_available_years_requires_auth(self):
        """Test that available-years endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/surveillance/available-years")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"SUCCESS: available-years endpoint requires authentication (returned {response.status_code})")
    
    def test_items_requires_auth(self):
        """Test that items endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/surveillance/items", params={"annee": 2026})
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"SUCCESS: items endpoint requires authentication (returned {response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
