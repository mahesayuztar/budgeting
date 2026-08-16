import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";
import { getSessionUser } from "@/src/lib/auth/AuthSession";

/**
 * @returns {Promise<JSX.Element>} Halaman login atau redirect ke dashboard.
 */
export default async function LoginPage() {
  const _session = await getSessionUser();

  if (_session) {
    redirect("/dashboard");
  }

  return <LoginForm />;
}