# Table

Tableau de données Kalaas : listes d'apprenants, paiements, présences.

- Conteneur `surface-200`, `radius-lg`, bordure `border` ; en-têtes en `overline` sur `surface-100`.
- Cellules `body-sm`, padding `space-3`/`space-4` ; survol de ligne `gold-100`.
- `align: "right"` pour les montants et nombres (chiffres tabulaires). Statuts via `Badge` dans `render`.
- `empty` : message quand il n'y a aucune ligne. Le tableau défile horizontalement sur mobile.
