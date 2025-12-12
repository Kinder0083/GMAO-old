#!/usr/bin/env python3
"""
Script pour capturer les screenshots du manuel utilisateur GMAO Iris
"""

import asyncio
from playwright.async_api import async_playwright
import os

# Configuration
FRONTEND_URL = "http://localhost:3000"
IMAGES_DIR = "/app/public/images/manual"
LOGIN_EMAIL = "admin@test.com"
LOGIN_PASSWORD = "testpassword"

# Liste des screenshots à capturer
SCREENSHOTS = [
    # Connexion et navigation
    {"name": "01-login", "path": "/", "wait_for": "input[type='email']", "description": "Page de connexion"},
    
    # Dashboard (après connexion)
    {"name": "02-dashboard", "path": "/dashboard", "wait_for": ".dashboard", "description": "Tableau de bord principal", "needs_login": True},
    
    # Inventaire
    {"name": "03-inventory-list", "path": "/inventory", "wait_for": "table", "description": "Liste de l'inventaire", "needs_login": True},
    
    # Demandes d'achat
    {"name": "04-purchase-requests-list", "path": "/purchase-requests", "wait_for": "table", "description": "Liste des demandes d'achat", "needs_login": True},
    
    # IoT Dashboard
    {"name": "05-iot-dashboard", "path": "/iot-dashboard", "wait_for": ".iot", "description": "Dashboard IoT/MQTT", "needs_login": True},
    
    # Chat Live
    {"name": "06-chat-live", "path": "/chat-live", "wait_for": ".chat", "description": "Chat en direct", "needs_login": True},
    
    # Assets/Équipements
    {"name": "07-assets", "path": "/assets", "wait_for": "table", "description": "Liste des équipements", "needs_login": True},
    
    # Personnes/Utilisateurs
    {"name": "08-people", "path": "/people", "wait_for": "table", "description": "Gestion des utilisateurs", "needs_login": True},
    
    # Locations
    {"name": "09-locations", "path": "/locations", "wait_for": "table", "description": "Gestion des localisations", "needs_login": True},
    
    # Planning
    {"name": "10-planning", "path": "/planning", "wait_for": ".planning", "description": "Planning", "needs_login": True},
    
    # Settings
    {"name": "11-settings", "path": "/settings", "wait_for": ".settings", "description": "Paramètres", "needs_login": True},
]

async def capture_screenshots():
    """Capture tous les screenshots définis"""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1920, "height": 1080})
        page = await context.new_page()
        
        print("🚀 Démarrage de la capture des screenshots...")
        print(f"📁 Répertoire de sortie: {IMAGES_DIR}")
        
        # Créer le répertoire si nécessaire
        os.makedirs(IMAGES_DIR, exist_ok=True)
        
        # Variable pour garder l'état de connexion
        logged_in = False
        
        for screenshot in SCREENSHOTS:
            try:
                print(f"\n📸 Capture: {screenshot['name']} - {screenshot['description']}")
                
                # Se connecter si nécessaire
                if screenshot.get("needs_login") and not logged_in:
                    print("  🔐 Connexion en cours...")
                    await page.goto(FRONTEND_URL, wait_until="networkidle")
                    await page.wait_for_selector('input[type="email"]', state="visible")
                    await page.fill('input[type="email"]', LOGIN_EMAIL)
                    await page.fill('input[type="password"]', LOGIN_PASSWORD)
                    await page.click('button:has-text("Se connecter")')
                    await asyncio.sleep(3)
                    logged_in = True
                    print("  ✅ Connecté")
                
                # Naviguer vers la page
                url = f"{FRONTEND_URL}{screenshot['path']}"
                print(f"  🌐 Navigation vers: {url}")
                await page.goto(url, wait_until="networkidle", timeout=15000)
                await asyncio.sleep(2)
                
                # Attendre l'élément spécifique
                try:
                    await page.wait_for_selector(screenshot['wait_for'], timeout=5000)
                except:
                    print(f"  ⚠️  Élément {screenshot['wait_for']} non trouvé, capture quand même")
                
                # Capturer le screenshot
                output_path = f"{IMAGES_DIR}/{screenshot['name']}.png"
                await page.screenshot(path=output_path, quality=20, full_page=False)
                print(f"  ✅ Sauvegardé: {output_path}")
                
            except Exception as e:
                print(f"  ❌ Erreur: {e}")
                continue
        
        await browser.close()
        print("\n✅ Toutes les captures sont terminées!")

if __name__ == "__main__":
    asyncio.run(capture_screenshots())
