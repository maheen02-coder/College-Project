import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { ok, requireAdmin } from "@/lib/api";
import UploadedFile from "@/lib/models/UploadedFile";
import User from "@/lib/models/User";

export const dynamic = "force-dynamic";

const STATUSES = ["pending_review", "approved", "rejected", "resubmission_required"];
const KINDS = ["application", "gallery", "avatar", "other"];

function mapFile(file) {
  const application = file.application;
  return {
    id: String(file._id),
    name: file.name,
    mimeType: file.mimeType,
    size: file.size,
    kind: file.kind,
    status: file.status,
    reviewNotes: file.reviewNotes,
    reviewedAt: file.reviewedAt ? new Date(file.reviewedAt).toISOString() : null,
    createdAt: new Date(file.createdAt).toISOString(),
    student: file.user
      ? {
          id: String(file.user._id),
          name: file.user.name,
          email: file.user.email,
          matricRollNumber: file.user.matricRollNumber,
          classYear: file.user.classYear,
          department: file.user.department,
        }
      : null,
    application: application
      ? {
          id: String(application._id),
          status: application.status,
          roundKey: application.roundKey,
          createdAt: application.createdAt ? new Date(application.createdAt).toISOString() : null,
        }
      : null,
    recruitment: application?.recruitment
      ? {
          id: String(application.recruitment._id),
          title: application.recruitment.title,
          closesAt: application.recruitment.closesAt
            ? new Date(application.recruitment.closesAt).toISOString()
            : null,
          status: application.recruitment.status,
        }
      : null,
    society: application?.society
      ? {
          id: String(application.society._id),
          name: application.society.name,
          slug: application.society.slug,
          color: application.society.color,
        }
      : null,
  };
}

export async function GET(request) {
  const { user, response } = await requireAdmin("review_applications");
  if (response) return response;

  await connectDB();
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);
  const query = { institute: user.instituteId };

  const status = searchParams.get("status");
  if (status && status !== "all" && STATUSES.includes(status)) query.status = status;

  const kind = searchParams.get("kind");
  if (kind && kind !== "all" && KINDS.includes(kind)) query.kind = kind;

  const userId = searchParams.get("userId");
  if (userId && mongoose.isValidObjectId(userId)) query.user = userId;

  const q = (searchParams.get("q") || "").trim();
  let matchedUsers = [];
  if (q) {
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    matchedUsers = await User.find({
      institute: user.instituteId,
      $or: [{ name: regex }, { email: regex }, { matricRollNumber: regex }],
    })
      .select("_id")
      .limit(500)
      .lean();
    query.$or = [{ name: regex }, { user: { $in: matchedUsers.map((row) => row._id) } }];
  }

  const files = await UploadedFile.find(query)
    .populate("user", "name email matricRollNumber classYear department")
    .populate({
      path: "application",
      select: "status roundKey createdAt recruitment society",
      populate: [
        { path: "recruitment", select: "title closesAt status" },
        { path: "society", select: "name slug color" },
      ],
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const aggMatch = { institute: new mongoose.Types.ObjectId(user.instituteId) };
  if (kind && KINDS.includes(kind)) aggMatch.kind = kind;
  if (userId && mongoose.isValidObjectId(userId)) aggMatch.user = new mongoose.Types.ObjectId(userId);
  if (q) {
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    aggMatch.$or = [
      { name: regex },
      { user: { $in: matchedUsers.map((row) => row._id) } },
    ];
  }
  const rows = await UploadedFile.aggregate([
    { $match: aggMatch },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const counts = Object.fromEntries(STATUSES.map((value) => [value, 0]));
  for (const row of rows) counts[row._id] = row.count;

  return ok({ items: files.map(mapFile), counts });
}
