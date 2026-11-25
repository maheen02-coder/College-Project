import QRCode from "qrcode";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { CERTIFICATE_TYPE_META } from "@/lib/constants";

const PAGE_W = 842;
const PAGE_H = 595;

const PALETTE = {
  ivory: "#fbf9ff",
  paper: "#ffffff",
  lavender: "#f1ecff",
  lilac: "#e4dcff",
  line: "#e7e2f5",
  ink: "#171332",
  ink2: "#2c2750",
  mist: "#6b6785",
  purple: "#6d28d9",
  violet: "#7c3aed",
  blue: "#2563eb",
};

function hex(hexValue, fallback = "#ffffff") {
  const clean = String(hexValue || fallback).replace("#", "");
  const value = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const int = Number.parseInt(value, 16);
  return rgb(((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255);
}

function tone(certificateType) {
  return CERTIFICATE_TYPE_META[certificateType] || CERTIFICATE_TYPE_META.participation;
}

export async function buildCertificatePdf({ certificate, institute, verifyUrl }) {
  const doc = await PDFDocument.create();
  doc.setTitle(`${certificate.recipientName} · ${certificate.type} certificate`);
  doc.setAuthor(institute?.name || "Campus Event Hub");
  doc.setSubject(certificate.activityTitle);

  const page = doc.addPage([PAGE_W, PAGE_H]);

  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontSerif = await doc.embedFont(StandardFonts.TimesRomanBold);
  const fontItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);

  const brand = hex(institute?.branding?.primary, PALETTE.purple);
  const accent = hex(institute?.branding?.accent, PALETTE.blue);
  const ivory = hex(PALETTE.ivory);
  const paper = hex(PALETTE.paper);
  const lavender = hex(PALETTE.lavender);
  const lilac = hex(PALETTE.lilac);
  const ink = hex(PALETTE.ink);
  const ink2 = hex(PALETTE.ink2);
  const mist = hex(PALETTE.mist);
  const line = hex(PALETTE.line);

  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: ivory });

  page.drawCircle({ x: 40, y: PAGE_H - 30, size: 230, color: lavender, opacity: 0.9 });
  page.drawCircle({ x: PAGE_W - 20, y: 10, size: 250, color: hex("#eaf1ff"), opacity: 0.85 });
  page.drawCircle({ x: PAGE_W - 110, y: PAGE_H - 60, size: 90, color: lilac, opacity: 0.7 });

  const watermark = institute?.shortName?.toUpperCase() || "KIPS";
  const watermarkWidth = fontBold.widthOfTextAtSize(watermark, 170);
  page.drawText(watermark, {
    x: (PAGE_W - watermarkWidth) / 2,
    y: PAGE_H / 2 - 90,
    size: 170,
    font: fontBold,
    color: brand,
    opacity: 0.05,
  });

  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: 8, color: brand });
  page.drawRectangle({ x: 0, y: 8, width: PAGE_W, height: 4, color: accent });

  page.drawRectangle({
    x: 30,
    y: 30,
    width: PAGE_W - 60,
    height: PAGE_H - 68,
    color: paper,
    opacity: 0.92,
    borderColor: brand,
    borderWidth: 1.4,
    borderOpacity: 0.75,
  });
  page.drawRectangle({
    x: 40,
    y: 40,
    width: PAGE_W - 80,
    height: PAGE_H - 88,
    borderColor: line,
    borderWidth: 0.8,
  });

  const corner = (x, y, dx, dy) => {
    page.drawLine({ start: { x, y }, end: { x: x + 26 * dx, y }, thickness: 2.2, color: brand, opacity: 0.55 });
    page.drawLine({ start: { x, y }, end: { x, y: y + 26 * dy }, thickness: 2.2, color: brand, opacity: 0.55 });
  };
  corner(52, PAGE_H - 62, 1, -1);
  corner(PAGE_W - 52, PAGE_H - 62, -1, -1);
  corner(52, 62, 1, 1);
  corner(PAGE_W - 52, 62, -1, 1);

  const center = (text, font, size, y, color = ink, tracking = 0) => {
    const content = tracking ? text.split("").join(" ") : text;
    const width = font.widthOfTextAtSize(content, size);
    page.drawText(content, { x: (PAGE_W - width) / 2, y, size, font, color });
  };

  center(institute?.shortName?.toUpperCase() || "KIPS COLLEGE", fontBold, 16, 516, brand, 0.4);
  center(
    `${institute?.name?.toUpperCase() || "KIPS COLLEGE"} · CAMPUS EVENT HUB`,
    fontRegular,
    7.6,
    502,
    mist,
    1
  );
  page.drawRectangle({ x: PAGE_W / 2 - 54, y: 492, width: 108, height: 1.4, color: accent, opacity: 0.55 });

  const meta = tone(certificate.type);
  center(meta.title.toUpperCase(), fontBold, 23, 448, ink2, 0.8);

  center("This certificate is proudly presented to", fontItalic, 11.5, 412, mist);

  const nameSize = certificate.recipientName.length > 26 ? 34 : 42;
  center(certificate.recipientName, fontSerif, nameSize, 354, hex("#4c1d95"));
  const nameWidth = fontSerif.widthOfTextAtSize(certificate.recipientName, nameSize);
  const underlineWidth = Math.min(nameWidth + 80, 540);
  page.drawRectangle({
    x: (PAGE_W - underlineWidth) / 2,
    y: 340,
    width: underlineWidth,
    height: 1.4,
    color: accent,
    opacity: 0.45,
  });

  center(meta.action.toUpperCase(), fontRegular, 8.4, 316, mist, 0.8);

  const activity = certificate.activityTitle;
  const activitySize = activity.length > 48 ? 15 : activity.length > 30 ? 18 : 21;
  center(activity, fontBold, activitySize, 288, ink);

  const kind = certificate.activityKind ? `${certificate.activityKind}` : "";
  if (kind) center(kind.toUpperCase(), fontRegular, 7.4, 272, mist, 1.2);

  if (certificate.reason) {
    center(certificate.reason, fontItalic, 10.2, 250, ink2);
  }

  const issued = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(certificate.issuedAt));

  page.drawText("ISSUED ON", { x: 70, y: 206, size: 6.4, font: fontBold, color: mist });
  page.drawText(issued, { x: 70, y: 192, size: 10.2, font: fontRegular, color: ink });

  page.drawText("CERTIFICATE ID", { x: 70, y: 170, size: 6.4, font: fontBold, color: mist });
  page.drawText(certificate.certificateId, { x: 70, y: 157, size: 10.2, font: fontBold, color: brand });

  const signature = (x, width, name, label) => {
    page.drawRectangle({ x, y: 122, width, height: 0.9, color: ink2, opacity: 0.35 });
    page.drawText(name || " ", { x, y: 128, size: 9.6, font: fontSerif, color: ink2 });
    page.drawText(label, { x, y: 112, size: 6.4, font: fontRegular, color: mist });
  };

  signature(70, 170, certificate.issuedByName || certificate.organizerName || "Event Organizer", "EVENT ORGANIZER");
  signature(268, 170, institute?.leadership?.principal || "Principal", "PRINCIPAL");

  const sealX = 596;
  const sealY = 158;
  page.drawCircle({ x: sealX, y: sealY, size: 36, color: lavender, opacity: 0.85 });
  page.drawCircle({ x: sealX, y: sealY, size: 36, borderColor: brand, borderWidth: 1.1, borderOpacity: 0.75 });
  page.drawCircle({ x: sealX, y: sealY, size: 29, borderColor: accent, borderWidth: 0.6, borderOpacity: 0.5 });
  const sealText = institute?.branding?.logoText || "KIPS";
  const sealWidth = fontBold.widthOfTextAtSize(sealText, 11);
  page.drawText(sealText, { x: sealX - sealWidth / 2, y: sealY + 4, size: 11, font: fontBold, color: brand });
  const sealSub = "VERIFIED";
  page.drawText(sealSub, {
    x: sealX - fontRegular.widthOfTextAtSize(sealSub, 5.2) / 2,
    y: sealY - 9,
    size: 5.2,
    font: fontRegular,
    color: mist,
  });

  if (verifyUrl) {
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: 360,
      color: { dark: "#4c1d95", light: "#ffffff" },
    });
    const qrPng = await doc.embedPng(qrDataUrl);
    page.drawRectangle({ x: 666, y: 56, width: 110, height: 110, color: paper, borderColor: line, borderWidth: 0.6 });
    page.drawImage(qrPng, { x: 674, y: 64, width: 94, height: 94 });
    page.drawText("SCAN TO VERIFY", {
      x: 666 + (110 - fontRegular.widthOfTextAtSize("SCAN TO VERIFY", 5.2)) / 2,
      y: 44,
      size: 5.2,
      font: fontRegular,
      color: mist,
    });
  }

  const footer = `Authenticity of this certificate can be verified at ${
    verifyUrl || "the Campus Event Hub verification portal"
  } using the certificate ID above.`;
  const footerWidth = fontRegular.widthOfTextAtSize(footer, 6.4);
  page.drawText(footer, { x: (PAGE_W - footerWidth) / 2, y: 22, size: 6.4, font: fontRegular, color: mist });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
