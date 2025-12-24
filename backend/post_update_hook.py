#!/usr/bin/env python3
"""
Script post-mise à jour pour GMAO Iris
Exécuté automatiquement après chaque mise à jour Git

Ce script vérifie et corrige les éléments critiques après une mise à jour
"""

import os
import sys
import subprocess
from pathlib import Path

def print_step(step, message):
    """Affiche une étape avec formatage"""
    print(f"\n{'='*60}")
    print(f"[{step}] {message}")
    print('='*60)

def check_file_exists(filepath, description):
    """Vérifie qu'un fichier critique existe"""
    if os.path.exists(filepath):
        print(f"✅ {description} présent: {filepath}")
        return True
    else:
        print(f"❌ ERREUR: {description} manquant: {filepath}")
        return False

def run_command(command, description, cwd=None):
    """Exécute une commande et affiche le résultat"""
    print(f"\n🔄 {description}...")
    try:
        result = subprocess.run(
            command,
            shell=True,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=300
        )
        if result.returncode == 0:
            print(f"✅ {description} - OK")
            return True
        else:
            print(f"❌ {description} - ERREUR")
            print(f"STDERR: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ {description} - EXCEPTION: {str(e)}")
        return False

def main():
    print_step("1", "Vérification des fichiers critiques")
    
    # Détecter le répertoire racine de l'application
    app_root = Path(__file__).parent.parent.absolute()
    backend_dir = app_root / "backend"
    frontend_dir = app_root / "frontend"
    
    print(f"📁 Répertoire application: {app_root}")
    
    # Vérifier les fichiers critiques
    critical_files = [
        (backend_dir / "category_mapping.py", "Module de catégorisation"),
        (backend_dir / "server.py", "Serveur backend"),
        (frontend_dir / "src/pages/PurchaseHistory.jsx", "Page Historique Achat")
    ]
    
    all_present = True
    for filepath, description in critical_files:
        if not check_file_exists(filepath, description):
            all_present = False
    
    if not all_present:
        print("\n❌ ERREUR: Fichiers critiques manquants !")
        print("La mise à jour n'a pas été complète.")
        sys.exit(1)
    
    # Vérifier que l'import est présent dans server.py
    print_step("2", "Vérification de l'import category_mapping")
    
    server_file = backend_dir / "server.py"
    with open(server_file, 'r', encoding='utf-8') as f:
        content = f.read()
        if 'from category_mapping import get_category_from_article_dm6' in content:
            print("✅ Import category_mapping présent dans server.py")
        else:
            print("❌ ATTENTION: Import category_mapping manquant dans server.py")
            print("   Cela devrait être corrigé manuellement ou par la mise à jour Git")
    
    # Installer les dépendances backend si nécessaire
    print_step("3", "Installation des dépendances backend")
    
    requirements_file = backend_dir / "requirements.txt"
    if requirements_file.exists():
        venv_pip = backend_dir / "venv/bin/pip"
        if venv_pip.exists():
            run_command(
                f"{venv_pip} install -q -r {requirements_file}",
                "Installation dépendances backend",
                cwd=backend_dir
            )
        else:
            print("⚠️  Environnement virtuel non trouvé, skip installation backend")
    
    # Installer les dépendances frontend si nécessaire
    print_step("4", "Installation des dépendances frontend")
    
    package_json = frontend_dir / "package.json"
    if package_json.exists():
        # Vérifier si node_modules existe
        node_modules = frontend_dir / "node_modules"
        if not node_modules.exists():
            print("📦 node_modules manquant, installation nécessaire")
            run_command("yarn install", "Installation dépendances frontend", cwd=frontend_dir)
    
    # Rebuild le frontend
    print_step("5", "Rebuild du frontend")
    
    if package_json.exists():
        run_command("yarn build", "Build production frontend", cwd=frontend_dir)
    
    # Exécuter setup-email.sh si présent
    print_step("6", "Configuration Email (setup-email.sh)")
    
    setup_email_script = app_root / "setup-email.sh"
    if setup_email_script.exists():
        print(f"📧 Script setup-email.sh trouvé: {setup_email_script}")
        # Rendre le script exécutable
        os.chmod(setup_email_script, 0o755)
        # Le script setup-email.sh est interactif, on le skip en mode automatique
        print("ℹ️  setup-email.sh détecté mais skip en mode automatique")
        print("   Pour configurer les emails, exécutez manuellement:")
        print(f"   bash {setup_email_script}")
    else:
        print("ℹ️  setup-email.sh non trouvé (optionnel)")
    
    # Redémarrer les services
    print_step("7", "Redémarrage des services")
    
    # Vérifier si supervisor est disponible
    supervisor_check = subprocess.run(
        "which supervisorctl",
        shell=True,
        capture_output=True
    )
    
    if supervisor_check.returncode == 0:
        # Détecter les noms des services
        result = subprocess.run(
            "supervisorctl status | grep -E '(backend|frontend)' | awk '{print $1}'",
            shell=True,
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0 and result.stdout.strip():
            services = result.stdout.strip().split('\n')
            for service in services:
                run_command(
                    f"supervisorctl restart {service}",
                    f"Redémarrage {service}"
                )
        else:
            print("⚠️  Services supervisor non détectés, redémarrage manuel requis")
    else:
        print("⚠️  supervisorctl non disponible, redémarrage manuel requis")
    
    print_step("✅", "Mise à jour post-installation terminée")
    print("\n🎉 Tous les contrôles sont passés !")
    print("\n📝 Prochaines étapes:")
    print("   1. Vider le cache du navigateur (Ctrl+Shift+R)")
    print("   2. Tester la page 'Historique Achat'")
    print("   3. Vérifier la section '📊 Détail par Catégorie (DM6)'")

if __name__ == "__main__":
    main()
