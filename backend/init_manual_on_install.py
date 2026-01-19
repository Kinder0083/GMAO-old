#!/usr/bin/env python3
"""
Script d'initialisation du manuel utilisateur - À APPELER LORS DE L'INSTALLATION
Ce script génère le manuel complet avec tous les chapitres et sections.

Pour une installation Proxmox :
    python3 init_manual_on_install.py

Ce script délègue au script unifié generate_unified_manual.py qui contient
la version complète du manuel avec 24 chapitres et 70+ sections.
"""
import asyncio
import sys
import os
import subprocess

def main():
    """Initialise le manuel en utilisant le script unifié"""
    
    print("=" * 70)
    print("📚 INITIALISATION DU MANUEL UTILISATEUR")
    print("=" * 70)
    print()
    
    # Chemin du script unifié
    script_dir = os.path.dirname(os.path.abspath(__file__))
    unified_script = os.path.join(script_dir, "generate_unified_manual.py")
    
    if not os.path.exists(unified_script):
        print(f"❌ Script unifié non trouvé: {unified_script}")
        return False
    
    print("📥 Exécution du script unifié de génération du manuel...")
    print()
    
    try:
        # Exécuter le script unifié
        result = subprocess.run(
            [sys.executable, unified_script],
            cwd=script_dir,
            capture_output=False,
            env=os.environ.copy()
        )
        
        if result.returncode == 0:
            print()
            print("=" * 70)
            print("✅ MANUEL INITIALISÉ AVEC SUCCÈS !")
            print("=" * 70)
            print()
            print("Le manuel complet a été généré avec :")
            print("  • 24 chapitres")
            print("  • 70+ sections")
            print("  • Nouvelles fonctionnalités documentées :")
            print("    - Ordres Type (Modèles d'OT)")
            print("    - Modèles de Formulaires")
            print("    - Créateur de Formulaires Personnalisés")
            print("    - Gestion des Rôles et Permissions")
            print("    - Aide Contextuelle et Tooltips")
            print()
            return True
        else:
            print()
            print(f"❌ Le script unifié a échoué avec le code: {result.returncode}")
            return False
            
    except Exception as e:
        print()
        print("=" * 70)
        print("❌ ERREUR LORS DE L'INITIALISATION")
        print("=" * 70)
        print(f"Erreur: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print()
    result = main()
    print()
    
    sys.exit(0 if result else 1)
