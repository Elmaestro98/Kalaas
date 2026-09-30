# Kalaas

**Gérez votre établissement, simplement.**

Kalaas est un SaaS multi-tenant pour les **instituts de formation professionnelle** et les **établissements d'enseignement supérieur privés** au Sénégal, qu'ils proposent des formations courtes ou des diplômes du **système LMD (Licence, Master, Doctorat)**. Inscriptions et réinscriptions, échéanciers, encaissements (espèces, Wave, Orange Money, virement), reçus envoyés par WhatsApp et relances des impayés, depuis un navigateur ou un téléphone.

> Statut : MVP en développement — cœur métier, paiements et LMD en place ; relances, reçu PDF et pilotage à venir.
> Cahier des charges : [`docs/Kalaas_Cahier_des_charges_MVP.md`](docs/Kalaas_Cahier_des_charges_MVP.md)

---

## Pour qui ?

| Type d'établissement | Exemples | Ce qui change |
| --- | --- | --- |
| **Formation professionnelle** | Centres d'informatique, langues, couture, esthétique, comptabilité | Formations de quelques mois, sessions (promos) qui démarrent toute l'année, mensualités sur la durée de la formation |
| **Enseignement supérieur LMD** | Instituts supérieurs, écoles de commerce et d'ingénieurs, universités privées | Filières organisées en niveaux (L1 → L3, M1 → M2, D1 → D3), année académique, inscription annuelle puis **réinscription** au niveau suivant, frais annuels répartis sur l'année |
| **Mixte** | Institut qui propose à la fois des Licences et des formations courtes | Les deux fonctionnent dans le même compte |

Un même établissement peut donc proposer « Licence Informatique de gestion — L2 » et « Bureautique (3 mois) » : Kalaas gère les deux avec la même caisse et les mêmes reçus.

## Fonctionnalités

| Module | Contenu | État |
| --- | --- | --- |
| M1 — Paramétrage | Profil de l'établissement (NINEA, RCCM, pied de reçu), catalogue des formations, sessions | ✅ |
| M1 bis — Structure LMD | Années académiques, cycles (Licence, Master, Doctorat), filières et niveaux, tarif par niveau | ✅ |
| M2 — Apprenants et inscriptions | Fiche apprenant, inscription avec échéancier automatique, remises et bourses tracées | ✅ |
| M2 bis — Réinscriptions | Réinscription annuelle (passage au niveau supérieur, redoublement), matricule étudiant ✅ · import Excel 🔜 | 🟡 |
| M3 — Paiements et caisse | Espèces, Wave, Orange Money, virement ; paiements partiels répartis sur les échéances ; reçus numérotés ; annulation tracée ; journal de caisse | ✅ |
| M3 bis | Reçu PDF, clôture de caisse journalière, paiement en ligne par lien Wave | 🔜 |
| M4 — Relances | Liste des impayés, relances WhatsApp / SMS manuelles ou automatiques (J-3, J+1, J+7) | 🔜 |
| M5 — Présences | Appel par séance sur mobile, taux d'assiduité | 🔜 |
| M5 bis — Emplois du temps | Semaine type par classe (plusieurs cours par jour, horaires précis), salles, détection des conflits (classe, enseignant, salle), vues par classe / enseignant / salle, téléchargement PDF | ✅ |
| Équipe | Invitation par e-mail (Caissier, Formateur, Directeur), acceptation automatique à la première connexion, changement de rôle, retrait d'accès, liaison compte ↔ fiche professeur | ✅ |
| M5 ter — Professeurs | Fiches professeurs (permanents et vacataires, avec ou sans compte), affectation par matière et par classe, suivi des heures programmées / prévues, programmation envoyée par WhatsApp, « Ma semaine » pour le professeur connecté | ✅ |
| M6 — Tableau de bord et documents | Encaissé du jour / du mois, reste à recouvrer ✅ · exports Excel et PDF, attestation d'inscription, certificat de scolarité 🔜 | 🟡 |

> **Hors MVP (phase 2)** : notes et évaluations, semestres, unités d'enseignement (UE) et crédits ECTS, délibérations et procès-verbaux, relevés de notes, exceptions d'emploi du temps (cours annulés ou déplacés à une date précise), portail étudiant, application mobile native.

## Le système LMD dans Kalaas

### Vocabulaire

| Terme LMD | Dans Kalaas | Exemple |
| --- | --- | --- |
| Cycle | `cycle` d'une formation | Licence (3 ans), Master (2 ans), Doctorat (3 ans) |
| Filière / parcours | `filiere` d'une formation | Informatique de gestion, Finance-Comptabilité |
| Niveau | `niveau` d'une formation (1, 2, 3…) | L1, L2, L3, M1, M2 |
| Année académique | `AnneeAcademique` | 2026-2027 (octobre → juillet) |
| Classe / promotion | `Session` rattachée à une année académique | « L2 Informatique de gestion — 2026-2027 » |
| Inscription / réinscription | `Inscription` avec son type | Nouvelle inscription en L1, réinscription en L2, redoublement |
| Frais d'inscription annuels + scolarité | Échéances `INSCRIPTION` + `MENSUALITE` | 75 000 FCFA à l'inscription, puis 9 × 50 000 FCFA d'octobre à juin |

### Principe retenu

La chaîne existante **Formation → Session → Inscription → Échéance** reste la même pour tous. Pour le LMD, une **formation représente un niveau d'une filière**, avec son propre tarif :

```
Filière « Informatique de gestion » (cycle Licence)
├── Formation « Licence Informatique de gestion — L1 »  · 75 000 + 9 × 50 000
│   └── Session « L1 Info. gestion — 2026-2027 »  (année académique 2026-2027)
├── Formation « … — L2 »  · 75 000 + 9 × 55 000
└── Formation « … — L3 »  · 100 000 + 9 × 60 000
```

- **L'année académique** regroupe les sessions de l'année et sert de filtre partout (inscrits, encaissements, impayés).
- **La réinscription** crée une nouvelle inscription au niveau suivant (ou au même niveau en cas de redoublement), reliée à la précédente, avec un nouvel échéancier. L'historique financier de chaque année reste consultable.
- **Le matricule** est unique par établissement et reste le même pendant toute la scolarité (ex. `ITF-2026-0142`).
- Les formations courtes ne sont pas concernées : `cycle = FORMATION_COURTE`, sans filière ni niveau.

### Modèle de données LMD (migration `lmd`)

| Modèle | Ajouts |
| --- | --- |
| `AnneeAcademique` (nouveau) | libellé, date de début, date de fin, année en cours |
| `Formation` | `cycle` (FORMATION_COURTE, LICENCE, MASTER, DOCTORAT), `filiere`, `niveau` |
| `Session` | `anneeAcademiqueId` (obligatoire pour le LMD, vide pour les formations courtes) |
| `Apprenant` | `matricule` (unique par établissement), e-mail, date et lieu de naissance, sexe, diplôme d'accès |
| `Inscription` | `type` (NOUVELLE, REINSCRIPTION, REDOUBLEMENT), `inscriptionPrecedenteId` |
| `Institut` | `prefixeMatricule` (par défaut : initiales du nom, ex. ITF) |
| `CompteurMatricule` (nouveau) | numérotation atomique des matricules par établissement et par année d'entrée |

Ces ajouts sont compatibles avec les données existantes : toutes les nouvelles colonnes sont facultatives ou ont une valeur par défaut. Un apprenant créé avant les matricules en reçoit un à sa prochaine réinscription.

### Parcours type

1. **Paramètres** → créer l'année académique 2026-2027 (marquée « en cours ») et vérifier le préfixe des matricules.
2. **Formations** → « Nouvelle formation » → type Licence, filière, niveau L1, tarif annuel. Répéter pour L2 et L3.
3. **Nouvelle session** → formation L1, année 2026-2027 : les dates de l'année sont reprises automatiquement.
4. **Inscrire un apprenant** → il reçoit son matricule (ex. `ITF-2026-0001`).
5. L'année suivante : fiche apprenant → **Réinscrire** → Kalaas propose la session de L2 de l'année en cours ; l'inscription de L1 passe à « terminée » et ses éventuels impayés restent dus.

## Stack technique

| Brique | Choix |
| --- | --- |
| Application | Next.js 16 (App Router, TypeScript), Server Actions |
| Styles | Tailwind CSS v4, branché sur les tokens du design system (`src/app/tokens.css`) |
| Base de données | PostgreSQL sur Supabase, via Prisma 6 |
| Fichiers | Supabase Storage (reçus PDF, logos) |
| Authentification | Clerk + Organizations (1 organisation = 1 établissement) |
| Validation | Zod 4 |
| Icônes | lucide-react |
| PDF | @react-pdf/renderer (emplois du temps ; reçus à venir) |
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
# créer un fichier .env avec les variables ci-dessous
npx prisma migrate dev
npm run dev
```

L'application tourne sur [http://localhost:3000](http://localhost:3000).

### Variables d'environnement

| Variable | Rôle |
| --- | --- |
| `DATABASE_URL` | Pooler Supabase, port 6543, avec `?pgbouncer=true` |
| `DIRECT_URL` | Connexion Supabase port 5432 (migrations) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clé publique Clerk |
| `CLERK_SECRET_KEY` | Clé secrète Clerk |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Vérification des webhooks Clerk (à venir) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase (à venir, Storage) |
| `SUPABASE_SERVICE_ROLE_KEY` | Accès serveur au Storage, ne jamais exposer côté client (à venir) |
| `CRON_SECRET` | Protection des routes appelées par Vercel Cron (à venir) |

## Structure du projet

```
kalaas/
├── docs/
│   ├── Kalaas_Cahier_des_charges_MVP.md
│   └── maquettes/                  # design system et 14 écrans
├── prisma/
│   ├── schema.prisma               # modèle de données
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── page.tsx                # accueil public
│   │   ├── onboarding/             # création de l'établissement
│   │   └── (app)/                  # espace établissement (menu latéral)
│   │       ├── dashboard/
│   │       ├── courses/            # formations et sessions
│   │       ├── students/           # apprenants et fiche apprenant
│   │       ├── enrollments/        # inscriptions et réinscriptions
│   │       ├── payments/           # encaissements, reçus, journal de caisse
│   │       ├── team/               # équipe : invitations, rôles, accès
│   │       ├── teachers/           # professeurs (fiches, matières, volume horaire)
│   │       ├── timetable/          # emplois du temps, affectations + route pdf/ (téléchargement)
│   │       └── settings/           # années académiques, salles, préfixe des matricules
│   ├── components/
│   │   ├── ui/                     # Field, MoneyInput, Badge
│   │   ├── sidebar.tsx, mobile-nav.tsx, navigations.tsx
│   ├── lib/
│   │   ├── prisma.ts               # client Prisma + extension multi-tenant dbInstitut()
│   │   ├── tenant.ts               # getContexte(), exigerRole()
│   │   ├── echeancier.ts           # génération des échéances, résumé financier
│   │   ├── paiements.ts            # répartition des paiements, règles d'annulation
│   │   ├── recus.ts                # numérotation des reçus par établissement et par année
│   │   ├── lmd.ts, matricules.ts   # cycles, niveaux, intitulés, matricules
│   │   ├── emploi-du-temps*.ts     # jours, heures, chargement des emplois du temps
│   │   ├── pdf/                    # documents PDF (@react-pdf/renderer)
│   │   └── format.ts, lettres.ts, telephone.ts, sessions.ts
│   └── proxy.ts                    # proxy Clerk (ex-middleware)
└── AGENTS.md / CLAUDE.md           # consignes pour les assistants IA
```

Conventions : routes et composants en anglais (`/students`, `InstituteForm`), textes de l'interface en français.

## Architecture multi-tenant

Tous les établissements partagent une même base. Chaque table métier porte une colonne `institutId`.

```ts
// Dans une Server Action ou une page protégée
import { exigerRole } from "@/lib/tenant";

const { institut, membre, db } = await exigerRole("DIRECTEUR", "CAISSIER");
const apprenants = await db.apprenant.findMany(); // filtré automatiquement sur l'établissement
```

- `getContexte()` relie l'organisation Clerk active à l'`Institut`, vérifie le `Membre` et renvoie `db`, un client Prisma limité à cet établissement.
- Le client brut `prisma` est réservé à l'onboarding, aux webhooks, aux jobs et au super admin.
- Le Row Level Security de PostgreSQL servira de seconde barrière (à activer).

## Règles de développement

1. Le code métier utilise uniquement `db` (issu de `getContexte()`), jamais le client `prisma` brut.
2. `institutId` s'écrit toujours en scalaire, jamais via `connect` ; pas d'écritures imbriquées sur les modèles tenant.
3. Montants en FCFA entiers (`Int`), jamais de `Float`.
4. Un paiement n'est jamais modifié ni supprimé : une annulation crée une ligne `Annulation`.
5. Chaque paiement se crée dans une transaction unique : numéro de reçu, paiement, répartition sur les échéances, journal d'audit.
6. Webhooks idempotents grâce à la contrainte unique `(mode, reference)`.
7. Chaque Server Action commence par `getContexte()` ou `exigerRole()`, puis valide ses entrées avec Zod.
8. Tout identifiant reçu d'un formulaire est revérifié via `db` avant usage.
9. Interface en français, pensée mobile d'abord.

## Rôles

| Rôle | Accès |
| --- | --- |
| Directeur | Tout l'établissement, tableau de bord financier, gestion de l'équipe, annulation des paiements |
| Caissier / Scolarité | Inscriptions et réinscriptions, encaissements, reçus, relances |
| Formateur / Enseignant | Ses sessions (ou classes) et les présences |

Un même utilisateur peut appartenir à plusieurs établissements (cas fréquent des enseignants vacataires).

## Scripts utiles

```bash
npm run dev                       # serveur de développement
npm run build                     # build de production
npx tsc --noEmit                  # vérification TypeScript
npx eslint src                    # vérification du code
npx prisma studio                 # explorer la base
npx prisma migrate dev --name xxx # nouvelle migration
```

## Feuille de route

- [x] **Fondations** : schéma Prisma, auth + établissements, isolation des données, onboarding
- [ ] Fondations (reste) : déploiement Vercel, Row Level Security
- [x] **Cœur métier** : formations, sessions, apprenants, inscriptions, échéanciers, remises
- [x] **LMD** : années académiques, cycles / filières / niveaux, matricule, réinscriptions
- [x] **Paiements** : encaissements, répartition, reçus numérotés, annulation, journal de caisse
- [ ] Paiements (reste) : reçu PDF, clôture de caisse, relances wa.me, import Excel
- [ ] **Pilotage** : présences, exports, attestations d'inscription et certificats de scolarité
- [ ] **Pilote** : E-DEV Academy + 2 établissements (dont au moins un en LMD), corrections

Lancement commercial dès que 3 établissements utilisent Kalaas chaque jour.

## Offres (proposition)

| Offre | Prix | Pour qui |
| --- | --- | --- |
| Essentiel | 10 000 FCFA / mois | Jusqu'à 100 apprenants, 2 utilisateurs |
| Pro | 20 000 FCFA / mois | Jusqu'à 300 apprenants, 5 utilisateurs, relances automatiques, paiement en ligne |
| Premium | 35 000 FCFA / mois | Jusqu'à 1 000 apprenants, utilisateurs illimités, SMS, plusieurs sites, support prioritaire |
| Campus | Sur devis | Établissements LMD de plus de 1 000 étudiants, accompagnement à la reprise des données |

---

## Licence

Logiciel propriétaire. © 2026 AFRICATECHNOLOGIE. Tous droits réservés.

## Contact

Mohamed Cheikh Samba — AFRICATECHNOLOGIE
africatechnologie9@gmail.com
