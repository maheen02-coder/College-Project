import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { getSessionUser } from "@/lib/auth";
import { getInstitute } from "@/lib/queries";

export default async function SiteLayout({ children }) {
  const [user, institute] = await Promise.all([getSessionUser(), getInstitute()]);
  const plainInstitute = institute
    ? { name: institute.name, shortName: institute.shortName, city: institute.city, emailDomain: institute.emailDomain }
    : null;

  return (
    <div className="relative flex min-h-screen flex-col">
      <Navbar user={user} institute={plainInstitute} />
      <main className="flex-1">{children}</main>
      <Footer institute={plainInstitute} />
    </div>
  );
}
