"""
MES (Manufacturing Execution System) API Tests
Tests for: machines CRUD, metrics, history, alerts, simulate-pulse
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@test.com"
TEST_PASSWORD = "Admin123!"

# Existing test machine ID
EXISTING_MACHINE_ID = "698b59a6972c86462554e604"


class TestAuth:
    """Authentication for MES API tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Auth failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        return data["access_token"]

    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Auth headers for API requests"""
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestMESMachines(TestAuth):
    """Tests for MES Machines endpoints"""

    def test_list_machines(self, headers):
        """GET /api/mes/machines - should return list of machines"""
        response = requests.get(f"{BASE_URL}/api/mes/machines", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        # Should have at least one machine
        assert len(data) >= 1, "Expected at least one machine"
        # Validate machine structure
        machine = data[0]
        assert "id" in machine
        assert "mqtt_topic" in machine
        assert "theoretical_cadence" in machine
        assert "equipment_name" in machine

    def test_get_machine_by_id(self, headers):
        """GET /api/mes/machines/{id} - should return specific machine"""
        response = requests.get(f"{BASE_URL}/api/mes/machines/{EXISTING_MACHINE_ID}", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["id"] == EXISTING_MACHINE_ID
        assert "mqtt_topic" in data
        assert "theoretical_cadence" in data
        assert "alerts" in data
        assert "equipment_name" in data

    def test_get_machine_not_found(self, headers):
        """GET /api/mes/machines/{id} - 404 for invalid ID"""
        response = requests.get(f"{BASE_URL}/api/mes/machines/000000000000000000000000", headers=headers)
        assert response.status_code == 404


class TestMESMetrics(TestAuth):
    """Tests for MES Metrics endpoint"""

    def test_get_realtime_metrics(self, headers):
        """GET /api/mes/machines/{id}/metrics - should return real-time metrics"""
        response = requests.get(f"{BASE_URL}/api/mes/machines/{EXISTING_MACHINE_ID}/metrics", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Validate all expected metric fields
        expected_fields = [
            "cadence_per_min", "cadence_per_hour", "production_today", 
            "production_24h", "is_running", "downtime_current_seconds",
            "downtime_today_seconds", "trs", "theoretical_cadence"
        ]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        # Validate data types
        assert isinstance(data["cadence_per_min"], int)
        assert isinstance(data["cadence_per_hour"], int)
        assert isinstance(data["production_today"], int)
        assert isinstance(data["production_24h"], int)
        assert isinstance(data["is_running"], bool)
        assert isinstance(data["downtime_current_seconds"], int)
        assert isinstance(data["downtime_today_seconds"], int)
        assert isinstance(data["trs"], (int, float))
        assert isinstance(data["theoretical_cadence"], (int, float))


class TestMESHistory(TestAuth):
    """Tests for MES Cadence History endpoint"""

    def test_get_history_6h(self, headers):
        """GET /api/mes/machines/{id}/history?period=6h - 6 hour history"""
        response = requests.get(
            f"{BASE_URL}/api/mes/machines/{EXISTING_MACHINE_ID}/history?period=6h",
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        # Validate history entry structure
        if len(data) > 0:
            entry = data[0]
            assert "timestamp" in entry
            assert "cadence" in entry
            assert "theoretical" in entry

    def test_get_history_12h(self, headers):
        """GET /api/mes/machines/{id}/history?period=12h - 12 hour history"""
        response = requests.get(
            f"{BASE_URL}/api/mes/machines/{EXISTING_MACHINE_ID}/history?period=12h",
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)

    def test_get_history_24h(self, headers):
        """GET /api/mes/machines/{id}/history?period=24h - 24 hour history"""
        response = requests.get(
            f"{BASE_URL}/api/mes/machines/{EXISTING_MACHINE_ID}/history?period=24h",
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)

    def test_get_history_7d(self, headers):
        """GET /api/mes/machines/{id}/history?period=7d - 7 day history (hourly aggregation)"""
        response = requests.get(
            f"{BASE_URL}/api/mes/machines/{EXISTING_MACHINE_ID}/history?period=7d",
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)


class TestMESAlerts(TestAuth):
    """Tests for MES Alerts endpoints"""

    def test_list_alerts(self, headers):
        """GET /api/mes/alerts - should return list of alerts"""
        response = requests.get(f"{BASE_URL}/api/mes/alerts?limit=20", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        # Validate alert structure if alerts exist
        if len(data) > 0:
            alert = data[0]
            assert "id" in alert
            assert "type" in alert
            assert "message" in alert
            assert "equipment_name" in alert
            assert "created_at" in alert
            assert "read" in alert

    def test_list_alerts_unread_only(self, headers):
        """GET /api/mes/alerts?unread_only=true - should filter unread alerts"""
        response = requests.get(f"{BASE_URL}/api/mes/alerts?unread_only=true&limit=20", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        # All returned alerts should be unread
        for alert in data:
            assert alert.get("read") == False

    def test_alert_count(self, headers):
        """GET /api/mes/alerts/count - should return unread count"""
        response = requests.get(f"{BASE_URL}/api/mes/alerts/count", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "count" in data
        assert isinstance(data["count"], int)
        assert data["count"] >= 0


class TestMESSimulatePulse(TestAuth):
    """Tests for MES Simulate Pulse endpoint"""

    def test_simulate_pulse(self, headers):
        """POST /api/mes/machines/{id}/simulate-pulse - should create a pulse"""
        response = requests.post(
            f"{BASE_URL}/api/mes/machines/{EXISTING_MACHINE_ID}/simulate-pulse",
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["success"] == True
        assert "message" in data


class TestMESAlertMarkRead(TestAuth):
    """Tests for MES Alert mark as read functionality"""

    def test_mark_all_alerts_read(self, headers):
        """PUT /api/mes/alerts/read-all - should mark all alerts as read"""
        response = requests.put(f"{BASE_URL}/api/mes/alerts/read-all", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["success"] == True


class TestMESPing(TestAuth):
    """Tests for MES Ping sensor endpoint"""

    def test_ping_sensor(self, headers):
        """POST /api/mes/machines/{id}/ping - should attempt to ping sensor"""
        response = requests.post(
            f"{BASE_URL}/api/mes/machines/{EXISTING_MACHINE_ID}/ping",
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        # Response should have success field (true or false depending on network)
        assert "success" in data
        assert "message" in data
        assert "ip" in data


class TestMESMachineUpdate(TestAuth):
    """Tests for MES Machine update functionality"""

    def test_update_machine_settings(self, headers):
        """PUT /api/mes/machines/{id} - should update machine settings"""
        update_data = {
            "theoretical_cadence": 7.0,
            "downtime_margin_pct": 35,
            "alert_stopped_minutes": 6,
            "alert_under_cadence": 3.5,
        }
        response = requests.put(
            f"{BASE_URL}/api/mes/machines/{EXISTING_MACHINE_ID}",
            headers=headers,
            json=update_data
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["theoretical_cadence"] == 7.0
        assert data["downtime_margin_pct"] == 35
        
        # Revert changes
        revert_data = {
            "theoretical_cadence": 6.0,
            "downtime_margin_pct": 30,
            "alert_stopped_minutes": 5,
            "alert_under_cadence": 3.0,
        }
        requests.put(
            f"{BASE_URL}/api/mes/machines/{EXISTING_MACHINE_ID}",
            headers=headers,
            json=revert_data
        )


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
