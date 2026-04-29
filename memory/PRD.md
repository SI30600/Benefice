# PRD — Calculateur Bénéfice Net (Pièces Informatiques + Assemblage PC)

## Problem Statement
"Est-ce que tu peux me faire un calcul du bénéfice net que je peux faire à chaque vente d'articles en pièces informatiques ? Car j'achète beaucoup sur Leboncoin, donc il y a une taxe de 5% sans compter 10€ de livraison en moyenne et ensuite 13% de l'URSSAF."

Extension demandée : ajouter un mode "Assemblage PC / Portable" avec service de premier démarrage + Windows (+100€), récupération de données en option (+50€), et frais de déplacement (Vauvert 10€, ≤15km 20€, 15-40km 40€, 40-100km 80€).

## User Persona
Revendeur particulier (auto-entrepreneur) qui achète des pièces informatiques sur Leboncoin et les revend, et qui propose aussi un service d'assemblage PC à domicile.

## Architecture
- **Frontend only** : React (CRA + craco), Tailwind, shadcn/ui (Select), lucide-react icons
- **Calcul 100% client-side** (pas de backend, pas de DB, pas de sauvegarde)
- Pages : `/` (Calculator unique avec deux onglets)

## Implemented (29/04/2026)
### Mode 1 — Calcul rapide (revente pièces)
- Champs : nom article, date, plateforme (Leboncoin/Vinted/eBay/Rakuten/Amazon/Facebook MP/Particulier/Autre), prix d'achat, prix de vente, livraison (10€ par défaut, modifiable)
- Calcul : `Net = Vente − Achat − (Achat × 5%) − Livraison − (Vente × 13%)`
- Affichage : breakdown (vente, achat, taxe LBC, livraison, URSSAF), bénéfice brut, bénéfice net + marge % + ROI %, verdict rentable/non rentable

### Mode 2 — Assemblage PC / Portable
- Champs : nom client, date, type machine (Fixe/Portable), coût pièces, pièces facturées au client, services optionnels, zone déplacement
- Services : Premier démarrage + Windows (+100€), Récupération données (+50€)
- Déplacements : Vauvert 10€, ≤15km 20€, 15–40km 40€, 40–100km 80€, sur place 0€
- Calcul : 
  - Total facturé = pièces vente + 100 (si service base) + 50 (si data) + déplacement
  - Charges = pièces coût + (pièces coût × 5%) + (Total facturé × 13%)
  - Net = Total facturé − Charges
- Affichage : devis client, charges, bénéfice net + marge % + total charges, verdict

## Design
- Thème "Retro-Futurism Terminal" : noir mat + accent jaune #EAB308, typographies Outfit + JetBrains Mono
- Bordures angulaires (rounded-none), corner accents, scanlines sur le panel résultat, grain léger
- Color-coding : vert (profit), rouge (perte), orange (LBC), bleu (URSSAF), jaune (services)

## Backlog / Next
- P1 : Sauvegarder l'historique des ventes (MongoDB) + export CSV
- P1 : Tableau de bord avec stats (chiffre d'affaires mois, top produits, marge moyenne)
- P2 : Génération de devis PDF imprimable pour le client (mode assemblage)
- P2 : Multi-utilisateurs avec authentification
- P2 : Personnalisation des taux (URSSAF varie selon catégorie BNC/BIC)
