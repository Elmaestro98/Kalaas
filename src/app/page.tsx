import { auth } from "@clerk/nextjs/server";
import { SignInButton, UserButton, OrganizationSwitcher } from "@clerk/nextjs";

export default async function HomePage() {
  const { userId, orgId } = await auth();

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold">
        Kalaas<span className="text-gold-500">.</span>
      </h1>
      <p className="mt-2 text-ink-muted">Gérez votre institut, simplement.</p>

      {userId ? (
        <div className="mt-8 space-y-4">
          <div className="flex items-center gap-4">
            <OrganizationSwitcher />
            <UserButton />
          </div>
          <p>Institut actif : {orgId ?? "aucun"}</p>
          {orgId && (
            <a href="/dashboard" className="font-semibold">
              Accéder à mon espace →
            </a>
          )}
        </div>
      ) : (
        <SignInButton mode="modal">
          <button className="mt-8 h-11 cursor-pointer rounded-md bg-action px-5 font-medium text-on-action hover:bg-action-hover">
            Se connecter
          </button>
        </SignInButton>
      )}
    </main>
  );
}
