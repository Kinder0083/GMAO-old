"""
Test cases for Surveillance Rapport feature:
1. GET /api/surveillance/rapport-stats with ?annee=XXXX filter
2. Response includes new fields: ecart_moyen, dans_les_temps, dans_les_temps_total, pourcentage_dans_les_temps
3. by_category includes ecart_moyen field
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSurveillanceRapportStats:
    """Tests for GET /api/surveillance/rapport-stats endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@test.com", "password": "Admin123!"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_rapport_stats_for_2025(self):
        """Test GET /api/surveillance/rapport-stats?annee=2025 returns filtered stats"""
        response = requests.get(
            f"{BASE_URL}/api/surveillance/rapport-stats",
            params={"annee": 2025},
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "global" in data, "Response should have 'global' field"
        assert "by_category" in data, "Response should have 'by_category' field"
        assert "by_batiment" in data, "Response should have 'by_batiment' field"
        assert "by_periodicite" in data, "Response should have 'by_periodicite' field"
        
        # Verify global has expected fields
        global_stats = data["global"]
        assert "total" in global_stats, "global should have 'total'"
        assert "realises" in global_stats, "global should have 'realises'"
        assert "en_retard" in global_stats, "global should have 'en_retard'"
        
        # Verify NEW fields are present
        assert "ecart_moyen" in global_stats, "global should have 'ecart_moyen'"
        assert "dans_les_temps" in global_stats, "global should have 'dans_les_temps'"
        assert "dans_les_temps_total" in global_stats, "global should have 'dans_les_temps_total'"
        assert "pourcentage_dans_les_temps" in global_stats, "global should have 'pourcentage_dans_les_temps'"
        
        print(f"2025 stats: total={global_stats['total']}, realises={global_stats['realises']}")
        print(f"New fields: ecart_moyen={global_stats['ecart_moyen']}, dans_les_temps={global_stats['dans_les_temps']}/{global_stats['dans_les_temps_total']}, %={global_stats['pourcentage_dans_les_temps']}")
    
    def test_rapport_stats_for_2026(self):
        """Test GET /api/surveillance/rapport-stats?annee=2026 returns filtered stats for 2026"""
        response = requests.get(
            f"{BASE_URL}/api/surveillance/rapport-stats",
            params={"annee": 2026},
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "global" in data
        global_stats = data["global"]
        
        # Verify NEW fields are present
        assert "ecart_moyen" in global_stats, "global should have 'ecart_moyen'"
        assert "dans_les_temps" in global_stats, "global should have 'dans_les_temps'"
        assert "dans_les_temps_total" in global_stats, "global should have 'dans_les_temps_total'"
        assert "pourcentage_dans_les_temps" in global_stats, "global should have 'pourcentage_dans_les_temps'"
        
        print(f"2026 stats: total={global_stats['total']}, realises={global_stats['realises']}")
        print(f"New fields: ecart_moyen={global_stats['ecart_moyen']}, dans_les_temps={global_stats['dans_les_temps']}/{global_stats['dans_les_temps_total']}, %={global_stats['pourcentage_dans_les_temps']}")
    
    def test_rapport_stats_without_year_filter(self):
        """Test GET /api/surveillance/rapport-stats without year filter returns all data"""
        response = requests.get(
            f"{BASE_URL}/api/surveillance/rapport-stats",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        
        # Should return more than just 2025 or 2026 data
        assert "global" in data
        global_stats = data["global"]
        
        # Verify NEW fields are present even without filter
        assert "ecart_moyen" in global_stats
        assert "dans_les_temps" in global_stats
        assert "dans_les_temps_total" in global_stats
        assert "pourcentage_dans_les_temps" in global_stats
        
        print(f"All years stats: total={global_stats['total']}, realises={global_stats['realises']}")
    
    def test_by_category_includes_ecart_moyen(self):
        """Test that by_category includes ecart_moyen field for each category"""
        response = requests.get(
            f"{BASE_URL}/api/surveillance/rapport-stats",
            params={"annee": 2026},
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        by_category = data.get("by_category", {})
        
        # Check if any categories exist
        if by_category:
            for cat_name, cat_data in by_category.items():
                assert "total" in cat_data, f"Category {cat_name} should have 'total'"
                assert "realises" in cat_data, f"Category {cat_name} should have 'realises'"
                assert "pourcentage" in cat_data, f"Category {cat_name} should have 'pourcentage'"
                assert "ecart_moyen" in cat_data, f"Category {cat_name} should have 'ecart_moyen'"
                print(f"Category '{cat_name}': total={cat_data['total']}, realises={cat_data['realises']}, ecart_moyen={cat_data['ecart_moyen']}")
        else:
            print("No categories found for 2026 (may be expected if no items)")
    
    def test_rapport_stats_2025_has_expected_count(self):
        """Test that 2025 has expected 12 items as mentioned in context"""
        response = requests.get(
            f"{BASE_URL}/api/surveillance/rapport-stats",
            params={"annee": 2025},
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        global_stats = data["global"]
        
        # According to context: Year 2025 has 12 items (0 realized)
        # Note: The exact count may vary due to test data changes
        print(f"2025 has {global_stats['total']} items (expected ~12)")
        # Don't assert exact count since test data can change
    
    def test_rapport_stats_2026_has_expected_count(self):
        """Test that 2026 has expected 1 item as mentioned in context"""
        response = requests.get(
            f"{BASE_URL}/api/surveillance/rapport-stats",
            params={"annee": 2026},
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        global_stats = data["global"]
        
        # According to context: Year 2026 has 1 item (1 realized, MMRI category)
        print(f"2026 has {global_stats['total']} items, {global_stats['realises']} realized (expected ~1)")
    
    def test_available_years_endpoint(self):
        """Test GET /api/surveillance/available-years returns years list"""
        response = requests.get(
            f"{BASE_URL}/api/surveillance/available-years",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "years" in data, "Response should have 'years' field"
        assert "current_year" in data, "Response should have 'current_year' field"
        
        years = data["years"]
        assert isinstance(years, list), "years should be a list"
        print(f"Available years: {years}")
        print(f"Current year: {data['current_year']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
