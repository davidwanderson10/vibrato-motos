import { redirect } from "next/navigation";
import { getCurrentUser, needsSetup } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await needsSetup()) redirect("/setup");
  if (await getCurrentUser()) redirect("/dashboard");
  return <LoginForm />;
}
