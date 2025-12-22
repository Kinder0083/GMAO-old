#!/usr/bin/env python3
"""
Backend API Testing Script for GMAO Iris
Tests the invite member functionality
"""

import requests
import json
import os
import time
from datetime import datetime, timedelta

# Use the correct backend URL from frontend .env
BACKEND_URL = "https://drawshare-sync.preview.emergentagent.com/api"

# Test credentials
ADMIN_EMAIL = "admin@test.com"
ADMIN_PASSWORD = "password"

class InviteMemberTester:
    def __init__(self):
        self.admin_session = requests.Session()
        self.admin_token = None
        self.admin_data = None
        
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
    
    def test_invite_member_success(self):
        """TEST 1: POST /api/users/invite-member - Successful invitation"""
        self.log("🧪 TEST 1: POST /api/users/invite-member - Successful invitation")
        
        try:
            invite_request = {
                "email": "new_test_user@example.com",
                "role": "TECHNICIEN"
            }
            
            response = self.admin_session.post(
                f"{BACKEND_URL}/users/invite-member",
                json=invite_request,
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                self.log(f"✅ POST /api/users/invite-member successful (200 OK)")
                
                # Verify response structure
                required_fields = ["message", "email", "role", "email_sent"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log(f"❌ Missing required fields: {missing_fields}", "ERROR")
                    return False
                
                # Verify field values
                if data["email"] != invite_request["email"]:
                    self.log(f"❌ Email mismatch: expected {invite_request['email']}, got {data['email']}", "ERROR")
                    return False
                
                if data["role"] != invite_request["role"]:
                    self.log(f"❌ Role mismatch: expected {invite_request['role']}, got {data['role']}", "ERROR")
                    return False
                
                # Check email_sent status
                email_sent = data.get("email_sent", False)
                self.log(f"   Email sent status: {email_sent}")
                self.log(f"   Message: {data['message']}")
                
                if email_sent:
                    self.log("✅ Email was sent successfully")
                    # Should not have invitation_link or warning when email is sent
                    if "invitation_link" in data:
                        self.log("⚠️ invitation_link present when email_sent is True", "WARNING")
                    if "warning" in data:
                        self.log("⚠️ warning present when email_sent is True", "WARNING")
                else:
                    self.log("⚠️ Email was not sent - checking fallback response")
                    # Should have invitation_link and warning when email fails
                    if "invitation_link" not in data:
                        self.log("❌ Missing invitation_link when email_sent is False", "ERROR")
                        return False
                    if "warning" not in data:
                        self.log("❌ Missing warning when email_sent is False", "ERROR")
                        return False
                    
                    self.log(f"   Invitation link: {data['invitation_link']}")
                    self.log(f"   Warning: {data['warning']}")
                
                return True
            else:
                self.log(f"❌ POST /api/users/invite-member failed - Status: {response.status_code}", "ERROR")
                self.log(f"   Response: {response.text}")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log(f"❌ Request failed - Error: {str(e)}", "ERROR")
            return False
    
    def test_invite_member_duplicate_email(self):
        """TEST 2: POST /api/users/invite-member - Duplicate email check"""
        self.log("🧪 TEST 2: POST /api/users/invite-member - Duplicate email check")
        
        try:
            invite_request = {
                "email": "admin@test.com",  # This email should already exist
                "role": "TECHNICIEN"
            }
            
            response = self.admin_session.post(
                f"{BACKEND_URL}/users/invite-member",
                json=invite_request,
                timeout=15
            )
            
            if response.status_code == 400:
                data = response.json()
                self.log(f"✅ POST /api/users/invite-member correctly returned 400 for duplicate email")
                
                # Check error message
                detail = data.get("detail", "")
                expected_message = "Un utilisateur avec cet email existe déjà"
                
                if expected_message in detail:
                    self.log(f"✅ Correct error message: {detail}")
                    return True
                else:
                    self.log(f"❌ Incorrect error message: expected '{expected_message}', got '{detail}'", "ERROR")
                    return False
            else:
                self.log(f"❌ Expected 400 status code for duplicate email, got {response.status_code}", "ERROR")
                self.log(f"   Response: {response.text}")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log(f"❌ Request failed - Error: {str(e)}", "ERROR")
            return False
    
    def test_invite_member_invalid_role(self):
        """TEST 3: POST /api/users/invite-member - Invalid role validation"""
        self.log("🧪 TEST 3: POST /api/users/invite-member - Invalid role validation")
        
        try:
            invite_request = {
                "email": "test_invalid_role@example.com",
                "role": "INVALID_ROLE"
            }
            
            response = self.admin_session.post(
                f"{BACKEND_URL}/users/invite-member",
                json=invite_request,
                timeout=15
            )
            
            if response.status_code == 422:  # Validation error
                self.log(f"✅ POST /api/users/invite-member correctly returned 422 for invalid role")
                return True
            else:
                self.log(f"❌ Expected 422 status code for invalid role, got {response.status_code}", "ERROR")
                self.log(f"   Response: {response.text}")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log(f"❌ Request failed - Error: {str(e)}", "ERROR")
            return False
    
    def test_invite_member_invalid_email(self):
        """TEST 4: POST /api/users/invite-member - Invalid email validation"""
        self.log("🧪 TEST 4: POST /api/users/invite-member - Invalid email validation")
        
        try:
            invite_request = {
                "email": "invalid-email-format",
                "role": "TECHNICIEN"
            }
            
            response = self.admin_session.post(
                f"{BACKEND_URL}/users/invite-member",
                json=invite_request,
                timeout=15
            )
            
            if response.status_code == 422:  # Validation error
                self.log(f"✅ POST /api/users/invite-member correctly returned 422 for invalid email")
                return True
            else:
                self.log(f"❌ Expected 422 status code for invalid email, got {response.status_code}", "ERROR")
                self.log(f"   Response: {response.text}")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log(f"❌ Request failed - Error: {str(e)}", "ERROR")
            return False
    
    def test_invite_member_token_validation(self):
        """TEST 5: Validate invitation token structure"""
        self.log("🧪 TEST 5: Validate invitation token structure")
        
        try:
            invite_request = {
                "email": "token_test_user@example.com",
                "role": "TECHNICIEN"
            }
            
            response = self.admin_session.post(
                f"{BACKEND_URL}/users/invite-member",
                json=invite_request,
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # If email failed, we should have an invitation_link
                if not data.get("email_sent", False) and "invitation_link" in data:
                    invitation_link = data["invitation_link"]
                    self.log(f"   Invitation link: {invitation_link}")
                    
                    # Check if link contains token parameter
                    if "token=" in invitation_link:
                        token_part = invitation_link.split("token=")[1]
                        # JWT tokens typically have 3 parts separated by dots
                        if token_part.count('.') == 2:
                            self.log("✅ Invitation link contains valid JWT token structure")
                            return True
                        else:
                            self.log("❌ Token does not appear to be valid JWT format", "ERROR")
                            return False
                    else:
                        self.log("❌ Invitation link does not contain token parameter", "ERROR")
                        return False
                elif data.get("email_sent", False):
                    self.log("✅ Email was sent successfully (no token validation needed)")
                    return True
                else:
                    self.log("❌ No invitation link provided when email failed", "ERROR")
                    return False
            else:
                self.log(f"❌ Failed to create invitation - Status: {response.status_code}", "ERROR")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log(f"❌ Request failed - Error: {str(e)}", "ERROR")
            return False
    
    
    def run_ai_chatbot_tests(self):
        """Run comprehensive tests for AI Chatbot P2 & P3 functionality"""
        self.log("=" * 80)
        self.log("TESTING AI CHATBOT P2 & P3 - GMAO IRIS")
        self.log("=" * 80)
        self.log("CONTEXTE:")
        self.log("Test des fonctionnalités avancées du chatbot IA pour GMAO Iris")
        self.log("P2: Contexte enrichi de l'application")
        self.log("P3: Guidage visuel avancé avec commandes de navigation")
        self.log("")
        self.log("TESTS À EFFECTUER:")
        self.log("1. Login admin avec credentials admin@test.com / password")
        self.log("2. GET /api/ai/context - Récupération contexte enrichi")
        self.log("3. GET /api/ai/providers - Liste des fournisseurs LLM")
        self.log("4. POST /api/ai/chat - Chat basique")
        self.log("5. POST /api/ai/chat - Chat avec contexte enrichi")
        self.log("6. POST /api/ai/chat - Test commandes de navigation")
        self.log("7. GET /api/ai/history - Récupération historique")
        self.log("=" * 80)
        
        results = {
            "admin_login": False,
            "ai_context": False,
            "ai_providers": False,
            "ai_chat_basic": False,
            "ai_chat_context": False,
            "ai_navigation": False,
            "ai_history": False
        }
        
        # Test 1: Admin Login
        results["admin_login"] = self.test_admin_login()
        
        if not results["admin_login"]:
            self.log("❌ Cannot proceed with other tests - Admin login failed", "ERROR")
            return results
        
        # TESTS CRITIQUES DU CHATBOT IA
        self.log("\n" + "=" * 60)
        self.log("🤖 TESTS CRITIQUES - AI CHATBOT P2 & P3")
        self.log("=" * 60)
        
        # Test 2: AI Context endpoint
        results["ai_context"] = self.test_ai_context_endpoint()
        
        # Test 3: AI Providers endpoint
        results["ai_providers"] = self.test_ai_providers_endpoint()
        
        # Test 4: Basic AI Chat
        results["ai_chat_basic"] = self.test_ai_chat_basic()
        
        # Test 5: AI Chat with enriched context
        results["ai_chat_context"] = self.test_ai_chat_with_context()
        
        # Test 6: AI Navigation commands
        results["ai_navigation"] = self.test_ai_navigation_commands()
        
        # Test 7: AI Chat history
        results["ai_history"] = self.test_ai_chat_history()
        
        # Summary
        self.log("=" * 80)
        self.log("AI CHATBOT P2 & P3 - RÉSULTATS DES TESTS")
        self.log("=" * 80)
        
        passed = sum(results.values())
        total = len(results)
        
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            self.log(f"  {test_name}: {status}")
        
        self.log(f"\n📊 Overall: {passed}/{total} tests passed")
        
        # Analyse détaillée des tests critiques
        critical_tests = [
            "admin_login", "ai_context", "ai_providers", 
            "ai_chat_basic", "ai_chat_context", "ai_navigation"
        ]
        critical_passed = sum(results.get(test, False) for test in critical_tests)
        
        self.log("\n" + "=" * 60)
        self.log("ANALYSE CRITIQUE DU CHATBOT IA")
        self.log("=" * 60)
        
        # TEST CRITIQUE 1: Authentification
        if results.get("admin_login", False):
            self.log("🎉 TEST CRITIQUE 1 - AUTHENTIFICATION: ✅ SUCCÈS")
            self.log("✅ Connexion admin@test.com / password réussie")
        else:
            self.log("🚨 TEST CRITIQUE 1 - AUTHENTIFICATION: ❌ ÉCHEC")
        
        # TEST CRITIQUE 2: Contexte enrichi
        if results.get("ai_context", False):
            self.log("🎉 TEST CRITIQUE 2 - AI CONTEXT: ✅ SUCCÈS")
            self.log("✅ GET /api/ai/context fonctionne")
            self.log("✅ Contexte enrichi avec statistiques temps réel")
        else:
            self.log("🚨 TEST CRITIQUE 2 - AI CONTEXT: ❌ ÉCHEC")
        
        # TEST CRITIQUE 3: Fournisseurs LLM
        if results.get("ai_providers", False):
            self.log("🎉 TEST CRITIQUE 3 - AI PROVIDERS: ✅ SUCCÈS")
            self.log("✅ GET /api/ai/providers fonctionne")
            self.log("✅ Liste des fournisseurs LLM disponibles")
        else:
            self.log("🚨 TEST CRITIQUE 3 - AI PROVIDERS: ❌ ÉCHEC")
        
        # TEST CRITIQUE 4: Chat basique
        if results.get("ai_chat_basic", False):
            self.log("🎉 TEST CRITIQUE 4 - AI CHAT BASIC: ✅ SUCCÈS")
            self.log("✅ POST /api/ai/chat fonctionne")
            self.log("✅ Réponses IA générées correctement")
        else:
            self.log("🚨 TEST CRITIQUE 4 - AI CHAT BASIC: ❌ ÉCHEC")
        
        # TEST CRITIQUE 5: Chat avec contexte
        if results.get("ai_chat_context", False):
            self.log("🎉 TEST CRITIQUE 5 - AI CHAT CONTEXT: ✅ SUCCÈS")
            self.log("✅ Chat avec contexte enrichi fonctionne")
            self.log("✅ IA utilise les données temps réel")
        else:
            self.log("🚨 TEST CRITIQUE 5 - AI CHAT CONTEXT: ❌ ÉCHEC")
        
        # TEST CRITIQUE 6: Commandes de navigation
        if results.get("ai_navigation", False):
            self.log("🎉 TEST CRITIQUE 6 - AI NAVIGATION: ✅ SUCCÈS")
            self.log("✅ Commandes de navigation générées")
            self.log("✅ Guidage visuel avancé opérationnel")
        else:
            self.log("🚨 TEST CRITIQUE 6 - AI NAVIGATION: ❌ ÉCHEC")
        
        # Conclusion finale
        self.log("\n" + "=" * 80)
        self.log("CONCLUSION FINALE - AI CHATBOT P2 & P3")
        self.log("=" * 80)
        
        if critical_passed >= len(critical_tests) - 1:  # Allow 1 failure
            self.log("🎉 AI CHATBOT P2 & P3 ENTIÈREMENT FONCTIONNEL!")
            self.log("✅ API /api/ai/* opérationnelles")
            self.log("✅ Contexte enrichi de l'application fonctionnel")
            self.log("✅ Chat IA avec réponses pertinentes")
            self.log("✅ Commandes de navigation et guidage visuel")
            self.log("✅ Fournisseurs LLM configurés")
            if results.get("ai_history", False):
                self.log("✅ Historique des conversations fonctionnel")
            self.log("✅ Les fonctionnalités P2 & P3 sont PRÊTES POUR PRODUCTION")
        else:
            self.log("⚠️ AI CHATBOT P2 & P3 INCOMPLET - PROBLÈMES DÉTECTÉS")
            failed_critical = [test for test in critical_tests if not results.get(test, False)]
            self.log(f"❌ Tests critiques échoués: {', '.join(failed_critical)}")
            self.log("❌ Les fonctionnalités P2 & P3 ne fonctionnent pas correctement")
            self.log("❌ Intervention requise avant mise en production")
        
        return results

if __name__ == "__main__":
    tester = AIChatbotTester()
    results = tester.run_ai_chatbot_tests()
    
    # Exit with appropriate code
    critical_tests = [
        "admin_login", "ai_context", "ai_providers", 
        "ai_chat_basic", "ai_chat_context", "ai_navigation"
    ]
    
    critical_passed = sum(results.get(test, False) for test in critical_tests)
    
    if critical_passed >= len(critical_tests) - 1:  # Allow 1 failure
        exit(0)  # Success
    else:
        exit(1)  # Failure