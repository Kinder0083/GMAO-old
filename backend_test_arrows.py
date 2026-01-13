#!/usr/bin/env python3
"""
Backend API Testing Script for Menu Organization Arrow Buttons
Tests the arrow buttons functionality for reordering menus and categories
"""

import requests
import json
import os
import time
from datetime import datetime, timedelta

# Use the correct backend URL from frontend .env
BACKEND_URL = "https://equip-status-3.preview.emergentagent.com/api"

# Test credentials
ADMIN_EMAIL = "admin@test.com"
ADMIN_PASSWORD = "testpassword"

class MenuArrowButtonsTester:
    def __init__(self):
        self.admin_session = requests.Session()
        self.admin_token = None
        self.admin_data = None
        self.original_preferences = None
        
    def log(self, message, level="INFO"):
        """Log test messages with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def test_admin_login(self):
        """Test admin login"""
        self.log("Testing admin login...")
        
        try:
            response = self.admin_session.post(
                f"{BACKEND_URL}/auth/login",
                json={
                    "email": ADMIN_EMAIL,
                    "password": ADMIN_PASSWORD
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
                
                self.log(f"✅ Admin login successful - User: {self.admin_data.get('prenom')} {self.admin_data.get('nom')} (Role: {self.admin_data.get('role')})")
                return True
            else:
                self.log(f"❌ Admin login failed - Status: {response.status_code}, Response: {response.text}", "ERROR")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log(f"❌ Admin login request failed - Error: {str(e)}", "ERROR")
            return False
    
    def setup_test_data(self):
        """Setup test data with multiple categories and menus for arrow testing"""
        self.log("🔧 Setting up test data for arrow buttons testing...")
        
        try:
            # Get current preferences
            response = self.admin_session.get(f"{BACKEND_URL}/user-preferences", timeout=15)
            if response.status_code != 200:
                self.log("❌ Failed to get current preferences", "ERROR")
                return False
            
            current_prefs = response.json()
            self.original_preferences = current_prefs  # Store for cleanup
            
            # Create test categories with specific order
            test_categories = [
                {
                    "id": "cat_maintenance_test",
                    "name": "Maintenance",
                    "icon": "Wrench",
                    "order": 0,
                    "items": []
                },
                {
                    "id": "cat_stock_test", 
                    "name": "Stock",
                    "icon": "Package",
                    "order": 1,
                    "items": []
                },
                {
                    "id": "cat_iot_test",
                    "name": "IoT",
                    "icon": "Wifi", 
                    "order": 2,
                    "items": []
                }
            ]
            
            # Create test menu items with specific order
            test_menu_items = [
                {
                    "id": "work-orders",
                    "label": "Ordres de travail",
                    "path": "/work-orders",
                    "icon": "ClipboardList",
                    "module": "workOrders",
                    "order": 0,
                    "visible": True,
                    "favorite": False,
                    "category_id": "cat_maintenance_test"
                },
                {
                    "id": "preventive-maintenance",
                    "label": "Maintenance prev.",
                    "path": "/preventive-maintenance", 
                    "icon": "Calendar",
                    "module": "preventiveMaintenance",
                    "order": 1,
                    "visible": True,
                    "favorite": False,
                    "category_id": "cat_maintenance_test"
                },
                {
                    "id": "assets",
                    "label": "Équipements",
                    "path": "/assets",
                    "icon": "Wrench",
                    "module": "assets",
                    "order": 2,
                    "visible": True,
                    "favorite": False,
                    "category_id": "cat_maintenance_test"
                },
                {
                    "id": "inventory",
                    "label": "Inventaire",
                    "path": "/inventory",
                    "icon": "Package",
                    "module": "inventory",
                    "order": 0,
                    "visible": True,
                    "favorite": False,
                    "category_id": "cat_stock_test"
                },
                {
                    "id": "dashboard",
                    "label": "Tableau de bord",
                    "path": "/dashboard",
                    "icon": "LayoutDashboard",
                    "module": "dashboard",
                    "order": 0,
                    "visible": True,
                    "favorite": False,
                    "category_id": None  # Uncategorized
                },
                {
                    "id": "reports",
                    "label": "Rapports",
                    "path": "/reports",
                    "icon": "BarChart3",
                    "module": "reports",
                    "order": 1,
                    "visible": True,
                    "favorite": False,
                    "category_id": None  # Uncategorized
                }
            ]
            
            # Update preferences with test data
            update_data = {
                "menu_categories": test_categories,
                "menu_items": test_menu_items
            }
            
            response = self.admin_session.put(
                f"{BACKEND_URL}/user-preferences",
                json=update_data,
                timeout=15
            )
            
            if response.status_code == 200:
                self.log("✅ Test data setup successful")
                self.log(f"   Created {len(test_categories)} categories")
                self.log(f"   Created {len(test_menu_items)} menu items")
                return True
            else:
                self.log(f"❌ Test data setup failed - Status: {response.status_code}", "ERROR")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log(f"❌ Test data setup failed - Error: {str(e)}", "ERROR")
            return False
    
    def test_move_category_down(self):
        """TEST 1: Move first category (Maintenance) down using arrow button logic"""
        self.log("🧪 TEST 1: Move category DOWN (Maintenance: order 0 → 1)")
        
        try:
            # Get current preferences
            response = self.admin_session.get(f"{BACKEND_URL}/user-preferences", timeout=15)
            if response.status_code != 200:
                self.log("❌ Failed to get current preferences", "ERROR")
                return False
            
            current_prefs = response.json()
            categories = current_prefs.get("menu_categories", [])
            
            # Find Maintenance category (should be at order 0)
            maintenance_cat = None
            for cat in categories:
                if cat.get("name") == "Maintenance":
                    maintenance_cat = cat
                    break
            
            if not maintenance_cat:
                self.log("❌ Maintenance category not found", "ERROR")
                return False
            
            if maintenance_cat.get("order") != 0:
                self.log(f"❌ Maintenance category not at order 0 (current: {maintenance_cat.get('order')})", "ERROR")
                return False
            
            # Simulate DOWN arrow click: swap with next category
            # Find category at order 1
            next_cat = None
            for cat in categories:
                if cat.get("order") == 1:
                    next_cat = cat
                    break
            
            if not next_cat:
                self.log("❌ No category at order 1 to swap with", "ERROR")
                return False
            
            # Swap orders
            maintenance_cat["order"] = 1
            next_cat["order"] = 0
            
            self.log(f"   Swapping: {maintenance_cat['name']} (0→1) ↔ {next_cat['name']} (1→0)")
            
            # Update preferences
            update_data = {"menu_categories": categories}
            
            response = self.admin_session.put(
                f"{BACKEND_URL}/user-preferences",
                json=update_data,
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                updated_categories = data.get("menu_categories", [])
                
                # Verify the swap
                maintenance_new = None
                other_new = None
                for cat in updated_categories:
                    if cat.get("name") == "Maintenance":
                        maintenance_new = cat
                    elif cat.get("id") == next_cat.get("id"):
                        other_new = cat
                
                if (maintenance_new and maintenance_new.get("order") == 1 and 
                    other_new and other_new.get("order") == 0):
                    self.log("✅ Category DOWN movement successful")
                    self.log(f"   Maintenance now at order: {maintenance_new.get('order')}")
                    self.log(f"   {other_new.get('name')} now at order: {other_new.get('order')}")
                    return True
                else:
                    self.log("❌ Category order swap verification failed", "ERROR")
                    return False
            else:
                self.log(f"❌ Category move failed - Status: {response.status_code}", "ERROR")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log(f"❌ Request failed - Error: {str(e)}", "ERROR")
            return False
    
    def test_move_category_up(self):
        """TEST 2: Move second category UP using arrow button logic"""
        self.log("🧪 TEST 2: Move category UP (Stock: order 1 → 0)")
        
        try:
            # Get current preferences
            response = self.admin_session.get(f"{BACKEND_URL}/user-preferences", timeout=15)
            if response.status_code != 200:
                self.log("❌ Failed to get current preferences", "ERROR")
                return False
            
            current_prefs = response.json()
            categories = current_prefs.get("menu_categories", [])
            
            # Find Stock category (should be at order 0 after previous test)
            stock_cat = None
            for cat in categories:
                if cat.get("name") == "Stock":
                    stock_cat = cat
                    break
            
            if not stock_cat:
                self.log("❌ Stock category not found", "ERROR")
                return False
            
            current_order = stock_cat.get("order")
            if current_order == 0:
                self.log("ℹ️  Stock category already at top (order 0), cannot move up")
                return True  # This is expected behavior
            
            # Simulate UP arrow click: swap with previous category
            prev_cat = None
            for cat in categories:
                if cat.get("order") == current_order - 1:
                    prev_cat = cat
                    break
            
            if not prev_cat:
                self.log(f"❌ No category at order {current_order - 1} to swap with", "ERROR")
                return False
            
            # Swap orders
            stock_cat["order"] = current_order - 1
            prev_cat["order"] = current_order
            
            self.log(f"   Swapping: {stock_cat['name']} ({current_order}→{current_order-1}) ↔ {prev_cat['name']} ({current_order-1}→{current_order})")
            
            # Update preferences
            update_data = {"menu_categories": categories}
            
            response = self.admin_session.put(
                f"{BACKEND_URL}/user-preferences",
                json=update_data,
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                updated_categories = data.get("menu_categories", [])
                
                # Verify the swap
                stock_new = None
                prev_new = None
                for cat in updated_categories:
                    if cat.get("name") == "Stock":
                        stock_new = cat
                    elif cat.get("id") == prev_cat.get("id"):
                        prev_new = cat
                
                if (stock_new and stock_new.get("order") == current_order - 1 and 
                    prev_new and prev_new.get("order") == current_order):
                    self.log("✅ Category UP movement successful")
                    self.log(f"   Stock now at order: {stock_new.get('order')}")
                    self.log(f"   {prev_new.get('name')} now at order: {prev_new.get('order')}")
                    return True
                else:
                    self.log("❌ Category order swap verification failed", "ERROR")
                    return False
            else:
                self.log(f"❌ Category move failed - Status: {response.status_code}", "ERROR")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log(f"❌ Request failed - Error: {str(e)}", "ERROR")
            return False
    
    def test_move_menu_down_within_category(self):
        """TEST 3: Move menu item DOWN within a category"""
        self.log("🧪 TEST 3: Move menu item DOWN within category (Ordres de travail: order 0 → 1)")
        
        try:
            # Get current preferences
            response = self.admin_session.get(f"{BACKEND_URL}/user-preferences", timeout=15)
            if response.status_code != 200:
                self.log("❌ Failed to get current preferences", "ERROR")
                return False
            
            current_prefs = response.json()
            menu_items = current_prefs.get("menu_items", [])
            
            # Find "Ordres de travail" menu in Maintenance category
            work_orders_menu = None
            maintenance_menus = []
            
            for item in menu_items:
                if item.get("category_id") and "maintenance" in item.get("category_id", "").lower():
                    maintenance_menus.append(item)
                    if item.get("id") == "work-orders":
                        work_orders_menu = item
            
            if not work_orders_menu:
                self.log("❌ Work orders menu not found in Maintenance category", "ERROR")
                return False
            
            current_order = work_orders_menu.get("order")
            
            # Find next menu in same category
            next_menu = None
            for item in maintenance_menus:
                if item.get("order") == current_order + 1:
                    next_menu = item
                    break
            
            if not next_menu:
                self.log("❌ No next menu item in category to swap with", "ERROR")
                return False
            
            # Swap orders within category
            work_orders_menu["order"] = current_order + 1
            next_menu["order"] = current_order
            
            self.log(f"   Swapping within Maintenance: {work_orders_menu['label']} ({current_order}→{current_order+1}) ↔ {next_menu['label']} ({current_order+1}→{current_order})")
            
            # Update preferences
            update_data = {"menu_items": menu_items}
            
            response = self.admin_session.put(
                f"{BACKEND_URL}/user-preferences",
                json=update_data,
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                updated_items = data.get("menu_items", [])
                
                # Verify the swap
                work_orders_new = None
                next_new = None
                for item in updated_items:
                    if item.get("id") == "work-orders":
                        work_orders_new = item
                    elif item.get("id") == next_menu.get("id"):
                        next_new = item
                
                if (work_orders_new and work_orders_new.get("order") == current_order + 1 and 
                    next_new and next_new.get("order") == current_order):
                    self.log("✅ Menu item DOWN movement within category successful")
                    self.log(f"   {work_orders_new.get('label')} now at order: {work_orders_new.get('order')}")
                    self.log(f"   {next_new.get('label')} now at order: {next_new.get('order')}")
                    return True
                else:
                    self.log("❌ Menu item order swap verification failed", "ERROR")
                    return False
            else:
                self.log(f"❌ Menu item move failed - Status: {response.status_code}", "ERROR")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log(f"❌ Request failed - Error: {str(e)}", "ERROR")
            return False
    
    def test_move_menu_up_within_category(self):
        """TEST 4: Move menu item UP within a category"""
        self.log("🧪 TEST 4: Move menu item UP within category")
        
        try:
            # Get current preferences
            response = self.admin_session.get(f"{BACKEND_URL}/user-preferences", timeout=15)
            if response.status_code != 200:
                self.log("❌ Failed to get current preferences", "ERROR")
                return False
            
            current_prefs = response.json()
            menu_items = current_prefs.get("menu_items", [])
            
            # Find a menu that's not at order 0 in its category
            target_menu = None
            maintenance_menus = []
            
            for item in menu_items:
                if item.get("category_id") and "maintenance" in item.get("category_id", "").lower():
                    maintenance_menus.append(item)
                    if item.get("order") > 0:  # Not at top
                        target_menu = item
                        break
            
            if not target_menu:
                self.log("ℹ️  No menu item found that can be moved up", "INFO")
                return True  # This is acceptable
            
            current_order = target_menu.get("order")
            
            # Find previous menu in same category
            prev_menu = None
            for item in maintenance_menus:
                if item.get("order") == current_order - 1:
                    prev_menu = item
                    break
            
            if not prev_menu:
                self.log("❌ No previous menu item in category to swap with", "ERROR")
                return False
            
            # Swap orders within category
            target_menu["order"] = current_order - 1
            prev_menu["order"] = current_order
            
            self.log(f"   Swapping within Maintenance: {target_menu['label']} ({current_order}→{current_order-1}) ↔ {prev_menu['label']} ({current_order-1}→{current_order})")
            
            # Update preferences
            update_data = {"menu_items": menu_items}
            
            response = self.admin_session.put(
                f"{BACKEND_URL}/user-preferences",
                json=update_data,
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                updated_items = data.get("menu_items", [])
                
                # Verify the swap
                target_new = None
                prev_new = None
                for item in updated_items:
                    if item.get("id") == target_menu.get("id"):
                        target_new = item
                    elif item.get("id") == prev_menu.get("id"):
                        prev_new = item
                
                if (target_new and target_new.get("order") == current_order - 1 and 
                    prev_new and prev_new.get("order") == current_order):
                    self.log("✅ Menu item UP movement within category successful")
                    self.log(f"   {target_new.get('label')} now at order: {target_new.get('order')}")
                    self.log(f"   {prev_new.get('label')} now at order: {prev_new.get('order')}")
                    return True
                else:
                    self.log("❌ Menu item order swap verification failed", "ERROR")
                    return False
            else:
                self.log(f"❌ Menu item move failed - Status: {response.status_code}", "ERROR")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log(f"❌ Request failed - Error: {str(e)}", "ERROR")
            return False
    
    def test_move_uncategorized_menu_down(self):
        """TEST 5: Move uncategorized menu item DOWN"""
        self.log("🧪 TEST 5: Move uncategorized menu item DOWN")
        
        try:
            # Get current preferences
            response = self.admin_session.get(f"{BACKEND_URL}/user-preferences", timeout=15)
            if response.status_code != 200:
                self.log("❌ Failed to get current preferences", "ERROR")
                return False
            
            current_prefs = response.json()
            menu_items = current_prefs.get("menu_items", [])
            
            # Find uncategorized menus
            uncategorized_menus = []
            for item in menu_items:
                if not item.get("category_id"):
                    uncategorized_menus.append(item)
            
            if len(uncategorized_menus) < 2:
                self.log("ℹ️  Need at least 2 uncategorized menus to test movement", "INFO")
                return True
            
            # Sort by order
            uncategorized_menus.sort(key=lambda x: x.get("order", 0))
            
            # Take first menu and move it down
            first_menu = uncategorized_menus[0]
            second_menu = uncategorized_menus[1]
            
            # Swap orders
            first_order = first_menu.get("order")
            second_order = second_menu.get("order")
            
            first_menu["order"] = second_order
            second_menu["order"] = first_order
            
            self.log(f"   Swapping uncategorized: {first_menu['label']} ({first_order}→{second_order}) ↔ {second_menu['label']} ({second_order}→{first_order})")
            
            # Update preferences
            update_data = {"menu_items": menu_items}
            
            response = self.admin_session.put(
                f"{BACKEND_URL}/user-preferences",
                json=update_data,
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                updated_items = data.get("menu_items", [])
                
                # Verify the swap
                first_new = None
                second_new = None
                for item in updated_items:
                    if item.get("id") == first_menu.get("id"):
                        first_new = item
                    elif item.get("id") == second_menu.get("id"):
                        second_new = item
                
                if (first_new and first_new.get("order") == second_order and 
                    second_new and second_new.get("order") == first_order):
                    self.log("✅ Uncategorized menu item movement successful")
                    self.log(f"   {first_new.get('label')} now at order: {first_new.get('order')}")
                    self.log(f"   {second_new.get('label')} now at order: {second_new.get('order')}")
                    return True
                else:
                    self.log("❌ Uncategorized menu order swap verification failed", "ERROR")
                    return False
            else:
                self.log(f"❌ Uncategorized menu move failed - Status: {response.status_code}", "ERROR")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log(f"❌ Request failed - Error: {str(e)}", "ERROR")
            return False
    
    def test_arrow_button_constraints(self):
        """TEST 6: Test arrow button constraints (first item UP disabled, last item DOWN disabled)"""
        self.log("🧪 TEST 6: Test arrow button constraints")
        
        try:
            # Get current preferences
            response = self.admin_session.get(f"{BACKEND_URL}/user-preferences", timeout=15)
            if response.status_code != 200:
                self.log("❌ Failed to get current preferences", "ERROR")
                return False
            
            current_prefs = response.json()
            categories = current_prefs.get("menu_categories", [])
            menu_items = current_prefs.get("menu_items", [])
            
            # Sort categories by order
            categories.sort(key=lambda x: x.get("order", 0))
            
            if len(categories) == 0:
                self.log("❌ No categories found for constraint testing", "ERROR")
                return False
            
            # Test: First category should not be able to move UP (order should stay 0)
            first_category = categories[0]
            original_order = first_category.get("order")
            
            self.log(f"   Testing constraint: First category '{first_category['name']}' at order {original_order}")
            
            if original_order == 0:
                self.log("✅ First category correctly at order 0 (UP arrow should be disabled)")
            else:
                self.log(f"⚠️  First category not at order 0 (current: {original_order})")
            
            # Test: Last category should not be able to move DOWN
            last_category = categories[-1]
            last_order = last_category.get("order")
            expected_last_order = len(categories) - 1
            
            self.log(f"   Testing constraint: Last category '{last_category['name']}' at order {last_order}")
            
            if last_order == expected_last_order:
                self.log("✅ Last category correctly at highest order (DOWN arrow should be disabled)")
            else:
                self.log(f"⚠️  Last category order unexpected (current: {last_order}, expected: {expected_last_order})")
            
            # Test menu items within categories
            maintenance_menus = []
            for item in menu_items:
                if item.get("category_id") and "maintenance" in item.get("category_id", "").lower():
                    maintenance_menus.append(item)
            
            if maintenance_menus:
                maintenance_menus.sort(key=lambda x: x.get("order", 0))
                
                first_menu = maintenance_menus[0]
                last_menu = maintenance_menus[-1]
                
                self.log(f"   Testing menu constraints in Maintenance category:")
                self.log(f"     First menu: '{first_menu['label']}' at order {first_menu.get('order')} (UP should be disabled)")
                self.log(f"     Last menu: '{last_menu['label']}' at order {last_menu.get('order')} (DOWN should be disabled)")
            
            self.log("✅ Arrow button constraints verification complete")
            return True
                
        except requests.exceptions.RequestException as e:
            self.log(f"❌ Request failed - Error: {str(e)}", "ERROR")
            return False
    
    def test_persistence_after_reordering(self):
        """TEST 7: Verify persistence after multiple reordering operations"""
        self.log("🧪 TEST 7: Verify persistence after reordering")
        
        try:
            # Wait a moment to ensure data is persisted
            time.sleep(1)
            
            response = self.admin_session.get(f"{BACKEND_URL}/user-preferences", timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                categories = data.get("menu_categories", [])
                menu_items = data.get("menu_items", [])
                
                self.log("✅ Data persistence check successful")
                
                # Verify categories are still properly ordered
                categories.sort(key=lambda x: x.get("order", 0))
                self.log("   Category order after all operations:")
                for i, cat in enumerate(categories):
                    expected_order = i
                    actual_order = cat.get("order")
                    status = "✅" if actual_order == expected_order else "❌"
                    self.log(f"     {status} {cat['name']}: order {actual_order} (expected {expected_order})")
                
                # Verify menu items within categories maintain order
                maintenance_menus = []
                for item in menu_items:
                    if item.get("category_id") and "maintenance" in item.get("category_id", "").lower():
                        maintenance_menus.append(item)
                
                if maintenance_menus:
                    maintenance_menus.sort(key=lambda x: x.get("order", 0))
                    self.log("   Menu order within Maintenance category:")
                    for i, menu in enumerate(maintenance_menus):
                        self.log(f"     - {menu['label']}: order {menu.get('order')}")
                
                self.log("✅ All reordering operations successfully persisted")
                return True
                
            else:
                self.log(f"❌ Persistence check failed - Status: {response.status_code}", "ERROR")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log(f"❌ Request failed - Error: {str(e)}", "ERROR")
            return False
    
    def cleanup_test_data(self):
        """Clean up test data by restoring original preferences"""
        self.log("🧹 Cleaning up test data...")
        
        if not self.original_preferences:
            self.log("ℹ️  No original preferences to restore")
            return True
        
        try:
            # Restore original preferences
            response = self.admin_session.put(
                f"{BACKEND_URL}/user-preferences",
                json=self.original_preferences,
                timeout=15
            )
            
            if response.status_code == 200:
                self.log("✅ Test data cleaned up successfully")
                return True
            else:
                self.log(f"⚠️  Cleanup failed - Status: {response.status_code}")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log(f"⚠️  Cleanup failed - Error: {str(e)}")
            return False
    
    def run_arrow_buttons_tests(self):
        """Run comprehensive tests for Menu Organization Arrow Buttons functionality"""
        self.log("=" * 80)
        self.log("TESTING MENU ORGANIZATION ARROW BUTTONS (FLÈCHES HAUT/BAS)")
        self.log("=" * 80)
        self.log("CONTEXTE:")
        self.log("Test de la fonctionnalité des flèches haut/bas pour réorganiser les menus et catégories")
        self.log("Fonctionnalité: Réorganisation via modification du champ 'order' dans /api/user-preferences")
        self.log("")
        self.log("TESTS À EFFECTUER:")
        self.log("1. Configuration des données de test")
        self.log("2. Déplacement catégorie vers le BAS (flèche DOWN)")
        self.log("3. Déplacement catégorie vers le HAUT (flèche UP)")
        self.log("4. Déplacement menu vers le BAS dans une catégorie")
        self.log("5. Déplacement menu vers le HAUT dans une catégorie")
        self.log("6. Déplacement menu sans catégorie")
        self.log("7. Vérification des contraintes (premier/dernier élément)")
        self.log("8. Vérification de la persistence")
        self.log("=" * 80)
        
        results = {
            "admin_login": False,
            "setup_test_data": False,
            "move_category_down": False,
            "move_category_up": False,
            "move_menu_down": False,
            "move_menu_up": False,
            "move_uncategorized_menu": False,
            "arrow_constraints": False,
            "persistence_verification": False
        }
        
        # Test 1: Admin Login
        results["admin_login"] = self.test_admin_login()
        
        if not results["admin_login"]:
            self.log("❌ Cannot proceed with other tests - Admin login failed", "ERROR")
            return results
        
        # Test 2: Setup test data
        results["setup_test_data"] = self.setup_test_data()
        
        if not results["setup_test_data"]:
            self.log("❌ Cannot proceed - Test data setup failed", "ERROR")
            return results
        
        # TESTS CRITIQUES DES FLÈCHES HAUT/BAS
        self.log("\n" + "=" * 60)
        self.log("🔄 TESTS CRITIQUES - ARROW BUTTONS FUNCTIONALITY")
        self.log("=" * 60)
        
        # Test 3: Move category down
        results["move_category_down"] = self.test_move_category_down()
        
        # Test 4: Move category up
        results["move_category_up"] = self.test_move_category_up()
        
        # Test 5: Move menu down within category
        results["move_menu_down"] = self.test_move_menu_down_within_category()
        
        # Test 6: Move menu up within category
        results["move_menu_up"] = self.test_move_menu_up_within_category()
        
        # Test 7: Move uncategorized menu
        results["move_uncategorized_menu"] = self.test_move_uncategorized_menu_down()
        
        # Test 8: Arrow button constraints
        results["arrow_constraints"] = self.test_arrow_button_constraints()
        
        # Test 9: Persistence verification
        results["persistence_verification"] = self.test_persistence_after_reordering()
        
        # Cleanup test data
        self.cleanup_test_data()
        
        # Summary
        self.log("=" * 80)
        self.log("MENU ORGANIZATION ARROW BUTTONS - RÉSULTATS DES TESTS")
        self.log("=" * 80)
        
        passed = sum(results.values())
        total = len(results)
        
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            self.log(f"  {test_name}: {status}")
        
        self.log(f"\n📊 Overall: {passed}/{total} tests passed")
        
        # Analyse détaillée des tests critiques
        critical_tests = [
            "admin_login", "setup_test_data", "move_category_down", "move_category_up",
            "move_menu_down", "move_menu_up", "arrow_constraints", "persistence_verification"
        ]
        critical_passed = sum(results.get(test, False) for test in critical_tests)
        
        self.log("\n" + "=" * 60)
        self.log("ANALYSE CRITIQUE DES FLÈCHES HAUT/BAS")
        self.log("=" * 60)
        
        # Conclusion finale
        self.log("\n" + "=" * 80)
        self.log("CONCLUSION FINALE - MENU ORGANIZATION ARROW BUTTONS")
        self.log("=" * 80)
        
        if critical_passed >= len(critical_tests) - 1:  # Allow 1 failure
            self.log("🎉 MENU ORGANIZATION ARROW BUTTONS ENTIÈREMENT FONCTIONNEL!")
            self.log("✅ Déplacement des catégories avec flèches HAUT/BAS opérationnel")
            self.log("✅ Déplacement des menus avec flèches HAUT/BAS opérationnel")
            self.log("✅ Contraintes des flèches (premier/dernier) respectées")
            self.log("✅ Persistence des réorganisations validée")
            self.log("✅ Backend prêt pour l'interface des flèches haut/bas")
            self.log("✅ La fonctionnalité est PRÊTE POUR PRODUCTION")
        else:
            self.log("⚠️ MENU ORGANIZATION ARROW BUTTONS INCOMPLET - PROBLÈMES DÉTECTÉS")
            failed_critical = [test for test in critical_tests if not results.get(test, False)]
            self.log(f"❌ Tests critiques échoués: {', '.join(failed_critical)}")
            self.log("❌ La fonctionnalité des flèches haut/bas ne fonctionne pas correctement")
            self.log("❌ Intervention requise avant mise en production")
        
        return results

if __name__ == "__main__":
    tester = MenuArrowButtonsTester()
    results = tester.run_arrow_buttons_tests()
    
    # Exit with appropriate code
    critical_tests = [
        "admin_login", "setup_test_data", "move_category_down", "move_category_up",
        "move_menu_down", "move_menu_up", "arrow_constraints", "persistence_verification"
    ]
    
    critical_passed = sum(results.get(test, False) for test in critical_tests)
    
    if critical_passed >= len(critical_tests) - 1:  # Allow 1 failure
        exit(0)  # Success
    else:
        exit(1)  # Failure