import fs from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { writeLightPoster, writeSocietyArt } from "@/lib/posters";
import { makeId, randomCode, slugify } from "@/lib/utils";
import { ADMIN_ROLE_PRESETS, ADMIN_PERMISSIONS, POINT_ACTIONS } from "@/lib/constants";
import ActivityLog from "@/lib/models/ActivityLog";
import AdminRole from "@/lib/models/AdminRole";
import Announcement from "@/lib/models/Announcement";
import Application from "@/lib/models/Application";
import Category from "@/lib/models/Category";
import Certificate from "@/lib/models/Certificate";
import CertificateTemplate from "@/lib/models/CertificateTemplate";
import Competition from "@/lib/models/Competition";
import CompetitionEntry from "@/lib/models/CompetitionEntry";
import Event from "@/lib/models/Event";
import EventFeedback from "@/lib/models/EventFeedback";
import Gallery from "@/lib/models/Gallery";
import Group from "@/lib/models/Group";
import GroupMember from "@/lib/models/GroupMember";
import Institute from "@/lib/models/Institute";
import Interview from "@/lib/models/Interview";
import Message from "@/lib/models/Message";
import Notification from "@/lib/models/Notification";
import Question from "@/lib/models/Question";
import Recruitment from "@/lib/models/Recruitment";
import Registration from "@/lib/models/Registration";
import Society from "@/lib/models/Society";
import SocietyMember from "@/lib/models/SocietyMember";
import StudentPoint from "@/lib/models/StudentPoint";
import Task from "@/lib/models/Task";
import UploadedFile from "@/lib/models/UploadedFile";
import User from "@/lib/models/User";
import Achievement from "@/lib/models/Achievement";

export const dynamic = "force-dynamic";

const at = (days, hour = 10, minute = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date;
};

const STUDENTS = [
  ["Ayesha Khan", "demo@kips.edu.pk", "KIPS-2024-001", 1042, 1100, "Intermediate Part II", "A", "+92 300 1234567", "verified", "Pre-Engineering", ["Public Speaking", "Writing", "Event Management"], ["Debate", "Writing", "Volunteering"], 210],
  ["Ali Raza", "ali.raza@kips.edu.pk", "KIPS-2024-002", 980, 1100, "Intermediate Part II", "A", "+92 300 2233445", "verified", "Pre-Engineering", ["Programming", "Science"], ["Programming", "Science"], 95],
  ["Hira Fatima", "hira.fatima@kips.edu.pk", "KIPS-2024-003", 1015, 1100, "Intermediate Part II", "B", "+92 300 3344556", "pending", "Pre-Medical", ["Writing", "Art"], ["Art", "Writing"], 45],
  ["Zain Abbas", "zain.abbas@kips.edu.pk", "KIPS-2024-004", 899, 1100, "Intermediate Part I", "A", "+92 300 4455667", "verified", "Computer Science", ["Programming", "Designing"], ["Programming", "Designing"], 120],
  ["Mariam Shah", "mariam.shah@kips.edu.pk", "KIPS-2024-005", 1068, 1100, "Intermediate Part II", "C", "+92 300 5566778", "pending", "Pre-Medical", ["Public Speaking", "Leadership"], ["Public Speaking", "Leadership"], 70],
  ["Hamza Tariq", "hamza.tariq@kips.edu.pk", "KIPS-2024-006", 940, 1100, "Intermediate Part II", "B", "+92 300 6677889", "verified", "Computer Science", ["Programming", "Leadership", "Event Management"], ["Programming", "Event Management"], 160],
  ["Noor ul Ain", "noor.ulain@kips.edu.pk", "KIPS-2024-007", 1024, 1100, "Intermediate Part II", "A", "+92 300 7788990", "pending", "Pre-Engineering", ["Photography", "Art"], ["Photography", "Art"], 55],
  ["Bilal Ahmed", "bilal.ahmed@kips.edu.pk", "KIPS-2024-008", 875, 1100, "Intermediate Part I", "B", "+92 300 8899001", "verified", "Business Administration", ["Leadership", "Debate"], ["Debate", "Sports"], 85],
  ["Sana Yousaf", "sana.yousaf@kips.edu.pk", "KIPS-2024-009", 1091, 1100, "Intermediate Part II", "C", "+92 300 9900112", "pending", "Pre-Medical", ["Writing", "Science"], ["Writing", "Science"], 35],
  ["Ahmed Raza", "ahmed.raza@kips.edu.pk", "KIPS-2024-010", 760, 1100, "Intermediate Part I", "A", "+92 301 1122334", "rejected", "General Science", ["Sports"], ["Sports"], 15],
  ["Fatima Zahra", "fatima.zahra@kips.edu.pk", "KIPS-2024-011", 1002, 1100, "Intermediate Part II", "B", "+92 301 2233445", "verified", "Media Studies", ["Photography", "Writing", "Designing"], ["Photography", "Designing", "Writing"], 130],
  ["Usman Ali", "usman.ali@kips.edu.pk", "KIPS-2024-012", 918, 1100, "Intermediate Part I", "C", "+92 301 3344556", "verified", "Sports Science", ["Sports", "Leadership"], ["Sports", "Volunteering"], 60],
];

const SOCIETIES = [
  { name: "Adventure Society", category: "Adventure", color: "#7c3aed", tagline: "Explore beyond the classroom.", cover: "/2campus.jfif", description: "Hiking trips, camping weekends and outdoor challenges that build confidence and teamwork.", purpose: "To give every student a taste of adventure, resilience and the outdoors.", activities: ["Hiking", "Camping", "Orienteering", "Outdoor skills"] },
  { name: "Quiz Society", category: "Academic", color: "#2563eb", tagline: "Sharpen your mind, one question at a time.", cover: "/quiz club.jfif", description: "Weekly quizzes, inter-college championships and knowledge nights for the endlessly curious.", purpose: "To celebrate knowledge, curiosity and quick thinking across every discipline.", activities: ["Weekly quizzes", "Championship prep", "Knowledge nights"] },
  { name: "Sports Society", category: "Sports", color: "#0d9488", tagline: "Play hard. Play together.", cover: "/sports community.jfif", description: "Futsal, cricket, badminton and athletics — the home of KIPS campus sport.", purpose: "To build fitness, discipline and team spirit through competitive sport.", activities: ["Futsal", "Cricket", "Badminton", "Athletics"] },
  { name: "Literary Society", category: "Literary", color: "#9333ea", tagline: "Words that move people.", cover: "/literary society.jfif", description: "Poetry, storytelling, writing workshops and open mics for every voice on campus.", purpose: "To nurture writers and speakers and give student voices a stage.", activities: ["Open mics", "Writing workshops", "Poetry slams"] },
  { name: "Arts & Culture Society", category: "Arts & Culture", color: "#db2777", tagline: "Create. Exhibit. Inspire.", cover: "/arts and culture.jfif", description: "Visual arts, music, theatre and cultural festivals that make campus beautiful.", purpose: "To celebrate creativity and bring the campus together through art.", activities: ["Live painting", "Photography walks", "Cultural festivals", "Theatre"] },
  { name: "Science & Technology Society", category: "Technology", color: "#4f46e5", tagline: "Build what comes next.", cover: "/Tech Innovation pic.jfif", description: "Hackathons, robotics labs and tech talks for students who love to build.", purpose: "To grow a community of makers, engineers and innovators at KIPS.", activities: ["Hackathons", "Robotics labs", "Tech talks", "Build weekends"] },
  { name: "Social Welfare Society", category: "Social Welfare", color: "#059669", tagline: "Small actions, real change.", cover: "/social clubs.jfif", description: "Charity drives, community service and volunteering that make a measurable difference.", purpose: "To serve the community and grow compassionate student leaders.", activities: ["Charity drives", "Community teaching", "Volunteer corps"] },
  { name: "Debating Society", category: "Literary", color: "#b45309", tagline: "Argue better. Think deeper.", cover: "/debating society.jfif", description: "Parliamentary debate, public speaking and inter-college tournaments.", purpose: "To develop confident speakers and rigorous thinkers.", activities: ["Practice debates", "Public speaking", "Tournaments"] },
];

const EVENTS = [
  { title: "Qawwali Night 2026", category: "Entertainment", type: "Cultural", society: 4, poster: "/55A9iYEPxIJbVEgaC66kYdd1fl0pHsCL8F17WO20sjGw5sELgT_jOjW4mJE5cyyJ9bTOVrD6V4WKWDtMQoRZR91n28OQpa-FTKn1Tt8i47pYIfMeeEN5in5AeXvVTlmmJvrknonmZkU5Zn0s_04KIaN7WssWL9cxkKS_gexypeadlMHGQA6qfs9grj_HxW4g.jfif", startAt: at(-35, 18), endAt: at(-35, 22), regOpen: at(-55, 9), deadline: at(-40, 23), venue: "Open Air Amphitheatre", capacity: 300, featured: false, feedback: true, excerpt: "An unforgettable evening of Sufi music under the stars.", description: "Campus came alive with traditional qawwali, student performances and a candlelit courtyard. The evening brought together students, faculty and families for a celebration of music and culture.", highlights: ["Live qawwali ensemble", "Candlelit courtyard", "Student opening act"] },
  { title: "Sports Day 2026", category: "Sports", type: "Sports", society: 2, poster: "/sports community.jfif", startAt: at(-24, 8), endAt: at(-24, 17), regOpen: at(-40, 9), deadline: at(-27, 23), venue: "KIPS Sports Complex", capacity: 260, featured: false, feedback: true, excerpt: "A full day of athletics, team sport and house pride.", description: "Sports Day turned the campus into a stadium. Track finals, futsal knockouts and a roaring closing ceremony crowned this year's house champions.", highlights: ["Track and field finals", "Inter-house futsal", "Closing ceremony"] },
  { title: "Annual Dinner 2026", category: "Celebrations", type: "Celebration", society: null, poster: "/Spring event pic.jfif", startAt: at(-14, 19), endAt: at(-14, 23), regOpen: at(-30, 9), deadline: at(-18, 23), venue: "Grand Marquee, KIPS College", capacity: 220, featured: false, feedback: true, excerpt: "A formal evening celebrating the year's achievements.", description: "Faculty, students and alumni gathered for the annual dinner, an evening of awards, speeches and celebration of the year's academic and extracurricular achievements.", highlights: ["Annual awards", "Alumni speeches", "Dinner and live music"] },
  { title: "Welcome Party 2026", category: "Celebrations", type: "Celebration", society: null, poster: "/Welcome Party 2026.jfif", startAt: at(6, 16), endAt: at(6, 21), regOpen: at(-6, 9), deadline: at(4, 23), venue: "Main Courtyard", capacity: 400, featured: true, excerpt: "The official welcome for our newest KIPS students.", description: "Meet your societies, tour the campus and kick off the year with music, food and games. Every new student is invited to the biggest welcome of the year.", highlights: ["Society fair", "Live music", "Campus tours", "Food street"] },
  { title: "Winter Cultural Festival", category: "Cultural", type: "Cultural", society: 4, poster: "/winter festival pic.jpg", startAt: at(16, 11), endAt: at(17, 20), regOpen: at(-4, 9), deadline: at(12, 23), venue: "KIPS College Grounds", capacity: 500, featured: true, excerpt: "Two days of art, music, food and culture from across Pakistan.", description: "The Winter Cultural Festival brings together art exhibitions, regional food stalls, folk performances and student theatre for a two-day celebration of culture.", highlights: ["Folk music stage", "Art exhibition", "Regional food street", "Student theatre"] },
  { title: "Inter-Society Quiz Night", category: "Competitions", type: "Society Event", society: 1, poster: "/quiz image.jfif", startAt: at(9, 17), endAt: at(9, 21), regOpen: at(-8, 9), deadline: at(5, 23), venue: "Main Auditorium", capacity: 180, featured: true, excerpt: "Eight societies. One trophy. Who knows the most?", description: "The sharpest minds from every society face off in rapid-fire rounds covering history, science, pop culture and current affairs. Register your team and claim the quiz crown.", highlights: ["Eight society teams", "Rapid-fire finals", "Audience rounds"] },
  { title: "Photography Walk: City in Light", category: "Workshops", type: "Workshop", society: 4, poster: "/City in Light.jfif", startAt: at(11, 8), endAt: at(11, 13), regOpen: at(-5, 9), deadline: at(1, 23), venue: "Meet at Main Gate", capacity: 60, featured: false, excerpt: "A guided photo walk through the city with a professional photographer.", description: "Bring any camera — phone or DSLR — and join a guided walk through the old city. Learn composition, light and storytelling, then submit your best frame for the showcase.", highlights: ["Guided photo walk", "Editing mini-clinic", "Showcase submission"] },
  { title: "Charity Winter Drive", category: "Charity", type: "Charity", society: 6, poster: "/social clubs.jfif", startAt: at(19, 9), endAt: at(19, 16), regOpen: at(-3, 9), deadline: at(16, 23), venue: "City Community Center", capacity: 120, featured: true, excerpt: "Collect, pack and deliver winter supplies to families in need.", description: "Join the Social Welfare Society to collect blankets, warm clothing and dry rations, pack care kits and deliver them across the city with partner organisations.", highlights: ["Donation collection", "Care kit packing", "Community delivery"] },
  { title: "Tech Innovation Summit 2026", category: "College Events", type: "Campus Event", society: 5, poster: "/Tech Innovation pic.jfif", startAt: at(26, 9), endAt: at(26, 17), regOpen: at(-2, 9), deadline: at(20, 23), venue: "Grand Auditorium", capacity: 300, featured: true, excerpt: "An all-day summit on AI, startups and the future of technology.", description: "Founders, engineers and student builders come together for keynotes, live demos and hands-on labs. Explore AI products, meet recruiters and pitch your ideas.", highlights: ["Industry keynotes", "Startup showcase", "Hands-on AI lab", "Recruiter lounge"] },
  { title: "Literary Open Mic", category: "Entertainment", type: "Society Event", society: 3, poster: "/Literary Open Mic.jfif", startAt: at(4, 18), endAt: at(4, 21), regOpen: at(-10, 9), deadline: at(-1, 23), venue: "Library Courtyard", capacity: 100, featured: false, excerpt: "An evening of poetry, stories and spoken word.", description: "The Literary Society's open mic returns with student poets, storytellers and first-time performers. Sign up to perform or come to listen.", highlights: ["Student performances", "Guest poet", "Open sign-up"] },
  { title: "Farewell Party 2026", category: "Celebrations", type: "Celebration", society: null, poster: "/farewell party pic.jfif", startAt: at(42, 18), endAt: at(42, 23), regOpen: at(2, 9), deadline: at(38, 23), venue: "Grand Marquee", capacity: 250, featured: false, excerpt: "A night to celebrate our graduating students.", description: "Join us for an evening of memories, awards and celebration as we send off our graduating class with a farewell they will remember.", highlights: ["Awards ceremony", "Memory wall", "Live music"] },
  { title: "Volunteer Orientation", category: "Workshops", type: "Workshop", society: 6, poster: "/Volunteer Orientation.jfif", startAt: at(2, 14), endAt: at(2, 17), regOpen: at(-9, 9), deadline: at(1, 23), venue: "Community Hall", capacity: 80, featured: false, excerpt: "Training for the winter volunteering programme.", description: "New volunteers learn how our drives work, how to lead a collection team and what to expect on delivery day. Attendance is required before joining a drive.", highlights: ["Volunteer training", "Team assignments", "Safety briefing"] },
];

const COMPETITIONS = [
  { title: "Inter-Society Quiz Championship 2026", category: "Academic", type: "Quiz", society: 1, poster: "/quiz club.jfif", mode: "individual", startAt: at(12, 16), endAt: at(12, 20), deadline: at(8, 23), venue: "Main Auditorium", capacity: 80, published: false, excerpt: "The campus title is on the line.", prizeDetails: "Trophy, certificates and book vouchers", description: "Represent your society in the biggest quiz tournament of the year. Six rounds, one champion." },
  { title: "Campus Debate Cup", category: "Literary", type: "Debate", society: 7, poster: "/debating society.jfif", mode: "individual", startAt: at(20, 15), endAt: at(20, 19), deadline: at(15, 23), venue: "Seminar Hall B", capacity: 60, published: false, excerpt: "Motion, rebuttal, victory.", prizeDetails: "Cash prize and certificates", description: "Parliamentary-style debate across three elimination rounds, judged by faculty and guest debaters." },
  { title: "Futsal Champions Cup", category: "Sports", type: "Sports", society: 2, poster: "/fustal champion cup.webp", mode: "team", teamSize: [3, 5], startAt: at(-18, 14), endAt: at(-18, 19), deadline: at(-22, 23), venue: "KIPS Sports Complex", capacity: 32, published: true, excerpt: "Five-a-side glory under the floodlights.", prizeDetails: "Champions trophy and medals", description: "The inter-society futsal tournament returns with eight teams, group stages and a floodlit final." },
  { title: "Creative Writing Challenge", category: "Literary", type: "Creative", society: 3, poster: "/creative writng competition.jfif", mode: "individual", startAt: at(-9, 10), endAt: at(-9, 14), deadline: at(-13, 23), venue: "Library Hall", capacity: 50, published: true, excerpt: "One prompt. Ninety minutes. Your best words.", prizeDetails: "Publication and certificates", description: "Students write a short piece from a surprise prompt, judged by the literary faculty panel." },
  { title: "Lens & Light Photography Contest", category: "Arts & Culture", type: "Photography", society: 4, poster: "/photography pic.jfif", mode: "individual", startAt: at(23, 10), endAt: at(23, 18), deadline: at(19, 23), venue: "Arts Block Gallery", capacity: 45, published: false, excerpt: "Show us the city through your lens.", prizeDetails: "Gallery feature and certificates", description: "Submit up to three original photographs on the theme 'City in Light'. The best work is exhibited in the Arts Block." },
];

export async function POST(request) {
  const secret = request.headers.get("x-seed-secret");
  if (secret !== (process.env.SEED_SECRET || "kips-seed-2026")) {
    return NextResponse.json({ ok: false, error: "Invalid seed secret." }, { status: 403 });
  }

  try {
  await connectDB();
  await Promise.all(
    [
      Achievement,
      ActivityLog,
      AdminRole,
      Announcement,
      Application,
      Category,
      Certificate,
      CertificateTemplate,
      CompetitionEntry,
      Competition,
      Event,
      EventFeedback,
      Gallery,
      GroupMember,
      Group,
      Institute,
      Interview,
      Message,
      Notification,
      Question,
      Recruitment,
      Registration,
      SocietyMember,
      Society,
      StudentPoint,
      Task,
      UploadedFile,
      User,
    ].map((model) => model.deleteMany({}))
  );

  const institute = await Institute.create({
    name: "KIPS College",
    shortName: "KIPS",
    slug: "kips-college",
    tagline: "Learn. Lead. Belong.",
    city: "Lahore, Pakistan",
    emailDomain: "kips.edu.pk",
    branding: { primary: "#6d28d9", accent: "#2563eb", logoText: "KIPS" },
    leadership: {
      principal: "Prof. Dr. Ayesha Siddiqui",
      registrar: "Mr. Imran Shah",
      activitiesHead: "Hina Tariq",
    },
    isActive: true,
  });

  const [staffHash, studentHash] = await Promise.all([hashPassword("Admin@123"), hashPassword("Student@123")]);

  const superAdmin = await User.create({
    institute: institute._id,
    name: "Dr. Bilal Hussain",
    email: "admin@kips.edu.pk",
    passwordHash: staffHash,
    role: "superadmin",
    adminRole: "superadmin",
    adminPermissions: ADMIN_PERMISSIONS,
    phone: "+92 300 1112233",
    bio: "Leads campus activities, student engagement and the KIPS Campus Event Hub.",
    verificationStatus: "verified",
    isActive: true,
  });

  const recruitmentAdmin = await User.create({
    institute: institute._id,
    name: "Hina Tariq",
    email: "recruitment@kips.edu.pk",
    passwordHash: staffHash,
    role: "admin",
    adminRole: "recruitment_admin",
    adminPermissions: ADMIN_ROLE_PRESETS.recruitment_admin.permissions,
    phone: "+92 300 4455667",
    bio: "Runs society recruitment, interviews and student onboarding.",
    verificationStatus: "verified",
    isActive: true,
  });

  const eventAdmin = await User.create({
    institute: institute._id,
    name: "Usman Malik",
    email: "events@kips.edu.pk",
    passwordHash: staffHash,
    role: "admin",
    adminRole: "event_admin",
    adminPermissions: ADMIN_ROLE_PRESETS.event_admin.permissions,
    phone: "+92 300 7788990",
    bio: "Programmes campus events, competitions and attendance.",
    verificationStatus: "verified",
    isActive: true,
  });

  const societyAdmin = await User.create({
    institute: institute._id,
    name: "Sana Iqbal",
    email: "societies@kips.edu.pk",
    passwordHash: staffHash,
    role: "admin",
    adminRole: "society_admin",
    adminPermissions: ADMIN_ROLE_PRESETS.society_admin.permissions,
    phone: "+92 300 8899001",
    bio: "Supports societies, memberships, groups and student leadership.",
    verificationStatus: "verified",
    isActive: true,
  });

  const students = [];
  for (const [name, email, matric, marks, total, classYear, section, phone, verification, department, skills, interests, points] of STUDENTS) {
    students.push(
      await User.create({
        institute: institute._id,
        name,
        email,
        passwordHash: studentHash,
        role: "student",
        matricRollNumber: matric,
        matricMarks: marks,
        matricTotalMarks: total,
        matricPercentage: Math.round((marks / total) * 1000) / 10,
        classYear,
        section,
        department,
        phone,
        skills,
        interests,
        verificationStatus: verification,
        verificationNote: verification === "rejected" ? "Matric result card could not be matched. Please resubmit." : "",
        verifiedAt: verification === "verified" ? at(-40, 11) : undefined,
        verifiedBy: verification === "verified" ? superAdmin._id : undefined,
        points,
        isActive: true,
        bio: `${classYear} student at KIPS College, passionate about ${interests[0].toLowerCase()} and campus life.`,
      })
    );
  }

  const byEmail = Object.fromEntries(students.map((student) => [student.email, student]));

  await AdminRole.insertMany(
    Object.entries(ADMIN_ROLE_PRESETS).map(([slug, preset]) => ({
      institute: institute._id,
      name: preset.label,
      slug,
      permissions: preset.permissions,
      isSystem: true,
      createdBy: superAdmin._id,
    }))
  );

  await Category.insertMany(
    [
      ["College Events", "calendar", "#6d28d9"],
      ["Society Events", "users", "#2563eb"],
      ["Entertainment", "music", "#db2777"],
      ["Cultural", "palette", "#9333ea"],
      ["Sports", "trophy", "#0d9488"],
      ["Workshops", "wrench", "#4f46e5"],
      ["Seminars", "presentation", "#0891b2"],
      ["Competitions", "award", "#b45309"],
      ["Celebrations", "sparkles", "#d97706"],
      ["Charity", "heart-handshake", "#059669"],
      ["Other", "layers", "#64748b"],
    ].map(([name, icon, color]) => ({
      institute: institute._id,
      name,
      slug: slugify(name),
      scope: "both",
      icon,
      color,
      description: `${name} at KIPS College.`,
    }))
  );

  const posterDir = path.join(process.cwd(), "public", "uploads", "posters");
  const artRoot = path.join(process.cwd(), "public", "uploads");

  const societies = [];
  for (let index = 0; index < SOCIETIES.length; index += 1) {
    const item = SOCIETIES[index];
    const slug = slugify(item.name);
    const art = await writeSocietyArt(fs, path, artRoot, slug, item);
    societies.push(
      await Society.create({
        institute: institute._id,
        name: item.name,
        slug,
        tagline: item.tagline,
        description: item.description,
        purpose: item.purpose,
        activities: item.activities,
        logo: art.logo,
        cover: item.cover || art.cover,
        color: item.color,
        category: item.category,
        foundedYear: 2018 + (index % 6),
        email: `${slug}@kips.edu.pk`,
        meetingSchedule: ["Monday · 3:30 PM", "Wednesday · 4:00 PM", "Friday · 2:30 PM"][index % 3],
        featured: index < 4,
        createdBy: societyAdmin._id,
      })
    );
  }

  const membershipPlan = [
    [0, 2, "president"], [0, 4, "vice_president"], [0, 7, "member"], [0, 9, "member"], [0, 11, "member"],
    [1, 1, "president"], [1, 2, "vice_president"], [1, 3, "secretary"], [1, 5, "member"], [1, 0, "member"], [1, 10, "member"],
    [2, 11, "president"], [2, 3, "vice_president"], [2, 6, "treasurer"], [2, 7, "member"], [2, 9, "member"],
    [3, 2, "president"], [3, 10, "secretary"], [3, 4, "member"], [3, 0, "member"],
    [4, 6, "president"], [4, 9, "vice_president"], [4, 2, "team_lead"], [4, 10, "member"], [4, 3, "member"],
    [5, 5, "president"], [5, 7, "vice_president"], [5, 3, "event_manager"], [5, 0, "event_manager"], [5, 1, "member"], [5, 4, "member"],
    [6, 8, "president"], [6, 3, "vice_president"], [6, 10, "volunteer"], [6, 11, "volunteer"],
    [7, 7, "president"], [7, 9, "secretary"], [7, 4, "member"],
  ];

  await SocietyMember.insertMany(
    membershipPlan.map(([societyIndex, studentIndex, role]) => ({
      institute: institute._id,
      society: societies[societyIndex]._id,
      user: students[studentIndex]._id,
      role,
      status: "active",
      phone: students[studentIndex].phone,
      joinedAt: at(-60 - studentIndex, 10),
      addedBy: societyAdmin._id,
    }))
  );

  const recruitments = await Recruitment.insertMany([
    {
      institute: institute._id,
      society: societies[1]._id,
      title: "Quiz Society Spring Intake 2026",
      description: "Join the team that runs KIPS' biggest quiz nights. We are looking for curious students who love learning and performing under pressure.",
      status: "open",
      opensAt: at(-6, 9),
      closesAt: at(21, 23),
      instructions: "Applications are reviewed within five working days. Shortlisted applicants will be invited to a campus interview.",
      rounds: [
        { key: "screening", name: "Application screening", opensAt: at(-6, 9), closesAt: at(14, 23), isActive: true },
        { key: "interview", name: "Campus interview", opensAt: at(15, 9), closesAt: at(21, 23), isActive: true },
      ],
      createdBy: recruitmentAdmin._id,
    },
    {
      institute: institute._id,
      society: societies[4]._id,
      title: "Creative Collective Intake 2026",
      description: "The Arts & Culture Society is opening its doors to painters, photographers, performers and event dreamers for the new season.",
      status: "open",
      opensAt: at(-4, 9),
      closesAt: at(18, 23),
      instructions: "Portfolio submissions are required. Selected applicants will meet the creative panel for a portfolio review.",
      rounds: [{ key: "portfolio", name: "Portfolio review", opensAt: at(-4, 9), closesAt: at(18, 23), isActive: true }],
      createdBy: recruitmentAdmin._id,
    },
    {
      institute: institute._id,
      society: societies[6]._id,
      title: "Volunteer Corps 2026",
      description: "Serve the community with the Social Welfare Society. Volunteers support drives, teaching programmes and city partnerships.",
      status: "closed",
      opensAt: at(-45, 9),
      closesAt: at(-20, 23),
      instructions: "Volunteer orientation is mandatory before joining a drive.",
      rounds: [{ key: "orientation", name: "Orientation", opensAt: at(-30, 9), closesAt: at(-20, 23), isActive: false }],
      createdBy: recruitmentAdmin._id,
    },
  ]);

  const quizQuestions = [
    ["Why do you want to join the Quiz Society?", "long_text", [], true, "Tell us what draws you to competitive quizzing.", "screening"],
    ["Which quiz formats do you enjoy most?", "dropdown", ["General knowledge", "Science & tech", "Current affairs", "Pop culture"], true, "", "screening"],
    ["Upload your CV or a short introduction letter.", "file", [], true, "PDF, DOC or TXT. One file is enough.", "screening"],
    ["Are you available for Wednesday evening practice sessions?", "yes_no", [], true, "", "screening"],
    ["Rate your confidence with rapid-fire questions.", "rating", [], false, "1 = still learning, 5 = ready for finals.", "screening"],
  ];
  const artQuestions = [
    ["Why do you want to join Arts & Culture Society?", "long_text", [], true, "Share the story behind your creative work.", "portfolio"],
    ["Which creative areas interest you?", "multiple_choice", ["Painting", "Photography", "Music", "Theatre", "Graphic design", "Event production"], true, "", "portfolio"],
    ["Rate your experience exhibiting or performing live.", "rating", [], false, "", "portfolio"],
    ["Upload a portfolio or sample of your work.", "file", [], true, "Images can be combined into a PDF. Max 8 MB.", "portfolio"],
    ["Preferred commitment level", "single_choice", ["Core team (weekly)", "Project-based", "Volunteer for events"], true, "", "portfolio"],
  ];
  const volunteerQuestions = [
    ["Why do you want to volunteer with the Social Welfare Society?", "long_text", [], true, "", "orientation"],
    ["Which drives can you support?", "multiple_choice", ["Winter supplies", "Community teaching", "Food distribution", "Fundraising"], true, "", "orientation"],
    ["Can you attend the orientation session?", "yes_no", [], true, "", "orientation"],
  ];
  const questionSets = [
    [recruitments[0], quizQuestions],
    [recruitments[1], artQuestions],
    [recruitments[2], volunteerQuestions],
  ];
  const questionsByRecruitment = {};
  for (const [recruitment, set] of questionSets) {
    const created = await Question.insertMany(
      set.map(([label, type, options, required, description, roundKey], index) => ({
        institute: institute._id,
        society: recruitment.society,
        recruitment: recruitment._id,
        roundKey,
        label,
        description,
        type,
        options,
        required,
        order: index + 1,
        isActive: true,
        createdBy: recruitmentAdmin._id,
      }))
    );
    questionsByRecruitment[String(recruitment._id)] = created;
  }

  await fs.mkdir(path.join(process.cwd(), ".data", "uploads"), { recursive: true });
  await fs.writeFile(
    path.join(process.cwd(), ".data", "uploads", "seed-ayesha-portfolio.txt"),
    "Ayesha Khan — Creative Portfolio\n\nPhotography, poetry and event production.\nCampus showcase: 'City in Light' photo series (2025).\nLiterary open mic performer, 2024-2026.\n\nContact: demo@kips.edu.pk"
  );
  await fs.writeFile(
    path.join(process.cwd(), ".data", "uploads", "seed-ayesha-cv.txt"),
    "Ayesha Khan\nKIPS-2024-001 · Intermediate Part II\n\nExperience: Quiz Society event manager, volunteer corps.\nSkills: public speaking, writing, event management."
  );

  const portfolioFile = await UploadedFile.create({
    institute: institute._id,
    user: byEmail["demo@kips.edu.pk"]._id,
    name: "Ayesha-Khan-Portfolio.txt",
    storedName: "seed-ayesha-portfolio.txt",
    mimeType: "text/plain",
    size: 254,
    kind: "application",
    status: "pending_review",
  });
  const cvFile = await UploadedFile.create({
    institute: institute._id,
    user: byEmail["hira.fatima@kips.edu.pk"]._id,
    name: "Hira-Fatima-CV.txt",
    storedName: "seed-ayesha-cv.txt",
    mimeType: "text/plain",
    size: 236,
    kind: "application",
    status: "resubmission_required",
    reviewNotes: "Please include the portfolio link and a contact number.",
    reviewedBy: recruitmentAdmin._id,
    reviewedAt: at(-1, 12),
  });

  const artQuestionsList = questionsByRecruitment[String(recruitments[1]._id)];
  const quizQuestionsList = questionsByRecruitment[String(recruitments[0]._id)];

  const demoApplication = await Application.create({
    institute: institute._id,
    recruitment: recruitments[1]._id,
    society: societies[4]._id,
    user: byEmail["demo@kips.edu.pk"]._id,
    roundKey: "portfolio",
    status: "under_review",
    submittedAt: at(-2, 13),
    answers: [
      { question: artQuestionsList[0]._id, label: artQuestionsList[0].label, type: "long_text", value: "I have been photographing campus life for two years and want to help build exhibitions that feel alive, not just decorative." },
      { question: artQuestionsList[1]._id, label: artQuestionsList[1].label, type: "multiple_choice", value: ["Photography", "Theatre", "Event production"] },
      { question: artQuestionsList[2]._id, label: artQuestionsList[2].label, type: "rating", value: 4 },
      { question: artQuestionsList[3]._id, label: artQuestionsList[3].label, type: "file", value: "", files: [portfolioFile._id] },
      { question: artQuestionsList[4]._id, label: artQuestionsList[4].label, type: "single_choice", value: "Core team (weekly)" },
    ],
    statusHistory: [
      { status: "submitted", at: at(-2, 13), by: byEmail["demo@kips.edu.pk"]._id, byName: "Ayesha Khan", note: "" },
      { status: "under_review", at: at(-1, 10), by: recruitmentAdmin._id, byName: recruitmentAdmin.name, note: "Portfolio looks strong. Scheduling panel review." },
    ],
  });

  const hiraApplication = await Application.create({
    institute: institute._id,
    recruitment: recruitments[0]._id,
    society: societies[1]._id,
    user: byEmail["hira.fatima@kips.edu.pk"]._id,
    roundKey: "screening",
    status: "interview_scheduled",
    submittedAt: at(-5, 11),
    answers: [
      { question: quizQuestionsList[0]._id, label: quizQuestionsList[0].label, type: "long_text", value: "I love trivia nights and want to help KIPS compete at inter-college level." },
      { question: quizQuestionsList[1]._id, label: quizQuestionsList[1].label, type: "dropdown", value: "General knowledge" },
      { question: quizQuestionsList[2]._id, label: quizQuestionsList[2].label, type: "file", value: "", files: [cvFile._id] },
      { question: quizQuestionsList[3]._id, label: quizQuestionsList[3].label, type: "yes_no", value: "Yes" },
      { question: quizQuestionsList[4]._id, label: quizQuestionsList[4].label, type: "rating", value: 4 },
    ],
    statusHistory: [
      { status: "submitted", at: at(-5, 11), by: byEmail["hira.fatima@kips.edu.pk"]._id, byName: "Hira Fatima", note: "" },
      { status: "shortlisted", at: at(-3, 15), by: recruitmentAdmin._id, byName: recruitmentAdmin.name, note: "Strong general knowledge score." },
      { status: "interview_scheduled", at: at(-2, 9), by: recruitmentAdmin._id, byName: recruitmentAdmin.name, note: "Interview booked for next week." },
    ],
  });

  await Application.create({
    institute: institute._id,
    recruitment: recruitments[0]._id,
    society: societies[1]._id,
    user: byEmail["mariam.shah@kips.edu.pk"]._id,
    roundKey: "screening",
    status: "submitted",
    submittedAt: at(-1, 17),
    answers: [
      { question: quizQuestionsList[0]._id, label: quizQuestionsList[0].label, type: "long_text", value: "I want a team that treats learning like a sport. I am in it to win." },
      { question: quizQuestionsList[1]._id, label: quizQuestionsList[1].label, type: "dropdown", value: "Current affairs" },
      { question: quizQuestionsList[3]._id, label: quizQuestionsList[3].label, type: "yes_no", value: "Yes" },
    ],
    statusHistory: [{ status: "submitted", at: at(-1, 17), by: byEmail["mariam.shah@kips.edu.pk"]._id, byName: "Mariam Shah", note: "" }],
  });

  await Application.create({
    institute: institute._id,
    recruitment: recruitments[2]._id,
    society: societies[6]._id,
    user: byEmail["fatima.zahra@kips.edu.pk"]._id,
    roundKey: "orientation",
    status: "accepted",
    submittedAt: at(-38, 12),
    answers: [],
    reviewNotes: "Accepted into volunteer corps.",
    reviewedBy: recruitmentAdmin._id,
    statusHistory: [
      { status: "submitted", at: at(-38, 12), by: byEmail["fatima.zahra@kips.edu.pk"]._id, byName: "Fatima Zahra", note: "" },
      { status: "accepted", at: at(-32, 10), by: recruitmentAdmin._id, byName: recruitmentAdmin.name, note: "Accepted into volunteer corps." },
    ],
  });

  await Interview.create({
    institute: institute._id,
    application: hiraApplication._id,
    student: byEmail["hira.fatima@kips.edu.pk"]._id,
    society: societies[1]._id,
    scheduledAt: at(3, 14),
    mode: "on_campus",
    location: "Activities Office, Block A",
    panel: ["Hina Tariq", "Ali Raza", "Zain Abbas"],
    status: "scheduled",
    createdBy: recruitmentAdmin._id,
  });

  const quizGroup = await Group.create({
    institute: institute._id,
    society: societies[1]._id,
    name: "Quiz Society Core Team",
    description: "Planning, practice and tournament coordination for the Quiz Society.",
    color: "#2563eb",
    memberIds: [students[1]._id, students[2]._id, students[3]._id, students[5]._id, students[0]._id, students[10]._id],
    moderators: [students[1]._id],
    lastMessageAt: at(0, 9, 12),
    lastMessagePreview: "Practice moved to 4:30 PM in the library.",
    createdBy: societyAdmin._id,
  });
  const techGroup = await Group.create({
    institute: institute._id,
    society: societies[5]._id,
    name: "Tech Build Team",
    description: "Hackathon squads, robotics builds and tech summit planning.",
    color: "#4f46e5",
    memberIds: [students[5]._id, students[7]._id, students[3]._id, students[0]._id, students[1]._id, students[4]._id],
    moderators: [students[5]._id, students[7]._id],
    lastMessageAt: at(0, 8, 30),
    lastMessagePreview: "Summit landing page is ready for review.",
    createdBy: societyAdmin._id,
  });
  const volunteerGroup = await Group.create({
    institute: institute._id,
    society: societies[6]._id,
    name: "Cultural Night Volunteers",
    description: "Volunteer coordination for the Winter Cultural Festival.",
    color: "#059669",
    memberIds: [students[8]._id, students[3]._id, students[10]._id, students[11]._id, students[0]._id],
    moderators: [students[8]._id],
    lastMessageAt: at(-1, 17, 45),
    lastMessagePreview: "Volunteer briefing notes are pinned.",
    createdBy: societyAdmin._id,
  });
  const artsGroup = await Group.create({
    institute: institute._id,
    society: societies[4]._id,
    name: "Arts Collective",
    description: "Exhibition planning and creative collaborations.",
    color: "#db2777",
    memberIds: [students[6]._id, students[9]._id, students[2]._id, students[10]._id, students[3]._id],
    moderators: [students[6]._id],
    lastMessageAt: at(-1, 12, 20),
    lastMessagePreview: "Gallery wall mockups uploaded.",
    createdBy: societyAdmin._id,
  });

  const groupMemberDocs = [];
  const addGroupMembers = (group, memberIds, moderatorIds) => {
    for (const userId of memberIds) {
      groupMemberDocs.push({
        institute: institute._id,
        group: group._id,
        user: userId,
        role: moderatorIds.some((id) => String(id) === String(userId)) ? "moderator" : "member",
        joinedAt: at(-20, 10),
        lastReadAt: at(0, 7),
      });
    }
  };
  addGroupMembers(quizGroup, quizGroup.memberIds, quizGroup.moderators);
  addGroupMembers(techGroup, techGroup.memberIds, techGroup.moderators);
  addGroupMembers(volunteerGroup, volunteerGroup.memberIds, volunteerGroup.moderators);
  addGroupMembers(artsGroup, artsGroup.memberIds, artsGroup.moderators);
  await GroupMember.insertMany(groupMemberDocs);

  const messageDocs = [
    [quizGroup, students[1], "Salam everyone! Spring intake applications are open. Please review the screening sheet tonight.", at(0, 9, 0), true],
    [quizGroup, students[0], "Reviewed the first five — some really strong general knowledge answers.", at(0, 9, 4), false],
    [quizGroup, students[2], "I can join the interview panel on Thursday after 2 PM.", at(0, 9, 8), false],
    [quizGroup, students[1], "Perfect. Practice moved to 4:30 PM in the library.", at(0, 9, 12), false],
    [quizGroup, students[5], "Can we add a rapid-fire round to the inter-society night?", at(-1, 18, 20), false],
    [quizGroup, students[1], "Yes — I'll draft the round structure and share it here.", at(-1, 18, 27), false],
    [techGroup, students[5], "Summit landing page is ready for review. Feedback by tomorrow please.", at(0, 8, 30), false],
    [techGroup, students[3], "The speaker cards look great. I'll test mobile tonight.", at(0, 8, 36), false],
    [techGroup, students[0], "I can cover the social media schedule for launch week.", at(0, 8, 41), false],
    [techGroup, students[7], "Booked the auditorium for the dry run on Friday.", at(-1, 16, 12), true],
    [volunteerGroup, students[8], "Volunteer briefing notes are pinned. Please read before Saturday.", at(-1, 17, 45), true],
    [volunteerGroup, students[0], "I'll lead the registration desk again — happy to train two new volunteers.", at(-1, 18, 2), false],
    [volunteerGroup, students[10], "Can we get extra collection boxes for the north gate?", at(-1, 18, 20), false],
    [artsGroup, students[6], "Gallery wall mockups uploaded. Voting closes tomorrow evening.", at(-1, 12, 20), false],
    [artsGroup, students[9], "The lighting plan works better with the smaller frames on the east wall.", at(-1, 12, 35), false],
  ];
  await Message.collection.insertMany(
    messageDocs.map(([group, sender, body, createdAt, pinned]) => ({
      _id: new mongoose.Types.ObjectId(),
      institute: institute._id,
      group: group._id,
      sender: sender._id,
      senderName: sender.name,
      body,
      attachments: [],
      createdAt,
      updatedAt: createdAt,
      isAnnouncement: pinned,
      pinned,
    }))
  );

  await Task.insertMany([
    { institute: institute._id, society: societies[1]._id, group: quizGroup._id, title: "Shortlist spring intake applicants", description: "Score the first-round applications and flag candidates for interview.", assignedTo: students[0]._id, createdBy: students[1]._id, dueDate: at(2, 17), priority: "high", status: "in_progress" },
    { institute: institute._id, society: societies[5]._id, group: techGroup._id, title: "Finalise summit landing page copy", description: "Review speaker bios, agenda and registration call-to-action.", assignedTo: students[0]._id, createdBy: students[5]._id, dueDate: at(1, 12), priority: "urgent", status: "pending" },
    { institute: institute._id, society: societies[6]._id, group: volunteerGroup._id, title: "Confirm collection boxes with facilities", description: "Two boxes for the north gate, one for the main entrance.", assignedTo: students[0]._id, createdBy: students[8]._id, dueDate: at(3, 10), priority: "medium", status: "pending" },
    { institute: institute._id, society: societies[6]._id, group: volunteerGroup._id, title: "Draft volunteer briefing pack", description: "Include timings, zones and emergency contacts.", assignedTo: students[0]._id, createdBy: students[8]._id, dueDate: at(-2, 16), priority: "medium", status: "completed", completedAt: at(-2, 15) },
    { institute: institute._id, society: societies[1]._id, group: quizGroup._id, title: "Design practise scoreboard", description: "Simple projection-friendly board for Wednesday practice.", assignedTo: students[2]._id, createdBy: students[1]._id, dueDate: at(5, 18), priority: "low", status: "pending" },
  ]);

  const events = [];
  for (let index = 0; index < EVENTS.length; index += 1) {
    const item = EVENTS[index];
    const slug = slugify(item.title);
    const poster = item.poster || (await writeLightPoster(fs, path, posterDir, slug, {
      title: item.title,
      category: item.category,
      variant: index,
    }));
    const past = new Date(item.endAt) < new Date();
    events.push(
      await Event.create({
        institute: institute._id,
        society: item.society === null ? undefined : societies[item.society]._id,
        title: item.title,
        slug,
        excerpt: item.excerpt,
        description: item.description,
        poster,
        category: item.category,
        type: item.type,
        startAt: item.startAt,
        endAt: item.endAt,
        venue: item.venue,
        organizer: eventAdmin._id,
        organizerName: item.society === null ? "Campus Activities Office" : societies[item.society].name,
        registrationOpenAt: item.regOpen,
        registrationDeadline: item.deadline,
        capacity: item.capacity,
        requirements: "Open to all verified KIPS students. Bring your student ID.",
        notes: "Check the campus updates feed for any schedule changes.",
        rules: ["Arrive 15 minutes before the start time.", "Follow campus code of conduct.", "Photography only in designated areas."],
        highlights: item.highlights,
        feedbackEnabled: Boolean(item.feedback),
        featured: item.featured,
        status: past ? "completed" : index === 9 ? "registration_closed" : "registration_open",
        createdBy: eventAdmin._id,
      })
    );
  }

  const registrationDocs = [];
  const registered = new Set();
  const addRegistration = (eventIndex, studentIndex, status, attendance, via = "manual") => {
    const key = `${eventIndex}:${studentIndex}`;
    if (registered.has(key)) return;
    registered.add(key);
    registrationDocs.push({
      institute: institute._id,
      event: events[eventIndex]._id,
      user: students[studentIndex]._id,
      registrationId: makeId("KIPS-REG", 6),
      status,
      attendance,
      markedVia: via,
      markedBy: attendance === "unmarked" ? undefined : eventAdmin._id,
      attendedAt: attendance === "present" ? at(-14, 10) : undefined,
      createdAt: at(-20, 10),
      updatedAt: at(-14, 10),
    });
  };

  for (const eventIndex of [0, 1, 2]) {
    for (let studentIndex = 0; studentIndex < 9; studentIndex += 1) {
      addRegistration(eventIndex, studentIndex, "attended", "present");
    }
  }
  addRegistration(0, 10, "attended", "absent");
  addRegistration(1, 11, "attended", "present");
  for (const eventIndex of [3, 4, 5, 6, 7, 8, 10, 11]) {
    addRegistration(eventIndex, 0, "approved", "unmarked");
    for (let studentIndex = 1; studentIndex < 10; studentIndex += 1) {
      if ((studentIndex + eventIndex) % 3 !== 0) addRegistration(eventIndex, studentIndex, "approved", "unmarked");
    }
  }
  addRegistration(9, 0, "cancelled", "unmarked");
  addRegistration(9, 4, "approved", "unmarked");
  await Registration.insertMany(registrationDocs);

  const competitions = await Competition.insertMany(
    COMPETITIONS.map((item) => ({
      institute: institute._id,
      society: societies[item.society]._id,
      title: item.title,
      slug: slugify(item.title),
      excerpt: item.excerpt,
      description: item.description,
      category: item.category,
      type: item.type,
      mode: item.mode,
      teamSize: { min: item.teamSize ? item.teamSize[0] : 1, max: item.teamSize ? item.teamSize[1] : 1 },
      venue: item.venue,
      startAt: item.startAt,
      endAt: item.endAt,
      registrationDeadline: item.deadline,
      submissionDeadline: item.published ? item.endAt : undefined,
      capacity: item.capacity,
      prizeDetails: item.prizeDetails || "",
      rules: ["Register before the deadline.", "Judges' decisions are final.", "Plagiarism leads to disqualification."],
      requirements: "Open to verified KIPS students.",
      organizer: eventAdmin._id,
      organizerName: societies[item.society].name,
      status: new Date(item.endAt) < new Date() ? "completed" : "registration_open",
      leaderboardPublished: item.published,
      createdBy: eventAdmin._id,
    }))
  );

  let posterIndex = 0;
  for (const competition of competitions) {
    const source = COMPETITIONS[posterIndex];
    const poster = source.poster || (await writeLightPoster(fs, path, posterDir, competition.slug, {
      title: competition.title,
      category: competition.category,
      variant: posterIndex,
      kicker: "KIPS COMPETITIONS",
    }));
    posterIndex += 1;
    competition.poster = poster;
    await competition.save();
  }

  const futsal = competitions[2];
  const writing = competitions[3];
  const quizChampionship = competitions[0];
  const photography = competitions[4];

  const entries = await CompetitionEntry.insertMany([
    { institute: institute._id, competition: futsal._id, user: students[0]._id, entryId: makeId("KIPS-ENT", 6), teamName: "Purple Strikers", members: [{ name: "Ayesha Khan", rollNumber: "KIPS-2024-001" }, { name: "Ali Raza", rollNumber: "KIPS-2024-002" }, { name: "Usman Ali", rollNumber: "KIPS-2024-012" }], status: "approved", score: 92, position: "winner", remarks: "Unbeaten in the group stage and final." },
    { institute: institute._id, competition: futsal._id, user: students[7]._id, entryId: makeId("KIPS-ENT", 6), teamName: "Blue Falcons", members: [{ name: "Bilal Ahmed", rollNumber: "KIPS-2024-008" }, { name: "Zain Abbas", rollNumber: "KIPS-2024-004" }, { name: "Hamza Tariq", rollNumber: "KIPS-2024-006" }], status: "approved", score: 86, position: "runner_up", remarks: "Finalists." },
    { institute: institute._id, competition: futsal._id, user: students[3]._id, entryId: makeId("KIPS-ENT", 6), teamName: "Green Machine", members: [{ name: "Zain Abbas", rollNumber: "KIPS-2024-004" }, { name: "Ali Raza", rollNumber: "KIPS-2024-002" }], status: "approved", score: 78, position: "second_runner_up", remarks: "" },
    { institute: institute._id, competition: writing._id, user: students[9]._id, entryId: makeId("KIPS-ENT", 6), teamName: "", members: [], status: "approved", score: 94, position: "winner", remarks: "Exceptional control of voice and structure." },
    { institute: institute._id, competition: writing._id, user: students[0]._id, entryId: makeId("KIPS-ENT", 6), teamName: "", members: [], status: "approved", score: 88, position: "runner_up", remarks: "Beautiful imagery, strong closing." },
    { institute: institute._id, competition: writing._id, user: students[2]._id, entryId: makeId("KIPS-ENT", 6), teamName: "", members: [], status: "approved", score: 81, position: "participant", remarks: "" },
    { institute: institute._id, competition: quizChampionship._id, user: students[0]._id, entryId: makeId("KIPS-ENT", 6), teamName: "", members: [], status: "approved", score: null, position: "none", remarks: "" },
    { institute: institute._id, competition: quizChampionship._id, user: students[1]._id, entryId: makeId("KIPS-ENT", 6), teamName: "", members: [], status: "approved", score: null, position: "none", remarks: "" },
    { institute: institute._id, competition: quizChampionship._id, user: students[5]._id, entryId: makeId("KIPS-ENT", 6), teamName: "", members: [], status: "approved", score: null, position: "none", remarks: "" },
    { institute: institute._id, competition: photography._id, user: students[6]._id, entryId: makeId("KIPS-ENT", 6), teamName: "", members: [], status: "pending", score: null, position: "none", remarks: "", submissionLink: "https://example.com/lens-light/noor" },
  ]);

  const certificatePlan = [
    ["participation", 0, "Qawwali Night 2026", "Campus Event", "Recognised for participation in Qawwali Night 2026."],
    ["participation", 1, "Sports Day 2026", "Campus Event", "Recognised for participation in Sports Day 2026."],
    ["winner", 2, "Futsal Champions Cup", "Competition", "Awarded for winning first place with Purple Strikers."],
    ["runner_up", 3, "Creative Writing Challenge", "Competition", "Awarded runner-up for outstanding creative writing."],
    ["society_membership", null, "Quiz Society", "Society", "For active membership of the Quiz Society."],
    ["leadership", null, "Science & Technology Society", "Society", "For leadership as Event Manager of the Science & Technology Society."],
    ["volunteer", null, "Campus Community Service", "Society", "For dedicated volunteer service with the Social Welfare Society."],
  ];

  const certificates = [];
  for (let index = 0; index < certificatePlan.length; index += 1) {
    const [type, competitionIndex, activityTitle, activityKind, reason] = certificatePlan[index];
    certificates.push(
      await Certificate.create({
        institute: institute._id,
        certificateId: `CEH-CERT-2026-${randomCode(5)}`,
        user: students[0]._id,
        competition: competitionIndex === null ? undefined : competitions[competitionIndex]._id,
        society: competitionIndex === null ? societies[index === 4 ? 1 : index === 5 ? 5 : 6]._id : undefined,
        type,
        recipientName: "Ayesha Khan",
        activityTitle,
        activityKind,
        reason,
        issuedBy: superAdmin._id,
        issuedByName: superAdmin.name,
        issuedAt: at(-30 + index * 3, 12),
        status: "valid",
      })
    );
  }
  const otherCertificates = [
    ["winner", 3, 9, "Creative Writing Challenge", "Competition", "Awarded first place in the Creative Writing Challenge."],
    ["runner_up", 2, 7, "Futsal Champions Cup", "Competition", "Awarded runner-up with Blue Falcons."],
    ["participation", 0, 5, "Qawwali Night 2026", "Campus Event", "Recognised for participation in Qawwali Night 2026."],
    ["society_membership", null, 1, "Quiz Society", "Society", "For active membership of the Quiz Society."],
    ["volunteer", null, 10, "Volunteer Corps", "Society", "For volunteer service in the community welfare programme."],
  ];
  for (const [type, competitionIndex, studentIndex, activityTitle, activityKind, reason] of otherCertificates) {
    certificates.push(
      await Certificate.create({
        institute: institute._id,
        certificateId: `CEH-CERT-2026-${randomCode(5)}`,
        user: students[studentIndex]._id,
        competition: competitionIndex === null ? undefined : competitions[competitionIndex]._id,
        society: competitionIndex === null ? societies[1]._id : undefined,
        type,
        recipientName: students[studentIndex].name,
        activityTitle,
        activityKind,
        reason,
        issuedBy: superAdmin._id,
        issuedByName: superAdmin.name,
        issuedAt: at(-22 + studentIndex, 12),
        status: "valid",
      })
    );
  }

  await Announcement.insertMany([
    { institute: institute._id, title: "Spring society recruitment is open", body: "Quiz Society and Arts & Culture Society are accepting applications. Read each call, answer the custom questions and upload your portfolio before the deadlines.", category: "recruitment", priority: "important", pinned: true, link: "/recruitment", publishedBy: recruitmentAdmin._id, publishedByName: recruitmentAdmin.name },
    { institute: institute._id, title: "Tech Innovation Summit registrations are live", body: "Seats for the biggest tech event of the semester are now open. Keynotes, startup demos and a hands-on AI lab await.", category: "event", priority: "important", pinned: true, image: events[8].poster, link: "/events/tech-innovation-summit-2026", publishedBy: eventAdmin._id, publishedByName: eventAdmin.name },
    { institute: institute._id, title: "Futsal Champions Cup results published", body: "Purple Strikers took the trophy after an unbeaten run. Full rankings and certificates are now in the competition results.", category: "result", priority: "normal", link: "/competitions/futsal-champions-cup", publishedBy: eventAdmin._id, publishedByName: eventAdmin.name },
    { institute: institute._id, title: "Winter Cultural Festival volunteers needed", body: "The Arts & Culture Society is assembling the volunteer team for the two-day festival. Orientation is mandatory for all new volunteers.", category: "notice", priority: "important", link: "/events/winter-cultural-festival", publishedBy: societyAdmin._id, publishedByName: societyAdmin.name },
    { institute: institute._id, title: "Certificate verification portal is live", body: "Every certificate issued through KIPS Campus Event Hub now carries a unique ID and QR code. Employers and universities can verify instantly.", category: "general", priority: "normal", link: "/verify", publishedBy: superAdmin._id, publishedByName: superAdmin.name },
    { institute: institute._id, title: "Society leadership handover next month", body: "Current society presidents should begin handover notes. Leadership applications open to active members from next week.", category: "society", priority: "normal", link: "/societies", publishedBy: societyAdmin._id, publishedByName: societyAdmin.name },
  ]);

  await Notification.insertMany([
    { institute: institute._id, user: students[0]._id, type: "application", title: "Application under review", message: "Your Arts & Culture Society application is being reviewed by the creative panel.", link: "/dashboard/applications" },
    { institute: institute._id, user: students[0]._id, type: "file_review", title: "Portfolio is pending review", message: "Your uploaded portfolio is waiting for a reviewer.", link: "/dashboard/applications" },
    { institute: institute._id, user: students[0]._id, type: "group", title: "New message in Quiz Society Core Team", message: "Practice moved to 4:30 PM in the library.", link: "/dashboard/groups", read: true },
    { institute: institute._id, user: students[0]._id, type: "task", title: "Urgent task assigned", message: "Finalise the Tech Innovation Summit landing page copy by tomorrow.", link: "/dashboard/tasks" },
    { institute: institute._id, user: students[0]._id, type: "event", title: "Welcome Party is in 6 days", message: "You are registered. Check the venue and timings.", link: "/events/welcome-party-2026", read: true },
    { institute: institute._id, user: students[0]._id, type: "certificate", title: "New certificate issued", message: "Your Creative Writing Challenge runner-up certificate is ready.", link: "/dashboard/certificates" },
    { institute: institute._id, user: students[0]._id, type: "points", title: "+10 activity points", message: "Points awarded for attending Sports Day 2026.", link: "/dashboard/points", read: true },
    { institute: institute._id, user: students[0]._id, type: "competition", title: "Quiz Championship registration confirmed", message: "You are entered in the Inter-Society Quiz Championship.", link: "/dashboard/competitions" },
    { institute: institute._id, user: students[0]._id, type: "announcement", title: "Spring recruitment is open", message: "Two societies are accepting applications this week.", link: "/recruitment", read: true },
    { institute: institute._id, user: students[0]._id, type: "result", title: "Creative Writing Challenge results", message: "You placed runner-up. View the full leaderboard.", link: "/competitions/creative-writing-challenge" },
    { institute: institute._id, user: students[1]._id, type: "application", title: "Interview shortlist", message: "You have been shortlisted for the Quiz Society intake.", link: "/admin/applications" },
    { institute: institute._id, user: students[2]._id, type: "application", title: "Interview scheduled", message: "Your Quiz Society interview is scheduled for this week.", link: "/dashboard/applications" },
  ]);

  await Achievement.insertMany([
    { institute: institute._id, user: students[0]._id, title: "Campus Champion", description: "Won the Futsal Champions Cup with Purple Strikers.", type: "award", icon: "trophy", points: 50, awardedBy: eventAdmin._id, awardedAt: at(-18, 18), isVisible: true },
    { institute: institute._id, user: students[0]._id, title: "Volunteer of the Month", description: "Recognised for leadership at community welfare drives.", type: "recognition", icon: "heart", points: 15, awardedBy: societyAdmin._id, awardedAt: at(-10, 12), isVisible: true },
    { institute: institute._id, user: students[0]._id, title: "Quiz Finalist", description: "Reached the rapid-fire stage of the quiz championship.", type: "badge", icon: "brain", points: 10, awardedBy: recruitmentAdmin._id, awardedAt: at(-5, 16), isVisible: true },
    { institute: institute._id, user: students[0]._id, title: "200 Activity Points", description: "Crossed 200 verified activity points this semester.", type: "milestone", icon: "sparkles", points: 0, awardedAt: at(-2, 10), isVisible: true },
    { institute: institute._id, user: students[3]._id, title: "Creative Writer Award", description: "First place in the Creative Writing Challenge.", type: "award", icon: "pen", points: 50, awardedBy: eventAdmin._id, awardedAt: at(-9, 15), isVisible: true },
  ]);

  const pointDocs = [
    [0, "event_attendance", 0, "Qawwali Night attendance"],
    [0, "event_attendance", 1, "Sports Day attendance"],
    [0, "event_attendance", 2, "Annual Dinner attendance"],
    [0, "competition_win", 2, "Futsal Champions Cup winner"],
    [0, "competition_participation", 3, "Creative Writing Challenge runner-up"],
    [0, "society_joined", 1, "Joined Quiz Society"],
    [0, "society_joined", 5, "Joined Science & Technology Society"],
    [0, "society_joined", 6, "Joined Social Welfare volunteer corps"],
    [0, "leadership_role", 5, "Society Event Manager"],
    [0, "task_completed", 3, "Volunteer briefing pack completed"],
    [0, "event_volunteering", 6, "Community service"],
  ];
  await StudentPoint.insertMany(
    pointDocs.map(([studentIndex, action, sourceIndex, note]) => ({
      institute: institute._id,
      user: students[studentIndex]._id,
      action,
      points: POINT_ACTIONS[action].points,
      sourceType: "seed",
      sourceId: new mongoose.Types.ObjectId(),
      note,
      awardedBy: eventAdmin._id,
      createdAt: at(-12 + sourceIndex, 12),
    }))
  );

  await EventFeedback.insertMany([
    { institute: institute._id, event: events[0]._id, user: students[0]._id, rating: 5, organization: 5, quality: 4, suggestions: "More seating near the courtyard would help." },
    { institute: institute._id, event: events[1]._id, user: students[0]._id, rating: 4, organization: 5, quality: 4, suggestions: "Add a water station at the far field." },
    { institute: institute._id, event: events[0]._id, user: students[2]._id, rating: 5, organization: 4, quality: 5, suggestions: "Loved the student opening act." },
    { institute: institute._id, event: events[1]._id, user: students[5]._id, rating: 4, organization: 4, quality: 5, suggestions: "More track events next year." },
    { institute: institute._id, event: events[2]._id, user: students[7]._id, rating: 5, organization: 5, quality: 5, suggestions: "Excellent evening." },
  ]);

  await Gallery.insertMany([
    { institute: institute._id, society: societies[4]._id, event: events[0]._id, title: "Qawwali Night Highlights", description: "A candlelit evening of Sufi music and student performances.", cover: events[0].poster, images: [events[0].poster, "/2campus.jfif"], createdBy: societyAdmin._id },
    { institute: institute._id, society: societies[2]._id, event: events[1]._id, title: "Sports Day 2026", description: "Track finals, futsal and house pride.", cover: "/sports community.jfif", images: ["/sports community.jfif", "/fustal champion cup.webp"], createdBy: eventAdmin._id },
    { institute: institute._id, society: societies[1]._id, title: "Quiz Society Practice Nights", description: "Weekly practice and championship prep.", cover: "/quiz club.jfif", images: ["/quiz club.jfif", "/quiz image.jfif"], createdBy: societyAdmin._id },
    { institute: institute._id, society: societies[6]._id, event: events[7]._id, title: "Community Welfare Drive", description: "Students packing and delivering winter supplies.", cover: "/social clubs.jfif", images: ["/social clubs.jfif", "/Volunteer Orientation.jfif"], createdBy: societyAdmin._id },
    { institute: institute._id, event: events[3]._id, title: "Welcome Party 2026", description: "The welcome stage and the official invitation for our newest students.", cover: "/Welcome Party 2026.jfif", images: ["/Welcome Party 2026.jfif", "/welcome party pic.jfif"], createdBy: eventAdmin._id },
  ]);

  await CertificateTemplate.create({
    institute: institute._id,
    name: "KIPS Signature",
    title: "KIPS College Certificate of Recognition",
    body: "This certificate is proudly presented by KIPS College in recognition of outstanding contribution to campus life.",
    signatory: "Dr. Bilal Hussain · Campus Activities Office",
    primaryColor: "#6d28d9",
    accentColor: "#2563eb",
    isDefault: true,
    createdBy: superAdmin._id,
  });

  await ActivityLog.insertMany([
    { institute: institute._id, actor: superAdmin._id, actorName: superAdmin.name, actorRole: "superadmin", action: "institute.settings_updated", entityType: "Institute", summary: "Updated KIPS branding and leadership details." },
    { institute: institute._id, actor: superAdmin._id, actorName: superAdmin.name, actorRole: "superadmin", action: "student.verified", entityType: "User", entityId: students[1]._id, summary: "Verified Ali Raza (KIPS-2024-002)." },
    { institute: institute._id, actor: recruitmentAdmin._id, actorName: recruitmentAdmin.name, actorRole: "admin", action: "application.shortlisted", entityType: "Application", entityId: hiraApplication._id, summary: "Shortlisted Hira Fatima for the Quiz Society." },
    { institute: institute._id, actor: recruitmentAdmin._id, actorName: recruitmentAdmin.name, actorRole: "admin", action: "file.resubmission_requested", entityType: "UploadedFile", entityId: cvFile._id, summary: "Requested a new CV from Hira Fatima." },
    { institute: institute._id, actor: eventAdmin._id, actorName: eventAdmin.name, actorRole: "admin", action: "event.created", entityType: "Event", entityId: events[8]._id, summary: "Created Tech Innovation Summit 2026." },
    { institute: institute._id, actor: eventAdmin._id, actorName: eventAdmin.name, actorRole: "admin", action: "competition.results_published", entityType: "Competition", entityId: futsal._id, summary: "Published Futsal Champions Cup results." },
    { institute: institute._id, actor: societyAdmin._id, actorName: societyAdmin.name, actorRole: "admin", action: "group.created", entityType: "Group", entityId: volunteerGroup._id, summary: "Created Cultural Night Volunteers group." },
    { institute: institute._id, actor: societyAdmin._id, actorName: societyAdmin.name, actorRole: "admin", action: "membership.role_changed", entityType: "SocietyMember", summary: "Promoted Ayesha Khan to Event Manager in the Science & Technology Society." },
    { institute: institute._id, actor: superAdmin._id, actorName: superAdmin.name, actorRole: "superadmin", action: "certificate.issued", entityType: "Certificate", entityId: certificates[2]._id, summary: "Issued winner certificate to Ayesha Khan." },
    { institute: institute._id, actor: superAdmin._id, actorName: superAdmin.name, actorRole: "superadmin", action: "admin.permissions_updated", entityType: "User", entityId: recruitmentAdmin._id, summary: "Updated recruitment admin permissions." },
  ]);

  return NextResponse.json({
    ok: true,
    counts: {
      institute: 1,
      admins: 4,
      students: students.length,
      societies: societies.length,
      memberships: membershipPlan.length,
      recruitments: recruitments.length,
      questions: Object.values(questionsByRecruitment).reduce((sum, list) => sum + list.length, 0),
      applications: 4,
      files: 2,
      interviews: 1,
      groups: 4,
      messages: messageDocs.length,
      tasks: 5,
      events: events.length,
      registrations: registrationDocs.length,
      competitions: competitions.length,
      entries: entries.length,
      certificates: certificates.length,
      announcements: 6,
      notifications: 12,
      achievements: 5,
      points: pointDocs.length,
      feedback: 5,
      galleries: 5,
      activityLogs: 10,
    },
    credentials: {
      superadmin: "admin@kips.edu.pk / Admin@123",
      recruitment: "recruitment@kips.edu.pk / Admin@123",
      events: "events@kips.edu.pk / Admin@123",
      societies: "societies@kips.edu.pk / Admin@123",
      student: "demo@kips.edu.pk / Student@123",
    },
  });
  } catch (error) {
    console.error("Seed failed:", error);
    return NextResponse.json(
      { ok: false, error: error.message, stack: String(error.stack || "").split("\n").slice(0, 8) },
      { status: 500 }
    );
  }
}
