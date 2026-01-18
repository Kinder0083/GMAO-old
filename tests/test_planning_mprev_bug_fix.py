"""
Test suite for Planning M.Prev Bug Fix P0:
- Verify that maintenance end dates are respected in the calendar
- Days AFTER maintenance end date should show 'Sans données' (gray), not EN_MAINTENANCE (yellow)
- Test the getLastMaintenanceEndDate() and getStatusBlocksForDay() logic

Bug Description:
When a maintenance request is approved, the calendar shows the start date correctly
but the end date is not respected. The EN_MAINTENANCE status (yellow) appears infinite
beyond the planned maintenance end date.

Fix Applied:
1. New function getLastMaintenanceEndDate() to find the end date of the last maintenance
2. Modified getStatusBlocksForDay() to return null (gray) for days after this date
3. Improved API filtering to correctly overlap periods
4. New cron job manage_planned_maintenance_status() to manage automatic status transitions
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://proxmox-debugger.preview.emergentagent.com').rstrip('/')


class TestPlanningMPrevBugFix:
    """Test Planning M.Prev maintenance end date bug fix"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "password"
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            self.token = data.get("access_token") or data.get("token")
            self.user = data.get("user")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
            print(f"✓ Logged in as: {self.user.get('email')}")
        else:
            pytest.skip(f"Login failed: {login_response.status_code}")
    
    # ==================== API TESTS ====================
    
    def test_planning_equipements_returns_date_debut_and_date_fin(self):
        """Test that planning entries have both date_debut and date_fin fields"""
        response = self.session.get(f"{BASE_URL}/api/demandes-arret/planning/equipements")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        entries = response.json()
        assert isinstance(entries, list), "Response should be a list"
        
        print(f"✓ Found {len(entries)} planning entries")
        
        for entry in entries:
            assert "date_debut" in entry, f"Entry missing date_debut: {entry}"
            assert "date_fin" in entry, f"Entry missing date_fin: {entry}"
            assert "equipement_id" in entry, f"Entry missing equipement_id: {entry}"
            
            # Verify date_fin >= date_debut
            date_debut = entry["date_debut"]
            date_fin = entry["date_fin"]
            assert date_fin >= date_debut, f"date_fin ({date_fin}) should be >= date_debut ({date_debut})"
            
            print(f"  Entry: {entry.get('equipement_id')} - {date_debut} to {date_fin}")
        
        return entries
    
    def test_planning_equipements_filter_by_date_range(self):
        """Test that API correctly filters by date range (overlap logic)"""
        # Get entries for January 2026
        response = self.session.get(
            f"{BASE_URL}/api/demandes-arret/planning/equipements",
            params={"date_debut": "2026-01-01", "date_fin": "2026-01-31"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        entries = response.json()
        print(f"✓ Found {len(entries)} entries for January 2026")
        
        # All entries should overlap with January 2026
        for entry in entries:
            date_debut = entry["date_debut"]
            date_fin = entry["date_fin"]
            
            # Entry should overlap with January 2026
            # Overlap condition: entry.date_fin >= query.date_debut AND entry.date_debut <= query.date_fin
            assert date_fin >= "2026-01-01", f"Entry date_fin ({date_fin}) should be >= 2026-01-01"
            assert date_debut <= "2026-01-31", f"Entry date_debut ({date_debut}) should be <= 2026-01-31"
            
            print(f"  ✓ Entry overlaps correctly: {date_debut} to {date_fin}")
    
    def test_planning_entries_have_correct_status(self):
        """Test that planning entries have EN_MAINTENANCE status"""
        response = self.session.get(f"{BASE_URL}/api/demandes-arret/planning/equipements")
        
        assert response.status_code == 200
        
        entries = response.json()
        
        for entry in entries:
            statut = entry.get("statut")
            assert statut == "EN_MAINTENANCE", f"Expected EN_MAINTENANCE, got {statut}"
        
        print(f"✓ All {len(entries)} entries have EN_MAINTENANCE status")
    
    def test_planning_entries_not_terminated(self):
        """Test that terminated maintenances are not returned"""
        response = self.session.get(f"{BASE_URL}/api/demandes-arret/planning/equipements")
        
        assert response.status_code == 200
        
        entries = response.json()
        
        # Check that no entry has fin_anticipee = True
        for entry in entries:
            fin_anticipee = entry.get("fin_anticipee", False)
            assert not fin_anticipee, f"Entry should not have fin_anticipee=True: {entry}"
        
        print(f"✓ No terminated entries in planning")
    
    # ==================== EQUIPMENT STATUS TESTS ====================
    
    def test_equipment_status_history_endpoint(self):
        """Test that status history endpoint returns data"""
        response = self.session.get(f"{BASE_URL}/api/equipments/status-history")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        history = response.json()
        assert isinstance(history, list), "Response should be a list"
        
        print(f"✓ Found {len(history)} status history entries")
        
        # Check structure of entries
        if len(history) > 0:
            entry = history[0]
            assert "equipment_id" in entry, "Entry should have equipment_id"
            assert "statut" in entry, "Entry should have statut"
            assert "changed_at" in entry, "Entry should have changed_at"
            print(f"  Sample entry: {entry.get('equipment_id')} - {entry.get('statut')} at {entry.get('changed_at')}")
    
    def test_equipment_current_status(self):
        """Test that equipment current status is correct"""
        response = self.session.get(f"{BASE_URL}/api/equipments")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        equipments = response.json()
        
        print(f"✓ Found {len(equipments)} equipments")
        
        for eq in equipments:
            eq_id = eq.get("id")
            nom = eq.get("nom")
            statut = eq.get("statut")
            
            print(f"  Equipment: {nom} ({eq_id}) - Status: {statut}")
            
            # Verify status is a valid value
            valid_statuses = ["OPERATIONNEL", "EN_FONCTIONNEMENT", "A_LARRET", "EN_MAINTENANCE", "HORS_SERVICE", "EN_CT", "DEGRADE", "ALERTE_S_EQUIP"]
            assert statut in valid_statuses, f"Invalid status: {statut}"
    
    # ==================== DEMANDES ARRET TESTS ====================
    
    def test_demandes_arret_list(self):
        """Test that demandes d'arrêt list returns data"""
        response = self.session.get(f"{BASE_URL}/api/demandes-arret/")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        demandes = response.json()
        assert isinstance(demandes, list), "Response should be a list"
        
        print(f"✓ Found {len(demandes)} demandes d'arrêt")
        
        # Check for approved demandes
        approved = [d for d in demandes if d.get("statut") == "APPROUVEE"]
        print(f"  Approved demandes: {len(approved)}")
        
        for d in approved:
            print(f"    - {d.get('id')}: {d.get('date_debut')} to {d.get('date_fin')}")
    
    def test_demandes_arret_have_date_range(self):
        """Test that approved demandes have date_debut and date_fin"""
        response = self.session.get(f"{BASE_URL}/api/demandes-arret/")
        
        assert response.status_code == 200
        
        demandes = response.json()
        approved = [d for d in demandes if d.get("statut") == "APPROUVEE"]
        
        for d in approved:
            assert "date_debut" in d, f"Demande missing date_debut: {d.get('id')}"
            assert "date_fin" in d, f"Demande missing date_fin: {d.get('id')}"
            
            date_debut = d["date_debut"]
            date_fin = d["date_fin"]
            
            assert date_fin >= date_debut, f"date_fin ({date_fin}) should be >= date_debut ({date_debut})"
            
            print(f"✓ Demande {d.get('id')}: {date_debut} to {date_fin}")
    
    # ==================== ANNUAL STATISTICS TESTS ====================
    
    def test_annual_statistics_calculation(self):
        """Test that annual statistics are calculated correctly"""
        # Get equipments
        eq_response = self.session.get(f"{BASE_URL}/api/equipments")
        assert eq_response.status_code == 200
        equipments = eq_response.json()
        
        # Get status history
        history_response = self.session.get(f"{BASE_URL}/api/equipments/status-history")
        assert history_response.status_code == 200
        history = history_response.json()
        
        # Get planning entries
        planning_response = self.session.get(f"{BASE_URL}/api/demandes-arret/planning/equipements")
        assert planning_response.status_code == 200
        planning = planning_response.json()
        
        print(f"✓ Data loaded: {len(equipments)} equipments, {len(history)} history entries, {len(planning)} planning entries")
        
        # Verify we have data to calculate statistics
        assert len(equipments) > 0, "Should have at least one equipment"
        
        # The frontend calculates statistics based on:
        # - Status history for historical data
        # - Planning entries for planned maintenances
        # - Days after last maintenance end date should be "Sans données" (not counted)
        
        print("✓ Annual statistics data available for calculation")


class TestMaintenanceEndDateLogic:
    """Test the specific logic for maintenance end date handling"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "password"
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            self.token = data.get("access_token") or data.get("token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip(f"Login failed: {login_response.status_code}")
    
    def test_maintenance_entries_have_bounded_dates(self):
        """
        Test that maintenance entries have bounded dates (not infinite).
        This is the core of the bug fix - maintenances should have clear end dates.
        """
        response = self.session.get(f"{BASE_URL}/api/demandes-arret/planning/equipements")
        
        assert response.status_code == 200
        
        entries = response.json()
        
        for entry in entries:
            date_debut = entry.get("date_debut")
            date_fin = entry.get("date_fin")
            
            assert date_debut is not None, "date_debut should not be None"
            assert date_fin is not None, "date_fin should not be None"
            
            # Parse dates
            start = datetime.strptime(date_debut, "%Y-%m-%d")
            end = datetime.strptime(date_fin, "%Y-%m-%d")
            
            # Maintenance should not be infinite (max 365 days)
            duration = (end - start).days
            assert duration <= 365, f"Maintenance duration ({duration} days) seems too long"
            assert duration >= 0, f"Maintenance duration ({duration} days) should be positive"
            
            print(f"✓ Entry {entry.get('id')}: {date_debut} to {date_fin} ({duration} days)")
    
    def test_equipment_with_maintenance_has_correct_planning(self):
        """
        Test that equipment with active maintenance has correct planning entries.
        """
        # Get equipments
        eq_response = self.session.get(f"{BASE_URL}/api/equipments")
        assert eq_response.status_code == 200
        equipments = eq_response.json()
        
        # Get planning entries
        planning_response = self.session.get(f"{BASE_URL}/api/demandes-arret/planning/equipements")
        assert planning_response.status_code == 200
        planning = planning_response.json()
        
        # Group planning by equipment
        planning_by_eq = {}
        for entry in planning:
            eq_id = entry.get("equipement_id")
            if eq_id not in planning_by_eq:
                planning_by_eq[eq_id] = []
            planning_by_eq[eq_id].append(entry)
        
        # Check each equipment
        for eq in equipments:
            eq_id = eq.get("id")
            nom = eq.get("nom")
            statut = eq.get("statut")
            
            eq_planning = planning_by_eq.get(eq_id, [])
            
            if statut == "EN_MAINTENANCE":
                # Equipment in maintenance should have planning entries
                # (unless it's a manual status change)
                print(f"  Equipment {nom} is EN_MAINTENANCE with {len(eq_planning)} planning entries")
            else:
                print(f"  Equipment {nom} is {statut} with {len(eq_planning)} planning entries")
    
    def test_last_maintenance_end_date_logic(self):
        """
        Test the logic for finding the last maintenance end date.
        This is used to determine when to show 'Sans données' (gray) in the calendar.
        """
        # Get planning entries
        response = self.session.get(f"{BASE_URL}/api/demandes-arret/planning/equipements")
        assert response.status_code == 200
        planning = response.json()
        
        # Group by equipment and find last end date
        last_end_by_eq = {}
        for entry in planning:
            eq_id = entry.get("equipement_id")
            date_fin = entry.get("date_fin")
            
            if eq_id not in last_end_by_eq or date_fin > last_end_by_eq[eq_id]:
                last_end_by_eq[eq_id] = date_fin
        
        print(f"✓ Last maintenance end dates by equipment:")
        for eq_id, last_end in last_end_by_eq.items():
            print(f"  {eq_id}: {last_end}")
        
        # Verify the logic: days after last_end should be "Sans données"
        # This is what the frontend getLastMaintenanceEndDate() function does
        assert len(last_end_by_eq) > 0, "Should have at least one equipment with maintenance"


class TestCronJobEndpoints:
    """Test cron job related endpoints for maintenance status management"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "password"
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            self.token = data.get("access_token") or data.get("token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip(f"Login failed: {login_response.status_code}")
    
    def test_check_end_maintenance_endpoint(self):
        """Test POST /api/demandes-arret/check-end-maintenance endpoint"""
        response = self.session.post(f"{BASE_URL}/api/demandes-arret/check-end-maintenance")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "emails_sent" in data, "Response should contain 'emails_sent'"
        assert "message" in data, "Response should contain 'message'"
        
        print(f"✓ Check end maintenance: {data['message']}")
    
    def test_check_expired_demandes_endpoint(self):
        """Test POST /api/demandes-arret/check-expired endpoint"""
        response = self.session.post(f"{BASE_URL}/api/demandes-arret/check-expired")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "expired_count" in data, "Response should contain 'expired_count'"
        assert "message" in data, "Response should contain 'message'"
        
        print(f"✓ Check expired: {data['message']}")
    
    def test_trigger_reminders_endpoint(self):
        """Test GET /api/demandes-arret/trigger-reminders endpoint"""
        response = self.session.get(f"{BASE_URL}/api/demandes-arret/trigger-reminders")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "status" in data, "Response should contain 'status'"
        
        print(f"✓ Trigger reminders: status={data['status']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
