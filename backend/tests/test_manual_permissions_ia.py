"""
Tests for the new IA features: Manual sections and AI permissions
Testing iteration 43: Manual updates and new permission modules (aiDashboard, aiAutomations, aiWidgets)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@test.com"
ADMIN_PASSWORD = "Admin123!"
TECHNICIEN_EMAIL = "technicien@test.com"
TECHNICIEN_PASSWORD = "Technicien123!"


class TestManualContent:
    """Tests for GET /api/manual/content - New IA sections"""

    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")

    def test_manual_content_loads(self, admin_token):
        """Test that manual content loads successfully"""
        response = requests.get(
            f"{BASE_URL}/api/manual/content",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "chapters" in data, "Response should contain 'chapters'"
        assert "sections" in data, "Response should contain 'sections'"
        print(f"✅ Manual content loaded: {len(data['chapters'])} chapters, {len(data['sections'])} sections")

    def test_assistant_ia_chapter_exists(self, admin_token):
        """Test that chapter 'Assistant IA' (ch-024) exists"""
        response = requests.get(
            f"{BASE_URL}/api/manual/content",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        chapters = data.get("chapters", [])
        
        # Find the Assistant IA chapter
        assistant_ia_chapter = None
        for chapter in chapters:
            if chapter.get("id") == "ch-024" or "Assistant IA" in chapter.get("title", ""):
                assistant_ia_chapter = chapter
                break
        
        assert assistant_ia_chapter is not None, "Chapter 'Assistant IA' (ch-024) not found in manual"
        print(f"✅ Found 'Assistant IA' chapter: {assistant_ia_chapter.get('title')}")
        return assistant_ia_chapter

    def test_assistant_ia_chapter_has_10_sections(self, admin_token):
        """Test that chapter 'Assistant IA' has 10 sections including new IA features"""
        response = requests.get(
            f"{BASE_URL}/api/manual/content",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        chapters = data.get("chapters", [])
        sections = data.get("sections", [])
        
        # Find the Assistant IA chapter
        assistant_ia_chapter = None
        for chapter in chapters:
            if chapter.get("id") == "ch-024" or "Assistant IA" in chapter.get("title", ""):
                assistant_ia_chapter = chapter
                break
        
        if assistant_ia_chapter is None:
            pytest.skip("Chapter 'Assistant IA' (ch-024) not found")
        
        # Count sections for this chapter
        chapter_section_ids = assistant_ia_chapter.get("sections", [])
        chapter_sections = [s for s in sections if s.get("id") in chapter_section_ids or s.get("chapter_id") == assistant_ia_chapter.get("id")]
        
        print(f"📖 Chapter 'Assistant IA' sections ({len(chapter_sections)}):")
        for section in chapter_sections:
            print(f"   - {section.get('id')}: {section.get('title')}")
        
        # Expected: 10 sections (including new OT creation, widgets, automations, notifications, dashboard IA, diagnostic)
        assert len(chapter_sections) >= 10, f"Expected at least 10 sections in 'Assistant IA', found {len(chapter_sections)}"
        print(f"✅ 'Assistant IA' chapter has {len(chapter_sections)} sections (expected >= 10)")

    def test_dashboard_service_chapter_exists(self, admin_token):
        """Test that chapter 'Dashboard Service' (ch-028) exists"""
        response = requests.get(
            f"{BASE_URL}/api/manual/content",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        chapters = data.get("chapters", [])
        
        # Find the Dashboard Service chapter
        dashboard_chapter = None
        for chapter in chapters:
            if chapter.get("id") == "ch-028" or "Dashboard Service" in chapter.get("title", ""):
                dashboard_chapter = chapter
                break
        
        assert dashboard_chapter is not None, "Chapter 'Dashboard Service' (ch-028) not found in manual"
        print(f"✅ Found 'Dashboard Service' chapter: {dashboard_chapter.get('title')}")

    def test_dashboard_service_chapter_has_4_sections(self, admin_token):
        """Test that chapter 'Dashboard Service' has 4 sections including 'Creer des widgets via l'IA'"""
        response = requests.get(
            f"{BASE_URL}/api/manual/content",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        chapters = data.get("chapters", [])
        sections = data.get("sections", [])
        
        # Find the Dashboard Service chapter
        dashboard_chapter = None
        for chapter in chapters:
            if chapter.get("id") == "ch-028" or "Dashboard Service" in chapter.get("title", ""):
                dashboard_chapter = chapter
                break
        
        if dashboard_chapter is None:
            pytest.skip("Chapter 'Dashboard Service' (ch-028) not found")
        
        # Count sections for this chapter
        chapter_section_ids = dashboard_chapter.get("sections", [])
        chapter_sections = [s for s in sections if s.get("id") in chapter_section_ids or s.get("chapter_id") == dashboard_chapter.get("id")]
        
        print(f"📖 Chapter 'Dashboard Service' sections ({len(chapter_sections)}):")
        for section in chapter_sections:
            print(f"   - {section.get('id')}: {section.get('title')}")
        
        # Expected: 4 sections (including 'Creer des widgets via l'IA')
        assert len(chapter_sections) >= 4, f"Expected at least 4 sections in 'Dashboard Service', found {len(chapter_sections)}"
        
        # Check for the specific section about creating widgets via IA
        widget_ia_section = None
        for section in chapter_sections:
            title = section.get("title", "").lower()
            if "widget" in title and "ia" in title:
                widget_ia_section = section
                break
        
        assert widget_ia_section is not None, "Section 'Creer des widgets via l'IA' not found in Dashboard Service chapter"
        print(f"✅ 'Dashboard Service' chapter has {len(chapter_sections)} sections (expected >= 4)")
        print(f"✅ Found 'widgets via IA' section: {widget_ia_section.get('title')}")


class TestRolesPermissions:
    """Tests for GET /api/roles - New IA permission modules"""

    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")

    def test_roles_endpoint_returns_roles(self, admin_token):
        """Test that roles endpoint returns list of roles"""
        response = requests.get(
            f"{BASE_URL}/api/roles",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Handle both array and object response formats
        if isinstance(data, list):
            roles = data
        elif isinstance(data, dict):
            roles = data.get("roles", data.get("data", []))
        else:
            roles = []
        
        assert len(roles) > 0, "Expected at least one role"
        print(f"✅ Roles endpoint returned {len(roles)} roles")
        return roles

    def test_admin_role_has_ai_permissions(self, admin_token):
        """Test that Admin role has aiDashboard, aiAutomations, aiWidgets with full permissions"""
        response = requests.get(
            f"{BASE_URL}/api/roles",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        if isinstance(data, list):
            roles = data
        elif isinstance(data, dict):
            roles = data.get("roles", data.get("data", []))
        else:
            roles = []
        
        # Find Admin role
        admin_role = None
        for role in roles:
            if role.get("code") == "ADMIN" or role.get("label", "").upper() == "ADMIN":
                admin_role = role
                break
        
        assert admin_role is not None, "Admin role not found"
        
        permissions = admin_role.get("permissions", {})
        
        # Check aiDashboard permissions
        ai_dashboard = permissions.get("aiDashboard", {})
        assert ai_dashboard.get("view") == True, "Admin should have aiDashboard.view=true"
        assert ai_dashboard.get("edit") == True, "Admin should have aiDashboard.edit=true"
        assert ai_dashboard.get("delete") == True, "Admin should have aiDashboard.delete=true"
        print(f"✅ Admin aiDashboard: view={ai_dashboard.get('view')}, edit={ai_dashboard.get('edit')}, delete={ai_dashboard.get('delete')}")
        
        # Check aiAutomations permissions
        ai_automations = permissions.get("aiAutomations", {})
        assert ai_automations.get("view") == True, "Admin should have aiAutomations.view=true"
        assert ai_automations.get("edit") == True, "Admin should have aiAutomations.edit=true"
        assert ai_automations.get("delete") == True, "Admin should have aiAutomations.delete=true"
        print(f"✅ Admin aiAutomations: view={ai_automations.get('view')}, edit={ai_automations.get('edit')}, delete={ai_automations.get('delete')}")
        
        # Check aiWidgets permissions
        ai_widgets = permissions.get("aiWidgets", {})
        assert ai_widgets.get("view") == True, "Admin should have aiWidgets.view=true"
        assert ai_widgets.get("edit") == True, "Admin should have aiWidgets.edit=true"
        assert ai_widgets.get("delete") == True, "Admin should have aiWidgets.delete=true"
        print(f"✅ Admin aiWidgets: view={ai_widgets.get('view')}, edit={ai_widgets.get('edit')}, delete={ai_widgets.get('delete')}")

    def test_technicien_role_has_restricted_ai_permissions(self, admin_token):
        """Test that Technicien role has aiDashboard, aiAutomations, aiWidgets with view=true, edit/delete=false"""
        response = requests.get(
            f"{BASE_URL}/api/roles",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        if isinstance(data, list):
            roles = data
        elif isinstance(data, dict):
            roles = data.get("roles", data.get("data", []))
        else:
            roles = []
        
        # Find Technicien role
        technicien_role = None
        for role in roles:
            if role.get("code") == "TECHNICIEN" or "technicien" in role.get("label", "").lower():
                technicien_role = role
                break
        
        assert technicien_role is not None, "Technicien role not found"
        print(f"📋 Found Technicien role: {technicien_role.get('code')} / {technicien_role.get('label')}")
        
        permissions = technicien_role.get("permissions", {})
        
        # Check aiDashboard permissions
        ai_dashboard = permissions.get("aiDashboard", {})
        assert ai_dashboard.get("view") == True, "Technicien should have aiDashboard.view=true"
        assert ai_dashboard.get("edit") == False, "Technicien should have aiDashboard.edit=false"
        assert ai_dashboard.get("delete") == False, "Technicien should have aiDashboard.delete=false"
        print(f"✅ Technicien aiDashboard: view={ai_dashboard.get('view')}, edit={ai_dashboard.get('edit')}, delete={ai_dashboard.get('delete')}")
        
        # Check aiAutomations permissions
        ai_automations = permissions.get("aiAutomations", {})
        assert ai_automations.get("view") == True, "Technicien should have aiAutomations.view=true"
        assert ai_automations.get("edit") == False, "Technicien should have aiAutomations.edit=false"
        assert ai_automations.get("delete") == False, "Technicien should have aiAutomations.delete=false"
        print(f"✅ Technicien aiAutomations: view={ai_automations.get('view')}, edit={ai_automations.get('edit')}, delete={ai_automations.get('delete')}")
        
        # Check aiWidgets permissions
        ai_widgets = permissions.get("aiWidgets", {})
        assert ai_widgets.get("view") == True, "Technicien should have aiWidgets.view=true"
        assert ai_widgets.get("edit") == False, "Technicien should have aiWidgets.edit=false"
        assert ai_widgets.get("delete") == False, "Technicien should have aiWidgets.delete=false"
        print(f"✅ Technicien aiWidgets: view={ai_widgets.get('view')}, edit={ai_widgets.get('edit')}, delete={ai_widgets.get('delete')}")


class TestAIWidgetPermissions:
    """Tests for AI Widget generation permissions (require_permission)"""

    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")

    @pytest.fixture(scope="class")
    def technicien_token(self):
        """Get technicien auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TECHNICIEN_EMAIL,
            "password": TECHNICIEN_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            return data.get("access_token") or data.get("token")
        pytest.skip(f"Technicien login failed: {response.status_code} - {response.text}")

    def test_technicien_denied_widget_generation(self, technicien_token):
        """Test that technicien is denied (403) when trying to generate a widget"""
        response = requests.post(
            f"{BASE_URL}/api/ai/widgets/generate",
            headers={"Authorization": f"Bearer {technicien_token}"},
            json={
                "description": "Cree un camembert des OT par statut"
            }
        )
        
        # Expected: 403 Forbidden because technicien has aiWidgets.edit=false
        assert response.status_code == 403, f"Expected 403 Forbidden, got {response.status_code}: {response.text}"
        print(f"✅ Technicien correctly denied access to widget generation (403)")

    def test_admin_allowed_widget_generation(self, admin_token):
        """Test that admin is allowed to generate a widget (regression test)"""
        response = requests.post(
            f"{BASE_URL}/api/ai/widgets/generate",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "description": "Widget test iteration 43 - nombre total OT"
            }
        )
        
        # Expected: 200 OK because admin has aiWidgets.edit=true
        # Note: The actual response might take time due to LLM call, but it should not return 403
        assert response.status_code != 403, f"Admin should not get 403, got {response.status_code}: {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True, "Expected success=true"
            widget = data.get("widget", {})
            print(f"✅ Admin successfully generated widget: {widget.get('name')}")
            
            # Clean up - delete the test widget
            widget_id = widget.get("id")
            if widget_id:
                delete_response = requests.delete(
                    f"{BASE_URL}/api/custom-widgets/{widget_id}",
                    headers={"Authorization": f"Bearer {admin_token}"}
                )
                print(f"   Cleanup: deleted test widget {widget_id}")
        else:
            print(f"⚠️ Widget generation returned {response.status_code} (not 403, which is correct)")


class TestAutomationPermissions:
    """Tests for Automation parse permissions (require_permission)"""

    @pytest.fixture(scope="class")
    def technicien_token(self):
        """Get technicien auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TECHNICIEN_EMAIL,
            "password": TECHNICIEN_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            return data.get("access_token") or data.get("token")
        pytest.skip(f"Technicien login failed: {response.status_code} - {response.text}")

    def test_technicien_denied_automation_parse(self, technicien_token):
        """Test that technicien is denied (403) when trying to parse automation"""
        response = requests.post(
            f"{BASE_URL}/api/automations/parse",
            headers={"Authorization": f"Bearer {technicien_token}"},
            json={
                "message": "Alerte moi quand la temperature depasse 30 degres"
            }
        )
        
        # Expected: 403 Forbidden because technicien has aiAutomations.edit=false
        assert response.status_code == 403, f"Expected 403 Forbidden, got {response.status_code}: {response.text}"
        print(f"✅ Technicien correctly denied access to automation parse (403)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
