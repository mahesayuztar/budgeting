import { redirect } from "next/navigation";
import { getAuthUser } from "@/src/core/auth/dal";

export default async function Home() {
  const user = await getAuthUser();
  redirect(user ? "/dashboard" : "/login");
}
