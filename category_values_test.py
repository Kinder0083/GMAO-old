#!/usr/bin/env python3
"""
Test all category values for work orders
"""

import requests
import json
from datetime import datetime

# Use the correct backend URL from frontend .env
BACKEND_URL = "https://resource-tracker-48.preview.emergentagent.com/api"

# Test credentials
ADMIN_EMAIL = "admin@gmao-iris.local"
ADMIN_PASSWORD = "Admin123!"

def log(message, level="INFO"):
    """Log test messages with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {level}: {message}")

def test_all_categories():
    """Test all available category values"""
    
    # Login first
    session = requests.Session()
    
    login_response = session.post(
        f"{BACKEND_URL}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=10
    )
    
    if login_response.status_code != 200:
        log("❌ Login failed", "ERROR")
        return False
    
    token = login_response.json().get("access_token")
    session.headers.update({"Authorization": f"Bearer {token}"})
    
    log("✅ Admin login successful")
    
    # Test all category values
    categories = [
        "CHANGEMENT_FORMAT",
        "TRAVAUX_PREVENTIFS", 
        "TRAVAUX_CURATIF",
        "TRAVAUX_DIVERS",
        "FORMATION"
    ]
    
    created_orders = []
    
    log("🧪 Testing all category values...")
    
    for category in categories:
        log(f"Testing category: {category}")
        
        work_order_data = {
            "titre": f"Test {category}",
            "description": f"Test de la catégorie {category}",
            "priorite": "MOYENNE",
            "categorie": category,
            "statut": "OUVERT"
        }
        
        response = session.post(
            f"{BACKEND_URL}/work-orders",
            json=work_order_data,
            timeout=10
        )
        
        if response.status_code in [200, 201]:
            data = response.json()
            if data.get("categorie") == category:
                log(f"✅ Category {category} works correctly")
                created_orders.append(data.get("id"))
            else:
                log(f"❌ Category {category} failed - got {data.get('categorie')}", "ERROR")
                return False
        else:
            log(f"❌ Category {category} failed - Status: {response.status_code}", "ERROR")
            return False
    
    # Cleanup
    log("🧹 Cleaning up test orders...")
    for order_id in created_orders:
        try:
            session.delete(f"{BACKEND_URL}/work-orders/{order_id}", timeout=10)
        except:
            pass
    
    log("🎉 All category values work correctly!")
    return True

if __name__ == "__main__":
    success = test_all_categories()
    exit(0 if success else 1)