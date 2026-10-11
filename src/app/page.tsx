import type { ReactNode } from "react";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { OrganizationSwitcher, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Check, ChevronDown, History, Lock, ShieldCheck, Undo2 } from "lucide-react";
import ProductTour from "@/components/landing/product-tour";
import { MaquetteEcheancier, MaquetteNotes, MaquetteRelances } from "@/components/landing/mockups";
import "./landing.css";

const ETABLISSEMENTS = [
  "Instituts de formation professionnelle",
  "Écoles supérieures (BTS, Licence)",
  "Universités privées (LMD)",
  "Centres de formation continue",
];

const DOMAINES = [
  {
    id: "scolarite",
    domaine: "Scolarité",
    titre: "Le dossier de chaque étudiant, toujours à jour",
    texte:
      "De l'inscription au diplôme, toutes les informations d'un étudiant sont réunies sur une seule fiche, consultable par l'équipe autorisée.",
    points: [
      "Inscription en quelques minutes, matricule attribué automatiquement",
      "Échéancier généré selon la formation, avec remises et bourses",
      "Réinscriptions d'une année à l'autre sans ressaisie",
      "Attestations d'inscription et certificats de scolarité en PDF",
    ],
    maquette: <MaquetteEcheancier />,
  },
  {
    id: "finances",
    domaine: "Finances",
    titre: "Des encaissements tracés et une caisse qui tombe juste",
    texte:
      "Chaque paiement est enregistré avec son moyen de règlement et donne lieu à un reçu numéroté. Les retards sont visibles immédiatement.",
    points: [
      "Espèces, Wave, Orange Money et virement, avec la référence de transaction",
      "Reçu numéroté en PDF, partageable sur WhatsApp",
      "Liste des impayés et relances WhatsApp préparées",
      "Clôture de caisse quotidienne, dépenses et paie des vacataires",
    ],
    maquette: <MaquetteRelances />,
  },
  {
    id: "pedagogie",
    domaine: "Pédagogie",
    titre: "Emplois du temps, présences et notes au même endroit",
    texte:
      "L'organisation des cours et le suivi des résultats s'appuient sur les mêmes données : les heures faites, les absences et les moyennes sont toujours cohérentes.",
    points: [
      "Emplois du temps par classe, sans double réservation de salle",
      "Appel par cours, depuis un ordinateur ou un téléphone",
      "Évaluations, unités d'enseignement et crédits LMD",
      "Relevés de notes et résultats par semestre",
    ],
    maquette: <MaquetteNotes />,
  },
];

const ROLES = [
  {
    role: "Direction",
    texte: "Une vue complète de l'établissement et la main sur les réglages.",
    points: ["Tableau de bord et rapports financiers", "Validation de la paie des vacataires", "Gestion de l'équipe et des droits"],
  },
  {
    role: "Caisse",
    texte: "Les outils du guichet, sans accès aux rapports ni aux réglages.",
    points: ["Encaissements et reçus", "Suivi des impayés et relances", "Clôture de sa caisse chaque soir"],
  },
  {
    role: "Formateurs",
    texte: "Leur programme de cours et le suivi de leurs classes.",
    points: ["Emploi du temps personnel", "Appel en début de cours", "Saisie des notes"],
  },
];

const SECURITE = [
  { icone: Lock, titre: "Données séparées", texte: "Les informations de votre établissement ne sont accessibles qu'à votre équipe." },
  { icone: ShieldCheck, titre: "Accès par rôle", texte: "Chaque membre ne voit que ce qui correspond à sa fonction." },
  { icone: Undo2, titre: "Annulation, jamais suppression", texte: "Un paiement erroné est annulé avec un motif et reste visible." },
  { icone: History, titre: "Historique des opérations", texte: "Les actions sensibles sont enregistrées avec leur auteur et leur date." },
];

const QUESTIONS = [
  {
    q: "Faut-il installer un logiciel ?",
    r: "Non. Kalaas s'utilise dans le navigateur, sur ordinateur, tablette ou téléphone. Il suffit d'une connexion internet.",
  },
  {
    q: "Comment fonctionne l'essai gratuit ?",
    r: "Vous créez votre établissement et utilisez toutes les fonctionnalités pendant 14 jours. Aucune carte bancaire n'est demandée.",
  },
  {
    q: "Kalaas gère-t-il le système LMD ?",
    r: "Oui. Les formations Licence, Master et Doctorat sont organisées en semestres, unités d'enseignement et crédits, avec relevés de notes.",
  },
  {
    q: "Peut-on enregistrer les paiements Wave et Orange Money ?",
    r: "Oui. Le caissier enregistre chaque paiement reçu par Wave, Orange Money, virement ou en espèces, avec la référence de la transaction. Kalaas refuse une référence déjà utilisée.",
  },
  {
    q: "Plusieurs personnes peuvent-elles utiliser Kalaas ?",
    r: "Oui. La direction invite les membres de l'équipe et attribue à chacun un rôle : directeur, caissier ou formateur.",
  },
];

function Bouton({ children, variante = "plein" }: { children: ReactNode; variante?: "plein" | "contour" | "clair" }) {
  const styles = {
    plein: "bg-navy-900 text-white hover:bg-navy-800",
    contour: "border border-border bg-surface-200 text-ink hover:bg-surface-100",
    clair: "bg-white text-navy-900 hover:bg-surface-100",
  };
  return (
    <span className={`inline-flex h-11 cursor-pointer items-center justify-center rounded-md px-5 text-sm font-semibold transition-colors ${styles[variante]}`}>
      {children}
    </span>
  );
}

export default async function HomePage() {
  const { userId, orgId } = await auth();

  // Le même bouton principal partout : essai pour un visiteur, accès direct pour un utilisateur
  const appel = (variante: "plein" | "clair") =>
    orgId ? (
      <Link href="/dashboard">
        <Bouton variante={variante}>Ouvrir mon espace</Bouton>
      </Link>
    ) : userId ? null : (
      <SignUpButton mode="modal">
        <button type="button">
          <Bouton variante={variante}>Démarrer l&apos;essai gratuit</Bouton>
        </button>
      </SignUpButton>
    );

  return (
    <div className="bg-surface-100 text-ink">
      {/* ─── En-tête ─── */}
      <header className="sticky top-0 z-30 border-b border-border bg-surface-100/90 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-4 sm:px-6" aria-label="Navigation principale">
          <Link href="/" className="text-xl font-bold text-ink">
            Kalaas<span className="text-gold-500">.</span>
          </Link>
          <div className="hidden gap-6 text-sm md:flex">
            <a href="#fonctionnalites" className="text-ink-muted hover:text-ink">
              Fonctionnalités
            </a>
            <a href="#equipe" className="text-ink-muted hover:text-ink">
              Équipe
            </a>
            <a href="#securite" className="text-ink-muted hover:text-ink">
              Sécurité
            </a>
            <a href="#questions" className="text-ink-muted hover:text-ink">
              Questions
            </a>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {userId ? (
              <>
                <OrganizationSwitcher />
                <UserButton />
              </>
            ) : (
              <>
                <SignInButton mode="modal">
                  <button type="button" className="cursor-pointer text-sm font-medium text-ink hover:text-ink-muted">
                    Se connecter
                  </button>
                </SignInButton>
                <span className="hidden sm:block">{appel("plein")}</span>
              </>
            )}
          </div>
        </nav>
      </header>

      <main>
        {/* ─── Présentation ─── */}
        <section className="px-4 pt-14 pb-20 sm:px-6 lg:pt-20">
          <div className="mx-auto max-w-4xl text-center">
            <p className="inline-flex rounded-full border border-border bg-surface-200 px-3 py-1 text-xs font-medium text-ink-muted">
              Logiciel de gestion d&apos;établissement académique
            </p>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-[3.25rem] lg:leading-[1.12]">
              Toute la gestion de votre établissement, dans un seul outil
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-pretty text-ink-muted">
              Scolarité, pédagogie et finances : Kalaas accompagne les instituts de formation, écoles supérieures et
              universités privées, de l&apos;inscription des étudiants jusqu&apos;au bilan financier.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {appel("plein")}
              <a href="#fonctionnalites">
                <Bouton variante="contour">Découvrir les fonctionnalités</Bouton>
              </a>
            </div>
            {userId && !orgId && (
              <p className="mt-6 text-sm text-ink-muted">
                Créez votre établissement depuis le menu en haut à droite pour commencer.
              </p>
            )}
            <p className="mt-5 text-xs text-ink-muted">14 jours d&apos;essai · Sans carte bancaire · Aucune installation</p>
          </div>

          <div className="mx-auto mt-14 max-w-5xl">
            <ProductTour />
          </div>
        </section>

        {/* ─── Pour quels établissements ─── */}
        <section className="border-y border-border bg-surface-200">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
            <p className="text-center text-xs font-medium tracking-wide text-ink-muted uppercase">Conçu pour</p>
            <ul className="mt-4 grid gap-3 text-center text-sm font-medium sm:grid-cols-2 lg:grid-cols-4">
              {ETABLISSEMENTS.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* ─── Fonctionnalités par domaine ─── */}
        <section id="fonctionnalites" className="scroll-mt-16 px-4 py-24 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Tout le fonctionnement de l&apos;établissement</h2>
              <p className="mt-4 text-ink-muted">
                Les services administratifs, la caisse et l&apos;équipe pédagogique travaillent sur les mêmes informations,
                sans fichiers Excel à réconcilier.
              </p>
            </div>

            <div className="mt-20 space-y-24">
              {DOMAINES.map((d, i) => (
                <div key={d.id} id={d.id} className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
                  <div className={`min-w-0 ${i % 2 === 1 ? "lg:order-2" : ""}`}>
                    <p className="text-sm font-semibold text-gold-700">{d.domaine}</p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{d.titre}</h3>
                    <p className="mt-4 leading-relaxed text-ink-muted">{d.texte}</p>
                    <ul className="mt-6 space-y-3">
                      {d.points.map((p) => (
                        <li key={p} className="flex gap-3 text-sm">
                          <Check size={18} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={`min-w-0 ${i % 2 === 1 ? "lg:order-1" : ""}`}>{d.maquette}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Rôles ─── */}
        <section id="equipe" className="scroll-mt-16 border-t border-border bg-surface-200 px-4 py-24 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Un espace adapté à chaque fonction</h2>
              <p className="mt-4 text-ink-muted">
                La direction invite son équipe et attribue un rôle à chacun. Chaque personne retrouve les outils dont elle
                a besoin, et seulement ceux-là.
              </p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {ROLES.map((r) => (
                <div key={r.role} className="rounded-xl border border-border bg-surface-100 p-6">
                  <h3 className="text-lg font-semibold">{r.role}</h3>
                  <p className="mt-2 text-sm text-ink-muted">{r.texte}</p>
                  <ul className="mt-5 space-y-2.5 border-t border-border pt-5">
                    {r.points.map((p) => (
                      <li key={p} className="flex gap-2.5 text-sm">
                        <Check size={16} className="mt-0.5 shrink-0 text-gold-700" aria-hidden="true" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Sécurité ─── */}
        <section id="securite" className="scroll-mt-16 px-4 py-24 sm:px-6">
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Des données fiables et protégées</h2>
              <p className="mt-4 text-ink-muted">
                Les informations financières et académiques d&apos;un établissement demandent de la rigueur. Kalaas garde la
                trace de chaque opération importante.
              </p>
            </div>
            <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {SECURITE.map((s) => (
                <div key={s.titre}>
                  <s.icone size={22} className="text-navy-700" aria-hidden="true" />
                  <h3 className="mt-3 font-semibold">{s.titre}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{s.texte}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Questions fréquentes ─── */}
        <section id="questions" className="scroll-mt-16 border-t border-border bg-surface-200 px-4 py-24 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">Questions fréquentes</h2>
            <div className="mt-12 divide-y divide-border border-y border-border">
              {QUESTIONS.map((q) => (
                <details key={q.q} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                    {q.q}
                    <ChevronDown
                      size={18}
                      className="shrink-0 text-ink-muted transition-transform group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>
                  <p className="mt-3 pr-8 text-sm leading-relaxed text-ink-muted">{q.r}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Dernier appel ─── */}
        <section className="px-4 py-20 sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 rounded-2xl bg-navy-900 px-8 py-12 text-white sm:px-12 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Essayez Kalaas dans votre établissement</h2>
              <p className="mt-2 text-white/70">Toutes les fonctionnalités pendant 14 jours, sans engagement.</p>
            </div>
            {appel("clair")}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-lg font-bold text-ink">
              Kalaas<span className="text-gold-500">.</span>
            </p>
            <p className="mt-1">Logiciel de gestion d&apos;établissement académique</p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <a href="#fonctionnalites" className="text-ink-muted hover:text-ink">
              Fonctionnalités
            </a>
            <a href="#securite" className="text-ink-muted hover:text-ink">
              Sécurité
            </a>
            <a href="#questions" className="text-ink-muted hover:text-ink">
              Questions
            </a>
            <span>© 2026 Kalaas</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
