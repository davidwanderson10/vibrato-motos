import "server-only";
import ExcelJS from "exceljs";

export interface Coluna {
  header: string;
  key: string;
  width?: number;
}

/** Gera um arquivo .xlsx em memória a partir de colunas + linhas. */
export async function gerarXlsx(
  sheetName: string,
  colunas: Coluna[],
  linhas: Record<string, unknown>[],
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Vibrato Motos";
  wb.created = new Date();
  const ws = wb.addWorksheet(sheetName);

  ws.columns = colunas.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width ?? 18,
  }));

  // Cabeçalho em negrito com fundo escuro.
  ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  ws.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF14181F" },
  };

  linhas.forEach((l) => ws.addRow(l));
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: colunas.length },
  };

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/** Resposta HTTP de download para um buffer .xlsx. */
export function respostaXlsx(buffer: Buffer, nomeArquivo: string): Response {
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
      "Cache-Control": "no-store",
    },
  });
}
