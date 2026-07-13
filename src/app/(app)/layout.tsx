import { requireUser } from "@/lib/auth";
import { Sidebar } from "@/components/app-shell/sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await requireUser();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar
        usuarioNome={usuario.nome}
        locadoraNome={usuario.locadora.nome}
        cargo={usuario.cargo}
        permissoes={usuario.permissoes}
      />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">{children}</div>
      </main>
    </div>
  );
}
