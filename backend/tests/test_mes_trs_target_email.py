"""
MES TRS Target & Email Notifications API Tests
Tests for: trs_target field, email_notifications config, production schedule awareness, TRS_BELOW_TARGET alert type
"""
import pytest
import requests
import os
from datetime import datetime

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


# ==================== TRS TARGET CONFIG ====================
class TestTRSTargetConfig(TestAuth):
    """Tests for TRS target configuration"""

    def test_update_machine_trs_target(self, headers):
        """PUT /api/mes/machines/{id} - should update trs_target field"""
        # First get current value to restore later
        get_response = requests.get(f"{BASE_URL}/api/mes/machines/{EXISTING_MACHINE_ID}", headers=headers)
        assert get_response.status_code == 200
        original_trs_target = get_response.json().get("trs_target", 85)
        
        # Update trs_target
        update_data = {"trs_target": 90}
        response = requests.put(
            f"{BASE_URL}/api/mes/machines/{EXISTING_MACHINE_ID}",
            headers=headers,
            json=update_data
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify update
        assert data.get("trs_target") == 90, f"Expected trs_target=90, got {data.get('trs_target')}"
        print(f"Updated TRS target to: {data['trs_target']}%")
        
        # Restore original value
        requests.put(f"{BASE_URL}/api/mes/machines/{EXISTING_MACHINE_ID}", headers=headers, json={"trs_target": original_trs_target})

    def test_metrics_includes_trs_target(self, headers):
        """GET /api/mes/machines/{id}/metrics - should include trs_target field"""
        response = requests.get(f"{BASE_URL}/api/mes/machines/{EXISTING_MACHINE_ID}/metrics", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "trs_target" in data, "Missing trs_target in metrics"
        assert isinstance(data["trs_target"], (int, float)), "trs_target should be numeric"
        print(f"Metrics include trs_target: {data['trs_target']}%")
        print(f"Current TRS: {data.get('trs')}% vs Target: {data['trs_target']}%")

    def test_get_machine_includes_trs_target(self, headers):
        """GET /api/mes/machines/{id} - should include trs_target field"""
        response = requests.get(f"{BASE_URL}/api/mes/machines/{EXISTING_MACHINE_ID}", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "trs_target" in data, "Missing trs_target in machine response"
        assert isinstance(data["trs_target"], (int, float)), "trs_target should be numeric"
        print(f"Machine trs_target: {data['trs_target']}%")


# ==================== EMAIL NOTIFICATIONS CONFIG ====================
class TestEmailNotificationsConfig(TestAuth):
    """Tests for email notifications configuration"""

    def test_update_machine_email_enabled(self, headers):
        """PUT /api/mes/machines/{id} - should update email_enabled field"""
        # Enable email notifications
        update_data = {"email_enabled": True}
        response = requests.put(
            f"{BASE_URL}/api/mes/machines/{EXISTING_MACHINE_ID}",
            headers=headers,
            json=update_data
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        email_notif = data.get("email_notifications", {})
        assert email_notif.get("enabled") == True, f"Expected enabled=True, got {email_notif.get('enabled')}"
        print(f"Email notifications enabled: {email_notif.get('enabled')}")

    def test_update_machine_email_recipients(self, headers):
        """PUT /api/mes/machines/{id} - should update email_recipients list"""
        update_data = {"email_recipients": ["test@example.com", "admin@factory.com"]}
        response = requests.put(
            f"{BASE_URL}/api/mes/machines/{EXISTING_MACHINE_ID}",
            headers=headers,
            json=update_data
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        email_notif = data.get("email_notifications", {})
        recipients = email_notif.get("recipients", [])
        assert isinstance(recipients, list), "recipients should be a list"
        assert "test@example.com" in recipients, "test@example.com should be in recipients"
        assert "admin@factory.com" in recipients, "admin@factory.com should be in recipients"
        print(f"Email recipients: {recipients}")

    def test_update_machine_email_alert_types(self, headers):
        """PUT /api/mes/machines/{id} - should update email_alert_types list"""
        update_data = {"email_alert_types": ["STOPPED", "TRS_BELOW_TARGET", "NO_SIGNAL"]}
        response = requests.put(
            f"{BASE_URL}/api/mes/machines/{EXISTING_MACHINE_ID}",
            headers=headers,
            json=update_data
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        email_notif = data.get("email_notifications", {})
        alert_types = email_notif.get("alert_types", [])
        assert isinstance(alert_types, list), "alert_types should be a list"
        assert "STOPPED" in alert_types, "STOPPED should be in alert_types"
        assert "TRS_BELOW_TARGET" in alert_types, "TRS_BELOW_TARGET should be in alert_types"
        assert "NO_SIGNAL" in alert_types, "NO_SIGNAL should be in alert_types"
        print(f"Email alert types: {alert_types}")

    def test_update_machine_email_delay_minutes(self, headers):
        """PUT /api/mes/machines/{id} - should update email_delay_minutes field"""
        # First get original value
        get_response = requests.get(f"{BASE_URL}/api/mes/machines/{EXISTING_MACHINE_ID}", headers=headers)
        original_delay = get_response.json().get("email_notifications", {}).get("delay_minutes", 5)
        
        # Update delay
        update_data = {"email_delay_minutes": 15}
        response = requests.put(
            f"{BASE_URL}/api/mes/machines/{EXISTING_MACHINE_ID}",
            headers=headers,
            json=update_data
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        email_notif = data.get("email_notifications", {})
        delay = email_notif.get("delay_minutes")
        assert delay == 15, f"Expected delay_minutes=15, got {delay}"
        print(f"Email delay minutes: {delay}")
        
        # Restore original value
        requests.put(f"{BASE_URL}/api/mes/machines/{EXISTING_MACHINE_ID}", headers=headers, json={"email_delay_minutes": original_delay})

    def test_get_machine_includes_email_notifications(self, headers):
        """GET /api/mes/machines/{id} - should include email_notifications object"""
        response = requests.get(f"{BASE_URL}/api/mes/machines/{EXISTING_MACHINE_ID}", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "email_notifications" in data, "Missing email_notifications in machine response"
        email_notif = data["email_notifications"]
        
        # Verify all expected fields
        assert "enabled" in email_notif, "Missing enabled in email_notifications"
        assert "recipients" in email_notif, "Missing recipients in email_notifications"
        assert "alert_types" in email_notif, "Missing alert_types in email_notifications"
        assert "delay_minutes" in email_notif, "Missing delay_minutes in email_notifications"
        
        print(f"Email notifications config:")
        print(f"  - Enabled: {email_notif.get('enabled')}")
        print(f"  - Recipients: {email_notif.get('recipients')}")
        print(f"  - Alert types: {email_notif.get('alert_types')}")
        print(f"  - Delay minutes: {email_notif.get('delay_minutes')}")

    def test_update_all_email_fields_together(self, headers):
        """PUT /api/mes/machines/{id} - should update all email fields in single request"""
        update_data = {
            "email_enabled": True,
            "email_recipients": ["factory@test.com"],
            "email_alert_types": ["STOPPED", "UNDER_CADENCE", "OVER_CADENCE", "NO_SIGNAL", "TARGET_REACHED", "TRS_BELOW_TARGET"],
            "email_delay_minutes": 10
        }
        response = requests.put(
            f"{BASE_URL}/api/mes/machines/{EXISTING_MACHINE_ID}",
            headers=headers,
            json=update_data
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        email_notif = data.get("email_notifications", {})
        assert email_notif.get("enabled") == True
        assert "factory@test.com" in email_notif.get("recipients", [])
        assert len(email_notif.get("alert_types", [])) == 6, "Should have 6 alert types"
        assert email_notif.get("delay_minutes") == 10
        
        print(f"All email fields updated successfully:")
        print(f"  - Full config: {email_notif}")


# ==================== PRODUCTION SCHEDULE AWARENESS ====================
class TestProductionScheduleAwareness(TestAuth):
    """Tests for production schedule awareness in alerts (no alerts outside production hours)"""

    def test_production_schedule_includes_days(self, headers):
        """GET /api/mes/machines/{id} - production_schedule includes production_days"""
        response = requests.get(f"{BASE_URL}/api/mes/machines/{EXISTING_MACHINE_ID}", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        schedule = data.get("production_schedule", {})
        assert "production_days" in schedule, "Missing production_days in production_schedule"
        assert isinstance(schedule["production_days"], list), "production_days should be a list"
        print(f"Production days: {schedule['production_days']} (0=Mon, 6=Sun)")

    def test_production_schedule_includes_hours(self, headers):
        """GET /api/mes/machines/{id} - production_schedule includes start/end hours"""
        response = requests.get(f"{BASE_URL}/api/mes/machines/{EXISTING_MACHINE_ID}", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        schedule = data.get("production_schedule", {})
        assert "is_24h" in schedule, "Missing is_24h in production_schedule"
        assert "start_hour" in schedule, "Missing start_hour in production_schedule"
        assert "end_hour" in schedule, "Missing end_hour in production_schedule"
        print(f"Production schedule: 24h={schedule['is_24h']}, hours={schedule['start_hour']}-{schedule['end_hour']}")


# ==================== TRS_BELOW_TARGET ALERT TYPE ====================
class TestTRSBelowTargetAlert(TestAuth):
    """Tests for TRS_BELOW_TARGET alert type"""

    def test_alert_type_recognized_in_email_config(self, headers):
        """PUT /api/mes/machines/{id} - TRS_BELOW_TARGET should be valid alert type"""
        update_data = {"email_alert_types": ["TRS_BELOW_TARGET"]}
        response = requests.put(
            f"{BASE_URL}/api/mes/machines/{EXISTING_MACHINE_ID}",
            headers=headers,
            json=update_data
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        alert_types = data.get("email_notifications", {}).get("alert_types", [])
        assert "TRS_BELOW_TARGET" in alert_types, "TRS_BELOW_TARGET should be recognized"
        print(f"TRS_BELOW_TARGET alert type is recognized: {alert_types}")

    def test_get_alerts_list(self, headers):
        """GET /api/mes/alerts - should return alerts list with proper structure"""
        response = requests.get(f"{BASE_URL}/api/mes/alerts?limit=50", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Alerts should be a list"
        print(f"Found {len(data)} alerts")
        
        # Check structure if alerts exist
        if len(data) > 0:
            alert = data[0]
            assert "id" in alert, "Alert should have id"
            assert "type" in alert, "Alert should have type"
            assert "message" in alert, "Alert should have message"
            assert "equipment_name" in alert, "Alert should have equipment_name"
            assert "read" in alert, "Alert should have read status"
            assert "created_at" in alert, "Alert should have created_at"
            print(f"Sample alert: type={alert['type']}, read={alert['read']}, message={alert['message'][:50]}...")
            
            # Check if email_sent field exists (new feature)
            if "email_sent" in alert:
                print(f"Alert has email_sent field: {alert['email_sent']}")


# ==================== EMAIL DELAY DEDUP ====================
class TestEmailDelayDedup(TestAuth):
    """Tests for email delay deduplication (uses configured delay instead of hardcoded 5min)"""

    def test_email_delay_saved_correctly(self, headers):
        """PUT then GET - email_delay_minutes should persist correctly"""
        # Set a specific delay value
        update_data = {"email_delay_minutes": 20}
        put_response = requests.put(
            f"{BASE_URL}/api/mes/machines/{EXISTING_MACHINE_ID}",
            headers=headers,
            json=update_data
        )
        assert put_response.status_code == 200
        
        # Get machine and verify
        get_response = requests.get(f"{BASE_URL}/api/mes/machines/{EXISTING_MACHINE_ID}", headers=headers)
        assert get_response.status_code == 200
        data = get_response.json()
        
        delay = data.get("email_notifications", {}).get("delay_minutes")
        assert delay == 20, f"Expected delay_minutes=20, got {delay}"
        print(f"Email delay saved and retrieved correctly: {delay} minutes")
        
        # Reset to default
        requests.put(f"{BASE_URL}/api/mes/machines/{EXISTING_MACHINE_ID}", headers=headers, json={"email_delay_minutes": 5})


# ==================== COMBINED UPDATE TEST ====================
class TestCombinedUpdate(TestAuth):
    """Tests for updating trs_target and email config together"""

    def test_update_trs_target_and_email_together(self, headers):
        """PUT /api/mes/machines/{id} - update trs_target + email config in one request"""
        update_data = {
            "trs_target": 75,
            "email_enabled": True,
            "email_recipients": ["combined@test.com"],
            "email_alert_types": ["TRS_BELOW_TARGET"],
            "email_delay_minutes": 8
        }
        response = requests.put(
            f"{BASE_URL}/api/mes/machines/{EXISTING_MACHINE_ID}",
            headers=headers,
            json=update_data
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify TRS target
        assert data.get("trs_target") == 75, f"Expected trs_target=75, got {data.get('trs_target')}"
        
        # Verify email config
        email_notif = data.get("email_notifications", {})
        assert email_notif.get("enabled") == True
        assert "combined@test.com" in email_notif.get("recipients", [])
        assert "TRS_BELOW_TARGET" in email_notif.get("alert_types", [])
        assert email_notif.get("delay_minutes") == 8
        
        print(f"Combined update successful:")
        print(f"  - TRS Target: {data['trs_target']}%")
        print(f"  - Email config: {email_notif}")
        
        # Restore defaults
        restore_data = {
            "trs_target": 85,
            "email_enabled": False,
            "email_recipients": [],
            "email_alert_types": [],
            "email_delay_minutes": 5
        }
        requests.put(f"{BASE_URL}/api/mes/machines/{EXISTING_MACHINE_ID}", headers=headers, json=restore_data)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
