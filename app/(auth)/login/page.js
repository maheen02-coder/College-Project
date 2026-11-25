import { redirect } from "next/navigation";
import LoginForm from "@/components/auth/LoginForm";
import { getSessionUser } from "@/lib/auth";

export const metadata = {
  title: "Sign in",
  description: "Sign in to KIPS Campus Event Hub to register for events, enter competitions and download certificates.",
};

function dashboardFor(role) {
  if (role === "admin" || role === "superadmin") return "/admin";
  return "/dashboard";
}

export default async function LoginPage({ searchParams }) {
  const user = await getSessionUser();
  if (user) redirect(dashboardFor(user.role));

  const params = await searchParams;
  const next = typeof params?.next === "string" ? params.next : "";

  return <LoginForm next={next} />;
}
