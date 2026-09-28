
import { getContexte } from "@/lib/tenant";

export default async function DashboardPage() {
  const { institut, membre, db } = await getContexte();

  const nbApprenants = await db.apprenant.count();

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold">Bonjour {membre.utilisateur.nom}</h1>
      <p className="mt-2 text-ink-muted">
        {institut.nom} · {institut.ville} · rôle : {membre.role}
      </p>

      <div className="mt-8 rounded-lg bg-navy-900 p-6 text-white">
        <p className="text-sm text-white/70">Apprenants inscrits</p>
        <p className="mt-1 text-4xl font-bold text-gold-500">{nbApprenants}</p>
      </div>
    </main>
  );
}