#!/usr/bin/env python3
"""
Script de diagnostic WebSocket pour le tableau d'affichage
Teste l'envoi et la réception des messages de création et suppression
"""
import asyncio
import websockets
import json
import sys

async def test_whiteboard_websocket():
    board_id = "board_1"
    user_id = "test_user_1"
    user_name = "Test User"
    
    ws_url = f"ws://localhost:8001/ws/whiteboard/{board_id}?user_id={user_id}&user_name={user_name}"
    
    print("=" * 60)
    print("TEST WEBSOCKET TABLEAU D'AFFICHAGE")
    print("=" * 60)
    print(f"\nConnexion à: {ws_url}")
    
    try:
        async with websockets.connect(ws_url) as ws:
            print("✅ Connecté au WebSocket")
            
            # Test 1: Envoyer un objet
            print("\n--- Test 1: Création d'objet ---")
            test_object = {
                "type": "object_added",
                "object_id": "test_obj_123",
                "object": {
                    "type": "rect",
                    "id": "test_obj_123",
                    "left": 0.5,
                    "top": 0.5,
                    "width": 0.1,
                    "height": 0.1,
                    "fill": "#FF0000"
                }
            }
            await ws.send(json.dumps(test_object))
            print(f"📤 Envoyé: object_added (id: test_obj_123)")
            
            # Attendre la réponse
            try:
                response = await asyncio.wait_for(ws.recv(), timeout=3.0)
                data = json.loads(response)
                print(f"📥 Reçu: {data.get('type')} - {json.dumps(data)[:100]}...")
            except asyncio.TimeoutError:
                print("⚠️ Pas de réponse (timeout 3s)")
            
            # Test 2: Supprimer l'objet
            print("\n--- Test 2: Suppression d'objet ---")
            delete_msg = {
                "type": "object_removed",
                "object_id": "test_obj_123"
            }
            await ws.send(json.dumps(delete_msg))
            print(f"📤 Envoyé: object_removed (id: test_obj_123)")
            
            # Attendre la réponse
            try:
                response = await asyncio.wait_for(ws.recv(), timeout=3.0)
                data = json.loads(response)
                print(f"📥 Reçu: {data.get('type')} - {json.dumps(data)[:100]}...")
            except asyncio.TimeoutError:
                print("⚠️ Pas de réponse (timeout 3s)")
            
            # Test 3: Heartbeat
            print("\n--- Test 3: Heartbeat ---")
            await ws.send(json.dumps({"type": "heartbeat"}))
            print("📤 Envoyé: heartbeat")
            
            try:
                response = await asyncio.wait_for(ws.recv(), timeout=3.0)
                data = json.loads(response)
                print(f"📥 Reçu: {data.get('type')}")
            except asyncio.TimeoutError:
                print("⚠️ Pas de réponse heartbeat (timeout 3s)")
            
            print("\n✅ Tests terminés")
            
    except Exception as e:
        print(f"❌ Erreur: {type(e).__name__}: {e}")

if __name__ == "__main__":
    asyncio.run(test_whiteboard_websocket())
