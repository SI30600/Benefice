# PRD — Calculateur Bénéfice Net + OneDrive

## Problem Statement
Calculateur de bénéfice net pour revente de pièces informatiques (achat Leboncoin)
+ mode prestation d'assemblage PC, avec sauvegarde Excel sur OneDrive.

## Context (29/04/2026)

### Mode 1 — Calcul rapide (revente pièces)
- Champs : nom article, date, plateforme, prix d'achat, prix vente, livraison
- Frais : taxe LBC 5% (achat), URSSAF 13% (vente, article)
- Affichage : breakdown, bénéfice brut, net, marge, ROI

### Mode 2 — Assemblage PC / Portable
- Client : nom, adresse complète (rue, CP, ville), téléphone, email, date
- Type machine : Fixe ou Portable (composants différents)
- Composants Fixe : carte mère, processeur, GPU, RAM, SSD, alimentation, boîtier, clavier-souris, écran (chacun avec modèle + coût)
- Composants Portable : modèle + accessoires
- Pièces facturées au client (article 13%)
- **Articles (URSSAF 13%)** : pièces facturées + Licence Windows (30€ par défaut, éditable)
- **Prestations (URSSAF 23%)** : Premier démarrage (70€ par défaut, éditable) + Récup données (50€ par défaut, éditable) + Déplacement
- Déplacement (boutons cliquables) : Vauvert 10€ / ≤15km 20€ / 15-40km 40€ / 40-100km 80€ / Mondial Relay 25€ (assurance) / Aucun-Atelier 0€

### OneDrive Excel sync
- OAuth Microsoft (consumers — comptes personnels)
- Tokens stockés MongoDB (refresh token rotation auto)
- 1 clic "Enregistrer" → ajoute 1 ligne dans /BeneficeNet/devis-clients.xlsx
- Colonnes : date, client, adresse, CP, ville, tél, email, type, composants, partsCost, partsSale, licence, démarrage, données, déplacement (zone+€), totalBilled, lbcTax, urssafArt, urssafPrest, netProfit, marge

## Architecture
- Frontend : React (CRA), Tailwind, shadcn (Select), lucide-react, axios
- Backend : FastAPI + motor (MongoDB) + msal + openpyxl
- Calculs côté client (instantanés)
- OneDrive via Microsoft Graph API (download → append → upload)

## Backlog
- P1 : Notifications email lors enregistrement devis
- P1 : Génération PDF imprimable du devis
- P2 : Historique des devis stocké en local pour relire avant export
- P2 : Multi-utilisateurs avec auth (si tu veux partager l'app)
