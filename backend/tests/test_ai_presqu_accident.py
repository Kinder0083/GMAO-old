"""
Test AI Presqu'accident Routes
Tests 4 AI features:
1. POST /api/ai-presqu-accident/analyze-root-causes - Root cause analysis (5 Pourquoi + Ishikawa)
2. POST /api/ai-presqu-accident/find-similar - Similar incidents detection
3. POST /api/ai-presqu-accident/analyze-trends - Trend analysis
4. POST /api/ai-presqu-accident/generate-report - QHSE report generation
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthentication:
    """Get auth token for subsequent tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        token = data.get("access_token") or data.get("token")
        assert token, "No token in response"
        return token
    
    @pytest.fixture(scope="class") 
    def auth_headers(self, auth_token):
        """Return headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestAIAnalyzeRootCauses(TestAuthentication):
    """Test POST /api/ai-presqu-accident/analyze-root-causes"""
    
    @pytest.fixture(scope="class")
    def presqu_accident_item(self, auth_headers):
        """Get an existing presqu'accident item for testing"""
        response = requests.get(f"{BASE_URL}/api/presqu-accident/items", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get items: {response.text}"
        data = response.json()
        # Response can be a list directly or {data: [...]}
        items = data if isinstance(data, list) else data.get("data", [])
        assert len(items) > 0, "No presqu'accident items in DB"
        return items[0]
    
    def test_analyze_root_causes_returns_200(self, auth_headers, presqu_accident_item):
        """Test that endpoint returns 200 with valid item_id"""
        response = requests.post(
            f"{BASE_URL}/api/ai-presqu-accident/analyze-root-causes",
            headers=auth_headers,
            json={"item_id": presqu_accident_item["id"]},
            timeout=60  # AI calls can take time
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_analyze_root_causes_response_structure(self, auth_headers, presqu_accident_item):
        """Test that response contains expected fields"""
        response = requests.post(
            f"{BASE_URL}/api/ai-presqu-accident/analyze-root-causes",
            headers=auth_headers,
            json={"item_id": presqu_accident_item["id"]},
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check success field
        assert "success" in data
        if data["success"]:
            assert "data" in data
            analysis = data["data"]
            
            # Check 5 Pourquoi (analyse_5_pourquoi)
            assert "analyse_5_pourquoi" in analysis or "5_pourquoi" in analysis, "Missing 5 Pourquoi"
            
            # Check Ishikawa
            assert "diagramme_ishikawa" in analysis or "ishikawa" in analysis, "Missing Ishikawa"
            
            # Check cause racine principale
            assert "cause_racine_principale" in analysis, "Missing cause_racine_principale"
            
            # Check actions preventives
            assert "actions_preventives" in analysis, "Missing actions_preventives"
            
            # Check evaluation risque
            assert "evaluation_risque" in analysis, "Missing evaluation_risque"
            print(f"Root cause analysis response: success={data['success']}")
    
    def test_analyze_root_causes_invalid_item_id(self, auth_headers):
        """Test with non-existent item_id returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/ai-presqu-accident/analyze-root-causes",
            headers=auth_headers,
            json={"item_id": "nonexistent-id-12345"},
            timeout=30
        )
        assert response.status_code == 404 or (response.status_code == 200 and not response.json().get("success", True))
    
    def test_analyze_root_causes_missing_item_id(self, auth_headers):
        """Test with missing item_id returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/ai-presqu-accident/analyze-root-causes",
            headers=auth_headers,
            json={},
            timeout=30
        )
        assert response.status_code == 400


class TestAIFindSimilar(TestAuthentication):
    """Test POST /api/ai-presqu-accident/find-similar"""
    
    def test_find_similar_returns_200(self, auth_headers):
        """Test that endpoint returns 200"""
        response = requests.post(
            f"{BASE_URL}/api/ai-presqu-accident/find-similar",
            headers=auth_headers,
            json={
                "titre": "Test chute dans l'atelier",
                "description": "Un operateur a failli chuter en raison d'un sol mouille dans l'atelier de production",
                "lieu": "Atelier Production",
                "service": "PRODUCTION",
                "categorie_incident": "CHUTE_PERSONNE"
            },
            timeout=60
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_find_similar_response_structure(self, auth_headers):
        """Test that response contains similar_incidents with similarity_score"""
        response = requests.post(
            f"{BASE_URL}/api/ai-presqu-accident/find-similar",
            headers=auth_headers,
            json={
                "titre": "Risque de brulure machine",
                "description": "Un technicien a failli se bruler en manipulant une piece chaude sortie du four industriel",
                "lieu": "Zone de four",
                "service": "PRODUCTION",
                "categorie_incident": "BRULURE"
            },
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "success" in data
        if data["success"]:
            assert "data" in data
            result = data["data"]
            
            # Check similar_incidents field
            assert "similar_incidents" in result, "Missing similar_incidents"
            
            # If there are similar incidents, check structure
            if result["similar_incidents"]:
                incident = result["similar_incidents"][0]
                assert "similarity_score" in incident, "Missing similarity_score in incident"
                print(f"Found {len(result['similar_incidents'])} similar incidents")
            else:
                print("No similar incidents found (empty list)")
    
    def test_find_similar_empty_description(self, auth_headers):
        """Test with empty description returns success but empty results"""
        response = requests.post(
            f"{BASE_URL}/api/ai-presqu-accident/find-similar",
            headers=auth_headers,
            json={
                "titre": "",
                "description": "",
                "lieu": "",
                "service": "",
                "categorie_incident": ""
            },
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        # Should return empty results for empty input
        assert "data" in data


class TestAIAnalyzeTrends(TestAuthentication):
    """Test POST /api/ai-presqu-accident/analyze-trends"""
    
    def test_analyze_trends_returns_200(self, auth_headers):
        """Test that endpoint returns 200"""
        response = requests.post(
            f"{BASE_URL}/api/ai-presqu-accident/analyze-trends",
            headers=auth_headers,
            json={"days": 365},
            timeout=90  # Trend analysis can take longer
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_analyze_trends_response_structure(self, auth_headers):
        """Test that response contains patterns, zones_a_risque, predictions, recommendations"""
        response = requests.post(
            f"{BASE_URL}/api/ai-presqu-accident/analyze-trends",
            headers=auth_headers,
            json={"days": 365},
            timeout=90
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "success" in data
        if data["success"]:
            assert "data" in data
            analysis = data["data"]
            
            # Check patterns_recurrents
            assert "patterns_recurrents" in analysis or "patterns" in analysis, "Missing patterns"
            
            # Check zones_a_risque
            assert "zones_a_risque" in analysis, "Missing zones_a_risque"
            
            # Check predictions
            assert "predictions" in analysis, "Missing predictions"
            
            # Check recommandations_prioritaires
            assert "recommandations_prioritaires" in analysis or "recommendations" in analysis, "Missing recommendations"
            
            # Check notifications_sent field in top-level response
            assert "notifications_sent" in data, "Missing notifications_sent"
            print(f"Trend analysis success, notifications_sent: {len(data.get('notifications_sent', []))}")
    
    def test_analyze_trends_with_custom_days(self, auth_headers):
        """Test with different days parameter"""
        response = requests.post(
            f"{BASE_URL}/api/ai-presqu-accident/analyze-trends",
            headers=auth_headers,
            json={"days": 30},
            timeout=90
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check stats include period info
        if data.get("success") and "stats" in data:
            assert data["stats"]["period_days"] == 30


class TestAIGenerateReport(TestAuthentication):
    """Test POST /api/ai-presqu-accident/generate-report"""
    
    def test_generate_report_returns_200(self, auth_headers):
        """Test that endpoint returns 200"""
        response = requests.post(
            f"{BASE_URL}/api/ai-presqu-accident/generate-report",
            headers=auth_headers,
            json={"days": 365},
            timeout=90
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_generate_report_response_structure(self, auth_headers):
        """Test that response contains QHSE report structure"""
        response = requests.post(
            f"{BASE_URL}/api/ai-presqu-accident/generate-report",
            headers=auth_headers,
            json={"days": 365},
            timeout=90
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "success" in data
        if data["success"]:
            assert "data" in data
            report = data["data"]
            
            # Check titre_rapport
            assert "titre_rapport" in report, "Missing titre_rapport"
            
            # Check resume_executif
            assert "resume_executif" in report, "Missing resume_executif"
            
            # Check indicateurs_cles
            assert "indicateurs_cles" in report, "Missing indicateurs_cles"
            
            # Check plan_action_propose
            assert "plan_action_propose" in report, "Missing plan_action_propose"
            
            print(f"QHSE Report generated: {report.get('titre_rapport', 'No title')}")


class TestAuthRequired:
    """Test that all endpoints require authentication"""
    
    def test_analyze_root_causes_requires_auth(self):
        """Test that endpoint returns 401 without auth"""
        response = requests.post(
            f"{BASE_URL}/api/ai-presqu-accident/analyze-root-causes",
            json={"item_id": "test"}
        )
        assert response.status_code == 401 or response.status_code == 403
    
    def test_find_similar_requires_auth(self):
        """Test that endpoint returns 401 without auth"""
        response = requests.post(
            f"{BASE_URL}/api/ai-presqu-accident/find-similar",
            json={"description": "test"}
        )
        assert response.status_code == 401 or response.status_code == 403
    
    def test_analyze_trends_requires_auth(self):
        """Test that endpoint returns 401 without auth"""
        response = requests.post(
            f"{BASE_URL}/api/ai-presqu-accident/analyze-trends",
            json={"days": 365}
        )
        assert response.status_code == 401 or response.status_code == 403
    
    def test_generate_report_requires_auth(self):
        """Test that endpoint returns 401 without auth"""
        response = requests.post(
            f"{BASE_URL}/api/ai-presqu-accident/generate-report",
            json={"days": 365}
        )
        assert response.status_code == 401 or response.status_code == 403


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
