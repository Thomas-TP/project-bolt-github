# Project Bolt HelpDesk

Plateforme HelpDesk PWA complète, moderne et modulaire, avec gestion avancée des utilisateurs, tickets, automatisations, notifications, et interface responsive.

## Sommaire
- [Fonctionnalités principales](#fonctionnalités-principales)
- [Architecture du projet](#architecture-du-projet)
- [Installation & déploiement](#installation--déploiement)
- [Technologies utilisées](#technologies-utilisées)
- [Structure des dossiers](#structure-des-dossiers)
- [Sécurité & gestion des droits](#sécurité--gestion-des-droits)
- [Contribuer](#contribuer)
- [Licence](#licence)

## Fonctionnalités principales
- Gestion des tickets (création, suivi, messages, fichiers)
- Gestion avancée des utilisateurs (rôles, activation, édition, onboarding)
- Automatisations (règles, triggers, notifications)
- PWA (offline, installation, notifications push)
- Interface moderne, responsive, multi-thèmes
- Support multi-langues (français, anglais, allemand, italien)
- Statistiques, analytics, tableaux de bord
- Intégration Netlify, Supabase, EmailJS, WebRTC, etc.

## Architecture du projet
- **Frontend** : React + TypeScript (Vite, TailwindCSS)
- **Backend** : Supabase (PostgreSQL, Auth, Storage, Functions)
- **Fonctions serverless** : Netlify Functions (Node.js)
- **PWA** : Service Worker, manifest, notifications push
- **Automatisations** : Table dédiée, triggers, gestion dynamique

### Schéma simplifié
```
[React/TS] --API--> [Supabase] --(webhooks/fonctions)--> [Netlify Functions]
         \--PWA/Service Worker--/
```

## Installation & déploiement
1. Cloner le repo
2. Installer les dépendances : `npm install`
3. Configurer `.env` et Supabase
4. Lancer en dev : `npm run dev`
5. Build : `npm run build`
6. Déploiement Netlify : `npx netlify deploy --prod`

## Technologies utilisées
- React, TypeScript, Vite, TailwindCSS
- Supabase (PostgreSQL, Auth, Storage)
- Netlify Functions, EmailJS
- PWA (Workbox, Service Worker)
- Recharts, Lucide, i18next

## Structure des dossiers
```
project/
  src/
    components/   # Composants React (UI, pages, modals...)
    hooks/        # Hooks personnalisés
    services/     # Accès API, logique métier
    lib/          # Types, helpers
    locales/      # Traductions
    pages/        # Pages principales
    utils/        # Fonctions utilitaires
  public/         # Assets statiques, manifest, icons
  supabase/       # Fonctions, migrations SQL
  netlify/        # Fonctions serverless
  chrome-extension/ # Extension Chrome HelpDesk
```

## Sécurité & gestion des droits
- Authentification Supabase (JWT)
- Rôles : client, agent, admin, superadmin
- Règles RLS (Row Level Security) sur toutes les tables sensibles
- Actions critiques centralisées dans des modales sécurisées

## Contribuer
- Forkez le repo, créez une branche, ouvrez une PR
- Merci de respecter la structure et la philosophie du projet

## Licence
Voir le fichier `LICENSE`.

---

**Contact & support** : contact@git.swiss
