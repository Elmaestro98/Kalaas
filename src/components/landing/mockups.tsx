import type { ReactNode } from "react";
import {
  BarChart3,
  BellRing,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  MessageCircle,
  PenLine,
  Users,
  Wallet,
} from "lucide-react";

// Maquettes fidèles à l'interface Kalaas, avec des données fictives

const NAV = [
  { icone: LayoutDashboard, label: "Tableau de bord", cle: "dashboard" },
  { icone: Users, label: "Étudiants", cle: "students" },
  { icone: ClipboardList, label: "Inscriptions", cle: "enrollments" },
  { icone: BookOpen, label: "Formations", cle: "courses" },
  { icone: CalendarCheck, label: "Présences", cle: "attendance" },
  { icone: PenLine, label: "Notes", cle: "grades" },
  { icone: CalendarDays, label: "Emplois du temps", cle: "timetable" },
  { icone: Wallet, label: "Encaissements", cle: "payments" },
  { icone: BellRing, label: "Impayés", cle: "unpaid" },
  { icone: BarChart3, label: "Rapports", cle: "reports" },
];

const TONS = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  gold: "bg-gold-100 text-gold-700",
  neutral: "bg-surface-100 text-ink-muted",
};

function Pastille({ ton, children }: { ton: keyof typeof TONS; children: ReactNode }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold whitespace-nowrap uppercase ${TONS[ton]}`}>
      {children}
    </span>
  );
}

// Fenêtre d'application : barre de titre + barre latérale + contenu
export function AppWindow({ actif, titre, children }: { actif: string; titre: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-200 shadow-[0_24px_64px_-24px_rgba(13,27,42,0.35)]">
      <div className="flex items-center gap-2 border-b border-border bg-surface-100 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <span className="ml-3 text-[11px] text-ink-muted">Kalaas · {titre}</span>
      </div>
      <div className="flex h-[24rem] text-left sm:h-[24.5rem]">
        <aside className="hidden w-40 shrink-0 bg-navy-900 py-4 text-white md:block">
          <p className="px-4 pb-4 text-base font-bold">
            Kalaas<span className="text-gold-500">.</span>
          </p>
          <ul className="space-y-0.5 px-2">
            {NAV.map((n) => (
              <li
                key={n.cle}
                className={`flex items-center gap-2 rounded border-l-2 px-2 py-1.5 text-[10px] ${
                  n.cle === actif ? "border-gold-500 bg-navy-700 font-semibold" : "border-transparent text-white/65"
                }`}
              >
                <n.icone size={12} aria-hidden="true" />
                {n.label}
              </li>
            ))}
          </ul>
        </aside>
        <div className="min-w-0 flex-1 overflow-hidden bg-surface-100 p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
}

function Carte({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-border bg-surface-200 p-3 ${className}`}>{children}</div>;
}

// ─── Écran : tableau de bord ───

const DERNIERS = [
  { heure: "11:42", nom: "Mariama Diallo", mode: "Wave", ton: "info" as const, montant: "65 000" },
  { heure: "11:15", nom: "Cheikh Fall", mode: "Espèces", ton: "neutral" as const, montant: "40 000" },
  { heure: "10:58", nom: "Aïssatou Ndiaye", mode: "Orange Money", ton: "warning" as const, montant: "75 000" },
  { heure: "10:21", nom: "Ousmane Sow", mode: "Virement", ton: "gold" as const, montant: "150 000" },
];

export function EcranTableauDeBord() {
  return (
    <div>
      <p className="text-sm font-semibold">Bonjour Aminata</p>
      <p className="text-[10px] text-ink-muted">École Supérieure Horizon · Dakar</p>
      <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <div className="rounded-lg bg-navy-900 p-3 text-white">
          <p className="text-[9px] text-white/70">Encaissé en octobre</p>
          <p className="mt-1 text-base font-bold text-gold-500 tabular-nums">
            4 860 000 <span className="text-[9px] font-normal text-white/70">FCFA</span>
          </p>
        </div>
        <Carte>
          <p className="text-[9px] text-ink-muted">Encaissé aujourd&apos;hui</p>
          <p className="mt-1 text-base font-bold tabular-nums">385 000</p>
          <p className="text-[9px] text-ink-muted">9 règlements</p>
        </Carte>
        <Carte>
          <div className="flex items-center justify-between gap-1">
            <p className="text-[9px] text-ink-muted">Reste à recouvrer</p>
            <Pastille ton="danger">23 en retard</Pastille>
          </div>
          <p className="mt-1 text-base font-bold tabular-nums">12 450 000</p>
        </Carte>
        <Carte>
          <p className="text-[9px] text-ink-muted">Inscriptions actives</p>
          <p className="mt-1 text-base font-bold tabular-nums">412</p>
        </Carte>
      </div>
      <div className="mt-2 grid gap-2 lg:grid-cols-[1.3fr_1fr]">
        <Carte>
          <p className="text-[11px] font-semibold">Derniers paiements</p>
          <ul className="mt-1 divide-y divide-border">
            {DERNIERS.map((d) => (
              <li key={d.nom} className="flex items-center gap-2 py-1.5 text-[10px]">
                <span className="w-8 text-ink-muted tabular-nums">{d.heure}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{d.nom}</span>
                <Pastille ton={d.ton}>{d.mode}</Pastille>
                <span className="w-14 text-right font-semibold tabular-nums">{d.montant}</span>
              </li>
            ))}
          </ul>
        </Carte>
        <Carte className="hidden lg:block">
          <p className="text-[11px] font-semibold">Résultat du mois</p>
          <dl className="mt-1 divide-y divide-border text-[10px]">
            <div className="flex justify-between py-1.5">
              <dt className="text-ink-muted">Encaissé</dt>
              <dd className="font-semibold text-success tabular-nums">4 860 000</dd>
            </div>
            <div className="flex justify-between py-1.5">
              <dt className="text-ink-muted">Paie des vacataires</dt>
              <dd className="tabular-nums">− 1 240 000</dd>
            </div>
            <div className="flex justify-between py-1.5">
              <dt className="text-ink-muted">Dépenses</dt>
              <dd className="tabular-nums">− 890 000</dd>
            </div>
            <div className="flex justify-between py-1.5 font-semibold">
              <dt>Solde</dt>
              <dd className="tabular-nums">2 730 000 FCFA</dd>
            </div>
          </dl>
        </Carte>
      </div>
    </div>
  );
}

// ─── Écran : journal des encaissements ───

const JOURNAL = [
  { recu: "REC-2026-01284", nom: "Mariama Diallo", formation: "Licence 2 · Gestion", mode: "Wave", ton: "info" as const, montant: "65 000" },
  { recu: "REC-2026-01283", nom: "Cheikh Fall", formation: "BTS Comptabilité", mode: "Espèces", ton: "neutral" as const, montant: "40 000" },
  { recu: "REC-2026-01282", nom: "Aïssatou Ndiaye", formation: "Master 1 · Finance", mode: "Orange Money", ton: "warning" as const, montant: "75 000" },
  { recu: "REC-2026-01281", nom: "Ousmane Sow", formation: "Licence 3 · Informatique", mode: "Virement", ton: "gold" as const, montant: "150 000" },
  { recu: "REC-2026-01280", nom: "Khady Mbaye", formation: "Licence 1 · Droit", mode: "Wave", ton: "info" as const, montant: "50 000" },
  { recu: "REC-2026-01279", nom: "Pape Diop", formation: "Développement web", mode: "Espèces", ton: "neutral" as const, montant: "35 000" },
];

export function EcranEncaissements() {
  return (
    <div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Encaissements</p>
          <p className="text-[10px] text-ink-muted">Mardi 13 octobre · 9 règlements · 385 000 FCFA</p>
        </div>
        <span className="rounded-md bg-gold-500 px-2.5 py-1.5 text-[10px] font-semibold text-navy-900">+ Nouvel encaissement</span>
      </div>
      <div className="mt-3 overflow-hidden rounded-lg border border-border bg-surface-200">
        <div className="grid grid-cols-[1fr_auto] gap-2 border-b border-border px-3 py-2 text-[9px] font-semibold text-ink-muted sm:grid-cols-[7rem_1fr_auto_4.5rem]">
          <span className="hidden sm:block">Reçu</span>
          <span>Apprenant</span>
          <span className="hidden sm:block">Mode</span>
          <span className="text-right">Montant</span>
        </div>
        {JOURNAL.map((j) => (
          <div
            key={j.recu}
            className="grid grid-cols-[1fr_auto] items-center gap-2 border-b border-border px-3 py-2 text-[10px] last:border-0 sm:grid-cols-[7rem_1fr_auto_4.5rem]"
          >
            <span className="hidden text-ink-muted tabular-nums sm:block">{j.recu}</span>
            <span className="min-w-0">
              <span className="block truncate font-medium">{j.nom}</span>
              <span className="block truncate text-[9px] text-ink-muted">{j.formation}</span>
            </span>
            <span className="hidden sm:block">
              <Pastille ton={j.ton}>{j.mode}</Pastille>
            </span>
            <span className="text-right font-semibold tabular-nums">{j.montant}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Écran : emploi du temps ───

const COURS: { jour: number; debut: number; duree: number; matiere: string; prof: string; ton: string }[] = [
  { jour: 0, debut: 0, duree: 2, matiere: "Comptabilité générale", prof: "M. Diop", ton: "bg-gold-100 border-gold-500" },
  { jour: 0, debut: 3, duree: 2, matiere: "Droit des affaires", prof: "Mme Ba", ton: "bg-info-soft border-info" },
  { jour: 1, debut: 1, duree: 2, matiere: "Mathématiques financières", prof: "M. Sarr", ton: "bg-success-soft border-success" },
  { jour: 2, debut: 0, duree: 3, matiere: "Contrôle de gestion", prof: "M. Diop", ton: "bg-gold-100 border-gold-500" },
  { jour: 3, debut: 2, duree: 2, matiere: "Anglais des affaires", prof: "Mme Kane", ton: "bg-warning-soft border-warning" },
  { jour: 4, debut: 0, duree: 2, matiere: "Fiscalité", prof: "M. Ndiaye", ton: "bg-info-soft border-info" },
  { jour: 4, debut: 3, duree: 2, matiere: "Informatique de gestion", prof: "M. Faye", ton: "bg-success-soft border-success" },
];

export function EcranEmploiDuTemps() {
  const jours = ["Lun", "Mar", "Mer", "Jeu", "Ven"];
  return (
    <div>
      <p className="text-sm font-semibold">Emplois du temps</p>
      <p className="text-[10px] text-ink-muted">Licence 2 · Gestion · semaine type</p>
      <div className="mt-3 grid grid-cols-5 gap-1.5">
        {jours.map((j, i) => (
          <div key={j} className="overflow-hidden rounded-md border border-border bg-surface-200">
            <p className="bg-navy-900 px-2 py-1 text-[9px] font-semibold text-white">{j}</p>
            <div className="relative h-56 sm:h-60">
              {COURS.filter((c) => c.jour === i).map((c) => (
                <div
                  key={c.matiere}
                  className={`absolute inset-x-1 rounded border-l-2 p-1.5 ${c.ton}`}
                  style={{ top: `${(c.debut / 6) * 100}%`, height: `calc(${(c.duree / 6) * 100}% - 4px)` }}
                >
                  <p className="text-[8px] text-ink-muted tabular-nums">
                    {8 + c.debut}h – {8 + c.debut + c.duree}h
                  </p>
                  <p className="text-[9px] leading-tight font-semibold">{c.matiere}</p>
                  <p className="hidden text-[8px] text-ink-muted sm:block">{c.prof}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Petites maquettes pour les sections fonctionnalités ───

export function MaquetteEcheancier() {
  const lignes = [
    { libelle: "Frais d'inscription", date: "1 oct.", montant: "100 000", statut: "Payée", ton: "success" as const },
    { libelle: "Mensualité 1/9", date: "5 oct.", montant: "65 000", statut: "Payée", ton: "success" as const },
    { libelle: "Mensualité 2/9", date: "5 nov.", montant: "65 000", statut: "Partiel", ton: "warning" as const },
    { libelle: "Mensualité 3/9", date: "5 déc.", montant: "65 000", statut: "À venir", ton: "neutral" as const },
  ];
  return (
    <div className="rounded-xl border border-border bg-surface-200 p-5 shadow-[0_16px_40px_-20px_rgba(13,27,42,0.25)]">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-navy-900 text-sm font-semibold text-gold-500">
          MD
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Mariama Diallo</p>
          <p className="truncate text-xs text-ink-muted">ESH-2026-0148 · Licence 2 · Gestion</p>
        </div>
        <Pastille ton="success">À jour</Pastille>
      </div>
      <div className="mt-4">
        <div className="flex justify-between text-xs">
          <span className="text-ink-muted">Payé 205 000 / 685 000 FCFA</span>
          <span className="font-semibold">30 %</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-100">
          <div className="h-full w-[30%] rounded-full bg-gold-500" />
        </div>
      </div>
      <ul className="mt-4 divide-y divide-border text-sm">
        {lignes.map((l) => (
          <li key={l.libelle} className="flex items-center gap-3 py-2.5">
            <span className="min-w-0 flex-1">
              <span className="block truncate">{l.libelle}</span>
              <span className="text-xs text-ink-muted">Échéance le {l.date}</span>
            </span>
            <span className="font-semibold tabular-nums">{l.montant}</span>
            <Pastille ton={l.ton}>{l.statut}</Pastille>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MaquetteRelances() {
  const retards = [
    { nom: "Babacar Thiam", formation: "Licence 1 · Droit", jours: 34, montant: "130 000" },
    { nom: "Ndeye Fatou Gueye", formation: "BTS Comptabilité", jours: 12, montant: "45 000" },
    { nom: "Modou Seck", formation: "Master 1 · Finance", jours: 6, montant: "75 000" },
  ];
  return (
    <div className="rounded-xl border border-border bg-surface-200 p-5 shadow-[0_16px_40px_-20px_rgba(13,27,42,0.25)]">
      <div className="flex items-baseline justify-between">
        <p className="font-semibold">Impayés et relances</p>
        <p className="text-xs text-ink-muted">250 000 FCFA en retard</p>
      </div>
      <ul className="mt-3 divide-y divide-border">
        {retards.map((r) => (
          <li key={r.nom} className="flex items-center gap-3 py-3">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{r.nom}</span>
              <span className="block truncate text-xs text-ink-muted">{r.formation}</span>
            </span>
            <span className="text-right">
              <span className="block text-sm font-semibold tabular-nums">{r.montant}</span>
              <span className={`text-xs ${r.jours > 30 ? "text-danger" : "text-warning"}`}>{r.jours} j de retard</span>
            </span>
            <span className="flex size-8 items-center justify-center rounded-md border border-border text-success">
              <MessageCircle size={15} aria-label="Relancer sur WhatsApp" />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MaquetteNotes() {
  const notes = [
    { nom: "Diallo Mariama", cc: "14,5", examen: "15,0", moyenne: "14,8" },
    { nom: "Fall Cheikh", cc: "11,0", examen: "12,5", moyenne: "11,9" },
    { nom: "Ndiaye Aïssatou", cc: "16,0", examen: "14,0", moyenne: "14,8" },
    { nom: "Sow Ousmane", cc: "8,5", examen: "10,0", moyenne: "9,4" },
  ];
  return (
    <div className="rounded-xl border border-border bg-surface-200 p-5 shadow-[0_16px_40px_-20px_rgba(13,27,42,0.25)]">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="font-semibold">UE 3 · Gestion financière</p>
          <p className="text-xs text-ink-muted">Licence 2 · Semestre 3 · 6 crédits</p>
        </div>
        <Pastille ton="gold">LMD</Pastille>
      </div>
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-ink-muted">
            <th className="pb-2 font-medium">Étudiant</th>
            <th className="pb-2 text-right font-medium">CC</th>
            <th className="pb-2 text-right font-medium">Examen</th>
            <th className="pb-2 text-right font-medium">Moy.</th>
          </tr>
        </thead>
        <tbody>
          {notes.map((n) => (
            <tr key={n.nom} className="border-b border-border last:border-0">
              <td className="py-2.5">{n.nom}</td>
              <td className="py-2.5 text-right tabular-nums">{n.cc}</td>
              <td className="py-2.5 text-right tabular-nums">{n.examen}</td>
              <td className={`py-2.5 text-right font-semibold tabular-nums ${Number(n.moyenne.replace(",", ".")) < 10 ? "text-danger" : ""}`}>
                {n.moyenne}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

