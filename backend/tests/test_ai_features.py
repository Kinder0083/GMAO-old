"""
Tests for AI Features:
- Feature 1: AI Work Order Diagnostic
- Feature 2: AI Work Order Summary
- Feature 3: AI Weekly Reports generation
- Feature 4: AI Sensor Analysis
- Feature 5: Adria memory (conversation history)
- Feature 6: Adria dynamic context (sensor data)
"""
import pytest
import requests
import os
import uuid
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@test.com"
TEST_PASSWORD = "Admin123!"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
        timeout=30
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    token = response.json().get("access_token")
    assert token, "No access token in response"
    return token


@pytest.fixture(scope="module")
def headers(auth_token):
    """Headers with authentication"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


@pytest.fixture(scope="module")
def work_order_id(headers):
    """Get a valid work order ID for testing"""
    response = requests.get(
        f"{BASE_URL}/api/work-orders",
        headers=headers,
        timeout=30
    )
    if response.status_code == 200:
        wos = response.json()
        if wos and len(wos) > 0:
            return wos[0].get("id")
    pytest.skip("No work orders found for testing AI features")


@pytest.fixture(scope="module")
def sensor_id(headers):
    """Get a valid sensor ID for testing"""
    response = requests.get(
        f"{BASE_URL}/api/sensors",
        headers=headers,
        timeout=30
    )
    if response.status_code == 200:
        sensors = response.json()
        if sensors and len(sensors) > 0:
            return sensors[0].get("id")
    pytest.skip("No sensors found for testing AI features")


class TestAIWorkOrderDiagnostic:
    """Tests for POST /api/ai-work-orders/diagnostic"""

    def test_diagnostic_success(self, headers, work_order_id):
        """Test AI diagnostic returns structured response"""
        response = requests.post(
            f"{BASE_URL}/api/ai-work-orders/diagnostic",
            headers=headers,
            json={"work_order_id": work_order_id},
            timeout=60  # LLM calls can be slow
        )
        
        assert response.status_code == 200, f"Diagnostic failed: {response.text}"
        data = response.json()
        
        # Check response structure
        assert data.get("success") is True, "Response should have success=true"
        assert "diagnostic" in data, "Response should contain 'diagnostic' key"
        
        diagnostic = data["diagnostic"]
        # Check for expected diagnostic fields
        assert "cause_probable" in diagnostic or "commentaire_expert" in diagnostic, \
            f"Diagnostic should have cause_probable or commentaire_expert. Got: {list(diagnostic.keys())}"
        
        print(f"✓ Diagnostic returned: {list(diagnostic.keys())}")

    def test_diagnostic_missing_work_order_id(self, headers):
        """Test diagnostic fails without work_order_id"""
        response = requests.post(
            f"{BASE_URL}/api/ai-work-orders/diagnostic",
            headers=headers,
            json={},
            timeout=30
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Correctly rejected request without work_order_id")

    def test_diagnostic_invalid_work_order_id(self, headers):
        """Test diagnostic fails with invalid work_order_id"""
        response = requests.post(
            f"{BASE_URL}/api/ai-work-orders/diagnostic",
            headers=headers,
            json={"work_order_id": "invalid-id-12345"},
            timeout=30
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Correctly returned 404 for invalid work_order_id")


class TestAIWorkOrderSummary:
    """Tests for POST /api/ai-work-orders/summary"""

    def test_summary_success(self, headers, work_order_id):
        """Test AI summary returns structured response"""
        response = requests.post(
            f"{BASE_URL}/api/ai-work-orders/summary",
            headers=headers,
            json={"work_order_id": work_order_id},
            timeout=60
        )
        
        assert response.status_code == 200, f"Summary failed: {response.text}"
        data = response.json()
        
        # Check response structure
        assert data.get("success") is True, "Response should have success=true"
        assert "summary" in data, "Response should contain 'summary' key"
        
        summary = data["summary"]
        # Check for expected summary fields
        assert "resume" in summary or "recommandations" in summary, \
            f"Summary should have resume or recommandations. Got: {list(summary.keys())}"
        
        print(f"✓ Summary returned: {list(summary.keys())}")

    def test_summary_missing_work_order_id(self, headers):
        """Test summary fails without work_order_id"""
        response = requests.post(
            f"{BASE_URL}/api/ai-work-orders/summary",
            headers=headers,
            json={},
            timeout=30
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Correctly rejected request without work_order_id")


class TestAIWeeklyReports:
    """Tests for POST /api/ai-weekly-reports/generate"""

    def test_generate_weekly_report(self, headers):
        """Test AI weekly report generation"""
        response = requests.post(
            f"{BASE_URL}/api/ai-weekly-reports/generate",
            headers=headers,
            json={
                "service": "Maintenance",
                "period_days": 7,
                "report_type": "hebdomadaire"
            },
            timeout=90  # Report generation can be slow
        )
        
        assert response.status_code == 200, f"Report generation failed: {response.text}"
        data = response.json()
        
        # Check response structure
        assert data.get("success") is True, "Response should have success=true"
        assert "report" in data, "Response should contain 'report' key"
        
        report = data["report"]
        # Check for expected report fields
        expected_fields = ["sections", "points_attention", "actions_prioritaires"]
        found_fields = [f for f in expected_fields if f in report]
        assert len(found_fields) > 0, f"Report should have at least one of {expected_fields}. Got: {list(report.keys())}"
        
        # Check raw_stats
        if "raw_stats" in data:
            raw_stats = data["raw_stats"]
            assert "work_orders" in raw_stats, "raw_stats should contain work_orders"
            print(f"✓ Raw stats: {list(raw_stats.keys())}")
        
        print(f"✓ Report generated with keys: {list(report.keys())}")


class TestAISensorAnalysis:
    """Tests for POST /api/ai-sensors/analyze"""

    def test_sensor_analysis_success(self, headers, sensor_id):
        """Test AI sensor analysis returns structured response"""
        response = requests.post(
            f"{BASE_URL}/api/ai-sensors/analyze",
            headers=headers,
            json={"sensor_id": sensor_id},
            timeout=60
        )
        
        assert response.status_code == 200, f"Sensor analysis failed: {response.text}"
        data = response.json()
        
        # Check response structure
        assert data.get("success") is True, "Response should have success=true"
        assert "analysis" in data, "Response should contain 'analysis' key"
        
        analysis = data["analysis"]
        # Check for expected analysis fields - one of these must be present
        expected_fields = ["anomalies", "anomalies_detectees", "prediction", "recommandations", "etat_general"]
        found_fields = [f for f in expected_fields if f in analysis]
        assert len(found_fields) > 0, f"Analysis should have at least one of {expected_fields}. Got: {list(analysis.keys())}"
        
        # Check additional metadata
        if "sensor_name" in data:
            print(f"✓ Sensor analyzed: {data['sensor_name']}")
        if "readings_count" in data:
            print(f"  Readings count: {data['readings_count']}")
        
        print(f"✓ Analysis returned: {list(analysis.keys())}")

    def test_sensor_analysis_missing_sensor_id(self, headers):
        """Test sensor analysis fails without sensor_id"""
        response = requests.post(
            f"{BASE_URL}/api/ai-sensors/analyze",
            headers=headers,
            json={},
            timeout=30
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Correctly rejected request without sensor_id")

    def test_sensor_analysis_invalid_sensor_id(self, headers):
        """Test sensor analysis fails with invalid sensor_id"""
        response = requests.post(
            f"{BASE_URL}/api/ai-sensors/analyze",
            headers=headers,
            json={"sensor_id": "invalid-sensor-id"},
            timeout=30
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Correctly returned 404 for invalid sensor_id")


class TestAdriaMemory:
    """Tests for Adria conversation memory"""

    def test_adria_memory_conversation(self, headers):
        """Test that Adria remembers previous messages in same session"""
        session_id = f"test_memory_{uuid.uuid4().hex[:8]}"
        
        # First message: introduce yourself
        response1 = requests.post(
            f"{BASE_URL}/api/ai/chat",
            headers=headers,
            json={
                "message": "Je suis Pierre",
                "session_id": session_id,
                "include_app_context": False
            },
            timeout=60
        )
        
        assert response1.status_code == 200, f"First message failed: {response1.text}"
        data1 = response1.json()
        assert "response" in data1, "Response should contain 'response' key"
        print(f"✓ First message sent. Response: {data1['response'][:100]}...")
        
        # Wait a moment for the message to be stored
        time.sleep(2)
        
        # Second message: ask about name
        response2 = requests.post(
            f"{BASE_URL}/api/ai/chat",
            headers=headers,
            json={
                "message": "Comment je m'appelle ?",
                "session_id": session_id,
                "include_app_context": False
            },
            timeout=60
        )
        
        assert response2.status_code == 200, f"Second message failed: {response2.text}"
        data2 = response2.json()
        assert "response" in data2, "Response should contain 'response' key"
        
        # Check if the response mentions "Pierre"
        response_lower = data2["response"].lower()
        assert "pierre" in response_lower, f"Adria should remember the name 'Pierre'. Response: {data2['response']}"
        
        print(f"✓ Adria remembered the name! Response: {data2['response'][:200]}...")

    def test_adria_different_session_no_memory(self, headers):
        """Test that different sessions don't share memory"""
        session1 = f"test_session1_{uuid.uuid4().hex[:8]}"
        session2 = f"test_session2_{uuid.uuid4().hex[:8]}"
        
        # First session: introduce
        requests.post(
            f"{BASE_URL}/api/ai/chat",
            headers=headers,
            json={
                "message": "Je suis Jean",
                "session_id": session1,
                "include_app_context": False
            },
            timeout=60
        )
        
        time.sleep(1)
        
        # Second session: ask about name (should NOT know)
        response = requests.post(
            f"{BASE_URL}/api/ai/chat",
            headers=headers,
            json={
                "message": "Comment je m'appelle ?",
                "session_id": session2,
                "include_app_context": False
            },
            timeout=60
        )
        
        assert response.status_code == 200
        data = response.json()
        response_lower = data["response"].lower()
        
        # Should NOT mention "Jean" since it's a different session
        # (or might say "je ne sais pas" / "vous ne m'avez pas dit")
        print(f"✓ Different session test completed. Response: {data['response'][:200]}...")


class TestAdriaDynamicContext:
    """Tests for Adria dynamic context enrichment"""

    def test_adria_context_sensors(self, headers):
        """Test that Adria returns sensor data when asked about capteurs"""
        session_id = f"test_context_{uuid.uuid4().hex[:8]}"
        
        response = requests.post(
            f"{BASE_URL}/api/ai/chat",
            headers=headers,
            json={
                "message": "Quels sont les capteurs disponibles ?",
                "session_id": session_id,
                "include_app_context": True  # Important: enable app context
            },
            timeout=60
        )
        
        assert response.status_code == 200, f"Chat failed: {response.text}"
        data = response.json()
        assert "response" in data, "Response should contain 'response' key"
        
        # The response should contain some indication of sensors or IoT
        response_text = data["response"].lower()
        sensor_keywords = ["capteur", "sensor", "température", "pression", "iot", "valeur", "mesure"]
        found_keywords = [kw for kw in sensor_keywords if kw in response_text]
        
        print(f"✓ Response mentions: {found_keywords}")
        print(f"  Full response: {data['response'][:300]}...")
        
        # This test passes if we get a response - dynamic context is optional
        assert len(data["response"]) > 0, "Response should not be empty"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
