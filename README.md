# Gestion des horaires du bureau

Application Next.js 16 + Tailwind (en français) permettant à un manager de
configurer les horaires d'ouverture habituels du bureau et les périodes de
fermeture exceptionnelles, avec une API publique pour exposer ces
informations. L'authentification se fait par lien magique (Auth.js + Resend)
et chaque utilisateur dispose de son propre espace d'entreprise.

## Aperçu

![Interface manager](docs/screenshots/manager-home.png)

## Stack

- **Next.js 16** (App Router, Route Handlers)
- **React 19** + **Tailwind CSS 3** (thème clair)
- **PostgreSQL** via le driver `pg` (sans ORM)
- **Auth.js v5** (`next-auth@beta`) + adaptateur Postgres + Resend pour les
  emails de connexion
- **TypeScript**

## Démarrage rapide

1. Copier `.env.example` vers `.env` et renseigner les valeurs (au minimum
   `DATABASE_URL` et `AUTH_SECRET` ; `AUTH_RESEND_KEY` est optionnel en local).
2. Installer les dépendances :
   ```bash
   npm install
   ```
3. Initialiser la base (création des tables Auth.js + métier) :
   ```bash
   npm run db:init
   ```
4. Lancer le serveur de développement :
   ```bash
   npm run dev
   ```

L'interface est accessible sur http://localhost:3000. Toute requête
non-authentifiée est redirigée vers `/sign-in`.

### Authentification par lien magique

![Page de connexion](docs/screenshots/sign-in-page.png)

- L'utilisateur saisit son email sur `/sign-in`.
- Un lien à usage unique (valable 24 h) lui est envoyé.
  - Si `AUTH_RESEND_KEY` est défini, l'email est envoyé via Resend.
  - Sinon, le lien est imprimé dans la console du serveur (mode dev pratique).
- À la première connexion, une **entreprise** est automatiquement créée pour
  l'utilisateur (nom dérivé du domaine de l'email, slug aléatoire).

### Multi-tenant

Chaque utilisateur appartient à une entreprise. Toutes les requêtes
(horaires, fermetures, widgets, API publique) sont scopées par `company_id`.
Les URLs publiques utilisent le slug de l'entreprise.

```
/                                  ← UI manager (authentifié)
/sign-in                           ← page de connexion
/settings                          ← paramètres de l'entreprise (nom, slug, fuseau)
/embeds                            ← code à intégrer pour vos widgets

/c/<slug>/api/schedule             ← API publique
/c/<slug>/api/status               ← statut public
/c/<slug>/embed/badge              ← widget public
/c/<slug>/embed/badge-holidays     ← widget public + fermeture
```

## Schéma PostgreSQL

Voir [`src/lib/schema.sql`](src/lib/schema.sql).

| Table                | Rôle                                                                  |
| -------------------- | --------------------------------------------------------------------- |
| `companies`          | Une ligne par entreprise (slug, nom, fuseau horaire).                 |
| `users`              | Tables Auth.js + colonne `company_id` qui rattache l'utilisateur.     |
| `accounts`, `sessions`, `verification_token` | Tables techniques d'Auth.js (le projet utilise des sessions JWT, mais l'adapter requiert leur présence). |
| `regular_hours`      | Clé `(company_id, day_of_week)`. Récurrence `frequency_weeks` (1–4) + décalage `week_offset`. |
| `holidays`           | Périodes de fermeture rattachées à une entreprise.                     |

## Interface manager

- **Statut courant** : indique si le bureau est ouvert maintenant.
- **Horaires habituels** : case à cocher par jour + heures
  d'ouverture/fermeture, plus une récurrence (toutes les semaines, une
  semaine sur 2/3/4) avec sélection de la prochaine occurrence ouverte.
- **Périodes de fermeture** : ajout / suppression de périodes datées.
- **Paramètres** : nom de l'entreprise, slug public, fuseau horaire.

![Paramètres de l'entreprise](docs/screenshots/settings-page.png)

## API publique

Toutes les réponses sont en JSON et autorisent CORS (`*`). Les routes
publiques sont scopées par slug d'entreprise et ne nécessitent pas
d'authentification.

### `GET /c/<slug>/api/schedule`

Retourne les horaires hebdomadaires et les fermetures à venir.

```json
{
  "company": { "slug": "acme-wbisd", "name": "Acme" },
  "timezone": "Europe/Paris",
  "regular_hours": [
    {
      "day_of_week": 1,
      "day_label": "Monday",
      "is_open": true,
      "open_time": "09:00",
      "close_time": "18:00",
      "frequency_weeks": 1,
      "week_offset": 0,
      "next_occurrence": null
    },
    {
      "day_of_week": 5,
      "day_label": "Friday",
      "is_open": true,
      "open_time": "09:00",
      "close_time": "18:00",
      "frequency_weeks": 2,
      "week_offset": 1,
      "next_occurrence": "2026-05-15"
    }
  ],
  "upcoming_closures": [
    {
      "id": 3,
      "name": "Christmas break",
      "start_date": "2026-12-22",
      "end_date": "2027-01-02"
    }
  ]
}
```

`frequency_weeks` est la longueur du cycle (1–4) ; `week_offset` est l'index
de la semaine d'ouverture dans ce cycle (0..N-1), calculé par rapport au
lundi 2000-01-03 comme époque de référence. Pour les jours hebdomadaires,
`frequency_weeks=1`, `week_offset=0` et `next_occurrence=null`. Pour les
récurrences plus longues, `next_occurrence` pointe sur la prochaine date
ouverte concrète.

### `GET /c/<slug>/api/status`

Indique si le bureau est ouvert à l'instant donné.

Paramètres :

- `date` (optionnel) — date/heure ISO 8601. Par défaut : maintenant.

```json
{
  "company": { "slug": "acme-wbisd", "name": "Acme" },
  "checked_at": "2026-05-03T14:30:00.000Z",
  "timezone": "Europe/Paris",
  "open": true,
  "closes_at": "18:00",
  "reason": "regular"
}
```

## Widgets à intégrer

La page `/embeds` présente les widgets liés à votre entreprise avec un
aperçu en direct et un extrait `<iframe>` à copier.

![Page d'intégration des widgets](docs/screenshots/embeds-page.png)

| Route                                      | Contenu                                                                |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| `/c/<slug>/embed/badge`                    | Badge compact Ouvert / Fermé avec heure de fermeture ou motif.         |
| `/c/<slug>/embed/badge-holidays`           | Badge + période de fermeture en cours ou à venir dans 15 jours max.    |

Aperçus des widgets :

| Badge | Badge + prochaine fermeture |
| ----- | --------------------------- |
| ![Badge fermé](docs/screenshots/widget-badge.png) | ![Badge + fermeture (fermé)](docs/screenshots/widget-badge-holidays.png) |

Les widgets se rafraîchissent automatiquement toutes les 2 minutes côté
client et autorisent l'embed depuis n'importe quel domaine
(`Content-Security-Policy: frame-ancestors *`).

Exemple d'intégration :

```html
<iframe
  src="https://votre-domaine.example/c/acme-wbisd/embed/badge"
  width="360"
  height="56"
  loading="lazy"
  style="border:0;background:transparent"
  title="Horaires du bureau">
</iframe>
```

## API d'administration (interne)

Utilisée par l'interface de gestion. Toutes ces routes nécessitent une
session valide ; elles sont automatiquement scopées sur l'entreprise de
l'utilisateur courant.

| Méthode | Route                          | Description                                       |
| ------- | ------------------------------ | ------------------------------------------------- |
| `GET`   | `/api/admin/regular-hours`     | Liste des 7 jours.                                |
| `PUT`   | `/api/admin/regular-hours`     | Met à jour les 7 jours en bloc.                   |
| `GET`   | `/api/admin/closures`          | Liste des fermetures (`?include_past=true`).      |
| `POST`  | `/api/admin/closures`          | Crée une période de fermeture.                    |
| `DELETE`| `/api/admin/closures/:id`      | Supprime une période.                             |
| `GET`   | `/api/admin/company`           | Lit les paramètres de l'entreprise.               |
| `PATCH` | `/api/admin/company`           | Met à jour nom, slug ou fuseau horaire.           |

## Variables d'environnement

| Variable           | Description                                                                                  |
| ------------------ | -------------------------------------------------------------------------------------------- |
| `DATABASE_URL`     | Chaîne PostgreSQL (`postgres://user:pass@host:5432/db`).                                     |
| `TZ`              | Fuseau horaire par défaut côté serveur (ex. `Europe/Paris`).                                  |
| `AUTH_SECRET`      | Secret de signature des JWT Auth.js. Générer avec `openssl rand -base64 32`.                 |
| `AUTH_URL`         | URL publique du déploiement (utilisée pour construire les liens magiques).                   |
| `AUTH_RESEND_KEY`  | Clé d'API Resend. Si absente, les liens magiques sont imprimés dans la console (mode dev).   |
| `EMAIL_FROM`       | Adresse expéditrice (par ex. `noreply@votre-domaine.com`).                                   |

## Régénérer les captures d'écran

Les captures du dossier `docs/screenshots/` sont produites par un script
Playwright qui se connecte avec un cookie de session. Lancez le serveur en
mode production puis exécutez le script avec un cookie de session valide :

```bash
npm run build && npm start &
SCREENSHOT_SESSION_TOKEN="<jeton authjs.session-token>" \
SCREENSHOT_COMPANY_SLUG="acme-wbisd" \
npm run screenshots
```

Variables d'environnement utiles :

- `SCREENSHOT_BASE_URL` (défaut `http://localhost:3000`)
- `SCREENSHOT_SESSION_TOKEN` : valeur du cookie `authjs.session-token` après
  une connexion (les écrans manager sont sautés sans ce jeton)
- `SCREENSHOT_COMPANY_SLUG` : slug de l'entreprise utilisé pour les captures
  des widgets
- `CHROMIUM_PATH` : chemin vers un binaire Chromium si vous ne voulez pas
  laisser Playwright en télécharger un
