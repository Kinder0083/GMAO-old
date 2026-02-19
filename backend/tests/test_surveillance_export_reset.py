"""
Test: Surveillance Export PDF/Excel and Reset Surveillance Items
Features tested:
1. Backend DELETE /api/admin/reset/surveillance_items endpoint exists
2. Backend rapport-stats endpoint returns required fields for export

NOTE: We do NOT actually delete surveillance data - we only verify the endpoint exists
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSurveillanceResetEndpoint:
    """Test surveillance_items is available in reset endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup auth token for tests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "Admin123!"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_surveillance_items_reset_endpoint_exists_but_dont_delete(self):
        """
        Verify DELETE /api/admin/reset/surveillance_items endpoint is configured
        We test this by attempting an UNAUTHORIZED request (no auth header)
        to confirm the endpoint exists (should return 401/403, not 404)
        """
        # Make request WITHOUT auth to verify endpoint exists
        no_auth_session = requests.Session()
        response = no_auth_session.delete(f"{BASE_URL}/api/admin/reset/surveillance_items")
        
        # If endpoint exists, it should return 401 (unauthorized) or 403 (forbidden)
        # If endpoint doesn't exist, it would return 404
        assert response.status_code != 404, f"Endpoint /api/admin/reset/surveillance_items not found (got 404)"
        assert response.status_code in [401, 403, 422], f"Unexpected status: {response.status_code} - {response.text}"
        print(f"✅ Endpoint exists - returned {response.status_code} (expected 401/403 for unauthorized request)")
    
    def test_reset_invalid_section_returns_400(self):
        """Verify that invalid section returns 400 error"""
        response = self.session.delete(f"{BASE_URL}/api/admin/reset/invalid_section_xyz")
        assert response.status_code == 400, f"Expected 400 for invalid section, got {response.status_code}"
        print("✅ Invalid section correctly returns 400")


class TestSurveillanceRapportStatsForExport:
    """Test rapport-stats endpoint returns data suitable for PDF/Excel export"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup auth token for tests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "Admin123!"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_rapport_stats_endpoint_returns_exportable_data(self):
        """Test that rapport-stats returns all fields needed for Excel/PDF export"""
        current_year = 2025  # Use a year we know has data from previous tests
        response = self.session.get(f"{BASE_URL}/api/surveillance/rapport-stats?annee={current_year}")
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        
        data = response.json()
        
        # Verify global stats (required for Excel export)
        assert "global" in data, "Missing 'global' in response"
        global_stats = data["global"]
        required_global_fields = ["total", "realises", "pourcentage_realisation", "en_retard"]
        for field in required_global_fields:
            assert field in global_stats, f"Missing '{field}' in global stats"
        print(f"✅ Global stats present with required fields: {required_global_fields}")
        
        # Verify category stats with ecart_moyen (required for Excel export)
        assert "by_category" in data, "Missing 'by_category' in response"
        for cat_name, cat_data in data["by_category"].items():
            assert "total" in cat_data, f"Missing 'total' in category {cat_name}"
            assert "realises" in cat_data, f"Missing 'realises' in category {cat_name}"
            assert "pourcentage" in cat_data, f"Missing 'pourcentage' in category {cat_name}"
            # ecart_moyen can be null but should be present
            assert "ecart_moyen" in cat_data, f"Missing 'ecart_moyen' in category {cat_name}"
        print(f"✅ Category stats present with ecart_moyen field for {len(data['by_category'])} categories")
        
        # Verify batiment stats
        assert "by_batiment" in data, "Missing 'by_batiment' in response"
        print(f"✅ Batiment stats present with {len(data['by_batiment'])} buildings")
        
        # Verify periodicite stats
        assert "by_periodicite" in data, "Missing 'by_periodicite' in response"
        print(f"✅ Periodicite stats present")
        
        # Verify anomalies count
        assert "anomalies" in data, "Missing 'anomalies' in response"
        print(f"✅ Anomalies count present: {data['anomalies']}")
    
    def test_available_years_endpoint(self):
        """Test the available years endpoint (used by year tabs)"""
        response = self.session.get(f"{BASE_URL}/api/surveillance/available-years")
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "years" in data, "Missing 'years' in response"
        assert "current_year" in data, "Missing 'current_year' in response"
        assert isinstance(data["years"], list), "'years' should be a list"
        print(f"✅ Available years: {data['years']}, current: {data['current_year']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
