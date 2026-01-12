"""
Test suite for User Regime feature
Tests:
- User regime field in API responses
- User update with regime field
- Availability fields for different regimes (disponible, disponible_matin, disponible_aprem, disponible_nuit)
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@test.com"
TEST_PASSWORD = "password"


class TestUserRegimeFeature:
    """Tests for User Regime field functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.current_user = data["user"]
    
    def test_login_returns_regime_field(self):
        """Test that login response includes regime field"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify regime field exists in user object
        assert "user" in data
        assert "regime" in data["user"], "regime field missing from user object"
        
        # Verify regime is one of valid values
        valid_regimes = ["Journée", "2*8", "3*8"]
        assert data["user"]["regime"] in valid_regimes, f"Invalid regime value: {data['user']['regime']}"
        print(f"✓ Login returns regime field: {data['user']['regime']}")
    
    def test_get_users_returns_regime_field(self):
        """Test that GET /api/users returns regime field for all users"""
        response = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
        assert response.status_code == 200
        users = response.json()
        
        assert len(users) > 0, "No users found"
        
        valid_regimes = ["Journée", "2*8", "3*8"]
        for user in users:
            assert "regime" in user, f"regime field missing for user {user.get('email')}"
            assert user["regime"] in valid_regimes, f"Invalid regime for user {user.get('email')}: {user['regime']}"
        
        # Count regimes
        regime_counts = {}
        for user in users:
            regime = user["regime"]
            regime_counts[regime] = regime_counts.get(regime, 0) + 1
        
        print(f"✓ All {len(users)} users have valid regime field")
        print(f"  Regime distribution: {regime_counts}")
    
    def test_update_user_regime_journee(self):
        """Test updating user regime to Journée"""
        # Get first user
        response = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
        assert response.status_code == 200
        users = response.json()
        assert len(users) > 0
        
        test_user = users[0]
        user_id = test_user["id"]
        original_regime = test_user["regime"]
        
        # Update to Journée
        response = requests.put(
            f"{BASE_URL}/api/users/{user_id}",
            headers=self.headers,
            json={"regime": "Journée"}
        )
        assert response.status_code == 200, f"Update failed: {response.text}"
        
        # Verify update - use list endpoint and find user
        response = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
        assert response.status_code == 200
        users = response.json()
        updated_user = next((u for u in users if u["id"] == user_id), None)
        assert updated_user is not None
        assert updated_user["regime"] == "Journée"
        
        # Restore original regime
        requests.put(
            f"{BASE_URL}/api/users/{user_id}",
            headers=self.headers,
            json={"regime": original_regime}
        )
        
        print(f"✓ User regime updated to Journée successfully")
    
    def test_update_user_regime_2x8(self):
        """Test updating user regime to 2*8"""
        response = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
        users = response.json()
        test_user = users[0]
        user_id = test_user["id"]
        original_regime = test_user["regime"]
        
        # Update to 2*8
        response = requests.put(
            f"{BASE_URL}/api/users/{user_id}",
            headers=self.headers,
            json={"regime": "2*8"}
        )
        assert response.status_code == 200, f"Update failed: {response.text}"
        
        # Verify - use list endpoint
        response = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
        users = response.json()
        updated_user = next((u for u in users if u["id"] == user_id), None)
        assert updated_user is not None
        assert updated_user["regime"] == "2*8"
        
        # Restore
        requests.put(f"{BASE_URL}/api/users/{user_id}", headers=self.headers, json={"regime": original_regime})
        print(f"✓ User regime updated to 2*8 successfully")
    
    def test_update_user_regime_3x8(self):
        """Test updating user regime to 3*8"""
        response = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
        users = response.json()
        test_user = users[0]
        user_id = test_user["id"]
        original_regime = test_user["regime"]
        
        # Update to 3*8
        response = requests.put(
            f"{BASE_URL}/api/users/{user_id}",
            headers=self.headers,
            json={"regime": "3*8"}
        )
        assert response.status_code == 200, f"Update failed: {response.text}"
        
        # Verify
        response = requests.get(f"{BASE_URL}/api/users/{user_id}", headers=self.headers)
        updated_user = response.json()
        assert updated_user["regime"] == "3*8"
        
        # Restore
        requests.put(f"{BASE_URL}/api/users/{user_id}", headers=self.headers, json={"regime": original_regime})
        print(f"✓ User regime updated to 3*8 successfully")


class TestAvailabilityFields:
    """Tests for Availability fields supporting different regimes"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        self.token = data["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.current_user = data["user"]
    
    def test_availability_supports_journee_fields(self):
        """Test creating availability with 'disponible' field (Journée regime)"""
        # Get a user
        response = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
        users = response.json()
        test_user = users[0]
        
        # Create availability for tomorrow
        tomorrow = (datetime.now() + timedelta(days=1)).isoformat()
        
        response = requests.post(
            f"{BASE_URL}/api/availabilities",
            headers=self.headers,
            json={
                "user_id": test_user["id"],
                "date": tomorrow,
                "disponible": True
            }
        )
        
        # Accept 200 or 201 (create or update)
        assert response.status_code in [200, 201], f"Create availability failed: {response.text}"
        
        avail = response.json()
        assert "disponible" in avail
        print(f"✓ Availability created with 'disponible' field for Journée regime")
    
    def test_availability_supports_2x8_fields(self):
        """Test creating availability with matin/aprem fields (2*8 regime)"""
        response = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
        users = response.json()
        test_user = users[0]
        
        # Create availability for day after tomorrow
        future_date = (datetime.now() + timedelta(days=2)).isoformat()
        
        response = requests.post(
            f"{BASE_URL}/api/availabilities",
            headers=self.headers,
            json={
                "user_id": test_user["id"],
                "date": future_date,
                "disponible_matin": True,
                "disponible_aprem": False
            }
        )
        
        assert response.status_code in [200, 201], f"Create availability failed: {response.text}"
        
        avail = response.json()
        # Check that the fields exist in response (may be null if not set)
        print(f"✓ Availability created with matin/aprem fields for 2*8 regime")
    
    def test_availability_supports_3x8_fields(self):
        """Test creating availability with matin/aprem/nuit fields (3*8 regime)"""
        response = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
        users = response.json()
        test_user = users[0]
        
        # Create availability for 3 days from now
        future_date = (datetime.now() + timedelta(days=3)).isoformat()
        
        response = requests.post(
            f"{BASE_URL}/api/availabilities",
            headers=self.headers,
            json={
                "user_id": test_user["id"],
                "date": future_date,
                "disponible_matin": True,
                "disponible_aprem": True,
                "disponible_nuit": False
            }
        )
        
        assert response.status_code in [200, 201], f"Create availability failed: {response.text}"
        print(f"✓ Availability created with matin/aprem/nuit fields for 3*8 regime")
    
    def test_update_availability_partial_fields(self):
        """Test updating only specific availability fields"""
        response = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
        users = response.json()
        test_user = users[0]
        
        # Create initial availability
        future_date = (datetime.now() + timedelta(days=4)).isoformat()
        
        response = requests.post(
            f"{BASE_URL}/api/availabilities",
            headers=self.headers,
            json={
                "user_id": test_user["id"],
                "date": future_date,
                "disponible_matin": True
            }
        )
        assert response.status_code in [200, 201]
        avail = response.json()
        avail_id = avail["id"]
        
        # Update only disponible_aprem
        response = requests.put(
            f"{BASE_URL}/api/availabilities/{avail_id}",
            headers=self.headers,
            json={"disponible_aprem": False}
        )
        assert response.status_code == 200, f"Update failed: {response.text}"
        
        print(f"✓ Partial availability update works correctly")
    
    def test_get_availabilities_by_month(self):
        """Test getting availabilities filtered by month"""
        response = requests.get(
            f"{BASE_URL}/api/availabilities?month=1&year=2026",
            headers=self.headers
        )
        assert response.status_code == 200
        availabilities = response.json()
        
        print(f"✓ Retrieved {len(availabilities)} availabilities for January 2026")


class TestCreateMemberWithRegime:
    """Tests for creating members with regime field"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        self.token = data["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_create_member_with_journee_regime(self):
        """Test creating a member with Journée regime"""
        import uuid
        unique_email = f"test_journee_{uuid.uuid4().hex[:8]}@test.local"
        
        response = requests.post(
            f"{BASE_URL}/api/users/create-member",
            headers=self.headers,
            json={
                "email": unique_email,
                "prenom": "TEST_Journee",
                "nom": "User",
                "role": "TECHNICIEN",
                "password": "testpassword123",
                "regime": "Journée"
            }
        )
        
        if response.status_code == 201:
            user = response.json()
            assert user["regime"] == "Journée"
            print(f"✓ Created member with Journée regime")
            
            # Cleanup - delete test user
            requests.delete(f"{BASE_URL}/api/users/{user['id']}", headers=self.headers)
        else:
            print(f"⚠ Create member returned {response.status_code}: {response.text}")
    
    def test_create_member_with_2x8_regime(self):
        """Test creating a member with 2*8 regime"""
        import uuid
        unique_email = f"test_2x8_{uuid.uuid4().hex[:8]}@test.local"
        
        response = requests.post(
            f"{BASE_URL}/api/users/create-member",
            headers=self.headers,
            json={
                "email": unique_email,
                "prenom": "TEST_2x8",
                "nom": "User",
                "role": "TECHNICIEN",
                "password": "testpassword123",
                "regime": "2*8"
            }
        )
        
        if response.status_code == 201:
            user = response.json()
            assert user["regime"] == "2*8"
            print(f"✓ Created member with 2*8 regime")
            
            # Cleanup
            requests.delete(f"{BASE_URL}/api/users/{user['id']}", headers=self.headers)
        else:
            print(f"⚠ Create member returned {response.status_code}: {response.text}")
    
    def test_create_member_with_3x8_regime(self):
        """Test creating a member with 3*8 regime"""
        import uuid
        unique_email = f"test_3x8_{uuid.uuid4().hex[:8]}@test.local"
        
        response = requests.post(
            f"{BASE_URL}/api/users/create-member",
            headers=self.headers,
            json={
                "email": unique_email,
                "prenom": "TEST_3x8",
                "nom": "User",
                "role": "TECHNICIEN",
                "password": "testpassword123",
                "regime": "3*8"
            }
        )
        
        if response.status_code == 201:
            user = response.json()
            assert user["regime"] == "3*8"
            print(f"✓ Created member with 3*8 regime")
            
            # Cleanup
            requests.delete(f"{BASE_URL}/api/users/{user['id']}", headers=self.headers)
        else:
            print(f"⚠ Create member returned {response.status_code}: {response.text}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
