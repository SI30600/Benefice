# PRD — Bénéfice.NET

## Problem Statement
Application de calcul de bénéfice net pour revente de pièces informatiques + assemblage PC, avec suivi finance complet, restreinte à un seul utilisateur via authentification Microsoft 365.

## Personas
- **Auto-entrepreneur informatique unique** : `contact@solutioninformatique.fr`
  - Achète sur Leboncoin (taxe 5%)
  - Revend des pièces / assemble des PC pour des clients
  - Doit déclarer URSSAF (13% pièces, 23% prestations)

## Core Requirements

### 1) Onglet "Calcul rapide"
- Champs : article, date, plateforme, prix achat, prix vente, livraison
- Frais : taxe LBC 5% (achat), URSSAF 13% (vente article)
- Affichage : breakdown, bénéfice brut, net, marge, ROI

### 2) Onglet "Assemblage PC"
- Client : nom, adresse complète, téléphone, email, date
- Type machine : Fixe / Portable
- Composants Fixe : carte mère, CPU, GPU, RAM, SSD, alim, boîtier, clavier-souris, écran
- Composants Portable : modèle + accessoires
- Articles (URSSAF 13%) : pièces facturées + Licence Windows (30€) + Office 2024 Pro Plus
- Prestations (URSSAF 23%) : Premier démarrage (70€) + Récup données (50€) + Déplacement
- Déplacement : Vauvert 10€ / ≤15km 20€ / 15-40km 40€ / 40-100km 80€ / Mondial Relay 25€ / Atelier 0€

### 3) Onglet "Suivi Finance"
- Tracking CA, taxes, état du compte bancaire réel
- Déduit : différé CB + achats LBC en attente non encore débités
- Liste cumulative des achats LBC en attente (mode addition)
- Récap mois courant + mois précédent
- Lien rapide "Déclarer sur URSSAF.fr"
- Stockage 100% local MongoDB (plus de OneDrive)

### 4) Sécurité — Portail O365
- Auth Microsoft Entra ID (mono-tenant)
- Restreinte à `contact@solutioninformatique.fr` uniquement
- Tout autre email → rejet `email_non_autorise`
- Bearer token (30j TTL) stocké dans MongoDB `portal_sessions`

## Architecture

### Backend (FastAPI + MongoDB)
- `/app/backend/server.py` : routes finance + portal auth (toutes protégées par `require_auth`)
- `/app/backend/portal_auth.py` : MSAL ConfidentialClientApplication, single-tenant
- `/app/backend/finance.py` : modèles & helpers finance ledger

### Frontend (React + Tailwind + Shadcn)
- `App.js` : wrapper auth (loading → login → calculator)
- `LoginPage.jsx` : portail O365 + hook `useAuth` + `setAuthToken` (axios.defaults)
- `pages/Calculator.jsx` : tabs (Calcul rapide / Assemblage / Finance)
- `components/CalcForm.jsx` : calcul rapide
- `components/AssemblyForm.jsx` + `AssemblyResult.jsx` : assemblage
- `components/FinanceTab.jsx` : dashboard finance
- `components/SaveDevisPanel.jsx` : push devis → finance ledger

### Auth flow
1. `GET /api/auth/portal/login` → renvoie auth_url MSAL (single-tenant)
2. Microsoft redirige sur `/api/auth/portal/callback?code=...`
3. Backend échange code → access_token → email Graph API
4. Si email != `PORTAL_ALLOWED_EMAIL` → redirect `/?portal_error=email_non_autorise`
5. Sinon → génère bearer token, insère dans `portal_sessions`, redirige `/?portal_token=...`
6. React capture le token via URL params, stocke en localStorage, set axios default header
7. Toutes les routes `/api/finance/*` exigent `Authorization: Bearer <token>`

## Implementation Status (à jour)

### ✅ Done
- Calcul rapide + Assemblage PC + Finance Tracker complets
- URSSAF 13%/23% + zones de déplacement
- Office 2024 Pro Plus
- Récap mois courant + précédent
- Achats LBC en attente cumulatifs
- Différé CB déduit du solde
- Auth portail O365 mono-tenant (backend + frontend)
- Suppression complète du code OneDrive obsolète
- Toutes les requêtes axios injectent le bearer token via `axios.defaults`
- **2026-04-30** : Calcul rapide multi-articles (panier d'achats multi-sources) — testé E2E
- **2026-04-30** : Plateforme "Autre" avec taxe + frais expédition manuels — testé E2E
- **2026-04-30** : Placeholders "prix mini" transparents (CalcForm + AssemblyForm) couvrant achat + taxe + URSSAF 13.5% — testé E2E
- **2026-04-30** : ResultPanel — libellé "Taxes plateformes" (LBC 5% + Autre) et "Livraison" agrégée (zone + expédition custom)
- **2026-04-30** : Suppression de la ligne "Bénéfice brut" (inutile en franchise TVA micro-BIC)
- **2026-05-03** : Achats en attente — choix plateforme (LBC/Vinted/eBay/...) + nom client
- **2026-05-03** : Auto-conversion achat→`finance_entries.category=achat` lors de l'encaissement d'un paiement avec client_name identique → "dans ta poche" reflète la vraie marge nette (testé : 690€ encaissé − 332.69€ achat = 264.16€ in pocket)
- **2026-05-03** : Badge "📦 −X€ achat lié" sur les paiements en attente quand un achat matche le client_name (preview avant encaissement)
- **2026-05-03** : Boutons Reset par mois (en cours + mois précédent) — endpoint `DELETE /api/finance/entries/month/{YYYY-MM}` avec confirmation UI

### 🚧 Configuration Azure requise
- App registration en single-tenant
- Redirect URI : `https://profit-calculator-65.preview.emergentagent.com/api/auth/portal/callback`
- Client secret valide

## Backlog
- **P1** : Notifications email lors enregistrement devis
- **P1** : Génération PDF imprimable du devis
- **P2** : Historique devis avec relecture avant export
- **P2** : Filtres / recherche dans Suivi Finance

## Tech Stack
- Frontend : React (CRA), Tailwind, Shadcn UI, lucide-react, axios
- Backend : FastAPI, motor, MSAL, requests
- DB : MongoDB
- Auth : Microsoft Entra ID OAuth2 (single-tenant)
