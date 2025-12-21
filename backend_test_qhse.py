#!/usr/bin/env python3
"""
Backend API Testing Script for GMAO Application
Tests the QHSE permissions system functionality after corrections
"""

import requests
import json
import os
from datetime import datetime, timedelta

# Use the correct backend URL from frontend .env
BACKEND_URL = "https://scripts-cleanup.preview.emergentagent.com/api"

# Test credentials - try both admin accounts
ADMIN_EMAIL_1 = "admin@example.com"
ADMIN_PASSWORD_1 = "password123"
ADMIN_EMAIL_2 = "admin@gmao-iris.local"
ADMIN_PASSWORD_2 = "Admin123!"

# QHSE test credentials (to be created)
QHSE_EMAIL = "test_qhse@test.com"
QHSE_PASSWORD = "Test123!"

class QHSEPermissionsTester:
    def __init__(self):
        self.admin_session = requests.Session()
        self.qhse_session = requests.Session()
        self.admin_token = None
        self.qhse_token = None
        self.admin_data = None
        self.qhse_data = None
        self.created_work_order_id = None
        
    def log(self, message, level="INFO"):
        """Log test messages with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def test_admin_login(self):
        """Test admin login - try both admin accounts"""
        self.log("Testing admin login...")
        
        # Try first admin account
        try:
            response = self.admin_session.post(
                f"{BACKEND_URL}/auth/login",
                json={
                    "email": ADMIN_EMAIL_1,
                    "password": ADMIN_PASSWORD_1
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data.get("access_token")
                self.admin_data = data.get("user")
                
                # Set authorization header for future requests
                self.admin_session.headers.update({
                    "Authorization": f"Bearer {self.admin_token}"
                })
                
                self.log(f"✅ Admin login successful with {ADMIN_EMAIL_1} - User: {self.admin_data.get('prenom')} {self.admin_data.get('nom')} (Role: {self.admin_data.get('role')})")
                return True
            else:
                self.log(f"⚠️ First admin login failed - Status: {response.status_code}, trying second account...")
                
        except requests.exceptions.RequestException as e:
            self.log(f"⚠️ First admin login request failed - Error: {str(e)}, trying second account...")
        
        # Try second admin account
        try:
            response = self.admin_session.post(
                f"{BACKEND_URL}/auth/login",
                json={
                    "email": ADMIN_EMAIL_2,
                    "password": ADMIN_PASSWORD_2
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data.get("access_token")
                self.admin_data = data.get("user")
                
                # Set authorization header for future requests
                self.admin_session.headers.update({
                    "Authorization": f"Bearer {self.admin_token}"
                })
                
                self.log(f"✅ Admin login successful with {ADMIN_EMAIL_2} - User: {self.admin_data.get('prenom')} {self.admin_data.get('nom')} (Role: {self.admin_data.get('role')})")
                return True
            else:
                self.log(f"❌ Both admin logins failed - Status: {response.status_code}, Response: {response.text}", "ERROR")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log(f"❌ Both admin login requests failed - Error: {str(e)}", "ERROR")
            return False
    
    def test_qhse_login(self):
        """Test QHSE login"""
        self.log("Testing QHSE login...")
        
        try:
            response = self.qhse_session.post(
                f"{BACKEND_URL}/auth/login",
                json={
                    "email": QHSE_EMAIL,
                    "password": QHSE_PASSWORD
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.qhse_token = data.get("access_token")
                self.qhse_data = data.get("user")
                
                # Set authorization header for future requests
                self.qhse_session.headers.update({
                    "Authorization": f"Bearer {self.qhse_token}"
                })
                
                self.log(f"✅ QHSE login successful - User: {self.qhse_data.get('prenom')} {self.qhse_data.get('nom')} (Role: {self.qhse_data.get('role')})")
                return True
            else:
                self.log(f"❌ QHSE login failed - Status: {response.status_code}, Response: {response.text}", "ERROR")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log(f"❌ QHSE login request failed - Error: {str(e)}", "ERROR")
            return False
    
    def create_qhse_user(self):
        """Create a QHSE user with specific permissions"""
        self.log("Creating QHSE user with QHSE role and specific permissions...")
        
        # QHSE permissions according to specifications
        qhse_permissions = {
            "dashboard": {"view": True, "edit": False, "delete": False},
            "interventionRequests": {"view": True, "edit": True, "delete": False},
            "workOrders": {"view": True, "edit": False, "delete": False},
            "improvementRequests": {"view": True, "edit": True, "delete": False},
            "improvements": {"view": True, "edit": False, "delete": False},
            "preventiveMaintenance": {"view": True, "edit": False, "delete": False},
            "assets": {"view": True, "edit": False, "delete": False},
            "inventory": {"view": True, "edit": False, "delete": False},
            "locations": {"view": True, "edit": False, "delete": False},
            "meters": {"view": True, "edit": False, "delete": False},
            "reports": {"view": True, "edit": False, "delete": False},
            # NO ACCESS TO these modules
            "vendors": {"view": False, "edit": False, "delete": False},
            "people": {"view": False, "edit": False, "delete": False},
            "planning": {"view": False, "edit": False, "delete": False},
            "purchaseHistory": {"view": False, "edit": False, "delete": False},
            "importExport": {"view": False, "edit": False, "delete": False},
            "journal": {"view": False, "edit": False, "delete": False}
        }
        
        user_data = {
            "nom": "QHSE",
            "prenom": "Test",
            "email": QHSE_EMAIL,
            "password": QHSE_PASSWORD,
            "role": "QHSE",
            "service": "Qualité",
            "permissions": qhse_permissions
        }
        
        try:
            response = self.admin_session.post(
                f"{BACKEND_URL}/users/create-member",
                json=user_data,
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                user = response.json()
                self.log(f"✅ QHSE user created successfully - ID: {user.get('id')}, Role: {user.get('role')}")
                return user
            else:
                self.log(f"❌ Failed to create QHSE user - Status: {response.status_code}, Response: {response.text}", "ERROR")
                return None
                
        except requests.exceptions.RequestException as e:
            self.log(f"❌ Create QHSE user request failed - Error: {str(e)}", "ERROR")
            return None

    # ==================== QHSE PERMISSIONS TESTS ====================
    
    def test_qhse_reports_analytics(self):
        """Test QHSE can GET /api/reports/analytics (should work - view authorized)"""
        self.log("Testing QHSE GET /api/reports/analytics...")
        
        try:
            response = self.qhse_session.get(
                f"{BACKEND_URL}/reports/analytics",
                timeout=10
            )
            
            if response.status_code == 200:
                analytics = response.json()
                self.log(f"✅ QHSE GET reports/analytics successful - Reports access authorized")
                return True
            else:
                self.log(f"❌ QHSE GET reports/analytics failed - Status: {response.status_code}, Response: {response.text}", "ERROR")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log(f"❌ QHSE GET reports/analytics request failed - Error: {str(e)}", "ERROR")
            return False

    def test_qhse_vendors_forbidden(self):
        """Test QHSE CANNOT GET /api/vendors (should return 403 - no view permission)"""
        self.log("Testing QHSE GET /api/vendors (should be forbidden)...")
        
        try:
            response = self.qhse_session.get(
                f"{BACKEND_URL}/vendors",
                timeout=10
            )
            
            if response.status_code == 403:
                self.log("✅ QHSE GET vendors correctly forbidden (403)")
                return True
            else:
                self.log(f"❌ QHSE GET vendors should be forbidden but got - Status: {response.status_code}, Response: {response.text}", "ERROR")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log(f"❌ QHSE GET vendors request failed - Error: {str(e)}", "ERROR")
            return False

    def test_qhse_meters_view_allowed(self):
        """Test QHSE can GET /api/meters (should succeed 200 - view authorized)"""
        self.log("Testing QHSE GET /api/meters...")
        
        try:
            response = self.qhse_session.get(
                f"{BACKEND_URL}/meters",
                timeout=10
            )
            
            if response.status_code == 200:
                meters = response.json()
                self.log(f"✅ QHSE GET meters successful - Found {len(meters)} meters")
                return True
            else:
                self.log(f"❌ QHSE GET meters failed - Status: {response.status_code}, Response: {response.text}", "ERROR")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log(f"❌ QHSE GET meters request failed - Error: {str(e)}", "ERROR")
            return False

    def test_qhse_meters_edit_forbidden(self):
        """Test QHSE CANNOT POST /api/meters (should fail 403 - no edit permission)"""
        self.log("Testing QHSE POST /api/meters (should be forbidden)...")
        
        meter_data = {
            "nom": "Test Meter QHSE",
            "type": "ELECTRICITE",
            "numero_serie": "TEST-QHSE-001",
            "unite": "kWh",
            "prix_unitaire": 0.15
        }
        
        try:
            response = self.qhse_session.post(
                f"{BACKEND_URL}/meters",
                json=meter_data,
                timeout=10
            )
            
            if response.status_code == 403:
                self.log("✅ QHSE POST meters correctly forbidden (403)")
                return True
            else:
                self.log(f"❌ QHSE POST meters should be forbidden but got - Status: {response.status_code}, Response: {response.text}", "ERROR")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log(f"❌ QHSE POST meters request failed - Error: {str(e)}", "ERROR")
            return False

    def test_qhse_improvements_view_allowed(self):
        """Test QHSE can GET /api/improvements (should succeed 200 - view authorized)"""
        self.log("Testing QHSE GET /api/improvements...")
        
        try:
            response = self.qhse_session.get(
                f"{BACKEND_URL}/improvements",
                timeout=10
            )
            
            if response.status_code == 200:
                improvements = response.json()
                self.log(f"✅ QHSE GET improvements successful - Found {len(improvements)} improvements")
                return True
            else:
                self.log(f"❌ QHSE GET improvements failed - Status: {response.status_code}, Response: {response.text}", "ERROR")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log(f"❌ QHSE GET improvements request failed - Error: {str(e)}", "ERROR")
            return False

    def test_qhse_improvements_edit_forbidden(self):
        """Test QHSE CANNOT POST /api/improvements (should fail 403 - no edit permission)"""
        self.log("Testing QHSE POST /api/improvements (should be forbidden)...")
        
        improvement_data = {
            "titre": "Test Improvement QHSE",
            "description": "This should fail - QHSE has no edit permission on improvements",
            "priorite": "MOYENNE",
            "type_demande": "AMELIORATION_EQUIPEMENT"
        }
        
        try:
            response = self.qhse_session.post(
                f"{BACKEND_URL}/improvements",
                json=improvement_data,
                timeout=10
            )
            
            if response.status_code == 403:
                self.log("✅ QHSE POST improvements correctly forbidden (403)")
                return True
            else:
                self.log(f"❌ QHSE POST improvements should be forbidden but got - Status: {response.status_code}, Response: {response.text}", "ERROR")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log(f"❌ QHSE POST improvements request failed - Error: {str(e)}", "ERROR")
            return False

    # ==================== WORK ORDERS PERMISSIONS TESTS ====================
    
    def test_qhse_work_orders_post_forbidden(self):
        """Test QHSE CANNOT POST /api/work-orders (should fail 403 - no edit permission)"""
        self.log("Testing QHSE POST /api/work-orders (should be forbidden)...")
        
        work_order_data = {
            "titre": "Test Work Order QHSE",
            "description": "This should fail - QHSE has no edit permission on work orders",
            "priorite": "MOYENNE",
            "statut": "OUVERT",
            "type": "CORRECTIVE",
            "dateLimite": (datetime.now() + timedelta(days=7)).isoformat()
        }
        
        try:
            response = self.qhse_session.post(
                f"{BACKEND_URL}/work-orders",
                json=work_order_data,
                timeout=10
            )
            
            if response.status_code == 403:
                self.log("✅ QHSE POST work-orders correctly forbidden (403)")
                return True
            else:
                self.log(f"❌ QHSE POST work-orders should be forbidden but got - Status: {response.status_code}, Response: {response.text}", "ERROR")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log(f"❌ QHSE POST work-orders request failed - Error: {str(e)}", "ERROR")
            return False

    def test_qhse_work_orders_delete_forbidden(self):
        """Test QHSE CANNOT DELETE /api/work-orders/{id} (should fail 403 - no delete permission)"""
        # First create a work order as admin to try to delete as QHSE
        work_order_data = {
            "titre": "Test Work Order for QHSE Delete Test",
            "description": "Work order to test QHSE delete permissions",
            "priorite": "BASSE",
            "statut": "OUVERT",
            "type": "CORRECTIVE",
            "dateLimite": (datetime.now() + timedelta(days=5)).isoformat()
        }
        
        try:
            # Create work order as admin
            create_response = self.admin_session.post(
                f"{BACKEND_URL}/work-orders",
                json=work_order_data,
                timeout=10
            )
            
            if create_response.status_code not in [200, 201]:
                self.log("❌ Failed to create work order for delete test", "ERROR")
                return False
            
            work_order = create_response.json()
            work_order_id = work_order.get('id')
            
            self.log(f"Testing QHSE DELETE /api/work-orders/{work_order_id} (should be forbidden)...")
            
            # Try to delete as QHSE
            response = self.qhse_session.delete(
                f"{BACKEND_URL}/work-orders/{work_order_id}",
                timeout=10
            )
            
            if response.status_code == 403:
                self.log("✅ QHSE DELETE work-orders correctly forbidden (403)")
                # Clean up - delete as admin
                self.admin_session.delete(f"{BACKEND_URL}/work-orders/{work_order_id}")
                return True
            else:
                self.log(f"❌ QHSE DELETE work-orders should be forbidden but got - Status: {response.status_code}, Response: {response.text}", "ERROR")
                # Clean up - delete as admin
                self.admin_session.delete(f"{BACKEND_URL}/work-orders/{work_order_id}")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log(f"❌ QHSE DELETE work-orders request failed - Error: {str(e)}", "ERROR")
            return False

    def run_qhse_permissions_tests(self):
        """Run all QHSE permissions tests for the GMAO application"""
        self.log("=" * 70)
        self.log("STARTING QHSE PERMISSIONS SYSTEM TESTS")
        self.log("=" * 70)
        
        results = {
            "admin_login": False,
            "create_qhse_user": False,
            "qhse_login": False,
            "qhse_reports_analytics": False,
            "qhse_vendors_forbidden": False,
            "qhse_meters_view_allowed": False,
            "qhse_meters_edit_forbidden": False,
            "qhse_improvements_view_allowed": False,
            "qhse_improvements_edit_forbidden": False,
            "qhse_work_orders_post_forbidden": False,
            "qhse_work_orders_delete_forbidden": False
        }
        
        # Test 1: Admin Login
        results["admin_login"] = self.test_admin_login()
        
        if not results["admin_login"]:
            self.log("❌ Cannot proceed with other tests - Admin login failed", "ERROR")
            return results
        
        # Test 2: Try to login with existing QHSE user first, create if needed
        results["qhse_login"] = self.test_qhse_login()
        
        if not results["qhse_login"]:
            # If login failed, try to create the user
            qhse_user = self.create_qhse_user()
            results["create_qhse_user"] = qhse_user is not None
            
            if qhse_user:
                # Try login again after creation
                results["qhse_login"] = self.test_qhse_login()
        else:
            # User already exists and login worked
            results["create_qhse_user"] = True
        
        if results["qhse_login"]:
            # Test QHSE permissions
            results["qhse_reports_analytics"] = self.test_qhse_reports_analytics()
            results["qhse_vendors_forbidden"] = self.test_qhse_vendors_forbidden()
            results["qhse_meters_view_allowed"] = self.test_qhse_meters_view_allowed()
            results["qhse_meters_edit_forbidden"] = self.test_qhse_meters_edit_forbidden()
            results["qhse_improvements_view_allowed"] = self.test_qhse_improvements_view_allowed()
            results["qhse_improvements_edit_forbidden"] = self.test_qhse_improvements_edit_forbidden()
            results["qhse_work_orders_post_forbidden"] = self.test_qhse_work_orders_post_forbidden()
            results["qhse_work_orders_delete_forbidden"] = self.test_qhse_work_orders_delete_forbidden()
        else:
            self.log("❌ Cannot proceed with QHSE permission tests - QHSE login failed", "ERROR")
        
        # Summary
        self.log("=" * 60)
        self.log("QHSE PERMISSIONS TEST RESULTS SUMMARY")
        self.log("=" * 60)
        
        passed = sum(results.values())
        total = len(results)
        
        # Group results by category for better readability
        self.log("\n🔐 AUTHENTICATION TESTS:")
        auth_tests = ["admin_login", "create_qhse_user", "qhse_login"]
        for test in auth_tests:
            if test in results:
                status = "✅ PASS" if results[test] else "❌ FAIL"
                self.log(f"  {test}: {status}")
        
        self.log("\n✅ QHSE ALLOWED PERMISSIONS (should work):")
        allowed_tests = ["qhse_reports_analytics", "qhse_meters_view_allowed", "qhse_improvements_view_allowed"]
        for test in allowed_tests:
            if test in results:
                status = "✅ PASS" if results[test] else "❌ FAIL"
                self.log(f"  {test}: {status}")
        
        self.log("\n🚫 QHSE FORBIDDEN PERMISSIONS (should be blocked):")
        forbidden_tests = [
            "qhse_vendors_forbidden",
            "qhse_meters_edit_forbidden", 
            "qhse_improvements_edit_forbidden",
            "qhse_work_orders_post_forbidden",
            "qhse_work_orders_delete_forbidden"
        ]
        for test in forbidden_tests:
            if test in results:
                status = "✅ PASS" if results[test] else "❌ FAIL"
                self.log(f"  {test}: {status}")
        
        self.log(f"\n📊 Overall: {passed}/{total} tests passed")
        
        if passed == total:
            self.log("🎉 ALL QHSE PERMISSIONS TESTS PASSED - Permission system is working correctly!")
            self.log("✅ QHSE users can access authorized modules (reports, meters view, improvements view)")
            self.log("✅ QHSE users are correctly blocked from unauthorized modules (vendors, edit operations)")
            self.log("✅ Forbidden operations return 403 status codes as expected")
        else:
            self.log("⚠️ Some QHSE permissions tests failed - Check the logs above for details")
            failed_tests = [test for test, result in results.items() if not result]
            self.log(f"❌ Failed tests: {', '.join(failed_tests)}")
        
        return results

if __name__ == "__main__":
    tester = QHSEPermissionsTester()
    results = tester.run_qhse_permissions_tests()
    
    # Exit with appropriate code
    if all(results.values()):
        exit(0)  # Success
    else:
        exit(1)  # Failure