"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { parseDateOnly } from "@/lib/utils";
import { uploadObject, deleteObject } from "@/lib/storage";

export type ClienteFormState = { ok?: boolean; error?: string } | undefined;

const emptyToNull = (v: unknown) => (v === "" || v === undefined ? null : v);
const strNull = z.preprocess(emptyToNull, z.string().nullable());

const schema = z.object({
  id: z.string().min(1),
  nome: z.string().trim().min(1, "Informe o nome"),
  cpf: strNull,
  rg: strNull,
  email: strNull,
  telefone: strNull,
  cep: strNull,
  logradouro: strNull,
  numero: strNull,
  complemento: strNull,
  bairro: strNull,
  cidade: strNull,
  estado: strNull,
  cnhNumero: strNull,
  cnhValidade: strNull,
  dataNascimento: strNull,
  ref1Nome: strNull,
  ref1Telefone: strNull,
  ref2Nome: strNull,
  ref2Telefone: strNull,
  status: z.enum(["ativo", "ex_cliente"]),
});

export async function updateCliente(
  _prev: ClienteFormState,
  formData: FormData,
): Promise<ClienteFormState> {
  const usuario = await requireStaff();

  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const d = parsed.data;

  await prisma.cliente.updateMany({
    where: { id: d.id, locadoraId: usuario.locadoraId },
    data: {
      nome: d.nome,
      cpf: d.cpf,
      rg: d.rg,
      email: d.email,
      telefone: d.telefone,
      cep: d.cep,
      logradouro: d.logradouro,
      numero: d.numero,
      complemento: d.complemento,
      bairro: d.bairro,
      cidade: d.cidade,
      estado: d.estado,
      cnhNumero: d.cnhNumero,
      cnhValidade: d.cnhValidade ? parseDateOnly(d.cnhValidade) : null,
      dataNascimento: d.dataNascimento ? parseDateOnly(d.dataNascimento) : null,
      ref1Nome: d.ref1Nome,
      ref1Telefone: d.ref1Telefone,
      ref2Nome: d.ref2Nome,
      ref2Telefone: d.ref2Telefone,
      status: d.status,
    },
  });

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${d.id}`);
  return { ok: true };
}

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const TIPOS_OK = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
];

/** Faz upload de um documento do cliente para o storage. */
export async function uploadDocumento(
  formData: FormData,
): Promise<{ error?: string } | void> {
  const usuario = await requireStaff();
  const clienteId = String(formData.get("clienteId") ?? "");
  const arquivo = formData.get("arquivo");

  const cliente = await prisma.cliente.findFirst({
    where: { id: clienteId, locadoraId: usuario.locadoraId },
    select: { id: true },
  });
  if (!cliente) return { error: "Cliente inválido" };

  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { error: "Selecione um arquivo" };
  }
  if (arquivo.size > MAX_BYTES) {
    return { error: "Arquivo acima de 10 MB" };
  }
  if (arquivo.type && !TIPOS_OK.includes(arquivo.type)) {
    return { error: "Tipo não permitido (use imagem ou PDF)" };
  }

  const safeName = arquivo.name.replace(/[^\w.\-]+/g, "_").slice(-80);
  const chave = `clientes/${clienteId}/${crypto.randomUUID()}-${safeName}`;
  const buffer = Buffer.from(await arquivo.arrayBuffer());

  await uploadObject(chave, buffer, arquivo.type || undefined);
  await prisma.documentoCliente.create({
    data: { clienteId, nome: arquivo.name, chave },
  });

  revalidatePath(`/clientes/${clienteId}`);
}

/** Remove um documento (do storage e do banco). */
export async function deleteDocumento(id: string) {
  const usuario = await requireStaff();
  const doc = await prisma.documentoCliente.findFirst({
    where: { id, cliente: { locadoraId: usuario.locadoraId } },
    select: { id: true, chave: true, clienteId: true },
  });
  if (!doc) return;

  try {
    await deleteObject(doc.chave);
  } catch {
    // se falhar no storage, ainda remove do banco
  }
  await prisma.documentoCliente.delete({ where: { id: doc.id } });
  revalidatePath(`/clientes/${doc.clienteId}`);
}

/** Alterna entre ativo e ex-cliente rapidamente. */
export async function toggleClienteStatus(id: string, novo: "ativo" | "ex_cliente") {
  const usuario = await requireStaff();
  await prisma.cliente.updateMany({
    where: { id, locadoraId: usuario.locadoraId },
    data: { status: novo },
  });
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
}
