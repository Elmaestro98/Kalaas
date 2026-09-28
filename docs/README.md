# Kalaas

**Gérez votre institut, simplement.**

Kalaas est un SaaS multi-tenant pour les instituts de formation au Sénégal : inscriptions, échéanciers, encaissements (espèces, Wave, Orange Money), reçus PDF envoyés par WhatsApp et relances des impayés, depuis un navigateur ou un téléphone.

> Statut : MVP en développement — phase 1 (fondations).
> Cahier des charges complet : [`docs/Kalaas_Cahier_des_charges_MVP.md`](docs/Kalaas_Cahier_des_charges_MVP.md)

---

## Fonctionnalités du MVP

| Module | Contenu |
| --- | --- |
| M1 — Paramétrage | Profil de l'institut, catalogue des formations, sessions (cohortes) |
| M2 — Apprenants et inscriptions | Fiches apprenants, inscription avec échéancier automatique, remises, import Excel |
| M3 — Paiements et caisse | Espèces, Wave, Orange Money, virement ; paiements partiels ; reçus PDF numérotés ; clôture de caisse |
| M4 — Relances | Liste des impayés, relances WhatsApp / SMS manuelles ou automatiques (J-3, J+1, J+7) |
| M5 — Présences | Appel par séance sur mobile, taux d'assiduité |
| M6 — Tableau de bord | Encaissé du jour / du mois, reste à recouvrer, exports Excel et PDF |

## Stack technique

| Brique | Choix |
| --- | --- |
| Application | Next.js (App Router, TypeScript), Server Actions, Route Handlers |
| Base de données | PostgreSQL sur Supabase, via Prisma 6 |
| Fichiers | Supabase Storage (reçus PDF, logos) |
| Authentification | Clerk + Organizations (1 organisation = 1 institut) |
| Validation | Zod |
| Hébergement | Vercel (Hobby en développement, Pro en production) |
| Tâches planifiées | Vercel Cron + table `Job` |
| Paiements en ligne | API Wave Business, Orange Money (webhooks) |
| Surveillance | Sentry, UptimeRobot |

## Démarrage rapide

### Prérequis

- Node.js 20 ou plus
- Un projet [Supabase](https://supabase.com)
- Une application [Clerk](https://clerk.com) avec **Organizations** activé

### Installation

```bash
git clone <url-du-repo> kalaas
cd kalaas
npm install
cp .env.example .env        # puis remplir les variables
npx prisma validate
npx prisma migrate dev --name init
npm run dev
```

L'application tourne sur [http://localhost:3000](http://localhost:3000).

Pour créer le projet depuis zéro, suivre [`SETUP.md`](SETUP.md).

### Variables d'environnement

| Variable | Rôle |
| --- | --- |
| `DATABASE_URL` | Pooler Supabase, port 6543, avec `?pgbouncer=true` |
| `DIRECT_URL` | Connexion directe Supabase, port 5432 (migrations) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clé publique Clerk |
| `CLERK_SECRET_KEY` | Clé secrète Clerk |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Vérification des webhooks Clerk |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Accès serveur au Storage (ne jamais exposer côté client) |
| `CRON_SECRET` | Protection des routes appelées par Vercel Cron |

## Structure du projet

```
kalaas/
├── docs/
│   └── Kalaas_Cahier_des_charges_MVP.md
├── prisma/
│   └── schema.prisma          # modèle de données complet
├── src/
│   ├── app/                   # pages et routes (App Router)
│   ├── lib/
│   │   ├── prisma.ts          # client Prisma + extension multi-tenant dbInstitut()
│   │   ├── tenant.ts          # getContexte(), exigerRole()
│   │   └── recus.ts           # numérotation des reçus par institut et par année
│   └── proxy.ts               # middleware Clerk
├── CLAUDE.md                  # contrat de code du projet
├── SETUP.md                   # guide de mise en place pas à pas
└── .env.example
```

## Architecture multi-tenant

Tous les instituts partagent une même base. Chaque table métier porte une colonne `institutId`.

```ts
// Dans une Server Action ou une page protégée
import { getContexte, exigerRole } from "@/lib/tenant";

const { institut, membre, db } = await exigerRole("DIRECTEUR", "CAISSIER");
const apprenants = await db.apprenant.findMany(); // filtré automatiquement sur l'institut
```

- `getContexte()` relie l'organisation Clerk active à l'`Institut`, vérifie le `Membre` et renvoie `db`, un client Prisma limité à cet institut.
- Le client brut `prisma` est réservé aux webhooks, aux jobs et au super admin.
- Le Row Level Security de PostgreSQL sert de seconde barrière.

## Règles de développement

1. Le code métier utilise uniquement `ctx.db`, jamais le client `prisma` brut.
2. `institutId` s'écrit toujours en scalaire, jamais via `connect` ; pas d'écritures imbriquées sur les modèles tenant.
3. Montants en FCFA entiers (`Int`), jamais de `Float`.
4. Un paiement n'est jamais modifié ni supprimé : une annulation crée une ligne `Annulation`.
5. Chaque paiement se crée dans une transaction unique : numéro de reçu, paiement, répartition sur les échéances, journal d'audit.
6. Webhooks idempotents grâce à la contrainte unique `(mode, reference)`.
7. Chaque Server Action commence par `getContexte()` ou `exigerRole()`, puis valide ses entrées avec Zod.
8. Interface en français, pensée mobile d'abord.

Le détail est dans [`CLAUDE.md`](CLAUDE.md).

## Rôles

| Rôle | Accès |
| --- | --- |
| Directeur | Tout l'institut, tableau de bord financier, gestion de l'équipe |
| Caissier | Inscriptions, encaissements, reçus, relances |
| Formateur | Ses sessions et les présences |

## Scripts utiles

```bash
npm run dev                       # serveur de développement
npm run build                     # build de production
npx prisma studio                 # explorer la base
npx prisma migrate dev --name xxx # nouvelle migration
npx prisma generate               # régénérer le client
```

## Feuille de route

- [ ] **Sem. 1–2 — Fondations** : schéma Prisma, auth + instituts, isolation des données, déploiement Vercel
- [ ] **Sem. 3–5 — Cœur métier** : formations, sessions, apprenants, inscriptions, échéanciers, import Excel
- [ ] **Sem. 6–7 — Paiements** : encaissements, reçus PDF, clôture de caisse, relances wa.me
- [ ] **Sem. 8 — Pilotage** : présences, tableau de bord, exports, attestations
- [ ] **Sem. 9–10 — Pilote** : E-DEV Academy + 2 instituts, corrections

Lancement commercial dès que 3 instituts utilisent Kalaas chaque jour.

## Offres

| Offre | Prix | Pour qui |
| --- | --- | --- |
| Essentiel | 10 000 FCFA / mois | Jusqu'à 100 apprenants, 2 utilisateurs |
| Pro | 20 000 FCFA / mois | Jusqu'à 300 apprenants, 5 utilisateurs, relances automatiques, paiement en ligne |
| Premium | 35 000 FCFA / mois | Illimité, SMS, plusieurs sites, support prioritaire |

---

## Licence

Logiciel propriétaire. © 2026 AFRICATECHNOLOGIE. Tous droits réservés.

## Contact

Mohamed Cheikh Samba — AFRICATECHNOLOGIE
africatechnologie9@gmail.com
