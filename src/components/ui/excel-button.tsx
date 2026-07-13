import { Download } from "lucide-react";

/** Link de download de Excel (respeita os filtros embutidos no href). */
export function ExcelButton({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-background"
    >
      <Download className="h-4 w-4" /> Excel
    </a>
  );
}
