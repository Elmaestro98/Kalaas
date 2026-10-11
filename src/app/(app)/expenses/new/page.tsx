import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { exigerRole } from "@/lib/tenant";
import { dateDuJour } from "@/lib/echeancier";
import { formatFcfa } from "@/lib/format";
import ExpenseForm from "./expense-form";

export default async function NewExpensePage() {
  const { institut, membre } = await exigerRole("DIRECTEUR", "CAISSIER");
  const plafond = membre.role === "CAISSIER" ? institut.plafondDepenseCaissier : null;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/expenses" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
        <ArrowLeft size={16} aria-hidden="true" />
        Dépenses
      </Link>
      <h1 className="mt-3 text-2xl font-semibold lg:text-3xl">Nouvelle dépense</h1>
      <p className="mt-1 text-sm text-ink-muted">Loyer, factures, salaires, fournitures… tout ce qui sort de la caisse.</p>
      {plafond === 0 ? (
        <p className="mt-6 rounded-lg border border-border bg-surface-200 p-6 text-sm text-ink-muted">
          Seul le directeur peut enregistrer des dépenses dans cet établissement.
        </p>
      ) : (
        <>
          {plafond !== null && (
            <p className="mt-4 rounded-md bg-gold-100 px-4 py-3 text-sm text-gold-700">
              Vous pouvez enregistrer les dépenses jusqu&apos;à <b>{formatFcfa(plafond)}</b>. Au-delà, demandez au
              directeur.
            </p>
          )}
          <div className="mt-6 rounded-lg border border-border bg-surface-200 p-5 lg:p-6">
            <ExpenseForm aujourdhui={dateDuJour().toISOString().slice(0, 10)} />
          </div>
        </>
      )}
    </div>
  );
}
