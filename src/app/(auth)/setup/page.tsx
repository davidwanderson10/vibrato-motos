import { redirect } from "next/navigation";
import { needsSetup } from "@/lib/auth";
import { SetupForm } from "./setup-form";

// Sempre avaliar no request (depende do estado do banco, não pode ser estático).
export const dynamic = "force-dynamic";

export default async function SetupPage() {
  // Se já existe locadora, não faz sentido rodar o setup de novo.
  if (!(await needsSetup())) redirect("/login");
  return <SetupForm />;
}
