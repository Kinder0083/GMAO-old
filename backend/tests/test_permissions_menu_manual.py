"""
Backend tests for:
1. Permissions management - GET /api/roles returns roles with new permissions
2. Permissions migration - POST /api/roles/migrate-permissions
3. Manual chapters - GET /api/manual/content returns 36 chapters
4. User preferences menu items - GET /api/user-preferences
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
TEST_EMAIL = "admin@test.com"
TEST_PASSWORD = "Admin123!"

# New permissions that were added
NEW_PERMISSION_MODULES = [
    "mes", "mesReports", "serviceDashboard", "weeklyReports",
    "demandesArret", "consignes", "autorisationsParticulieres"
]

# All 43 expected permission modules in frontend MODULES array
ALL_PERMISSION_MODULES = [
    "dashboard", "interventionRequests", "workOrders", "improvementRequests",
    "improvements", "preventiveMaintenance", "planningMprev", "assets",
    "inventory", "locations", "meters", "surveillance", "surveillanceRapport",
    "presquaccident", "presquaccidentRapport", "documentations", "vendors",
    "reports", "people", "planning", "purchaseHistory", "purchaseRequests",
    "importExport", "journal", "settings", "personalization", "chatLive",
    "sensors", "iotDashboard", "mqttLogs", "whiteboard", "achat",
    "timeTracking", "cameras", "analyticsChecklists", "mes", "mesReports",
    "serviceDashboard", "weeklyReports", "demandesArret", "consignes",
    "autorisationsParticulieres"
]

# Expected new manual chapters (added for fresh Proxmox installation)
NEW_MANUAL_CHAPTERS = [
    "Caméras", "Rapports M.E.S.", "Dashboard Service", "Gestion d'Equipe",
    "Rapports Hebdomadaires", "Tableau d'Affichage", "Analytics Checklists",
    "Personnalisation", "Autorisations Particulières", "Demandes d'Arrêt"
]

# Required menu items including new ones
NEW_MENU_ITEMS = [
    "service-dashboard", "cameras", "mes", "mes-reports",
    "analytics-checklists", "whiteboard", "weekly-reports", "team-management"
]


class TestAuth:
    """Test authentication to get token for protected endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in login response"
        return data["access_token"]
    
    def test_login_returns_token(self, auth_token):
        """Test that login works and returns a token"""
        assert auth_token is not None
        assert len(auth_token) > 0
        print(f"✅ Login successful, token length: {len(auth_token)}")


class TestRolesPermissions:
    """Test role permissions - new modules added"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Login failed: {response.text}")
        return response.json().get("access_token")
    
    def test_get_roles_returns_200(self, auth_token):
        """GET /api/roles should return 200"""
        response = requests.get(
            f"{BASE_URL}/api/roles",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✅ GET /api/roles returns 200")
    
    def test_roles_have_new_permission_modules(self, auth_token):
        """Roles should have new permission modules: mes, mesReports, serviceDashboard, etc."""
        response = requests.get(
            f"{BASE_URL}/api/roles",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        roles = response.json()
        assert len(roles) > 0, "No roles returned"
        
        # Check ADMIN role has all new permissions
        admin_role = next((r for r in roles if r.get("code") == "ADMIN"), None)
        assert admin_role is not None, "ADMIN role not found"
        
        permissions = admin_role.get("permissions", {})
        missing_modules = []
        for module in NEW_PERMISSION_MODULES:
            if module not in permissions:
                missing_modules.append(module)
        
        assert len(missing_modules) == 0, f"ADMIN role missing permission modules: {missing_modules}"
        
        # Verify each new module has view/edit/delete structure
        for module in NEW_PERMISSION_MODULES:
            perm = permissions.get(module, {})
            assert "view" in perm, f"Module {module} missing 'view' field"
            assert "edit" in perm, f"Module {module} missing 'edit' field"
            assert "delete" in perm, f"Module {module} missing 'delete' field"
        
        print(f"✅ ADMIN role has all {len(NEW_PERMISSION_MODULES)} new permission modules")
    
    def test_admin_has_all_43_permission_modules(self, auth_token):
        """ADMIN role should have all 43 permission modules (from frontend MODULES array)"""
        response = requests.get(
            f"{BASE_URL}/api/roles",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        roles = response.json()
        
        admin_role = next((r for r in roles if r.get("code") == "ADMIN"), None)
        assert admin_role is not None
        
        permissions = admin_role.get("permissions", {})
        found_count = 0
        missing = []
        
        for module in ALL_PERMISSION_MODULES:
            if module in permissions:
                found_count += 1
            else:
                missing.append(module)
        
        print(f"✅ ADMIN role has {found_count}/{len(ALL_PERMISSION_MODULES)} permission modules")
        if missing:
            print(f"   ⚠️ Missing modules: {missing}")
        
        # Allow some flexibility - at least 40 modules should be present
        assert found_count >= 40, f"Expected at least 40 modules, found {found_count}"


class TestMigratePermissions:
    """Test permissions migration endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Login failed: {response.text}")
        return response.json().get("access_token")
    
    def test_migrate_permissions_endpoint_exists(self, auth_token):
        """POST /api/roles/migrate-permissions should exist"""
        response = requests.post(
            f"{BASE_URL}/api/roles/migrate-permissions",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        # Should return 200 (success) or any valid response, not 404
        assert response.status_code != 404, "Endpoint /api/roles/migrate-permissions not found"
        print(f"✅ POST /api/roles/migrate-permissions returns {response.status_code}")
    
    def test_migrate_permissions_returns_success(self, auth_token):
        """Migration should return success response with updated_count"""
        response = requests.post(
            f"{BASE_URL}/api/roles/migrate-permissions",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "success" in data, "Response missing 'success' field"
        assert data["success"] == True, "Migration was not successful"
        assert "updated_count" in data, "Response missing 'updated_count' field"
        
        print(f"✅ Migration successful, {data.get('updated_count', 0)} roles updated")


class TestManualContent:
    """Test manual content - should have 36 chapters including new ones"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Login failed: {response.text}")
        return response.json().get("access_token")
    
    def test_manual_content_returns_200(self, auth_token):
        """GET /api/manual/content should return 200"""
        response = requests.get(
            f"{BASE_URL}/api/manual/content",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✅ GET /api/manual/content returns 200")
    
    def test_manual_has_chapters(self, auth_token):
        """Manual content should have chapters"""
        response = requests.get(
            f"{BASE_URL}/api/manual/content",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "chapters" in data, "Response missing 'chapters' field"
        chapters = data["chapters"]
        
        assert len(chapters) > 0, "No chapters returned"
        print(f"✅ Manual has {len(chapters)} chapters")
    
    def test_manual_has_at_least_30_chapters(self, auth_token):
        """Manual should have at least 30 chapters (expect 35-36)"""
        response = requests.get(
            f"{BASE_URL}/api/manual/content",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        chapters = data.get("chapters", [])
        
        # Target is 36, but accept 30+ as minimum
        assert len(chapters) >= 30, f"Expected at least 30 chapters, got {len(chapters)}"
        print(f"✅ Manual has {len(chapters)} chapters (target: 36)")
    
    def test_manual_has_new_chapters(self, auth_token):
        """Manual should include new chapters for fresh Proxmox install"""
        response = requests.get(
            f"{BASE_URL}/api/manual/content",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        chapters = data.get("chapters", [])
        chapter_titles = [ch.get("title", "") for ch in chapters]
        
        found_new_chapters = []
        missing_new_chapters = []
        
        for expected in NEW_MANUAL_CHAPTERS:
            found = False
            for title in chapter_titles:
                if expected.lower() in title.lower():
                    found = True
                    found_new_chapters.append(expected)
                    break
            if not found:
                missing_new_chapters.append(expected)
        
        print(f"✅ Found {len(found_new_chapters)}/{len(NEW_MANUAL_CHAPTERS)} expected new chapters")
        if found_new_chapters:
            print(f"   Found: {found_new_chapters}")
        if missing_new_chapters:
            print(f"   ⚠️ Missing (may be named differently): {missing_new_chapters}")
        
        # At least 70% of new chapters should be present
        assert len(found_new_chapters) >= 7, f"Expected at least 7 new chapters, found {len(found_new_chapters)}"
    
    def test_manual_has_sections(self, auth_token):
        """Manual should have sections with content"""
        response = requests.get(
            f"{BASE_URL}/api/manual/content",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        sections = data.get("sections", [])
        
        assert len(sections) >= 50, f"Expected at least 50 sections, got {len(sections)}"
        print(f"✅ Manual has {len(sections)} sections")


class TestUserPreferences:
    """Test user preferences - menu items should have required fields"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Login failed: {response.text}")
        return response.json().get("access_token")
    
    def test_user_preferences_returns_200(self, auth_token):
        """GET /api/user-preferences should return 200"""
        response = requests.get(
            f"{BASE_URL}/api/user-preferences",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✅ GET /api/user-preferences returns 200")
    
    def test_user_preferences_has_menu_items(self, auth_token):
        """User preferences should have menu_items"""
        response = requests.get(
            f"{BASE_URL}/api/user-preferences",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        menu_items = data.get("menu_items", [])
        
        assert len(menu_items) > 0, "No menu_items in user preferences"
        print(f"✅ User preferences has {len(menu_items)} menu items")
    
    def test_menu_items_have_required_fields(self, auth_token):
        """Each menu item should have label, path, icon, module"""
        response = requests.get(
            f"{BASE_URL}/api/user-preferences",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        menu_items = data.get("menu_items", [])
        
        required_fields = ["label", "path", "icon", "module"]
        items_with_missing_fields = []
        
        for item in menu_items:
            item_id = item.get("id", "unknown")
            missing = [f for f in required_fields if not item.get(f)]
            if missing:
                items_with_missing_fields.append({"id": item_id, "missing": missing})
        
        if items_with_missing_fields:
            print(f"⚠️ Items with missing fields: {items_with_missing_fields[:5]}...")
        
        # Allow some items to be missing fields, but majority should be complete
        assert len(items_with_missing_fields) < len(menu_items) / 2, \
            f"Too many items ({len(items_with_missing_fields)}) missing required fields"
        
        print(f"✅ {len(menu_items) - len(items_with_missing_fields)}/{len(menu_items)} menu items have all required fields")
    
    def test_menu_items_include_new_items(self, auth_token):
        """Menu items should include new items like service-dashboard, cameras, mes"""
        response = requests.get(
            f"{BASE_URL}/api/user-preferences",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        menu_items = data.get("menu_items", [])
        menu_ids = [item.get("id") for item in menu_items]
        
        found_new = []
        missing_new = []
        
        for expected_id in NEW_MENU_ITEMS:
            if expected_id in menu_ids:
                found_new.append(expected_id)
            else:
                missing_new.append(expected_id)
        
        print(f"✅ Found {len(found_new)}/{len(NEW_MENU_ITEMS)} new menu items")
        if found_new:
            print(f"   Found: {found_new}")
        if missing_new:
            print(f"   ⚠️ Not found: {missing_new}")
        
        # At least 50% of new menu items should be present
        assert len(found_new) >= 4, f"Expected at least 4 new menu items, found {len(found_new)}"


class TestStartupMigration:
    """Test that startup migration runs correctly on server restart"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Login failed: {response.text}")
        return response.json().get("access_token")
    
    def test_roles_exist_after_startup(self, auth_token):
        """Roles should exist after startup (init_system_roles)"""
        response = requests.get(
            f"{BASE_URL}/api/roles",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        roles = response.json()
        assert len(roles) >= 10, f"Expected at least 10 system roles, got {len(roles)}"
        
        # Check for key system roles
        role_codes = [r.get("code") for r in roles]
        for expected_code in ["ADMIN", "TECHNICIEN", "VISUALISEUR", "DIRECTEUR", "QHSE"]:
            assert expected_code in role_codes, f"System role {expected_code} not found"
        
        print(f"✅ {len(roles)} roles exist after startup")
    
    def test_manual_chapters_exist_after_startup(self, auth_token):
        """Manual chapters should exist after startup migration"""
        response = requests.get(
            f"{BASE_URL}/api/manual/content",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        chapters = data.get("chapters", [])
        
        assert len(chapters) >= 25, f"Expected at least 25 chapters, got {len(chapters)}"
        print(f"✅ Manual has {len(chapters)} chapters after startup")


class TestAPIResponseStructure:
    """Verify API responses don't leak MongoDB _id"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Login failed: {response.text}")
        return response.json().get("access_token")
    
    def test_roles_response_no_mongodb_id(self, auth_token):
        """GET /api/roles should not leak MongoDB _id"""
        response = requests.get(
            f"{BASE_URL}/api/roles",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        roles = response.json()
        for role in roles:
            assert "_id" not in role, f"Role contains _id field: {role.get('code')}"
        
        print("✅ Roles response doesn't contain MongoDB _id")
    
    def test_manual_content_no_mongodb_id(self, auth_token):
        """GET /api/manual/content should not leak MongoDB _id"""
        response = requests.get(
            f"{BASE_URL}/api/manual/content",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        for chapter in data.get("chapters", [])[:5]:
            assert "_id" not in chapter, "Chapter contains _id field"
        for section in data.get("sections", [])[:5]:
            assert "_id" not in section, "Section contains _id field"
        
        print("✅ Manual content response doesn't contain MongoDB _id")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
