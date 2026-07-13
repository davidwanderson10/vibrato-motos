import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { isInvestidor } from "@/lib/permissoes";
import { presignedGetUrl } from "@/lib/storage";
import { PageHeader } from "@/components/app-shell/page-header";
import {
  DadosLocadoraForm,
  PerfilForm,
  EmailForm,
  SenhaForm,
} from "./forms";

export default async function ConfiguracoesPage() {
  const usuario = await requireUser();
  const investidor = isInvestidor(usuario);

  const locadora = await prisma.locadora.findUniqueOrThrow({
    where: { id: usuario.locadoraId },
  });

  const logoUrl = locadora.logoUrl
    ? await presignedGetUrl(locadora.logoUrl)
    : null;

  return (
    <>
      <PageHeader
        title="Configurações"
        subtitle={
          investidor ? "Sua conta" : "Dados da locadora e da sua conta"
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {!investidor && (
          <div className="lg:col-span-2">
            <DadosLocadoraForm
              locadora={{
                nome: locadora.nome,
                cnpj: locadora.cnpj,
                responsavel: locadora.responsavel,
                whatsapp: locadora.whatsapp,
                endereco: locadora.endereco,
              }}
              logoUrl={logoUrl}
            />
          </div>
        )}
        <PerfilForm nomeAtual={usuario.nome} />
        <EmailForm emailAtual={usuario.email} />
        <SenhaForm />
      </div>
    </>
  );
}
