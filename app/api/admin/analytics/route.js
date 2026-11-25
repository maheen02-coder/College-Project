import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { ok, requireAdmin } from "@/lib/api";
import { EVENT_STATUSES } from "@/lib/constants";
import Application, { APPLICATION_STATUSES } from "@/lib/models/Application";
import Certificate from "@/lib/models/Certificate";
import Competition from "@/lib/models/Competition";
import CompetitionEntry from "@/lib/models/CompetitionEntry";
import Event from "@/lib/models/Event";
import EventFeedback from "@/lib/models/EventFeedback";
import Group from "@/lib/models/Group";
import Registration from "@/lib/models/Registration";
import Society from "@/lib/models/Society";
import SocietyMember from "@/lib/models/SocietyMember";
import User from "@/lib/models/User";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, response } = await requireAdmin("view_analytics");
  if (response) return response;

  await connectDB();
  const institute = new mongoose.Types.ObjectId(user.instituteId);
  const now = new Date();
  const months = [];
  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    months.push({
      key: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
      label: new Intl.DateTimeFormat("en-GB", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(date),
    });
  }
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));

  const [
    studentCount,
    verifiedStudents,
    pendingVerification,
    societyCount,
    activeSocietyCount,
    eventTotal,
    eventStatusRows,
    registrationTotal,
    registrationAttended,
    registrationPending,
    competitionCount,
    entryCount,
    applicationRows,
    certificateCount,
    groupCount,
    membershipCount,
    feedbackStats,
    monthlyRows,
    topSocieties,
    topStudentRows,
    categoryRows,
  ] = await Promise.all([
    User.countDocuments({ institute, role: "student" }),
    User.countDocuments({ institute, role: "student", verificationStatus: "verified" }),
    User.countDocuments({ institute, role: "student", verificationStatus: "pending" }),
    Society.countDocuments({ institute }),
    Society.countDocuments({ institute, isActive: true }),
    Event.countDocuments({ institute }),
    Event.aggregate([{ $match: { institute } }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    Registration.countDocuments({ institute }),
    Registration.countDocuments({ institute, status: "attended" }),
    Registration.countDocuments({ institute, status: "pending" }),
    Competition.countDocuments({ institute }),
    CompetitionEntry.countDocuments({ institute }),
    Application.aggregate([
      { $match: { institute } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Certificate.countDocuments({ institute, status: "valid" }),
    Group.countDocuments({ institute }),
    SocietyMember.countDocuments({ institute, status: "active" }),
    EventFeedback.aggregate([
      { $match: { institute } },
      { $group: { _id: null, count: { $sum: 1 }, average: { $avg: "$rating" } } },
    ]),
    Registration.aggregate([
      { $match: { institute, createdAt: { $gte: monthStart } } },
      {
        $group: {
          _id: { y: { $year: "$createdAt" }, m: { $month: "$createdAt" } },
          registrations: { $sum: 1 },
          attendance: { $sum: { $cond: [{ $eq: ["$attendance", "present"] }, 1, 0] } },
        },
      },
    ]),
    SocietyMember.aggregate([
      { $match: { institute, status: "active" } },
      { $group: { _id: "$society", members: { $sum: 1 } } },
      { $sort: { members: -1 } },
      { $limit: 5 },
      { $lookup: { from: "societies", localField: "_id", foreignField: "_id", as: "society" } },
      { $unwind: "$society" },
      { $project: { _id: 0, id: { $toString: "$_id" }, name: "$society.name", members: 1 } },
    ]),
    User.find({ institute, role: "student" })
      .sort({ points: -1 })
      .limit(5)
      .select("name matricRollNumber classYear points")
      .lean(),
    Event.aggregate([
      { $match: { institute } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  const eventsByStatus = Object.fromEntries(EVENT_STATUSES.map((status) => [status, 0]));
  for (const row of eventStatusRows) {
    if (row._id && row._id in eventsByStatus) eventsByStatus[row._id] = row.count;
  }

  const applicationsByStatus = Object.fromEntries(APPLICATION_STATUSES.map((status) => [status, 0]));
  for (const row of applicationRows) {
    if (row._id && row._id in applicationsByStatus) applicationsByStatus[row._id] = row.count;
  }
  const applicationTotal = Object.values(applicationsByStatus).reduce((sum, value) => sum + value, 0);

  const monthlyMap = Object.fromEntries(
    monthlyRows.map((row) => [
      `${row._id.y}-${String(row._id.m).padStart(2, "0")}`,
      row,
    ])
  );

  const feedback = feedbackStats[0] || { count: 0, average: 0 };

  return ok({
    analytics: {
      counts: {
        students: studentCount,
        verifiedStudents,
        pendingVerification,
        societies: societyCount,
        activeSocieties: activeSocietyCount,
        events: { total: eventTotal, byStatus: eventsByStatus },
        registrations: {
          total: registrationTotal,
          attended: registrationAttended,
          pending: registrationPending,
          attendanceRate: registrationTotal
            ? Math.round((registrationAttended / registrationTotal) * 100)
            : 0,
        },
        competitions: competitionCount,
        entries: entryCount,
        applications: { total: applicationTotal, byStatus: applicationsByStatus },
        certificates: certificateCount,
        groups: groupCount,
        memberships: membershipCount,
        feedbackCount: feedback.count,
        averageRating: feedback.average ? Math.round(feedback.average * 10) / 10 : 0,
      },
      monthly: months.map((month) => ({
        month: month.key,
        label: month.label,
        registrations: monthlyMap[month.key]?.registrations || 0,
        attendance: monthlyMap[month.key]?.attendance || 0,
      })),
      topSocieties: topSocieties.map((row) => ({
        id: row.id,
        name: row.name,
        members: row.members,
      })),
      topStudents: topStudentRows.map((row) => ({
        id: String(row._id),
        name: row.name,
        matricRollNumber: row.matricRollNumber || "",
        points: row.points || 0,
        classYear: row.classYear || "",
      })),
      applicationFunnel: APPLICATION_STATUSES.map((status) => ({
        status,
        count: applicationsByStatus[status] || 0,
      })),
      categoryBreakdown: categoryRows.map((row) => ({
        category: row._id || "Other",
        count: row.count,
      })),
    },
  });
}
