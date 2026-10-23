"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";

// Graphiques du tableau de bord de la plateforme : une seule série par graphique (couleur --chart-1),
// traits fins, grille discrète, infobulle au survol et tableau des valeurs pour l'accessibilité.

type Pas = "day" | "week" | "month";
type Point = { debut: string; valeur: number };

const compact = new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 });
const entier = new Intl.NumberFormat("fr-FR");
const jourCourt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
const jourLong = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const moisCourt = new Intl.DateTimeFormat("fr-FR", { month: "short", year: "2-digit", timeZone: "UTC" });
const moisLong = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });

// Graduation de l'axe : « 24 sept. », ou « oct. 26 » pour les mois
function graduation(debut: string, pas: Pas) {
  const d = new Date(debut);
  return pas === "month" ? moisCourt.format(d) : jourCourt.format(d);
}

// Libellé complet de l'intervalle (infobulle et tableau)
function intervalle(debut: string, pas: Pas) {
  const d = new Date(debut);
  if (pas === "day") return jourLong.format(d);
  if (pas === "week") return `Semaine du ${jourCourt.format(d)}`;
  return moisLong.format(d);
}

const axe = { fill: "var(--ink-muted)", fontSize: 12 };

// Graduations rondes de l'axe vertical : pas de 1, 2, 2,5 ou 5 × 10ⁿ (0 · 5 k · 10 k · 15 k…)
function graduationsY(points: Point[]): number[] {
  const max = Math.max(...points.map((p) => p.valeur), 1);
  const brut = max / 4;
  const puissance = 10 ** Math.floor(Math.log10(brut));
  const pas = [1, 2, 2.5, 5, 10].map((m) => m * puissance).find((p) => p >= brut && Number.isInteger(p)) ?? puissance * 10;
  return Array.from({ length: Math.ceil(max / pas) + 1 }, (_, i) => i * pas);
}

function Infobulle({ active, payload, pas, unite }: TooltipContentProps<number, string> & { pas: Pas; unite?: string }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as Point;
  return (
    <div className="rounded-md border border-border bg-surface-200 px-3 py-2 text-sm shadow-raised">
      <p className="flex items-center gap-2 font-semibold tabular-nums text-ink">
        <span aria-hidden="true" className="h-0.5 w-3 rounded-full bg-[var(--chart-1)]" />
        {entier.format(point.valeur)}
        {unite && <span className="font-normal text-ink-muted">{unite}</span>}
      </p>
      <p className="text-xs text-ink-muted">{intervalle(point.debut, pas)}</p>
    </div>
  );
}

// Tableau des valeurs (repli accessible : tout ce que montre le graphique est lisible sans survol)
function Valeurs({ points, pas, unite }: { points: Point[]; pas: Pas; unite?: string }) {
  return (
    <details className="mt-2 text-sm">
      <summary className="cursor-pointer text-xs font-medium text-ink-muted hover:text-ink">Afficher les valeurs</summary>
      <div className="mt-2 max-h-56 overflow-y-auto rounded-md border border-border">
        <table className="w-full text-xs">
          <tbody className="divide-y divide-border">
            {points.map((p) => (
              <tr key={p.debut}>
                <th scope="row" className="px-3 py-1.5 text-left font-normal text-ink-muted">
                  {intervalle(p.debut, pas)}
                </th>
                <td className="px-3 py-1.5 text-right tabular-nums">
                  {entier.format(p.valeur)}
                  {unite && ` ${unite}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

type SerieProps = { points: Point[]; pas: Pas; titre: string; unite?: string };

// Évolution d'un nombre (utilisateurs actifs) : courbe avec un léger voile
export function Courbe({ points, pas, titre, unite }: SerieProps) {
  const graduations = graduationsY(points);
  return (
    <figure>
      <div className="h-56" role="img" aria-label={titre}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="debut"
              tickFormatter={(d: string) => graduation(d, pas)}
              tick={axe}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              minTickGap={24}
            />
            <YAxis
              ticks={graduations}
              domain={[0, graduations[graduations.length - 1]]}
              tickFormatter={(v: number) => compact.format(v)}
              tick={axe}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip
              cursor={{ stroke: "var(--ink-muted)", strokeWidth: 1 }}
              content={(props) => <Infobulle {...(props as TooltipContentProps<number, string>)} pas={pas} unite={unite} />}
            />
            <Area
              type="monotone"
              dataKey="valeur"
              stroke="var(--chart-1)"
              strokeWidth={2}
              fill="var(--chart-1)"
              fillOpacity={0.1}
              activeDot={{ r: 5, fill: "var(--chart-1)", stroke: "var(--surface-200)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <Valeurs points={points} pas={pas} unite={unite} />
    </figure>
  );
}

// Quantités par intervalle (encaissements, inscriptions) : colonnes fines arrondies au sommet
export function Colonnes({ points, pas, titre, unite }: SerieProps) {
  const graduations = graduationsY(points);
  return (
    <figure>
      <div className="h-56" role="img" aria-label={titre}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="debut"
              tickFormatter={(d: string) => graduation(d, pas)}
              tick={axe}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              minTickGap={24}
            />
            <YAxis
              ticks={graduations}
              domain={[0, graduations[graduations.length - 1]]}
              tickFormatter={(v: number) => compact.format(v)}
              tick={axe}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip
              cursor={{ fill: "var(--surface-100)" }}
              content={(props) => <Infobulle {...(props as TooltipContentProps<number, string>)} pas={pas} unite={unite} />}
            />
            <Bar dataKey="valeur" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <Valeurs points={points} pas={pas} unite={unite} />
    </figure>
  );
}

// Comparaison de catégories (fonctions utilisées) : barres horizontales de la plus grande à la plus petite,
// valeur au bout de chaque barre ; les catégories à zéro sont listées sous le graphique
export function Barres({ elements, titre }: { elements: { label: string; valeur: number }[]; titre: string }) {
  const utilises = elements.filter((e) => e.valeur > 0).sort((a, b) => b.valeur - a.valeur);
  const inutilises = elements.filter((e) => e.valeur === 0);
  if (utilises.length === 0) {
    return <p className="rounded-md bg-surface-100 p-6 text-center text-sm text-ink-muted">Aucune action sur la période.</p>;
  }
  return (
    <figure>
      <div style={{ height: utilises.length * 34 + 16 }} role="img" aria-label={titre}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={utilises} layout="vertical" margin={{ top: 0, right: 48, bottom: 0, left: 0 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="label" tick={axe} tickLine={false} axisLine={false} width={160} />
            <Bar dataKey="valeur" fill="var(--chart-1)" radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false}>
              <LabelList
                dataKey="valeur"
                position="right"
                formatter={(v: unknown) => entier.format(Number(v))}
                style={{ fill: "var(--ink)", fontSize: 12, fontVariantNumeric: "tabular-nums" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {inutilises.length > 0 && (
        <figcaption className="mt-2 text-xs text-ink-muted">
          Non utilisées sur la période : {inutilises.map((e) => e.label).join(", ")}.
        </figcaption>
      )}
    </figure>
  );
}
