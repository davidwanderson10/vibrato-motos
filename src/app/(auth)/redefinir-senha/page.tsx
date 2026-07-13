import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

// Stub: o envio de e-mail de redefinição será ligado na fase de publicação
// (provedor SMTP/Resend). Por ora a tela existe e explica o fluxo.
export default function RedefinirSenhaPage() {
  return (
    <Card>
      <CardContent className="py-6">
        <h2 className="mb-1 text-lg font-semibold">Redefinir senha</h2>
        <p className="mb-5 text-sm text-muted">
          Informe seu e-mail e enviaremos instruções para redefinir a senha.
        </p>
        <form>
          <Field label="E-mail" htmlFor="email">
            <Input id="email" name="email" type="email" required />
          </Field>
          <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-warning">
            O envio de e-mail ainda será configurado na publicação. Por
            enquanto, peça a um administrador para redefinir sua senha.
          </p>
          <Button type="submit" className="w-full" disabled>
            Enviar instruções
          </Button>
        </form>
        <div className="mt-4 text-sm">
          <Link href="/login" className="text-muted hover:text-foreground">
            ← Voltar ao login
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
