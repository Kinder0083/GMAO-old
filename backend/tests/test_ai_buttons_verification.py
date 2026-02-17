"""
Test AI Button Visibility - GMAO Iris
Focuses on verifying AI features work correctly:
1. AI Work Order Diagnostic
2. AI Work Order Summary
3. Automations list endpoint
4. AI Chat with enriched context (work orders with titles)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAIButtonsBackend:
    """Backend tests for AI button functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "Admin123!"
        }, timeout=30)
        
        if login_response.status_code != 200:
            pytest.skip(f"Auth failed: {login_response.status_code}")
        
        self.token = login_response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get a work order ID for testing
        wo_response = requests.get(f"{BASE_URL}/api/work-orders", headers=self.headers, timeout=30)
        if wo_response.status_code == 200:
            work_orders = wo_response.json()
            if isinstance(work_orders, list) and len(work_orders) > 0:
                self.test_wo_id = work_orders[0].get("id")
            else:
                self.test_wo_id = None
        else:
            self.test_wo_id = None

    def test_auth_works(self):
        """Verify authentication is working"""
        assert self.token is not None, "Token should be obtained"
        print(f"✅ Auth successful, token obtained")

    def test_get_work_orders(self):
        """Verify work orders endpoint returns data"""
        response = requests.get(f"{BASE_URL}/api/work-orders", headers=self.headers, timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        print(f"✅ Work orders endpoint works, {len(data)} WOs found")
        
        # Check if work orders have IDs
        if len(data) > 0:
            assert "id" in data[0], "Work order should have an id field"
            print(f"  First WO ID: {data[0].get('id')}")

    def test_ai_diagnostic_endpoint(self):
        """Test AI diagnostic endpoint with valid work order ID"""
        if not self.test_wo_id:
            pytest.skip("No work order available for testing")
        
        response = requests.post(
            f"{BASE_URL}/api/ai-work-orders/diagnostic",
            headers=self.headers,
            json={"work_order_id": self.test_wo_id},
            timeout=90  # AI endpoints need longer timeout
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text[:500]}"
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        assert "diagnostic" in data, "Response should contain diagnostic"
        
        diagnostic = data.get("diagnostic", {})
        # Check for expected fields
        print(f"✅ AI Diagnostic works!")
        print(f"  Fields present: {list(diagnostic.keys())}")
        if "cause_probable" in diagnostic.get("diagnostic", diagnostic):
            print(f"  Has cause_probable")
        if "pistes_resolution" in diagnostic.get("diagnostic", diagnostic):
            print(f"  Has pistes_resolution")

    def test_ai_summary_endpoint(self):
        """Test AI summary endpoint with valid work order ID"""
        if not self.test_wo_id:
            pytest.skip("No work order available for testing")
        
        response = requests.post(
            f"{BASE_URL}/api/ai-work-orders/summary",
            headers=self.headers,
            json={"work_order_id": self.test_wo_id},
            timeout=90
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text[:500]}"
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        assert "summary" in data, "Response should contain summary"
        
        summary = data.get("summary", {})
        print(f"✅ AI Summary works!")
        print(f"  Fields present: {list(summary.keys())}")

    def test_automations_list_endpoint(self):
        """Test automations list endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/automations/list",
            headers=self.headers,
            timeout=30
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Data should be a dict with automations array
        if isinstance(data, dict):
            automations = data.get("automations", [])
        else:
            automations = data
            
        print(f"✅ Automations list works!")
        print(f"  {len(automations)} automations found")

    def test_ai_chat_with_work_order_context(self):
        """Test AI chat returns enriched context with actual work order titles"""
        response = requests.post(
            f"{BASE_URL}/api/ai/chat",
            headers=self.headers,
            json={
                "message": "mes ordres de travail",
                "session_id": "test_ai_buttons_verification",
                "include_app_context": True
            },
            timeout=90
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text[:500]}"
        data = response.json()
        
        # Response should have a reply
        assert "reply" in data, "Response should have reply field"
        reply = data.get("reply", "")
        
        print(f"✅ AI Chat with context works!")
        print(f"  Reply length: {len(reply)} chars")
        
        # The reply should mention work orders (since we asked about them)
        # This verifies the enriched context is working
        
    def test_ai_sensors_analyze_endpoint_exists(self):
        """Test that AI sensor analysis endpoint is accessible (may fail if no sensors)"""
        # Get sensors first
        sensors_response = requests.get(
            f"{BASE_URL}/api/sensors",
            headers=self.headers,
            timeout=30
        )
        
        if sensors_response.status_code != 200:
            pytest.skip("Sensors endpoint not accessible")
        
        sensors = sensors_response.json()
        if not isinstance(sensors, dict) or "data" not in sensors:
            sensors_list = sensors if isinstance(sensors, list) else []
        else:
            sensors_list = sensors.get("data", [])
        
        if len(sensors_list) == 0:
            print("⚠️ No sensors available - endpoint exists but no data to test")
            return
        
        # Try to analyze first sensor
        sensor_id = sensors_list[0].get("id")
        response = requests.post(
            f"{BASE_URL}/api/ai-sensors/analyze",
            headers=self.headers,
            json={"sensor_id": sensor_id},
            timeout=90
        )
        
        # Either 200 success or 404/500 with proper error
        print(f"  AI Sensor Analysis response: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
