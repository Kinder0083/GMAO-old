"""
Test: AI Maintenance - Create Work Orders from Analysis
Feature: POST /api/ai-maintenance/create-work-orders-from-analysis
- Creates curative work orders from AI nonconformity analysis suggestions
- Returns success, created_count, work_orders array with id, numero, titre, priorite
- Validates work orders appear in GET /api/work-orders with statut=OUVERT, categorie=CURATIF
- Returns 400 if work_orders array is empty
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAIWorkOrderCreation:
    """Test suite for AI-generated work order creation endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: login as admin and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        
        # Login
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "Admin123!"
        })
        
        if login_resp.status_code == 200:
            token = login_resp.json().get('access_token')
            self.session.headers.update({'Authorization': f'Bearer {token}'})
            self.logged_in = True
        else:
            self.logged_in = False
            pytest.skip("Login failed - skipping tests")
        
        yield
        
        # Cleanup: delete test WOs created during test
        if hasattr(self, 'created_wo_ids'):
            for wo_id in self.created_wo_ids:
                try:
                    self.session.delete(f"{BASE_URL}/api/work-orders/{wo_id}")
                except:
                    pass
    
    def test_create_single_wo_from_analysis(self):
        """Test creating a single work order from AI analysis suggestion"""
        self.created_wo_ids = []
        
        work_orders_payload = {
            "work_orders": [
                {
                    "titre": "[TEST_AI] Remplacement filtre compresseur",
                    "description": "Non-conformité détectée: filtre encrassé, remplacement urgent requis",
                    "priorite": "HAUTE",
                    "equipement": "Compresseur Atlas Copco GA30",
                    "type": "CURATIF"
                }
            ]
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/ai-maintenance/create-work-orders-from-analysis",
            json=work_orders_payload
        )
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert data.get('success') is True, "Expected success=True"
        assert data.get('created_count') == 1, f"Expected created_count=1, got {data.get('created_count')}"
        assert 'work_orders' in data, "Missing work_orders in response"
        assert len(data['work_orders']) == 1, "Expected exactly 1 work order"
        
        wo = data['work_orders'][0]
        assert 'id' in wo, "Missing id in work order"
        assert 'numero' in wo, "Missing numero in work order"
        assert 'titre' in wo, "Missing titre in work order"
        assert 'priorite' in wo, "Missing priorite in work order"
        assert wo['priorite'] == 'HAUTE', f"Expected priorite=HAUTE, got {wo['priorite']}"
        
        self.created_wo_ids.append(wo['id'])
        print(f"Created WO #{wo['numero']} - {wo['titre']} (priority: {wo['priorite']})")
        
        return wo
    
    def test_created_wo_appears_in_work_orders_list(self):
        """Verify created WO appears in GET /api/work-orders with correct statut and categorie"""
        self.created_wo_ids = []
        
        # Create a WO first
        work_orders_payload = {
            "work_orders": [
                {
                    "titre": "[TEST_AI] Vérification pression pneumatique",
                    "description": "Non-conformité: pression hors limites",
                    "priorite": "NORMALE",
                    "equipement": "Ligne pneumatique 1",
                    "type": "CURATIF"
                }
            ]
        }
        
        create_resp = self.session.post(
            f"{BASE_URL}/api/ai-maintenance/create-work-orders-from-analysis",
            json=work_orders_payload
        )
        assert create_resp.status_code == 200
        created_wo = create_resp.json()['work_orders'][0]
        wo_id = created_wo['id']
        self.created_wo_ids.append(wo_id)
        
        # GET the work order
        get_resp = self.session.get(f"{BASE_URL}/api/work-orders/{wo_id}")
        assert get_resp.status_code == 200, f"Failed to GET WO: {get_resp.status_code}"
        
        wo_data = get_resp.json()
        
        # Verify statut and categorie
        assert wo_data.get('statut') == 'OUVERT', f"Expected statut=OUVERT, got {wo_data.get('statut')}"
        assert wo_data.get('categorie') == 'CURATIF', f"Expected categorie=CURATIF, got {wo_data.get('categorie')}"
        assert wo_data.get('source') == 'ai_nonconformity_analysis', f"Expected source=ai_nonconformity_analysis, got {wo_data.get('source')}"
        
        print(f"Verified WO #{wo_data.get('numero')}: statut={wo_data.get('statut')}, categorie={wo_data.get('categorie')}, source={wo_data.get('source')}")
    
    def test_create_multiple_wos_from_analysis(self):
        """Test creating multiple work orders at once"""
        self.created_wo_ids = []
        
        work_orders_payload = {
            "work_orders": [
                {
                    "titre": "[TEST_AI] OT Multiple 1 - Lubrification",
                    "description": "Lubrification insuffisante détectée",
                    "priorite": "BASSE",
                    "equipement": "Moteur pompe 1"
                },
                {
                    "titre": "[TEST_AI] OT Multiple 2 - Vibrations",
                    "description": "Niveau de vibrations anormal",
                    "priorite": "URGENTE",
                    "equipement": "Ventilateur tour refroidissement"
                }
            ]
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/ai-maintenance/create-work-orders-from-analysis",
            json=work_orders_payload
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get('success') is True
        assert data.get('created_count') == 2, f"Expected created_count=2, got {data.get('created_count')}"
        assert len(data['work_orders']) == 2
        
        for wo in data['work_orders']:
            self.created_wo_ids.append(wo['id'])
            print(f"Created WO #{wo['numero']} - {wo['titre']} (priority: {wo['priorite']})")
    
    def test_empty_work_orders_returns_400(self):
        """Test that empty work_orders array returns 400 error"""
        work_orders_payload = {
            "work_orders": []
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/ai-maintenance/create-work-orders-from-analysis",
            json=work_orders_payload
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"Correctly returned 400 for empty work_orders: {response.text}")
    
    def test_priority_mapping(self):
        """Test that all priority levels are correctly mapped"""
        self.created_wo_ids = []
        
        priorities = ["URGENTE", "HAUTE", "NORMALE", "BASSE"]
        
        for priority in priorities:
            payload = {
                "work_orders": [
                    {
                        "titre": f"[TEST_AI] Test Priority {priority}",
                        "description": f"Testing priority mapping for {priority}",
                        "priorite": priority,
                        "equipement": "Test Equipment"
                    }
                ]
            }
            
            response = self.session.post(
                f"{BASE_URL}/api/ai-maintenance/create-work-orders-from-analysis",
                json=payload
            )
            
            assert response.status_code == 200, f"Failed for priority {priority}"
            data = response.json()
            assert data['work_orders'][0]['priorite'] == priority, f"Priority not correctly mapped: expected {priority}"
            self.created_wo_ids.append(data['work_orders'][0]['id'])
            print(f"Priority {priority} correctly mapped")
    
    def test_endpoint_requires_auth(self):
        """Test that endpoint requires authentication"""
        unauthenticated_session = requests.Session()
        unauthenticated_session.headers.update({'Content-Type': 'application/json'})
        
        response = unauthenticated_session.post(
            f"{BASE_URL}/api/ai-maintenance/create-work-orders-from-analysis",
            json={"work_orders": [{"titre": "Test", "description": "Test", "priorite": "NORMALE", "equipement": "Test"}]}
        )
        
        assert response.status_code in [401, 403], f"Expected 401 or 403 without auth, got {response.status_code}"
        print(f"Endpoint correctly requires authentication: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
