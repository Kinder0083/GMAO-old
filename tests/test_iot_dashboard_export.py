"""
Tests for IoT Dashboard Export and Sensor Chart Features
- Export readings endpoint (CSV/XLSX)
- Sensors groups by type/location
- Sensor readings and statistics
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestIoTDashboardExport:
    """Tests for IoT Dashboard export and sensor features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "password"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    # ==================== Sensors List ====================
    def test_get_all_sensors(self):
        """Test GET /api/sensors returns list of sensors"""
        response = self.session.get(f"{BASE_URL}/api/sensors")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/sensors - Found {len(data)} sensors")
    
    # ==================== Groups by Type ====================
    def test_get_sensors_groups_by_type(self):
        """Test GET /api/sensors/groups/by-type returns grouped sensors"""
        response = self.session.get(f"{BASE_URL}/api/sensors/groups/by-type")
        assert response.status_code == 200
        data = response.json()
        assert "groups" in data
        assert "total_groups" in data
        assert "total_sensors" in data
        print(f"✓ GET /api/sensors/groups/by-type - {data['total_groups']} groups, {data['total_sensors']} sensors")
        
        # Verify group structure
        if data["groups"]:
            group = data["groups"][0]
            assert "type" in group
            assert "type_label" in group
            assert "sensors" in group
            assert "count" in group
    
    # ==================== Groups by Location ====================
    def test_get_sensors_groups_by_location(self):
        """Test GET /api/sensors/groups/by-location returns grouped sensors"""
        response = self.session.get(f"{BASE_URL}/api/sensors/groups/by-location")
        assert response.status_code == 200
        data = response.json()
        assert "groups" in data
        assert "total_groups" in data
        assert "total_sensors" in data
        print(f"✓ GET /api/sensors/groups/by-location - {data['total_groups']} groups, {data['total_sensors']} sensors")
        
        # Verify group structure
        if data["groups"]:
            group = data["groups"][0]
            assert "location_id" in group
            assert "location_name" in group
            assert "sensors" in group
            assert "count" in group
            assert "alerts_active" in group
    
    # ==================== Export Readings CSV ====================
    def test_export_readings_csv(self):
        """Test GET /api/sensors/export/readings with CSV format"""
        response = self.session.get(
            f"{BASE_URL}/api/sensors/export/readings",
            params={"period_days": 7, "format": "csv"}
        )
        assert response.status_code == 200
        
        # Verify CSV headers
        content = response.text
        assert "Date/Heure" in content
        assert "Capteur" in content
        assert "Type" in content
        assert "Valeur" in content
        assert "Unité" in content
        assert "Emplacement" in content
        print(f"✓ GET /api/sensors/export/readings (CSV) - Headers present")
    
    # ==================== Export Readings XLSX ====================
    def test_export_readings_xlsx(self):
        """Test GET /api/sensors/export/readings with XLSX format"""
        response = self.session.get(
            f"{BASE_URL}/api/sensors/export/readings",
            params={"period_days": 7, "format": "xlsx"}
        )
        assert response.status_code == 200
        
        # Verify XLSX content type
        content_type = response.headers.get("content-type", "")
        assert "spreadsheet" in content_type or "octet-stream" in content_type or len(response.content) > 0
        
        # Verify it's a valid XLSX (starts with PK - ZIP signature)
        assert response.content[:2] == b'PK', "XLSX file should start with PK (ZIP signature)"
        print(f"✓ GET /api/sensors/export/readings (XLSX) - Valid XLSX file ({len(response.content)} bytes)")
    
    # ==================== Export Readings Different Periods ====================
    def test_export_readings_24h(self):
        """Test export with 24h period (1 day)"""
        response = self.session.get(
            f"{BASE_URL}/api/sensors/export/readings",
            params={"period_days": 1, "format": "csv"}
        )
        assert response.status_code == 200
        print("✓ GET /api/sensors/export/readings (24h) - OK")
    
    def test_export_readings_30_days(self):
        """Test export with 30 days period"""
        response = self.session.get(
            f"{BASE_URL}/api/sensors/export/readings",
            params={"period_days": 30, "format": "csv"}
        )
        assert response.status_code == 200
        print("✓ GET /api/sensors/export/readings (30 days) - OK")
    
    def test_export_readings_90_days(self):
        """Test export with 90 days period (3 months)"""
        response = self.session.get(
            f"{BASE_URL}/api/sensors/export/readings",
            params={"period_days": 90, "format": "csv"}
        )
        assert response.status_code == 200
        print("✓ GET /api/sensors/export/readings (90 days) - OK")
    
    def test_export_readings_180_days(self):
        """Test export with 180 days period (6 months)"""
        response = self.session.get(
            f"{BASE_URL}/api/sensors/export/readings",
            params={"period_days": 180, "format": "csv"}
        )
        assert response.status_code == 200
        print("✓ GET /api/sensors/export/readings (180 days) - OK")
    
    # ==================== Sensor Readings ====================
    def test_get_sensor_readings(self):
        """Test GET /api/sensors/{id}/readings returns readings"""
        # First get a sensor
        sensors_response = self.session.get(f"{BASE_URL}/api/sensors")
        sensors = sensors_response.json()
        
        if sensors:
            sensor_id = sensors[0]["id"]
            response = self.session.get(
                f"{BASE_URL}/api/sensors/{sensor_id}/readings",
                params={"limit": 100, "hours": 24}
            )
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            print(f"✓ GET /api/sensors/{sensor_id}/readings - {len(data)} readings")
        else:
            pytest.skip("No sensors available for testing")
    
    # ==================== Sensor Statistics ====================
    def test_get_sensor_statistics(self):
        """Test GET /api/sensors/{id}/statistics returns stats"""
        # First get a sensor
        sensors_response = self.session.get(f"{BASE_URL}/api/sensors")
        sensors = sensors_response.json()
        
        if sensors:
            sensor_id = sensors[0]["id"]
            response = self.session.get(
                f"{BASE_URL}/api/sensors/{sensor_id}/statistics",
                params={"hours": 24}
            )
            assert response.status_code == 200
            data = response.json()
            assert "count" in data
            print(f"✓ GET /api/sensors/{sensor_id}/statistics - count: {data['count']}")
        else:
            pytest.skip("No sensors available for testing")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
