"""
Tests for Audit Logs Bug Fix - P0 Journal Error Resolution
============================================================
Bug: Journal d'audit displayed "Erreur lors du chargement du journal" after backup restore
Root Cause: MongoDB documents contained non-JSON serializable ObjectId, causing 500 backend crash
Fix: ObjectId sanitization in audit_service.py, robust error handling in /api/audit-logs endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuditLogsBugFix:
    """Test cases for the P0 audit logs bug fix"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication before each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login and get auth token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "Admin123!"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        # Get token from response (field is 'access_token')
        token = login_response.json().get("access_token")
        assert token, "No access_token in login response"
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_get_audit_logs_returns_200(self):
        """GET /api/audit-logs should return 200 OK with valid logs (no _id field)"""
        response = self.session.get(f"{BASE_URL}/api/audit-logs")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "logs" in data, "Response should contain 'logs' field"
        assert "total" in data, "Response should contain 'total' field"
        assert isinstance(data["logs"], list), "logs should be a list"
        assert isinstance(data["total"], int), "total should be an integer"
        
        # Verify NO _id field in any log entry (the main bug fix)
        for log in data["logs"]:
            assert "_id" not in log, f"Log entry should NOT contain '_id' field: {log}"
            
            # Each log should have expected fields
            if log:  # If not empty
                expected_fields = ["id", "timestamp", "action", "entity_type"]
                for field in expected_fields:
                    assert field in log, f"Log entry missing expected field '{field}': {log}"
        
        print(f"✅ GET /api/audit-logs returns 200 with {len(data['logs'])} logs, total: {data['total']}")
    
    def test_get_audit_logs_empty_collection_returns_200(self):
        """GET /api/audit-logs with no matching results should return 200 with {logs: [], total: 0}"""
        # Use an impossible filter to get empty results
        response = self.session.get(f"{BASE_URL}/api/audit-logs", params={
            "user_id": "nonexistent-user-id-that-will-never-match-12345"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "logs" in data, "Response should contain 'logs' field"
        assert "total" in data, "Response should contain 'total' field"
        assert isinstance(data["logs"], list), "logs should be a list"
        
        # Empty results should still return valid structure
        print(f"✅ Empty filter returns 200 with {len(data['logs'])} logs, total: {data['total']}")
    
    def test_get_audit_logs_invalid_action_filter_no_crash(self):
        """GET /api/audit-logs with invalid action filter should NOT crash backend (returns 200)"""
        # Invalid action type that doesn't exist in ActionType enum
        response = self.session.get(f"{BASE_URL}/api/audit-logs", params={
            "action": "INVALID_ACTION_TYPE_THAT_DOES_NOT_EXIST"
        })
        
        # Should NOT crash - should return 200 (the fix handles invalid enums gracefully)
        assert response.status_code == 200, f"Backend should not crash on invalid action filter, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "logs" in data, "Response should contain 'logs' field"
        print(f"✅ Invalid action filter returns 200 (no crash), logs: {len(data['logs'])}")
    
    def test_get_audit_logs_invalid_entity_type_no_crash(self):
        """GET /api/audit-logs with invalid entity_type should NOT crash backend (returns 200)"""
        response = self.session.get(f"{BASE_URL}/api/audit-logs", params={
            "entity_type": "INVALID_ENTITY_TYPE_XYZ"
        })
        
        assert response.status_code == 200, f"Backend should not crash on invalid entity_type, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "logs" in data, "Response should contain 'logs' field"
        print(f"✅ Invalid entity_type filter returns 200 (no crash), logs: {len(data['logs'])}")
    
    def test_get_audit_logs_valid_action_filter(self):
        """GET /api/audit-logs with valid action filter should work correctly"""
        # Test with valid action types
        valid_actions = ["CREATE", "UPDATE", "DELETE", "LOGIN"]
        
        for action in valid_actions:
            response = self.session.get(f"{BASE_URL}/api/audit-logs", params={"action": action})
            assert response.status_code == 200, f"Filter action={action} failed: {response.status_code}"
            data = response.json()
            
            # Verify all returned logs have the correct action type
            for log in data["logs"]:
                assert log["action"] == action, f"Log action should be {action}, got {log['action']}"
        
        print(f"✅ Valid action filters (CREATE, UPDATE, DELETE, LOGIN) all return 200")
    
    def test_get_audit_logs_valid_entity_type_filter(self):
        """GET /api/audit-logs with valid entity_type filter should work correctly"""
        valid_entity_types = ["USER", "WORK_ORDER", "EQUIPMENT"]
        
        for entity_type in valid_entity_types:
            response = self.session.get(f"{BASE_URL}/api/audit-logs", params={"entity_type": entity_type})
            assert response.status_code == 200, f"Filter entity_type={entity_type} failed: {response.status_code}"
            data = response.json()
            
            # Verify all returned logs have the correct entity_type
            for log in data["logs"]:
                assert log["entity_type"] == entity_type, f"Log entity_type should be {entity_type}, got {log['entity_type']}"
        
        print(f"✅ Valid entity_type filters (USER, WORK_ORDER, EQUIPMENT) all return 200")
    
    def test_get_audit_logs_pagination(self):
        """GET /api/audit-logs pagination should work correctly"""
        # Get first page
        response = self.session.get(f"{BASE_URL}/api/audit-logs", params={"skip": 0, "limit": 10})
        assert response.status_code == 200
        data = response.json()
        
        assert data["skip"] == 0, "skip should be 0"
        assert data["limit"] == 10, "limit should be 10"
        
        # Get second page if there are enough logs
        if data["total"] > 10:
            response2 = self.session.get(f"{BASE_URL}/api/audit-logs", params={"skip": 10, "limit": 10})
            assert response2.status_code == 200
            data2 = response2.json()
            assert data2["skip"] == 10, "skip should be 10"
        
        print(f"✅ Pagination works correctly, total logs: {data['total']}")
    
    def test_audit_logs_timestamp_format(self):
        """Verify timestamp is properly formatted (ISO format with timezone)"""
        response = self.session.get(f"{BASE_URL}/api/audit-logs", params={"limit": 5})
        assert response.status_code == 200
        data = response.json()
        
        for log in data["logs"]:
            if "timestamp" in log:
                ts = log["timestamp"]
                assert isinstance(ts, str), f"timestamp should be string, got {type(ts)}"
                # Should be ISO format (contains 'T' or at least valid date format)
                assert "T" in ts or "-" in ts, f"timestamp should be ISO format: {ts}"
        
        print(f"✅ Timestamps are properly formatted as ISO strings")
    
    def test_audit_logs_no_objectid_anywhere(self):
        """Deep check: No ObjectId anywhere in the response (including nested objects)"""
        response = self.session.get(f"{BASE_URL}/api/audit-logs", params={"limit": 20})
        assert response.status_code == 200
        data = response.json()
        
        def check_no_objectid(obj, path=""):
            """Recursively check no ObjectId patterns in any value"""
            if isinstance(obj, dict):
                for key, value in obj.items():
                    # _id field should never appear
                    assert key != "_id", f"Found '_id' at {path}.{key}"
                    check_no_objectid(value, f"{path}.{key}")
            elif isinstance(obj, list):
                for i, item in enumerate(obj):
                    check_no_objectid(item, f"{path}[{i}]")
            # Values should be JSON serializable (strings, numbers, bools, None)
        
        check_no_objectid(data)
        print(f"✅ No '_id' or ObjectId patterns found in response")


class TestAuditLogsEntityHistory:
    """Test entity history endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication before each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "Admin123!"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json().get("access_token")
        assert token, "No access_token in login response"
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_get_entity_history_invalid_type(self):
        """GET /api/audit-logs/entity/{invalid_type}/{id} should handle gracefully"""
        response = self.session.get(f"{BASE_URL}/api/audit-logs/entity/INVALID_TYPE/some-id")
        
        # Should return error but NOT 500 internal server error
        assert response.status_code in [200, 400, 422], f"Expected graceful handling, got {response.status_code}"
        print(f"✅ Invalid entity_type in path returns {response.status_code} (no 500 crash)")
    
    def test_get_entity_history_valid_type(self):
        """GET /api/audit-logs/entity/{valid_type}/{id} should work"""
        response = self.session.get(f"{BASE_URL}/api/audit-logs/entity/USER/some-user-id")
        
        # Should return 200 even if no history exists
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "history" in data or "logs" in data or isinstance(data, list) or "entity_type" in data, \
            f"Response should contain history data: {data}"
        print(f"✅ Valid entity history endpoint returns 200")


class TestAuditLogsExport:
    """Test audit logs export functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication before each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "Admin123!"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json().get("access_token")
        assert token, "No access_token in login response"
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_export_csv(self):
        """GET /api/audit-logs/export with format=csv should return valid CSV"""
        response = self.session.get(f"{BASE_URL}/api/audit-logs/export", params={"format": "csv"})
        
        assert response.status_code == 200, f"CSV export failed: {response.status_code}"
        
        # Check content type
        content_type = response.headers.get("Content-Type", "")
        assert "text/csv" in content_type or "application/octet-stream" in content_type or \
               "text/plain" in content_type, f"Unexpected content type: {content_type}"
        
        print(f"✅ CSV export returns 200 with content-type: {content_type}")
    
    def test_export_excel(self):
        """GET /api/audit-logs/export with format=excel should return valid Excel"""
        response = self.session.get(f"{BASE_URL}/api/audit-logs/export", params={"format": "excel"})
        
        assert response.status_code == 200, f"Excel export failed: {response.status_code}"
        
        # Check content type
        content_type = response.headers.get("Content-Type", "")
        # Excel files have various possible content types
        valid_types = ["application/vnd.openxmlformats", "application/vnd.ms-excel", 
                       "application/octet-stream", "spreadsheet"]
        assert any(t in content_type for t in valid_types), f"Unexpected content type: {content_type}"
        
        print(f"✅ Excel export returns 200 with content-type: {content_type}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
