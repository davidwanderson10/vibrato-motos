import { redirect } from "next/navigation";
import { getCurrentUser, needsSetup } from "@/lib/auth";
import { LoginForm } from "./login-form";

// Depende do estado do banco (needsSetup) e do cookie — nunca cachear o redirect.
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await needsSetup()) redirect("/setup");
  if (await getCurrentUser()) redirect("/dashboard");
  return <LoginForm />;
}
