// Logo Kalaas : un « K » coiffé d'une toque, avec le point doré de la marque.
// Version vectorielle du fichier public/Logo3.png (mêmes formes, mêmes couleurs).

type LogoIconeProps = {
  taille?: number;
  className?: string;
};

export function LogoIcone({ taille = 32, className = "" }: LogoIconeProps) {
  return (
    <svg
      viewBox="0 0 180 180"
      width={taille}
      height={taille}
      className={`shrink-0 ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="180" height="180" rx="36" fill="#0D1B2A" />
      <polygon points="89.5,38 136,52.5 89.5,67.5 43,52.5" fill="#F7F5F0" />
      <rect x="58" y="77" width="16" height="66" fill="#F7F5F0" />
      <polygon points="74,101 98.5,77 121,77 88.5,109.5 121,143 99,143 74,118" fill="#F7F5F0" />
      <circle cx="111" cy="109.5" r="10" fill="#C4A35A" />
    </svg>
  );
}

type LogoProps = {
  // « clair » : texte blanc, pour un fond bleu nuit ; « sombre » : texte bleu nuit, pour un fond clair
  variante?: "clair" | "sombre";
  taille?: number;
  className?: string;
};

// L'icône suivie du nom « Kalaas. »
export default function Logo({ variante = "sombre", taille = 32, className = "" }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoIcone taille={taille} />
      <span
        className={`font-bold leading-none ${variante === "clair" ? "text-white" : "text-ink"}`}
        style={{ fontSize: taille * 0.68 }}
      >
        Kalaas<span className="text-gold-500">.</span>
      </span>
    </span>
  );
}
