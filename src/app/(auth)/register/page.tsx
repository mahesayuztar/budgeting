import { redirect } from "next/navigation";
import RegisterForm from "./RegisterForm";
import { getSessionUser } from "@/src/lib/auth/AuthSession";

/**
 * @returns {Promise<JSX.Element>} Halaman register atau redirect ke dashboard.
 */
export default async function RegisterPage() {
  const _session = await getSessionUser();

  if (_session) {
    redirect("/dashboard");
  }

  return <RegisterForm />;
}