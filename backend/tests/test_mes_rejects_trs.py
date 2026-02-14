"""
MES Rejects & TRS API Tests
Tests for: reject reasons CRUD, rejects CRUD, TRS breakdown metrics, production schedule
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


# ==================== REJECT REASONS CRUD ====================
class TestRejectReasonsCRUD(TestAuth):
    """Tests for Reject Reasons CRUD endpoints"""

    def test_get_reject_reasons(self, headers):
        """GET /api/mes/reject-reasons - should return list of predefined reject reasons"""
        response = requests.get(f"{BASE_URL}/api/mes/reject-reasons", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} reject reasons")
        # Validate structure if reasons exist
        if len(data) > 0:
            reason = data[0]
            assert "id" in reason
            assert "label" in reason
            assert "active" in reason
            print(f"Sample reason: {reason['label']}")

    def test_create_reject_reason(self, headers):
        """POST /api/mes/reject-reasons - should create new reject reason"""
        create_data = {"label": "TEST_Defaut matiere test"}
        response = requests.post(f"{BASE_URL}/api/mes/reject-reasons", headers=headers, json=create_data)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["label"] == "TEST_Defaut matiere test"
        assert data["active"] == True
        print(f"Created reject reason with ID: {data['id']}")
        
        # Store ID for cleanup
        self.created_reason_id = data["id"]
        return data["id"]

    def test_create_reject_reason_empty_label(self, headers):
        """POST /api/mes/reject-reasons - should fail with empty label"""
        response = requests.post(f"{BASE_URL}/api/mes/reject-reasons", headers=headers, json={"label": ""})
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"Correctly rejected empty label: {response.json()}")

    def test_update_reject_reason(self, headers):
        """PUT /api/mes/reject-reasons/{id} - should update reject reason"""
        # First create a reason
        create_response = requests.post(
            f"{BASE_URL}/api/mes/reject-reasons",
            headers=headers,
            json={"label": "TEST_Original label"}
        )
        assert create_response.status_code == 200
        reason_id = create_response.json()["id"]
        
        # Update it
        update_data = {"label": "TEST_Updated label"}
        response = requests.put(f"{BASE_URL}/api/mes/reject-reasons/{reason_id}", headers=headers, json=update_data)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["label"] == "TEST_Updated label"
        print(f"Updated reason: {data}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/mes/reject-reasons/{reason_id}", headers=headers)

    def test_delete_reject_reason(self, headers):
        """DELETE /api/mes/reject-reasons/{id} - should delete reject reason"""
        # First create a reason
        create_response = requests.post(
            f"{BASE_URL}/api/mes/reject-reasons",
            headers=headers,
            json={"label": "TEST_To be deleted"}
        )
        assert create_response.status_code == 200
        reason_id = create_response.json()["id"]
        
        # Delete it
        response = requests.delete(f"{BASE_URL}/api/mes/reject-reasons/{reason_id}", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["success"] == True
        print(f"Deleted reason {reason_id}")
        
        # Verify deletion - should not appear in list
        list_response = requests.get(f"{BASE_URL}/api/mes/reject-reasons", headers=headers)
        reasons = list_response.json()
        assert not any(r["id"] == reason_id for r in reasons), "Reason still exists after deletion"


# ==================== REJECTS CRUD ====================
class TestRejectsCRUD(TestAuth):
    """Tests for Rejects (declare/list/delete) endpoints"""

    def test_declare_reject_with_predefined_reason(self, headers):
        """POST /api/mes/machines/{machine_id}/rejects - declare reject with predefined reason"""
        reject_data = {
            "quantity": 2,
            "reason": "Defaut matiere",
            "custom_reason": ""
        }
        response = requests.post(
            f"{BASE_URL}/api/mes/machines/{EXISTING_MACHINE_ID}/rejects",
            headers=headers,
            json=reject_data
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["quantity"] == 2
        assert data["reason"] == "Defaut matiere"
        assert "operator" in data
        assert "timestamp" in data
        print(f"Created reject with ID: {data['id']}, operator: {data['operator']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/mes/rejects/{data['id']}", headers=headers)

    def test_declare_reject_with_custom_reason(self, headers):
        """POST /api/mes/machines/{machine_id}/rejects - declare reject with custom reason"""
        reject_data = {
            "quantity": 1,
            "reason": "",
            "custom_reason": "TEST_Custom issue found"
        }
        response = requests.post(
            f"{BASE_URL}/api/mes/machines/{EXISTING_MACHINE_ID}/rejects",
            headers=headers,
            json=reject_data
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["quantity"] == 1
        assert data["custom_reason"] == "TEST_Custom issue found"
        print(f"Created reject with custom reason: {data['custom_reason']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/mes/rejects/{data['id']}", headers=headers)

    def test_declare_reject_with_both_reasons(self, headers):
        """POST /api/mes/machines/{machine_id}/rejects - declare reject with both predefined and custom reason"""
        reject_data = {
            "quantity": 3,
            "reason": "Hors tolerance",
            "custom_reason": "TEST_Additional detail"
        }
        response = requests.post(
            f"{BASE_URL}/api/mes/machines/{EXISTING_MACHINE_ID}/rejects",
            headers=headers,
            json=reject_data
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["quantity"] == 3
        assert data["reason"] == "Hors tolerance"
        assert data["custom_reason"] == "TEST_Additional detail"
        print(f"Created reject with both reasons: {data['reason']} - {data['custom_reason']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/mes/rejects/{data['id']}", headers=headers)

    def test_declare_reject_invalid_quantity(self, headers):
        """POST /api/mes/machines/{machine_id}/rejects - should fail with quantity <= 0"""
        reject_data = {"quantity": 0, "reason": "Test"}
        response = requests.post(
            f"{BASE_URL}/api/mes/machines/{EXISTING_MACHINE_ID}/rejects",
            headers=headers,
            json=reject_data
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"Correctly rejected invalid quantity: {response.json()}")

    def test_get_rejects_today(self, headers):
        """GET /api/mes/machines/{machine_id}/rejects - list today's rejects"""
        response = requests.get(
            f"{BASE_URL}/api/mes/machines/{EXISTING_MACHINE_ID}/rejects",
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} rejects for today")
        # Validate structure
        if len(data) > 0:
            reject = data[0]
            assert "id" in reject
            assert "quantity" in reject
            assert "reason" in reject or "custom_reason" in reject
            assert "timestamp" in reject
            assert "operator" in reject
            print(f"Sample reject: qty={reject['quantity']}, reason={reject.get('reason')}, operator={reject.get('operator')}")

    def test_delete_reject(self, headers):
        """DELETE /api/mes/rejects/{reject_id} - delete a reject"""
        # First create a reject
        create_response = requests.post(
            f"{BASE_URL}/api/mes/machines/{EXISTING_MACHINE_ID}/rejects",
            headers=headers,
            json={"quantity": 1, "reason": "TEST_To delete"}
        )
        assert create_response.status_code == 200
        reject_id = create_response.json()["id"]
        
        # Delete it
        response = requests.delete(f"{BASE_URL}/api/mes/rejects/{reject_id}", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["success"] == True
        print(f"Deleted reject {reject_id}")


# ==================== TRS BREAKDOWN ====================
class TestTRSBreakdown(TestAuth):
    """Tests for TRS breakdown metrics (Availability, Performance, Quality)"""

    def test_metrics_includes_trs_breakdown(self, headers):
        """GET /api/mes/machines/{id}/metrics - should include TRS breakdown fields"""
        response = requests.get(f"{BASE_URL}/api/mes/machines/{EXISTING_MACHINE_ID}/metrics", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Check all TRS breakdown fields exist
        trs_fields = ["trs", "trs_availability", "trs_performance", "trs_quality"]
        for field in trs_fields:
            assert field in data, f"Missing TRS field: {field}"
            assert isinstance(data[field], (int, float)), f"{field} should be numeric"
        
        print(f"TRS Breakdown:")
        print(f"  - TRS Global: {data['trs']}%")
        print(f"  - Availability: {data['trs_availability']}%")
        print(f"  - Performance: {data['trs_performance']}%")
        print(f"  - Quality: {data['trs_quality']}%")

    def test_metrics_includes_reject_counts(self, headers):
        """GET /api/mes/machines/{id}/metrics - should include reject/good parts counts"""
        response = requests.get(f"{BASE_URL}/api/mes/machines/{EXISTING_MACHINE_ID}/metrics", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Check reject/good parts fields
        assert "rejects_today" in data, "Missing rejects_today"
        assert "good_parts_today" in data, "Missing good_parts_today"
        assert isinstance(data["rejects_today"], int)
        assert isinstance(data["good_parts_today"], int)
        
        print(f"Production counts:")
        print(f"  - Rejects today: {data['rejects_today']}")
        print(f"  - Good parts today: {data['good_parts_today']}")
        print(f"  - Production today: {data['production_today']}")

    def test_metrics_includes_planned_operating_seconds(self, headers):
        """GET /api/mes/machines/{id}/metrics - should include planned/operating seconds"""
        response = requests.get(f"{BASE_URL}/api/mes/machines/{EXISTING_MACHINE_ID}/metrics", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Check planned/operating seconds
        assert "planned_seconds" in data, "Missing planned_seconds"
        assert "operating_seconds" in data, "Missing operating_seconds"
        assert isinstance(data["planned_seconds"], int)
        assert isinstance(data["operating_seconds"], int)
        
        print(f"Time metrics:")
        print(f"  - Planned seconds: {data['planned_seconds']}")
        print(f"  - Operating seconds: {data['operating_seconds']}")


# ==================== PRODUCTION SCHEDULE ====================
class TestProductionSchedule(TestAuth):
    """Tests for production schedule configuration"""

    def test_update_machine_production_schedule(self, headers):
        """PUT /api/mes/machines/{id} - should update production schedule fields"""
        # Get current machine state first
        get_response = requests.get(f"{BASE_URL}/api/mes/machines/{EXISTING_MACHINE_ID}", headers=headers)
        original = get_response.json()
        original_schedule = original.get("production_schedule", {})
        
        # Update with Saturday (5) and Sunday (6) included for weekend testing
        update_data = {
            "schedule_is_24h": False,
            "schedule_start_hour": 8,
            "schedule_end_hour": 20,
            "schedule_production_days": [0, 1, 2, 3, 4, 5]  # Mon-Sat
        }
        response = requests.put(
            f"{BASE_URL}/api/mes/machines/{EXISTING_MACHINE_ID}",
            headers=headers,
            json=update_data
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify update
        schedule = data.get("production_schedule", {})
        assert schedule.get("is_24h") == False, "is_24h should be False"
        assert schedule.get("start_hour") == 8, "start_hour should be 8"
        assert schedule.get("end_hour") == 20, "end_hour should be 20"
        assert 5 in schedule.get("production_days", []), "Saturday (5) should be in production_days"
        
        print(f"Updated production schedule:")
        print(f"  - 24h mode: {schedule.get('is_24h')}")
        print(f"  - Hours: {schedule.get('start_hour')}h - {schedule.get('end_hour')}h")
        print(f"  - Days: {schedule.get('production_days')}")
        
        # Revert to original
        revert_data = {
            "schedule_is_24h": original_schedule.get("is_24h", True),
            "schedule_start_hour": original_schedule.get("start_hour", 6),
            "schedule_end_hour": original_schedule.get("end_hour", 22),
            "schedule_production_days": original_schedule.get("production_days", [0, 1, 2, 3, 4])
        }
        requests.put(f"{BASE_URL}/api/mes/machines/{EXISTING_MACHINE_ID}", headers=headers, json=revert_data)

    def test_update_24h_mode(self, headers):
        """PUT /api/mes/machines/{id} - should toggle 24h production mode"""
        # Enable 24h mode
        update_data = {"schedule_is_24h": True}
        response = requests.put(
            f"{BASE_URL}/api/mes/machines/{EXISTING_MACHINE_ID}",
            headers=headers,
            json=update_data
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["production_schedule"]["is_24h"] == True
        print(f"24h mode enabled: {data['production_schedule']}")

    def test_get_machine_includes_production_schedule(self, headers):
        """GET /api/mes/machines/{id} - should include production_schedule"""
        response = requests.get(f"{BASE_URL}/api/mes/machines/{EXISTING_MACHINE_ID}", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "production_schedule" in data, "Missing production_schedule"
        schedule = data["production_schedule"]
        assert "is_24h" in schedule
        assert "start_hour" in schedule
        assert "end_hour" in schedule
        assert "production_days" in schedule
        assert isinstance(schedule["production_days"], list)
        
        print(f"Machine production schedule: {schedule}")


# ==================== CLEANUP TEST DATA ====================
class TestCleanup(TestAuth):
    """Cleanup TEST_ prefixed data"""

    def test_cleanup_test_reject_reasons(self, headers):
        """Cleanup - remove TEST_ prefixed reject reasons"""
        response = requests.get(f"{BASE_URL}/api/mes/reject-reasons", headers=headers)
        reasons = response.json()
        deleted = 0
        for reason in reasons:
            if reason.get("label", "").startswith("TEST_"):
                del_response = requests.delete(
                    f"{BASE_URL}/api/mes/reject-reasons/{reason['id']}",
                    headers=headers
                )
                if del_response.status_code == 200:
                    deleted += 1
        print(f"Cleaned up {deleted} test reject reasons")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
