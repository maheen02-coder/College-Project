import { redirect } from "next/navigation";
import SignupForm from "@/components/auth/SignupForm";
import { getSessionUser } from "@/lib/auth";

export const metadata = {
  title: "Create account",
  description: "Create your KIPS College student account on Campus Event Hub.",
};

export default async function SignupPage() {
  const user = await getSessionUser();
  if (user) redirect(user.role === "admin" || user.role === "superadmin" ? "/admin" : "/dashboard");

  return <SignupForm />;
}
