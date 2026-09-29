import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { exigerRole } from "@/lib/tenant";
import TeacherForm from "../teacher-form";

export default async function NewTeacherPage() {
  const { db } = await exigerRole("DIRECTEUR");

  // Comptes de l'équipe qui n'ont pas encore de fiche professeur
  const membres = await db.membre.findMany({
    where: { actif: true, role: { in: ["FORMATEUR", "DIRECTEUR"] }, ficheEnseignant: { is: null } },
    include: { utilisateur: { select: { nom: true } } },
  });
  const comptes = membres.map((m) => ({ id: m.id, nom: m.utilisateur.nom }));

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/teachers"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Professeurs
      </Link>
      <h1 className="mt-3 text-2xl font-semibold lg:text-3xl">Nouveau professeur</h1>
      <p className="mt-1 mb-6 text-sm text-ink-muted">
        Permanent ou vacataire : il pourra ensuite être affecté à des cours dans les emplois du temps.
      </p>
      <div className="rounded-lg border border-border bg-surface-200 p-5 shadow-[var(--shadow-card)] lg:p-8">
        <TeacherForm
          comptes={comptes}
          valeurs={{
            prenom: "",
            nom: "",
            telephone: "",
            email: "",
            specialite: "",
            statut: "VACATAIRE",
            tarifHoraire: 0,
            membreId: "",
          }}
        />
      </div>
    </div>
  );
}
