# 🚀 Guide de déploiement — Bénéfice.NET

Stack : **Render** (backend FastAPI) + **Vercel** (frontend React) + **MongoDB Atlas** (base) + **Microsoft Entra ID** (auth).

---

## 📋 Pré-requis

- [x] Un cluster MongoDB Atlas avec une connection string
- [x] Compte GitHub
- [x] Compte Render (gratuit pour démarrer — https://render.com)
- [x] Compte Vercel (gratuit — https://vercel.com)
- [x] App Registration Azure configurée en mono-tenant
- [x] Domaine perso (ex: `solutioninformatique.fr`) avec accès au DNS

---

## 1️⃣ Pousser le code sur GitHub

Dans Emergent, clique sur **"Save to GitHub"** dans la barre de chat. Choisis ton repo (ex: `benefice-net`) → confirme le push.

Vérifie ensuite sur GitHub que ces fichiers sont bien présents :
- `/render.yaml`
- `/frontend/vercel.json`
- `/backend/.env.example`
- `/frontend/.env.example`

⚠️ Vérifie qu'**aucun** `.env` réel n'est poussé (il est dans `.gitignore`).

---

## 2️⃣ MongoDB Atlas — sécuriser l'accès

Dans ton cluster Atlas :

1. **Network Access** → ajouter `0.0.0.0/0` (autorise Render à se connecter de n'importe où)
   - Pour plus de sécurité, tu peux limiter aux IPs de Render plus tard
2. **Database Access** → vérifier que ton user a le rôle `readWrite` sur la base
3. Copie ta connection string — exemple :
   ```
   mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?appName=Cluster0
   ```
   ⚠️ Remplace bien `<password>` par ton vrai mot de passe.

---

## 3️⃣ Déployer le BACKEND sur Render

### Méthode automatique (Blueprint) — recommandé

1. Va sur https://dashboard.render.com → bouton **"New +"** → **"Blueprint"**
2. Connecte ton GitHub et sélectionne le repo `benefice-net`
3. Render lit `render.yaml` automatiquement et crée le service `benefice-net-backend`
4. Une fois créé, va dans **Environment** et renseigne ces variables (toutes celles marquées `sync: false`) :

| Variable | Valeur |
|---|---|
| `MONGO_URL` | Ta connection string Atlas |
| `CORS_ORIGINS` | `https://benefice.solutioninformatique.fr` (ton domaine frontend, sera ajouté à l'étape 5) |
| `MS_CLIENT_ID` | `2840dcd5-1ffb-4693-aa0b-c2fb9b36b3f5` |
| `MS_CLIENT_SECRET` | (ton client secret Azure) |
| `MS_TENANT_ID` | `7f008f30-09bb-4ffe-b661-fa76376ab364` |
| `MS_AUTHORITY` | `https://login.microsoftonline.com/7f008f30-09bb-4ffe-b661-fa76376ab364` |
| `PORTAL_REDIRECT_URI` | `https://<URL_BACKEND_RENDER>/api/auth/portal/callback` (voir ci-dessous) |
| `PORTAL_ALLOWED_EMAIL` | `contact@solutioninformatique.fr` |

5. Render te donne une URL automatique du type `https://benefice-net-backend.onrender.com`
6. Mets à jour `PORTAL_REDIRECT_URI` avec :
   ```
   https://benefice-net-backend.onrender.com/api/auth/portal/callback
   ```
7. Clique **"Save changes"** → Render redéploie automatiquement
8. Test : ouvre `https://benefice-net-backend.onrender.com/api/` → tu dois voir `{"message":"Hello World"}`

### Optionnel — Domaine perso pour le backend

1. Render → ton service → **Settings** → **Custom Domain** → ajoute `api.solutioninformatique.fr`
2. Render te donne un enregistrement CNAME à mettre dans ton DNS o2switch (panel cPanel → Zone Editor) :
   ```
   api.solutioninformatique.fr  CNAME  benefice-net-backend.onrender.com
   ```
3. Une fois validé, mets à jour :
   - `PORTAL_REDIRECT_URI` → `https://api.solutioninformatique.fr/api/auth/portal/callback`
   - Azure App Registration → Authentication → Add Redirect URI → même valeur

---

## 4️⃣ Déployer le FRONTEND sur Vercel

1. Va sur https://vercel.com/new
2. Importe le repo GitHub `benefice-net`
3. **Important** : configure ces options
   - **Root Directory** : `frontend`
   - **Framework Preset** : Create React App (auto-détecté)
   - **Build Command** : `yarn build` (déjà dans vercel.json)
4. **Environment Variables** → ajouter :
   ```
   REACT_APP_BACKEND_URL = https://api.solutioninformatique.fr
   ```
   (ou ton URL Render `https://benefice-net-backend.onrender.com` si pas de domaine perso)
5. Clique **"Deploy"**
6. Vercel te donne une URL automatique du type `https://benefice-net.vercel.app`

### Optionnel — Domaine perso pour le frontend

1. Vercel → ton projet → **Settings** → **Domains** → ajoute `benefice.solutioninformatique.fr`
2. Vercel te donne un CNAME à mettre dans ton DNS o2switch :
   ```
   benefice.solutioninformatique.fr  CNAME  cname.vercel-dns.com
   ```
3. Une fois validé, retourne sur Render → mets à jour `CORS_ORIGINS` avec ton vrai domaine :
   ```
   CORS_ORIGINS=https://benefice.solutioninformatique.fr
   ```

---

## 5️⃣ Mettre à jour Azure App Registration

Sur https://entra.microsoft.com → ton app `BeneficeNet` :

1. **Authentication** → **Configuration d'URI de redirection** → bouton **"Ajouter un URI"** :
   - `https://api.solutioninformatique.fr/api/auth/portal/callback` (prod)
   - Tu peux laisser l'ancien URL preview Emergent pour les tests

2. Sauvegarder.

---

## 6️⃣ Test final

1. Ouvre `https://benefice.solutioninformatique.fr`
2. Tu vois la page **"Connexion requise"** → clique **"Se connecter avec Microsoft 365"**
3. Tu te connectes avec `contact@solutioninformatique.fr` → tu arrives sur le dashboard
4. Test que les onglets fonctionnent : Calcul rapide, Assemblage PC, Suivi Finance

---

## ⚠️ Points d'attention

### Render (plan gratuit)
- Le service **s'endort après 15 min d'inactivité** → la 1ère requête après dort prend ~30 sec
- Pour éviter ça : passer au plan Starter (~7$/mois) ou utiliser un cron externe (UptimeRobot ping toutes les 5 min)

### MongoDB Atlas (M0 free)
- 512 MB de stockage → largement suffisant pour ton usage
- Pas de backups auto sur le free tier → exporte régulièrement (`mongodump`)

### Sécurité
- Renouvelle ton `MS_CLIENT_SECRET` tous les 12-24 mois (Azure t'enverra un mail d'expiration)
- Si tu changes le mot de passe MongoDB Atlas, n'oublie pas de mettre à jour `MONGO_URL` dans Render

---

## 🔧 Dépannage

| Problème | Solution |
|---|---|
| 502 Bad Gateway sur Render | Le service est en train de démarrer (cold start), réessaie après 30 sec |
| 401 sur /api/finance/* | Token portail expiré, déconnecte/reconnecte |
| `email_non_autorise` | L'email de connexion ne correspond pas à `PORTAL_ALLOWED_EMAIL` |
| CORS error dans la console | Vérifie `CORS_ORIGINS` sur Render (sans slash final, séparé par virgules) |
| Login Microsoft → "AADSTS50011 redirect URI" | La Redirect URI Azure ne correspond pas à `PORTAL_REDIRECT_URI` Render — copier-coller exact |

---

## 💡 Améliorations futures

- [ ] Backups MongoDB automatisés (cron `mongodump` → S3/Backblaze)
- [ ] Monitoring (Render envoie déjà des emails si crash)
- [ ] Export CSV des finances pour ton expert-comptable
- [ ] Génération PDF des devis
