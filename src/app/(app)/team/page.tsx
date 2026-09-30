import Link from "next/link";
import { Clock, Link2 } from "lucide-react";
import { exigerRole } from "@/lib/tenant";
import { formatDate } from "@/lib/format";
import { nomEnseignant } from "@/lib/enseignants";
import { ROLE_LABELS } from "@/components/navigations";
import Badge from "@/components/ui/badge";
import { basculerAcces, revoquerInvitation } from "./actions";
import InviteForm from "./invite-form";
import RoleSelect from "./role-select";

function initiales(nom: string) {
  return nom
    .split(" ")
    .map((mot) => mot[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default async function TeamPage() {
  const { membre: moi, db } = await exigerRole("DIRECTEUR");

  const [membres, invitations, fichesLibres] = await Promise.all([
    db.membre.findMany({
      orderBy: [{ actif: "desc" }, { createdAt: "asc" }],
      include: {
        utilisateur: { select: { nom: true, email: true } },
        ficheEnseignant: { select: { id: true, prenom: true, nom: true } },
      },
    }),
    db.invitation.findMany({
      where: { statut: "EN_ATTENTE" },
      orderBy: { createdAt: "desc" },
      include: { enseignant: { select: { prenom: true, nom: true } } },
    }),
    // Fiches professeur sans compte, proposées quand on invite un formateur
    db.enseignant.findMany({
      where: { actif: true, membreId: null },
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    }),
  ]);

  const actifs = membres.filter((m) => m.actif);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold lg:text-3xl">Équipe</h1>
      <p className="mt-1 text-sm text-ink-muted">
        {actifs.length} membre{actifs.length > 1 ? "s" : ""} actif{actifs.length > 1 ? "s" : ""} · les
        apprenants n&apos;ont pas besoin de compte
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_24rem] lg:items-start">
        <div className="space-y-6">
          {/* Membres */}
          <section className="overflow-hidden rounded-lg border border-border bg-surface-200">
            <h2 className="border-b border-border px-5 py-4 font-semibold">Membres</h2>
            <ul className="divide-y divide-border">
              {membres.map((m) => {
                const estMoi = m.id === moi.id;
                return (
                  <li
                    key={m.id}
                    className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 ${m.actif ? "" : "opacity-60"}`}
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-navy-900 text-sm font-semibold text-gold-500">
                      {initiales(m.utilisateur.nom)}
                    </span>
                    <div className="min-w-44 flex-1">
                      <p className="font-semibold">
                        {m.utilisateur.nom}
                        {estMoi && <span className="ml-2 text-xs font-normal text-ink-muted">(vous)</span>}
                      </p>
                      <p className="truncate text-xs text-ink-muted">{m.utilisateur.email}</p>
                      {m.ficheEnseignant && (
                        <Link
                          href={`/teachers/${m.ficheEnseignant.id}`}
                          className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium"
                        >
                          <Link2 size={12} aria-hidden="true" />
                          Fiche : {nomEnseignant(m.ficheEnseignant)}
                        </Link>
                      )}
                    </div>

                    {estMoi || !m.actif ? (
                      <Badge ton={m.role === "DIRECTEUR" ? "gold" : "neutral"}>{ROLE_LABELS[m.role]}</Badge>
                    ) : (
                      <RoleSelect membreId={m.id} role={m.role} nom={m.utilisateur.nom} />
                    )}

                    {!estMoi && (
                      <form action={basculerAcces}>
                        <input type="hidden" name="id" value={m.id} />
                        <button
                          type="submit"
                          className={`cursor-pointer text-sm font-medium hover:underline ${
                            m.actif ? "text-danger" : "text-success"
                          }`}
                        >
                          {m.actif ? "Retirer l'accès" : "Rétablir l'accès"}
                        </button>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Invitations en attente */}
          {invitations.length > 0 && (
            <section className="overflow-hidden rounded-lg border border-border bg-surface-200">
              <h2 className="border-b border-border px-5 py-4 font-semibold">Invitations en attente</h2>
              <ul className="divide-y divide-border">
                {invitations.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 text-sm">
                    <Clock size={18} className="shrink-0 text-warning" aria-hidden="true" />
                    <div className="min-w-44 flex-1">
                      <p className="font-medium">{i.email}</p>
                      <p className="text-xs text-ink-muted">
                        Invité le {formatDate(i.createdAt)}
                        {i.enseignant && <> · fiche {nomEnseignant(i.enseignant)}</>}
                      </p>
                    </div>
                    <Badge ton="warning">{ROLE_LABELS[i.role]}</Badge>
                    <form action={revoquerInvitation}>
                      <input type="hidden" name="id" value={i.id} />
                      <button type="submit" className="cursor-pointer text-sm font-medium text-danger hover:underline">
                        Annuler
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Inviter */}
        <aside className="rounded-lg border border-border bg-surface-200 p-5 lg:sticky lg:top-24">
          <h2 className="font-semibold">Inviter un membre</h2>
          <p className="mt-1 mb-4 text-sm text-ink-muted">
            La personne reçoit un e-mail pour créer son compte. Son accès est activé à sa première connexion.
          </p>
          <InviteForm fiches={fichesLibres.map((f) => ({ id: f.id, nom: nomEnseignant(f) }))} />
        </aside>
      </div>
    </div>
  );
}
