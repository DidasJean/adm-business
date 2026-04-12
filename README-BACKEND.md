# ADM Backend (Vraie Application)

Ce backend transforme ton app locale en vraie application avec base de données centrale.

## 1) Préparer l'environnement

1. Copie `.env.example` vers `.env`
2. Renseigne `DATABASE_URL` (Supabase PostgreSQL recommandé)
3. Renseigne `JWT_SECRET`

Exemple Supabase:

`DATABASE_URL=postgresql://postgres:<PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres`

## 2) Lancer

```bash
npm run start
```

API disponible sur:

- `GET /health`
- `POST /api/auth/login`
- `GET/POST/PUT/DELETE /api/clients`
- `GET/POST/PUT/DELETE /api/transactions`
- `GET /api/notifications`
- `POST /api/notifications/mark-read-all`
- `GET/POST /api/messages`
- `GET/POST/PUT/DELETE /api/users`
- `POST /api/users/:id/toggle-active`

## 3) Compte initial

Au premier lancement, un admin est créé:

- `username: admin`
- `password: ADM123`

Change le mot de passe après connexion.

## 4) Fonctionnalités déjà prêtes

- Auth JWT (admin/client)
- Gestion clients
- Gestion transactions
- Notification client automatique à chaque nouveau mouvement
- Messagerie client <-> gérant (API)

## 5) Étape suivante (frontend)

Connecter `adm-calculator.html` à l'API:

- remplacer progressivement `localStorage` par appels `fetch('/api/...')`
- conserver fallback local hors ligne si tu veux un mode hybride
- ou ouvrir directement: `adm-calculator.html?api=https://ton-api`
