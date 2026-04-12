# Déploiement Pro (API + Base de données)

Ce guide te donne une version professionnelle:

- Frontend: `adm-calculator.html` (hébergé statique)
- Backend: API Node (`server/src`)
- Base: PostgreSQL (Supabase conseillé)

## 1) Base PostgreSQL (Supabase)

1. Crée un projet Supabase
2. Récupère la chaîne de connexion PostgreSQL (`DATABASE_URL`)
3. Conserve le mot de passe DB

## 2) Déployer le backend

### Option A: Render (recommandé)

1. Crée un nouveau service `Web Service`
2. Connecte ton repo
3. Build command: `npm install`
4. Start command: `npm run start`
5. Variables d'environnement:
   - `PORT=8080`
   - `DATABASE_URL=<ta_chaine_postgres>`
   - `JWT_SECRET=<secret_fort>`
   - `JWT_EXPIRES_IN=7d`
   - `CORS_ORIGIN=*` (ou ton domaine frontend)

### Option B: Railway

Même variables d'environnement, start command `npm run start`.

## 3) Tester l'API

Une fois déployée:

- `GET https://ton-api/health` doit répondre `{ ok: true, ... }`

## 4) Brancher le frontend

Ouvre:

`adm-calculator.html?api=https://ton-api`

L'URL API est mémorisée ensuite dans le navigateur.

## 4bis) Publier le frontend (Netlify/Vercel)

### Netlify (simple)

1. Crée un site Netlify
2. Dépose `adm-calculator.html` + `icons/` + `manifest.webmanifest` + `sw.js`
3. URL exemple: `https://adm-business.netlify.app`
4. Ouvre ensuite:
   - `https://adm-business.netlify.app/adm-calculator.html?api=https://ton-api`

## 4ter) Domaine final

1. Achète/ajoute ton domaine (`app.tondomaine.com`)
2. Relie le frontend (Netlify) au domaine
3. Relie le backend (Render/Railway) à `api.tondomaine.com`
4. Mets `CORS_ORIGIN=https://app.tondomaine.com` dans l'API

## 5) Compte initial

Créé automatiquement au premier démarrage:

- username: `admin`
- mot de passe: `ADM123`

Change immédiatement ce mot de passe.

## 6) Sécurité minimum

- Remplace `JWT_SECRET` par une clé forte
- Mets `CORS_ORIGIN` sur ton domaine frontend (pas `*`) en production
- Active HTTPS (Render/Railway le fait déjà)
