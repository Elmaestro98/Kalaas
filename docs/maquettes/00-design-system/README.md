# Kalaas

Kalaas est le SaaS de gestion des instituts de formation et écoles au Sénégal. Son identité tient en deux couleurs — le **bleu nuit** de l'institution et l'**or** de la réussite — et une typographie : **Poppins**. Toute interface Kalaas (application, site, e-mails, supports) part de ce système.

## Ton et contenu

- Français clair, vouvoiement, phrases courtes. On parle d'« apprenants », de « promotions », de « mensualités ».
- Les boutons disent l'action : « Enregistrer le paiement », pas « Valider ».
- Montants en FCFA avec espace fine : `45 000 FCFA`. Dates : `12 oct. 2026`.
- Pas d'emoji dans l'interface.

## Couleurs

- **`navy-900` #0D1B2A** — couleur d'identité : barre latérale, en-têtes, bouton principal (thème clair), fond de page en thème sombre.
- **`gold-500` #C4A35A** — accent : bouton « or », indicateur de menu actif, filets, chiffres clés. **Jamais en texte sur fond clair** (2,4:1) : utiliser `gold-700`.
- Fonds : `surface-100` (ivoire chaud #F7F5F0) pour la page, `surface-200` (blanc) pour les cartes, `border` pour les séparations.
- Texte : `ink` pour le principal, `ink-muted` pour le secondaire.
- `action` / `on-action` basculent automatiquement : bleu nuit + blanc en clair, or + bleu nuit en sombre.
- États : `success`, `warning`, `danger`, `info`, chacun avec sa version `-soft` pour les fonds de badges.
- Règle d'or : l'or reste rare (≈10 % de l'écran). Il signale ce qui compte.

## Typographie

Poppins (Google Fonts, graisses 400/500/600/700), une seule famille. Styles : `display`, `h1`, `h2`, `h3` pour les titres ; `body`, `body-sm`, `label`, `caption`, `overline` pour le reste. Les titres en 600, le texte en 400, les boutons et libellés en 500.

## Espacement, rayons, ombres

- Grille de 4px : `space-1` (4) → `space-12` (48). Padding de carte `space-6`, gouttière `space-4`.
- Rayons : `radius-sm` (6) champs, `radius-md` (10) boutons, `radius-lg` (16) cartes, `radius-pill` badges.
- Ombres douces : `shadow-card` au repos, `shadow-raised` au survol et pour les menus.

## Composants

- **Button** — variantes `primary` (action), `gold`, `secondary` (contour), `ghost`, `danger` ; tailles `sm`, `md`, `lg`. Un seul bouton `primary` ou `gold` par zone.
- **Badge** — statuts : `success`, `warning`, `danger`, `info`, `gold`, `neutral`. Toujours un mot, en capitales via `caption`.
- **Card** — conteneur `surface-200`, bordure `border`, `radius-lg`, padding `space-6` ; options titre, sur-titre, actions et filet or (`accent`).
- **Input** / **Select** — champs avec libellé toujours visible, focus bordure `gold-500` + halo `gold-100`, erreur en `danger`.
- **Table** — en-têtes `overline` sur `surface-100`, montants alignés à droite, statuts en `Badge`, survol `gold-100`.
- **Sidebar** — navigation `navy-900` (dans les deux thèmes), élément actif `navy-700` avec barre `gold-500`, compteurs en pastille or.

## Logo

Pas encore de logo fourni. En attendant : le mot « Kalaas » en Poppins 700, suivi d'un point `gold-500` (« Kalaas. »), blanc sur `navy-900` ou `ink` sur fond clair. Ne pas dessiner de symbole tant que le logo officiel n'est pas ajouté au système.

## Accessibilité

Tous les textes atteignent 4,5:1 dans les deux thèmes. Focus visible : anneau `focus-ring` de 2px décalé de 2px. Les statuts ne reposent jamais sur la couleur seule : chaque badge porte un mot.
