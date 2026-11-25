import { connectDB } from "@/lib/db";
import { ok } from "@/lib/api";
import { mapCertificate } from "@/lib/queries";
import Certificate from "@/lib/models/Certificate";
import Institute from "@/lib/models/Institute";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const { certificateId } = await params;
  await connectDB();

  const certificate = await Certificate.findOne({ certificateId: certificateId.trim().toUpperCase() })
    .populate("event", "title")
    .populate("competition", "title")
    .populate("society", "name")
    .lean();

  if (!certificate) {
    return ok({ found: false, valid: false });
  }

  const institute = await Institute.findById(certificate.institute).lean();

  return ok({
    found: true,
    valid: certificate.status === "valid",
    certificate: {
      ...mapCertificate(certificate),
      eventTitle: certificate.event?.title || "",
      competitionTitle: certificate.competition?.title || "",
      societyName: certificate.society?.name || "",
    },
    institute: institute
      ? {
          name: institute.name,
          shortName: institute.shortName,
          branding: institute.branding,
          leadership: institute.leadership,
        }
      : null,
  });
}
