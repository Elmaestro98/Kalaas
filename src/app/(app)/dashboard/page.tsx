import { getContexte } from "@/lib/tenant";

export default async function DashboardPage() {
  const { institut, membre, db } = await getContexte();

  const nbApprenants = await db.apprenant.count();

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-semibold lg:text-3xl">
        Bonjour {membre.utilisateur.nom}
      </h1>
      <p className="mt-1 text-ink-muted">
        {institut.nom} · {institut.ville}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-navy-900 p-5 text-white">
          <p className="text-sm text-white/70">Apprenants inscrits</p>
          <p className="mt-1 text-3xl font-bold text-gold-500">{nbApprenants}</p>
        </div>
      </div>
    </div>
  );
}