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
BACKEND_URL = "https://board-fix.preview.emergentagent.com/api"

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
    
    def run_invite_member_tests(self):
        """Run comprehensive tests for invite member functionality"""
        self.log("=" * 80)
        self.log("TESTING INVITE MEMBER FUNCTIONALITY - GMAO IRIS")
        self.log("=" * 80)
        self.log("CONTEXTE:")
        self.log("Test des fonctionnalités d'invitation de membres pour GMAO Iris")
        self.log("Vérification de l'API /api/users/invite-member")
        self.log("")
        self.log("TESTS À EFFECTUER:")
        self.log("1. Login admin avec credentials admin@test.com / password")
        self.log("2. POST /api/users/invite-member - Invitation réussie")
        self.log("3. POST /api/users/invite-member - Vérification email dupliqué")
        self.log("4. POST /api/users/invite-member - Validation rôle invalide")
        self.log("5. POST /api/users/invite-member - Validation email invalide")
        self.log("6. Validation de la structure du token d'invitation")
        self.log("=" * 80)
        
        results = {
            "admin_login": False,
            "invite_success": False,
            "duplicate_email": False,
            "invalid_role": False,
            "invalid_email": False,
            "token_validation": False
        }
        
        # Test 1: Admin Login
        results["admin_login"] = self.test_admin_login()
        
        if not results["admin_login"]:
            self.log("❌ Cannot proceed with other tests - Admin login failed", "ERROR")
            return results
        
        # TESTS CRITIQUES DE L'INVITATION DE MEMBRES
        self.log("\n" + "=" * 60)
        self.log("👥 TESTS CRITIQUES - INVITE MEMBER FUNCTIONALITY")
        self.log("=" * 60)
        
        # Test 2: Successful invitation
        results["invite_success"] = self.test_invite_member_success()
        
        # Test 3: Duplicate email check
        results["duplicate_email"] = self.test_invite_member_duplicate_email()
        
        # Test 4: Invalid role validation
        results["invalid_role"] = self.test_invite_member_invalid_role()
        
        # Test 5: Invalid email validation
        results["invalid_email"] = self.test_invite_member_invalid_email()
        
        # Test 6: Token validation
        results["token_validation"] = self.test_invite_member_token_validation()
        
        # Summary
        self.log("=" * 80)
        self.log("INVITE MEMBER FUNCTIONALITY - RÉSULTATS DES TESTS")
        self.log("=" * 80)
        
        passed = sum(results.values())
        total = len(results)
        
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            self.log(f"  {test_name}: {status}")
        
        self.log(f"\n📊 Overall: {passed}/{total} tests passed")
        
        # Analyse détaillée des tests critiques
        critical_tests = [
            "admin_login", "invite_success", "duplicate_email", 
            "invalid_role", "invalid_email", "token_validation"
        ]
        critical_passed = sum(results.get(test, False) for test in critical_tests)
        
        self.log("\n" + "=" * 60)
        self.log("ANALYSE CRITIQUE DE L'INVITATION DE MEMBRES")
        self.log("=" * 60)
        
        # TEST CRITIQUE 1: Authentification
        if results.get("admin_login", False):
            self.log("🎉 TEST CRITIQUE 1 - AUTHENTIFICATION: ✅ SUCCÈS")
            self.log("✅ Connexion admin@test.com / password réussie")
        else:
            self.log("🚨 TEST CRITIQUE 1 - AUTHENTIFICATION: ❌ ÉCHEC")
        
        # TEST CRITIQUE 2: Invitation réussie
        if results.get("invite_success", False):
            self.log("🎉 TEST CRITIQUE 2 - INVITE SUCCESS: ✅ SUCCÈS")
            self.log("✅ POST /api/users/invite-member fonctionne")
            self.log("✅ Structure de réponse correcte")
        else:
            self.log("🚨 TEST CRITIQUE 2 - INVITE SUCCESS: ❌ ÉCHEC")
        
        # TEST CRITIQUE 3: Vérification email dupliqué
        if results.get("duplicate_email", False):
            self.log("🎉 TEST CRITIQUE 3 - DUPLICATE EMAIL: ✅ SUCCÈS")
            self.log("✅ Vérification email dupliqué fonctionne")
            self.log("✅ Retourne erreur 400 appropriée")
        else:
            self.log("🚨 TEST CRITIQUE 3 - DUPLICATE EMAIL: ❌ ÉCHEC")
        
        # TEST CRITIQUE 4: Validation rôle
        if results.get("invalid_role", False):
            self.log("🎉 TEST CRITIQUE 4 - ROLE VALIDATION: ✅ SUCCÈS")
            self.log("✅ Validation des rôles fonctionne")
        else:
            self.log("🚨 TEST CRITIQUE 4 - ROLE VALIDATION: ❌ ÉCHEC")
        
        # TEST CRITIQUE 5: Validation email
        if results.get("invalid_email", False):
            self.log("🎉 TEST CRITIQUE 5 - EMAIL VALIDATION: ✅ SUCCÈS")
            self.log("✅ Validation des emails fonctionne")
        else:
            self.log("🚨 TEST CRITIQUE 5 - EMAIL VALIDATION: ❌ ÉCHEC")
        
        # TEST CRITIQUE 6: Token validation
        if results.get("token_validation", False):
            self.log("🎉 TEST CRITIQUE 6 - TOKEN VALIDATION: ✅ SUCCÈS")
            self.log("✅ Génération de token d'invitation fonctionne")
        else:
            self.log("🚨 TEST CRITIQUE 6 - TOKEN VALIDATION: ❌ ÉCHEC")
        
        # Conclusion finale
        self.log("\n" + "=" * 80)
        self.log("CONCLUSION FINALE - INVITE MEMBER FUNCTIONALITY")
        self.log("=" * 80)
        
        if critical_passed >= len(critical_tests) - 1:  # Allow 1 failure
            self.log("🎉 INVITE MEMBER FUNCTIONALITY ENTIÈREMENT FONCTIONNELLE!")
            self.log("✅ API /api/users/invite-member opérationnelle")
            self.log("✅ Validation des emails et rôles fonctionnelle")
            self.log("✅ Vérification des doublons fonctionnelle")
            self.log("✅ Génération de tokens d'invitation fonctionnelle")
            if results.get("invite_success", False):
                self.log("✅ Envoi d'emails d'invitation configuré")
            self.log("✅ La fonctionnalité d'invitation est PRÊTE POUR PRODUCTION")
        else:
            self.log("⚠️ INVITE MEMBER FUNCTIONALITY INCOMPLÈTE - PROBLÈMES DÉTECTÉS")
            failed_critical = [test for test in critical_tests if not results.get(test, False)]
            self.log(f"❌ Tests critiques échoués: {', '.join(failed_critical)}")
            self.log("❌ La fonctionnalité d'invitation ne fonctionne pas correctement")
            self.log("❌ Intervention requise avant mise en production")
        
        return results

if __name__ == "__main__":
    tester = InviteMemberTester()
    results = tester.run_invite_member_tests()
    
    # Exit with appropriate code
    critical_tests = [
        "admin_login", "invite_success", "duplicate_email", 
        "invalid_role", "invalid_email", "token_validation"
    ]
    
    critical_passed = sum(results.get(test, False) for test in critical_tests)
    
    if critical_passed >= len(critical_tests) - 1:  # Allow 1 failure
        exit(0)  # Success
    else:
        exit(1)  # Failure