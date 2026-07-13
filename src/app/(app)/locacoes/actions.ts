"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { parseDateOnly } from "@/lib/utils";

export type LocacaoFormState = { ok?: boolean; error?: string } | undefined;

const emptyToNull = (v: unknown) => (v === "" || v === undefined ? null : v);
const numNull = z.preprocess(emptyToNull, z.coerce.number().nullable());
const intNull = z.preprocess(emptyToNull, z.coerce.number().int().nullable());
const strNull = z.preprocess(emptyToNull, z.string().nullable());

const schema = z
  .object({
    veiculoId: z.string().min(1, "Selecione o veículo"),
    // cliente
    clienteMode: z.enum(["existente", "novo"]),
    clienteId: strNull,
    novoNome: strNull,
    novoCpf: strNull,
    novoTelefone: strNull,
    novoEmail: strNull,
    novoCnh: strNull,
    // valores
    valorAluguel: z.coerce.number().min(0, "Informe o valor do aluguel"),
    valorCaucao: numNull,
    multaAtraso: numNull,
    jurosMes: numNull,
    // prazos
    dataInicio: z.string().min(1, "Informe a data de início"),
    dataProximoPagamento: strNull,
    tempoMinimoDias: intNull,
    frequenciaPagamento: z.enum([
      "diario",
      "semanal",
      "quinzenal",
      "mensal",
    ]),
    // operacional
    localRetirada: strNull,
    localDevolucao: strNull,
    kmEntrega: intNull,
    nivelCombustivel: strNull,
    franquiaKmDiaria: intNull,
    raioCirculacao: strNull,
    atendenteId: strNull,
    // flags
    seguroTerceiros: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
    promessaCompra: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
    caucaoPendente: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
    caucaoParcelada: z.preprocess(
      (v) => v === "on" || v === "true",
      z.boolean(),
    ),
    status: z.enum(["ativa", "agendada"]),
  })
  .refine(
    (d) =>
      d.clienteMode === "existente"
        ? !!d.clienteId
        : !!d.novoNome && d.novoNome.trim().length > 0,
    { message: "Selecione ou cadastre um locatário", path: ["clienteId"] },
  );

export async function createLocacao(
  _prev: LocacaoFormState,
  formData: FormData,
): Promise<LocacaoFormState> {
  const usuario = await requireStaff();

  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const d = parsed.data;

  // Garante que o veículo é da locadora e está disponível.
  const veiculo = await prisma.veiculo.findFirst({
    where: { id: d.veiculoId, locadoraId: usuario.locadoraId },
  });
  if (!veiculo) return { error: "Veículo não encontrado" };
  if (veiculo.status !== "disponivel" && d.status === "ativa") {
    return { error: "Este veículo não está disponível para alugar." };
  }

  const dataInicio = new Date(d.dataInicio);
  const dataProx = d.dataProximoPagamento
    ? parseDateOnly(d.dataProximoPagamento)
    : dataInicio;

  try {
    await prisma.$transaction(async (tx) => {
      // Cliente: usa existente ou cria novo.
      let clienteId = d.clienteId;
      if (d.clienteMode === "novo") {
        const cliente = await tx.cliente.create({
          data: {
            locadoraId: usuario.locadoraId,
            nome: d.novoNome!.trim(),
            cpf: d.novoCpf,
            telefone: d.novoTelefone,
            email: d.novoEmail,
            cnhNumero: d.novoCnh,
          },
        });
        clienteId = cliente.id;
      } else {
        // valida que o cliente é da locadora
        const c = await tx.cliente.findFirst({
          where: { id: clienteId!, locadoraId: usuario.locadoraId },
          select: { id: true },
        });
        if (!c) throw new Error("Cliente inválido");
      }

      await tx.locacao.create({
        data: {
          locadoraId: usuario.locadoraId,
          veiculoId: d.veiculoId,
          clienteId: clienteId!,
          atendenteId: d.atendenteId || usuario.id,
          valorAluguel: d.valorAluguel,
          valorCaucao: d.valorCaucao,
          multaAtraso: d.multaAtraso,
          jurosMes: d.jurosMes,
          dataInicio,
          dataProximoPagamento: dataProx,
          tempoMinimoDias: d.tempoMinimoDias,
          frequenciaPagamento: d.frequenciaPagamento,
          localRetirada: d.localRetirada,
          localDevolucao: d.localDevolucao,
          kmEntrega: d.kmEntrega,
          nivelCombustivel: d.nivelCombustivel,
          franquiaKmDiaria: d.franquiaKmDiaria,
          raioCirculacao: d.raioCirculacao,
          seguroTerceiros: d.seguroTerceiros,
          promessaCompra: d.promessaCompra,
          caucaoPendente: d.caucaoPendente,
          caucaoParcelada: d.caucaoParcelada,
          status: d.status,
        },
      });

      // Atualiza o status do veículo.
      await tx.veiculo.update({
        where: { id: d.veiculoId },
        data: {
          status: d.status === "agendada" ? "retirada_agendada" : "alugado",
        },
      });
    });
  } catch (e) {
    return {
      error:
        e instanceof Error && e.message === "Cliente inválido"
          ? "Cliente inválido"
          : "Não foi possível criar a locação.",
    };
  }

  revalidatePath("/locacoes");
  revalidatePath("/frota");
  return { ok: true };
}

// Status do veículo derivado da situação da locação.
function veicStatusFor(
  locStatus: "ativa" | "agendada" | "encerrada",
): "alugado" | "retirada_agendada" | "disponivel" {
  if (locStatus === "ativa") return "alugado";
  if (locStatus === "agendada") return "retirada_agendada";
  return "disponivel";
}

const updateSchema = z.object({
  id: z.string().min(1),
  veiculoId: z.string().min(1, "Selecione o veículo"),
  clienteId: z.string().min(1, "Selecione o locatário"),
  valorAluguel: z.coerce.number().min(0, "Informe o valor do aluguel"),
  valorCaucao: numNull,
  multaAtraso: numNull,
  jurosMes: numNull,
  dataInicio: z.string().min(1, "Informe a data de início"),
  dataProximoPagamento: strNull,
  tempoMinimoDias: intNull,
  frequenciaPagamento: z.enum(["diario", "semanal", "quinzenal", "mensal"]),
  localRetirada: strNull,
  localDevolucao: strNull,
  kmEntrega: intNull,
  nivelCombustivel: strNull,
  franquiaKmDiaria: intNull,
  raioCirculacao: strNull,
  atendenteId: strNull,
  seguroTerceiros: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  promessaCompra: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  caucaoPendente: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  caucaoParcelada: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  status: z.enum(["ativa", "agendada", "encerrada"]),
});

export async function updateLocacao(
  _prev: LocacaoFormState,
  formData: FormData,
): Promise<LocacaoFormState> {
  const usuario = await requireStaff();

  const parsed = updateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const d = parsed.data;

  const existente = await prisma.locacao.findFirst({
    where: { id: d.id, locadoraId: usuario.locadoraId },
  });
  if (!existente) return { error: "Locação não encontrada" };

  // Valida veículo e cliente pertencem à locadora.
  const [veic, cli] = await Promise.all([
    prisma.veiculo.findFirst({
      where: { id: d.veiculoId, locadoraId: usuario.locadoraId },
      select: { id: true },
    }),
    prisma.cliente.findFirst({
      where: { id: d.clienteId, locadoraId: usuario.locadoraId },
      select: { id: true },
    }),
  ]);
  if (!veic) return { error: "Veículo inválido" };
  if (!cli) return { error: "Cliente inválido" };

  const dataInicio = new Date(d.dataInicio);
  const dataProx = d.dataProximoPagamento
    ? parseDateOnly(d.dataProximoPagamento)
    : dataInicio;
  const veiculoMudou = existente.veiculoId !== d.veiculoId;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.locacao.update({
        where: { id: d.id },
        data: {
          veiculoId: d.veiculoId,
          clienteId: d.clienteId,
          atendenteId: d.atendenteId || existente.atendenteId,
          valorAluguel: d.valorAluguel,
          valorCaucao: d.valorCaucao,
          multaAtraso: d.multaAtraso,
          jurosMes: d.jurosMes,
          dataInicio,
          dataProximoPagamento: dataProx,
          tempoMinimoDias: d.tempoMinimoDias,
          frequenciaPagamento: d.frequenciaPagamento,
          localRetirada: d.localRetirada,
          localDevolucao: d.localDevolucao,
          kmEntrega: d.kmEntrega,
          nivelCombustivel: d.nivelCombustivel,
          franquiaKmDiaria: d.franquiaKmDiaria,
          raioCirculacao: d.raioCirculacao,
          seguroTerceiros: d.seguroTerceiros,
          promessaCompra: d.promessaCompra,
          caucaoPendente: d.caucaoPendente,
          caucaoParcelada: d.caucaoParcelada,
          status: d.status,
          dataEncerramento:
            d.status === "encerrada"
              ? (existente.dataEncerramento ?? new Date())
              : null,
        },
      });

      // Reconcilia status dos veículos.
      if (veiculoMudou) {
        await tx.veiculo.update({
          where: { id: existente.veiculoId },
          data: { status: "disponivel" },
        });
      }
      await tx.veiculo.update({
        where: { id: d.veiculoId },
        data: { status: veicStatusFor(d.status) },
      });
    });
  } catch {
    return { error: "Não foi possível salvar a locação." };
  }

  revalidatePath("/locacoes");
  revalidatePath("/frota");
  return { ok: true };
}

export async function encerrarLocacao(id: string) {
  const usuario = await requireStaff();
  const locacao = await prisma.locacao.findFirst({
    where: { id, locadoraId: usuario.locadoraId },
  });
  if (!locacao) return;

  await prisma.$transaction(async (tx) => {
    await tx.locacao.update({
      where: { id },
      data: { status: "encerrada", dataEncerramento: new Date() },
    });
    await tx.veiculo.update({
      where: { id: locacao.veiculoId },
      data: { status: "disponivel" },
    });
  });

  revalidatePath("/locacoes");
  revalidatePath("/frota");
}
