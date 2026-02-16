# GMAO Iris - PRD

## Problème original
Application GMAO (CMMS) complète pour la gestion de maintenance assistée par ordinateur. Interface en français.

## Architecture
- **Frontend**: React + Shadcn/UI + TailwindCSS
- **Backend**: FastAPI + Motor (async MongoDB)
- **Database**: MongoDB (gmao_iris)
- **Intégrations**: Google Drive API, Tailscale Funnel, MQTT

## Fonctionnalités implémentées

### Session précédente
- Tableau de bord, ordres de travail, équipements, inventaire, zones
- Maintenance préventive, fournisseurs, historique d'achat
- Chat live, capteurs MQTT, système de backup/restore
- Import/export de données, journal d'audit
- Manuel utilisateur, personnalisation
- Gestion des utilisateurs et permissions (RBAC)

### Session actuelle (16/02/2026)
- ✅ Bug Fix: Compteur d'éléments en retard corrigé
- ✅ Refactoring: MainLayout avec hooks personnalisés (useOverdueItems, useWorkOrdersCount, etc.)
- ✅ Feature: Mises à jour temps réel des badges header via WebSocket
- ✅ Feature: Recherche autocomplete dans le manuel utilisateur
- ✅ Bug Fix P1: Rétention des sauvegardes globale (confirmé par l'utilisateur)
- ✅ Bug Fix P0: Journal d'audit - "Erreur lors du chargement du journal"
  - Cause racine: ObjectId MongoDB non sérialisables en JSON dans les documents audit_logs
  - Fix: _sanitize_log() dans audit_service.py, gestion robuste des erreurs backend/frontend
  - Protection de la collection audit_logs pendant les restaurations

## Credentials
- Admin: admin@test.com / Admin123!

## Backlog
- Aucune tâche en attente identifiée
