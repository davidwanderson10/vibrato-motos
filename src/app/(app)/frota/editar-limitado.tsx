"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateVeiculoLimitado, type VeiculoFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function EditarLimitado({
  id,
  valorFipe,
  kmAtual,
  observacoes,
}: {
  id: string;
  valorFipe: string | null;
  kmAtual: number | null;
  observacoes: string | null;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<VeiculoFormState, FormData>(
    updateVeiculoLimitado,
    undefined,
  );
  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Atualizar dados</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action}>
          <input type="hidden" name="id" value={id} />

          {state?.ok && (
            <p className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-success">
              Salvo.
            </p>
          )}
          {state?.error && (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
              {state.error}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor FIPE (R$)" htmlFor="valorFipe">
              <Input
                id="valorFipe"
                name="valorFipe"
                type="number"
                step="0.01"
                defaultValue={valorFipe ?? ""}
              />
            </Field>
            <Field label="KM atual" htmlFor="kmAtual">
              <Input
                id="kmAtual"
                name="kmAtual"
                type="number"
                defaultValue={kmAtual ?? ""}
              />
            </Field>
          </div>

          <Field label="Observações / ocorrências" htmlFor="observacoes">
            <Textarea
              id="observacoes"
              name="observacoes"
              defaultValue={observacoes ?? ""}
              placeholder="Anote ocorrências, avarias, combinados..."
            />
          </Field>

          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
