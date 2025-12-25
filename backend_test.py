#!/usr/bin/env python3
"""
Backend API Testing Script for GMAO Iris
Tests the Work Orders WebSocket real-time synchronization functionality
"""

import requests
import json
import os
import time
import asyncio
import websockets
import threading
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor

# Use the correct backend URL from frontend .env
BACKEND_URL = "https://realtimesync.preview.emergentagent.com/api"
WS_URL = "wss://realtimesync.preview.emergentagent.com/ws/realtime/work_orders"

# Test credentials
ADMIN_EMAIL = "admin@test.com"
ADMIN_PASSWORD = "password"

class WorkOrdersWebSocketTester:
    def __init__(self):
        self.admin_session = requests.Session()
        self.admin_token = None
        self.admin_data = None
        self.ws_messages = []
        self.ws_connected = False
        self.ws_connection_logs = []
        
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

    async def test_websocket_connection(self):
        """TEST 1: WebSocket Connection Test"""
        self.log("🧪 TEST 1: WebSocket Connection Test")
        
        if not self.admin_data or not self.admin_data.get('id'):
            self.log("❌ No admin user data available for WebSocket connection", "ERROR")
            return False
        
        user_id = self.admin_data.get('id')
        ws_url_with_params = f"{WS_URL}?user_id={user_id}"
        
        self.log(f"[Realtime work_orders] Connexion à: {ws_url_with_params}")
        self.ws_connection_logs.append(f"[Realtime work_orders] Connexion à: {ws_url_with_params}")
        
        try:
            # Simple connection without timeout parameter
            websocket = await websockets.connect(ws_url_with_params)
            
            self.log("[Realtime work_orders] WebSocket ouvert")
            self.ws_connection_logs.append("[Realtime work_orders] WebSocket ouvert")
            
            # Wait for connection confirmation
            try:
                message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                data = json.loads(message)
                
                if data.get('type') == 'connected':
                    self.log("[Realtime work_orders] Connecté ✅")
                    self.ws_connection_logs.append("[Realtime work_orders] Connecté ✅")
                    self.ws_connected = True
                    self.ws_messages.append(data)
                    await websocket.close()
                    return True
                else:
                    self.log(f"❌ Unexpected message type: {data.get('type')}", "ERROR")
                    await websocket.close()
                    return False
                    
            except asyncio.TimeoutError:
                self.log("❌ Timeout waiting for connection confirmation", "ERROR")
                await websocket.close()
                return False
                
        except Exception as e:
            self.log(f"❌ WebSocket connection failed: {str(e)}", "ERROR")
            return False

    def test_work_orders_api(self):
        """TEST 2: Work Orders API Test"""
        self.log("🧪 TEST 2: Work Orders API Test")
        
        try:
            # Test GET /api/work-orders
            response = self.admin_session.get(f"{BACKEND_URL}/work-orders", timeout=10)
            
            if response.status_code == 200:
                work_orders = response.json()
                self.log(f"✅ GET /api/work-orders successful - Found {len(work_orders)} work orders")
                return True
            else:
                self.log(f"❌ GET /api/work-orders failed - Status: {response.status_code}", "ERROR")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log(f"❌ Work Orders API request failed - Error: {str(e)}", "ERROR")
            return False

    def test_create_work_order(self):
        """TEST 3: Create Work Order Test"""
        self.log("🧪 TEST 3: Create Work Order Test")
        
        try:
            # Create a test work order
            work_order_data = {
                "id": f"test-wo-{int(time.time())}",
                "titre": f"Test WebSocket Work Order - {datetime.now().strftime('%H:%M:%S')}",
                "description": "Test work order for WebSocket real-time synchronization testing",
                "type": "CURATIF",
                "priorite": "NORMALE",
                "statut": "OUVERT",
                "tempsEstime": 2.0,
                "dateLimite": (datetime.now() + timedelta(days=7)).isoformat()
            }
            
            response = self.admin_session.post(
                f"{BACKEND_URL}/work-orders",
                json=work_order_data,
                timeout=15
            )
            
            if response.status_code == 200:
                created_wo = response.json()
                self.log(f"✅ POST /api/work-orders successful - Created WO: {created_wo.get('numero')}")
                return created_wo
            else:
                self.log(f"❌ POST /api/work-orders failed - Status: {response.status_code}", "ERROR")
                self.log(f"   Response: {response.text}")
                return None
                
        except requests.exceptions.RequestException as e:
            self.log(f"❌ Create work order request failed - Error: {str(e)}", "ERROR")
            return None

    async def test_realtime_sync_simulation(self):
        """TEST 4: Real-Time Sync Simulation (Two Clients)"""
        self.log("🧪 TEST 4: Real-Time Sync Simulation (Two Clients)")
        
        if not self.admin_data or not self.admin_data.get('id'):
            self.log("❌ No admin user data available for WebSocket connection", "ERROR")
            return False
        
        user_id = self.admin_data.get('id')
        ws_url_with_params = f"{WS_URL}?user_id={user_id}"
        
        client1_messages = []
        client2_messages = []
        
        try:
            # Simulate two clients connecting
            client1 = await websockets.connect(ws_url_with_params)
            client2 = await websockets.connect(ws_url_with_params)
            
            self.log("✅ Both WebSocket clients connected")
            
            # Wait for connection confirmations
            try:
                msg1 = await asyncio.wait_for(client1.recv(), timeout=5.0)
                msg2 = await asyncio.wait_for(client2.recv(), timeout=5.0)
                
                client1_messages.append(json.loads(msg1))
                client2_messages.append(json.loads(msg2))
                
                self.log("✅ Both clients received connection confirmations")
                
                # Now create a work order and see if both clients receive the update
                created_wo = self.test_create_work_order()
                
                if created_wo:
                    self.log("⏳ Waiting for real-time updates...")
                    
                    # Wait for real-time messages
                    try:
                        # Set up listeners for both clients
                        async def listen_client1():
                            try:
                                while True:
                                    msg = await asyncio.wait_for(client1.recv(), timeout=2.0)
                                    client1_messages.append(json.loads(msg))
                            except asyncio.TimeoutError:
                                pass
                        
                        async def listen_client2():
                            try:
                                while True:
                                    msg = await asyncio.wait_for(client2.recv(), timeout=2.0)
                                    client2_messages.append(json.loads(msg))
                            except asyncio.TimeoutError:
                                pass
                        
                        # Listen for 5 seconds
                        await asyncio.gather(
                            asyncio.wait_for(listen_client1(), timeout=5.0),
                            asyncio.wait_for(listen_client2(), timeout=5.0),
                            return_exceptions=True
                        )
                        
                    except Exception as e:
                        self.log(f"Listening completed: {str(e)}")
                    
                    # Check if clients received real-time updates
                    created_messages_client1 = [msg for msg in client1_messages if msg.get('type') == 'created']
                    created_messages_client2 = [msg for msg in client2_messages if msg.get('type') == 'created']
                    
                    if created_messages_client1 and created_messages_client2:
                        self.log("✅ Both clients received real-time 'created' events")
                        await client1.close()
                        await client2.close()
                        return True
                    else:
                        self.log(f"❌ Real-time sync failed - Client1 msgs: {len(created_messages_client1)}, Client2 msgs: {len(created_messages_client2)}")
                        self.log(f"   Client1 messages: {[msg.get('type') for msg in client1_messages]}")
                        self.log(f"   Client2 messages: {[msg.get('type') for msg in client2_messages]}")
                        await client1.close()
                        await client2.close()
                        return False
                else:
                    self.log("❌ Failed to create work order for real-time testing")
                    await client1.close()
                    await client2.close()
                    return False
                    
            except asyncio.TimeoutError:
                self.log("❌ Timeout waiting for connection confirmations", "ERROR")
                await client1.close()
                await client2.close()
                return False
                
        except Exception as e:
            self.log(f"❌ Real-time sync test failed: {str(e)}", "ERROR")
            return False

    def run_websocket_tests(self):
        """Run comprehensive WebSocket tests for Work Orders"""
        self.log("=" * 80)
        self.log("TESTING WORK ORDERS WEBSOCKET REAL-TIME SYNCHRONIZATION")
        self.log("=" * 80)
        self.log("CONTEXTE:")
        self.log("Test de la synchronisation temps réel WebSocket pour les Work Orders")
        self.log("Vérification de l'icône WiFi et de la synchronisation multi-clients")
        self.log("")
        self.log("TESTS À EFFECTUER:")
        self.log("1. Login admin avec credentials admin@test.com / password")
        self.log("2. Test de connexion WebSocket")
        self.log("3. Test de l'API Work Orders")
        self.log("4. Test de création d'ordre de travail")
        self.log("5. Test de synchronisation temps réel (simulation 2 clients)")
        self.log("=" * 80)
        
        results = {
            "admin_login": False,
            "websocket_connection": False,
            "work_orders_api": False,
            "create_work_order": False,
            "realtime_sync": False
        }
        
        # Test 1: Admin Login
        results["admin_login"] = self.test_admin_login()
        
        if not results["admin_login"]:
            self.log("❌ Cannot proceed with other tests - Admin login failed", "ERROR")
            return results
        
        # Test 2: Work Orders API
        results["work_orders_api"] = self.test_work_orders_api()
        
        # Test 3: WebSocket Connection
        try:
            results["websocket_connection"] = asyncio.run(self.test_websocket_connection())
        except Exception as e:
            self.log(f"❌ WebSocket connection test failed: {str(e)}", "ERROR")
            results["websocket_connection"] = False
        
        # Test 4: Create Work Order
        created_wo = self.test_create_work_order()
        results["create_work_order"] = created_wo is not None
        
        # Test 5: Real-time Sync Simulation
        if results["websocket_connection"]:
            try:
                results["realtime_sync"] = asyncio.run(self.test_realtime_sync_simulation())
            except Exception as e:
                self.log(f"❌ Real-time sync test failed: {str(e)}", "ERROR")
                results["realtime_sync"] = False
        else:
            self.log("⏭️ Skipping real-time sync test - WebSocket connection failed")
        
        # Summary
        self.log("=" * 80)
        self.log("WORK ORDERS WEBSOCKET TESTING - RÉSULTATS DES TESTS")
        self.log("=" * 80)
        
        passed = sum(results.values())
        total = len(results)
        
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            self.log(f"  {test_name}: {status}")
        
        self.log(f"\n📊 Overall: {passed}/{total} tests passed")
        
        # WebSocket Connection Logs Analysis
        self.log("\n" + "=" * 60)
        self.log("WEBSOCKET CONNECTION LOGS ANALYSIS")
        self.log("=" * 60)
        
        expected_logs = [
            "[Realtime work_orders] Connexion à:",
            "[Realtime work_orders] WebSocket ouvert",
            "[Realtime work_orders] Connecté ✅"
        ]
        
        for expected_log in expected_logs:
            found = any(expected_log in log for log in self.ws_connection_logs)
            status = "✅ FOUND" if found else "❌ MISSING"
            self.log(f"  {expected_log}: {status}")
        
        # WiFi Icon Status Analysis
        self.log("\n" + "=" * 60)
        self.log("WIFI ICON STATUS ANALYSIS")
        self.log("=" * 60)
        
        if results["websocket_connection"]:
            self.log("✅ WiFi Icon should be GREEN (lucide-wifi with text-green-500 class)")
            self.log("✅ WebSocket connection established successfully")
        else:
            self.log("❌ WiFi Icon should be RED (lucide-wifi-off with text-red-500 class)")
            self.log("❌ WebSocket connection failed")
        
        # Real-time Sync Analysis
        self.log("\n" + "=" * 60)
        self.log("REAL-TIME SYNCHRONIZATION ANALYSIS")
        self.log("=" * 60)
        
        if results["realtime_sync"]:
            self.log("✅ Real-time synchronization working")
            self.log("✅ Multiple clients receive updates automatically")
            self.log("✅ Work order creation broadcasts to all connected clients")
        else:
            self.log("❌ Real-time synchronization not working")
            self.log("❌ Updates not synchronized between clients")
            self.log("❌ Manual page refresh required to see changes")
        
        # Final Conclusion
        self.log("\n" + "=" * 80)
        self.log("CONCLUSION FINALE - WORK ORDERS WEBSOCKET FUNCTIONALITY")
        self.log("=" * 80)
        
        critical_tests = ["admin_login", "websocket_connection", "work_orders_api", "realtime_sync"]
        critical_passed = sum(results.get(test, False) for test in critical_tests)
        
        if critical_passed >= len(critical_tests):
            self.log("🎉 WORK ORDERS WEBSOCKET FUNCTIONALITY ENTIÈREMENT FONCTIONNELLE!")
            self.log("✅ WebSocket connections établies avec succès")
            self.log("✅ Icône WiFi verte (connecté)")
            self.log("✅ Synchronisation temps réel entre clients")
            self.log("✅ Logs de connexion WebSocket corrects")
            self.log("✅ La fonctionnalité temps réel est PRÊTE POUR PRODUCTION")
        elif results["websocket_connection"] and not results["realtime_sync"]:
            self.log("⚠️ WEBSOCKET PARTIELLEMENT FONCTIONNEL")
            self.log("✅ Connexions WebSocket établies")
            self.log("✅ Icône WiFi verte")
            self.log("❌ Synchronisation temps réel défaillante")
            self.log("❌ Problème avec la diffusion des événements")
        else:
            self.log("❌ WEBSOCKET FUNCTIONALITY DÉFAILLANTE")
            self.log("❌ Connexions WebSocket échouent")
            self.log("❌ Icône WiFi rouge (déconnecté)")
            self.log("❌ Aucune synchronisation temps réel")
            self.log("❌ Intervention requise pour corriger l'infrastructure WebSocket")
        
        return results

if __name__ == "__main__":
    tester = WorkOrdersWebSocketTester()
    results = tester.run_websocket_tests()
    
    # Exit with appropriate code
    critical_tests = [
        "admin_login", "websocket_connection", "work_orders_api", "realtime_sync"
    ]
    
    critical_passed = sum(results.get(test, False) for test in critical_tests)
    
    if critical_passed >= len(critical_tests):
        exit(0)  # Success
    else:
        exit(1)  # Failure