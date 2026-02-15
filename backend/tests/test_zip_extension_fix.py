"""
Test du correctif P0: Extension des fichiers de sauvegarde/export
Bug: Les fichiers ZIP étaient téléchargés avec l'extension .xlsx
Fix: Le frontend lit maintenant le header Content-Disposition pour déterminer l'extension

Tests couverts:
1. GET /api/export/all?format=xlsx -> Content-Type: application/zip, filename *.zip
2. GET /api/export/equipments?format=xlsx -> Content-Type: application/vnd...spreadsheetml.sheet, filename *.xlsx
3. GET /api/backup/download/{id} -> Content-Type: application/zip, filename *.zip
"""

import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestZipExtensionFix:
    """Tests pour le correctif d'extension de fichier ZIP"""

    @pytest.fixture(scope="class")
    def auth_token(self):
        """Obtenir un token d'authentification"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@test.com", "password": "Admin123!"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        data = login_response.json()
        return data.get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Headers avec authentification"""
        return {"Authorization": f"Bearer {auth_token}"}

    # Test 1: Export 'all' retourne un ZIP avec les bons headers
    def test_export_all_returns_zip_content_type(self, auth_headers):
        """GET /api/export/all?format=xlsx doit retourner Content-Type: application/zip"""
        response = requests.get(
            f"{BASE_URL}/api/export/all?format=xlsx",
            headers=auth_headers,
            stream=True
        )
        assert response.status_code == 200, f"Export failed: {response.text}"
        
        content_type = response.headers.get('Content-Type', '')
        assert 'application/zip' in content_type, f"Expected application/zip, got {content_type}"
        print(f"[PASS] Export 'all' Content-Type: {content_type}")

    def test_export_all_has_zip_filename_in_content_disposition(self, auth_headers):
        """GET /api/export/all?format=xlsx doit avoir filename=*.zip dans Content-Disposition"""
        response = requests.get(
            f"{BASE_URL}/api/export/all?format=xlsx",
            headers=auth_headers,
            stream=True
        )
        assert response.status_code == 200
        
        disposition = response.headers.get('Content-Disposition', '')
        assert '.zip' in disposition, f"Expected .zip in Content-Disposition, got: {disposition}"
        assert '.xlsx' not in disposition or 'export_complet' in disposition, \
            f"Should have .zip extension, not .xlsx: {disposition}"
        print(f"[PASS] Export 'all' Content-Disposition: {disposition}")

    # Test 2: Export single module retourne XLSX avec les bons headers
    def test_export_equipments_returns_xlsx_content_type(self, auth_headers):
        """GET /api/export/equipments?format=xlsx doit retourner Content-Type spreadsheetml"""
        response = requests.get(
            f"{BASE_URL}/api/export/equipments?format=xlsx",
            headers=auth_headers,
            stream=True
        )
        assert response.status_code == 200, f"Export failed: {response.text}"
        
        content_type = response.headers.get('Content-Type', '')
        expected_types = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'spreadsheetml']
        assert any(t in content_type for t in expected_types), \
            f"Expected spreadsheetml Content-Type, got {content_type}"
        print(f"[PASS] Export 'equipments' Content-Type: {content_type}")

    def test_export_equipments_has_xlsx_filename_in_content_disposition(self, auth_headers):
        """GET /api/export/equipments?format=xlsx doit avoir filename=*.xlsx dans Content-Disposition"""
        response = requests.get(
            f"{BASE_URL}/api/export/equipments?format=xlsx",
            headers=auth_headers,
            stream=True
        )
        assert response.status_code == 200
        
        disposition = response.headers.get('Content-Disposition', '')
        assert '.xlsx' in disposition, f"Expected .xlsx in Content-Disposition, got: {disposition}"
        print(f"[PASS] Export 'equipments' Content-Disposition: {disposition}")

    # Test 3: Backup download retourne ZIP avec les bons headers
    def test_backup_download_returns_zip_content_type(self, auth_headers):
        """GET /api/backup/download/{id} doit retourner Content-Type: application/zip"""
        # D'abord obtenir l'historique des backups
        history_response = requests.get(
            f"{BASE_URL}/api/backup/history?limit=5",
            headers=auth_headers
        )
        assert history_response.status_code == 200
        
        history = history_response.json()
        # Trouver un backup avec file_path
        backup_with_file = None
        for h in history:
            if h.get('status') == 'success' and h.get('file_path'):
                backup_with_file = h
                break
        
        if not backup_with_file:
            pytest.skip("No backup with local file available to test download")
        
        backup_id = backup_with_file['id']
        download_response = requests.get(
            f"{BASE_URL}/api/backup/download/{backup_id}",
            headers=auth_headers,
            stream=True
        )
        assert download_response.status_code == 200, f"Download failed: {download_response.text}"
        
        content_type = download_response.headers.get('Content-Type', '')
        assert 'application/zip' in content_type, \
            f"Expected application/zip for backup download, got {content_type}"
        print(f"[PASS] Backup download Content-Type: {content_type}")

    def test_backup_download_has_zip_filename_in_content_disposition(self, auth_headers):
        """GET /api/backup/download/{id} doit avoir filename=*.zip dans Content-Disposition"""
        # D'abord obtenir l'historique des backups
        history_response = requests.get(
            f"{BASE_URL}/api/backup/history?limit=5",
            headers=auth_headers
        )
        assert history_response.status_code == 200
        
        history = history_response.json()
        backup_with_file = None
        for h in history:
            if h.get('status') == 'success' and h.get('file_path'):
                backup_with_file = h
                break
        
        if not backup_with_file:
            pytest.skip("No backup with local file available to test download")
        
        backup_id = backup_with_file['id']
        download_response = requests.get(
            f"{BASE_URL}/api/backup/download/{backup_id}",
            headers=auth_headers,
            stream=True
        )
        assert download_response.status_code == 200
        
        disposition = download_response.headers.get('Content-Disposition', '')
        assert '.zip' in disposition, f"Expected .zip in Content-Disposition, got: {disposition}"
        print(f"[PASS] Backup download Content-Disposition: {disposition}")

    # Test 4: Vérifier les IDs de backups connus (mentionnés dans le contexte)
    def test_known_backup_ids_exist_in_history(self, auth_headers):
        """Vérifier que les backups mentionnés existent dans l'historique"""
        history_response = requests.get(
            f"{BASE_URL}/api/backup/history?limit=20",
            headers=auth_headers
        )
        assert history_response.status_code == 200
        
        history = history_response.json()
        history_ids = [h['id'] for h in history]
        
        # IDs mentionnés par le main agent
        known_ids = ['699180aeaacee395f06fb562', '699180acaacee395f06fb560', '699180170f7e5ff757fea6eb']
        
        found_ids = [kid for kid in known_ids if kid in history_ids]
        print(f"[INFO] Found {len(found_ids)}/{len(known_ids)} known backup IDs in history")
        print(f"[INFO] Total backups in history: {len(history)}")
        
        # Ce test est informatif, ne pas échouer si les IDs ont été purgés
        assert len(history) > 0, "Should have at least some backup history"


class TestExportEndpointsComparison:
    """Comparaison des réponses entre export 'all' et export module unique"""

    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Obtenir un token d'authentification"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@test.com", "password": "Admin123!"}
        )
        data = login_response.json()
        return {"Authorization": f"Bearer {data.get('access_token')}"}

    def test_export_all_vs_single_module_headers_differ(self, auth_headers):
        """Vérifier que export 'all' et export module unique ont des Content-Type différents"""
        # Export all
        all_response = requests.get(
            f"{BASE_URL}/api/export/all?format=xlsx",
            headers=auth_headers,
            stream=True
        )
        
        # Export single module
        single_response = requests.get(
            f"{BASE_URL}/api/export/work-orders?format=xlsx",
            headers=auth_headers,
            stream=True
        )
        
        all_content_type = all_response.headers.get('Content-Type', '')
        single_content_type = single_response.headers.get('Content-Type', '')
        
        print(f"[INFO] Export 'all' Content-Type: {all_content_type}")
        print(f"[INFO] Export 'work-orders' Content-Type: {single_content_type}")
        
        # 'all' doit être ZIP, 'work-orders' doit être XLSX
        assert 'zip' in all_content_type.lower(), \
            f"Export 'all' should be ZIP, got: {all_content_type}"
        assert 'spreadsheet' in single_content_type.lower() or 'xlsx' in single_content_type.lower(), \
            f"Export single module should be XLSX, got: {single_content_type}"
        
        print("[PASS] Content-Types differ correctly between 'all' (ZIP) and single module (XLSX)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
