import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { fail } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { buildCertificatePdf } from "@/lib/certificatePdf";
import Certificate from "@/lib/models/Certificate";
import Institute from "@/lib/models/Institute";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return fail("Sign in to download certificates.", 401);

  await connectDB();
  const certificate = await Certificate.findById(id).lean();
  if (!certificate) return fail("Certificate not found.", 404);

  const isOwner = String(certificate.user) === String(user.id);
  const staff = ["admin", "superadmin"].includes(user.role);
  if (!isOwner && !staff) return fail("Not permitted.", 403);
  if (certificate.status !== "valid") return fail("This certificate has been revoked.", 409);

  const institute = await Institute.findById(certificate.institute).lean();
  const origin = process.env.APP_URL || new URL(request.url).origin;

  const pdf = await buildCertificatePdf({
    certificate,
    institute,
    verifyUrl: `${origin}/verify/${certificate.certificateId}`,
  });

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${certificate.certificateId}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
