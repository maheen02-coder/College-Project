export const EVENT_CATEGORIES = [
  "College Events",
  "Society Events",
  "Entertainment",
  "Cultural",
  "Sports",
  "Workshops",
  "Seminars",
  "Competitions",
  "Celebrations",
  "Charity",
  "Other",
];

export const EVENT_TYPES = [
  "Campus Event",
  "Society Event",
  "Workshop",
  "Seminar",
  "Sports",
  "Cultural",
  "Entertainment",
  "Celebration",
  "Charity",
];

export const EVENT_FILTERS = [
  "All Events",
  "College Events",
  "Society Events",
  "Entertainment",
  "Cultural",
  "Sports",
  "Workshops",
  "Seminars",
  "Competitions",
  "Charity",
];

export const COMPETITION_TYPES = [
  "Quiz",
  "Debate",
  "Sports",
  "Science",
  "Literary",
  "Art",
  "Coding",
  "Business",
  "Photography",
  "Creative",
];

export const COMPETITION_CATEGORIES = [
  "Academic",
  "Literary",
  "Sports",
  "Arts & Culture",
  "Technology",
  "Business",
];

export const REGISTRATION_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "cancelled",
  "attended",
  "absent",
];

export const EVENT_STATUSES = [
  "upcoming",
  "registration_open",
  "registration_closed",
  "ongoing",
  "completed",
  "cancelled",
  "postponed",
];

export const CERTIFICATE_TYPES = [
  "participation",
  "winner",
  "runner_up",
  "volunteer",
  "society_membership",
  "leadership",
  "achievement",
  "special_recognition",
];

export const EVENT_STATUS_META = {
  upcoming: { label: "Upcoming", tone: "violet" },
  registration_open: { label: "Registration Open", tone: "emerald" },
  registration_closed: { label: "Registration Closed", tone: "amber" },
  ongoing: { label: "Ongoing", tone: "blue" },
  completed: { label: "Completed", tone: "slate" },
  cancelled: { label: "Cancelled", tone: "rose" },
  postponed: { label: "Postponed", tone: "amber" },
};

export const COMPETITION_STATUS_META = {
  upcoming: { label: "Upcoming", tone: "violet" },
  registration_open: { label: "Registration Open", tone: "emerald" },
  registration_closed: { label: "Registration Closed", tone: "amber" },
  ongoing: { label: "In Progress", tone: "blue" },
  completed: { label: "Completed", tone: "slate" },
  cancelled: { label: "Cancelled", tone: "rose" },
};

export const REGISTRATION_STATUS_META = {
  pending: { label: "Pending", tone: "amber" },
  approved: { label: "Approved", tone: "emerald" },
  rejected: { label: "Rejected", tone: "rose" },
  cancelled: { label: "Cancelled", tone: "slate" },
  attended: { label: "Attended", tone: "blue" },
  absent: { label: "Absent", tone: "rose" },
};

export const CERTIFICATE_TYPE_META = {
  participation: { label: "Participation", tone: "violet", title: "Certificate of Participation", action: "for active participation in" },
  winner: { label: "Winner", tone: "amber", title: "Certificate of Excellence", action: "for winning first place in" },
  runner_up: { label: "Runner-up", tone: "blue", title: "Certificate of Merit", action: "for securing runner-up position in" },
  volunteer: { label: "Volunteer", tone: "emerald", title: "Certificate of Volunteering", action: "for dedicated volunteer service at" },
  society_membership: { label: "Society Membership", tone: "violet", title: "Certificate of Membership", action: "for active membership of" },
  leadership: { label: "Leadership", tone: "amber", title: "Certificate of Leadership", action: "for outstanding leadership of" },
  achievement: { label: "Achievement", tone: "emerald", title: "Certificate of Achievement", action: "in recognition of outstanding achievement in" },
  special_recognition: { label: "Special Recognition", tone: "blue", title: "Certificate of Recognition", action: "in special recognition of contributions to" },
};

export const POSITION_META = {
  winner: { label: "Winner", tone: "amber" },
  runner_up: { label: "Runner-up", tone: "blue" },
  second_runner_up: { label: "2nd Runner-up", tone: "emerald" },
  participant: { label: "Participant", tone: "slate" },
  none: { label: "Unplaced", tone: "slate" },
};

export const SOCIETY_CATEGORIES = [
  "Academic",
  "Arts & Culture",
  "Sports",
  "Technology",
  "Literary",
  "Social Welfare",
  "Adventure",
  "General",
];

export const SOCIETY_ROLES = [
  "president",
  "vice_president",
  "secretary",
  "treasurer",
  "event_manager",
  "team_lead",
  "member",
  "volunteer",
];

export const SOCIETY_ROLE_META = {
  president: { label: "President", tone: "amber" },
  vice_president: { label: "Vice President", tone: "violet" },
  secretary: { label: "Secretary", tone: "blue" },
  treasurer: { label: "Treasurer", tone: "emerald" },
  event_manager: { label: "Event Manager", tone: "blue" },
  team_lead: { label: "Team Lead", tone: "violet" },
  member: { label: "Member", tone: "slate" },
  volunteer: { label: "Volunteer", tone: "emerald" },
};

export const RECRUITMENT_STATUS_META = {
  draft: { label: "Draft", tone: "slate" },
  open: { label: "Open", tone: "emerald" },
  closed: { label: "Closed", tone: "amber" },
  archived: { label: "Archived", tone: "slate" },
};

export const APPLICATION_STATUS_META = {
  draft: { label: "Draft", tone: "slate" },
  submitted: { label: "Submitted", tone: "blue" },
  pending_review: { label: "Pending Review", tone: "amber" },
  under_review: { label: "Under Review", tone: "violet" },
  shortlisted: { label: "Shortlisted", tone: "emerald" },
  interview_scheduled: { label: "Interview Scheduled", tone: "blue" },
  accepted: { label: "Accepted", tone: "emerald" },
  rejected: { label: "Rejected", tone: "rose" },
  withdrawn: { label: "Withdrawn", tone: "slate" },
};

export const QUESTION_TYPE_META = {
  short_text: { label: "Short text", tone: "slate" },
  long_text: { label: "Long text", tone: "slate" },
  single_choice: { label: "Single choice", tone: "violet" },
  multiple_choice: { label: "Multiple choice", tone: "violet" },
  yes_no: { label: "Yes / No", tone: "blue" },
  dropdown: { label: "Dropdown", tone: "blue" },
  rating: { label: "Rating (1–5)", tone: "amber" },
  file: { label: "File upload", tone: "emerald" },
};

export const FILE_STATUS_META = {
  pending_review: { label: "Pending review", tone: "amber" },
  approved: { label: "Approved", tone: "emerald" },
  rejected: { label: "Rejected", tone: "rose" },
  resubmission_required: { label: "Resubmission required", tone: "blue" },
};

export const INTERVIEW_STATUS_META = {
  scheduled: { label: "Scheduled", tone: "blue" },
  completed: { label: "Completed", tone: "emerald" },
  no_show: { label: "No show", tone: "rose" },
  cancelled: { label: "Cancelled", tone: "slate" },
};

export const TASK_STATUSES = ["pending", "in_progress", "completed", "cancelled"];

export const TASK_STATUS_META = {
  pending: { label: "Pending", tone: "amber" },
  in_progress: { label: "In progress", tone: "blue" },
  completed: { label: "Completed", tone: "emerald" },
  cancelled: { label: "Cancelled", tone: "slate" },
};

export const TASK_PRIORITY_META = {
  low: { label: "Low", tone: "slate" },
  medium: { label: "Medium", tone: "blue" },
  high: { label: "High", tone: "amber" },
  urgent: { label: "Urgent", tone: "rose" },
};

export const VERIFICATION_STATUS_META = {
  unverified: { label: "Unverified", tone: "slate" },
  pending: { label: "Pending verification", tone: "amber" },
  verified: { label: "Verified", tone: "emerald" },
  rejected: { label: "Rejected", tone: "rose" },
};

export const ADMIN_PERMISSIONS = [
  "manage_students",
  "verify_students",
  "manage_admins",
  "manage_societies",
  "manage_recruitment",
  "review_applications",
  "manage_events",
  "manage_competitions",
  "manage_registrations",
  "manage_attendance",
  "manage_certificates",
  "manage_announcements",
  "manage_groups",
  "manage_tasks",
  "manage_feedback",
  "manage_galleries",
  "manage_settings",
  "view_analytics",
  "view_logs",
];

export const ADMIN_PERMISSION_META = {
  manage_students: "Students directory",
  verify_students: "Student verification",
  manage_admins: "Admins & roles",
  manage_societies: "Societies & members",
  manage_recruitment: "Recruitment & questions",
  review_applications: "Applications, files & interviews",
  manage_events: "Events",
  manage_competitions: "Competitions & results",
  manage_registrations: "Registrations",
  manage_attendance: "Attendance & QR",
  manage_certificates: "Certificates & templates",
  manage_announcements: "Updates & announcements",
  manage_groups: "Groups & chat",
  manage_tasks: "Society tasks",
  manage_feedback: "Event feedback",
  manage_galleries: "Galleries",
  manage_settings: "Institute settings",
  view_analytics: "Analytics & reports",
  view_logs: "Activity logs",
};

export const ADMIN_ROLE_PRESETS = {
  superadmin: { label: "Super Admin", permissions: ADMIN_PERMISSIONS },
  recruitment_admin: {
    label: "Recruitment Admin",
    permissions: ["manage_students", "manage_recruitment", "review_applications", "view_analytics"],
  },
  event_admin: {
    label: "Event Admin",
    permissions: [
      "manage_events",
      "manage_competitions",
      "manage_registrations",
      "manage_attendance",
      "manage_announcements",
      "view_analytics",
    ],
  },
  society_admin: {
    label: "Society Admin",
    permissions: ["manage_students", "manage_societies", "manage_groups", "manage_tasks", "manage_galleries", "view_analytics"],
  },
  certificate_admin: {
    label: "Certificate Admin",
    permissions: ["manage_certificates", "view_analytics"],
  },
  student_admin: {
    label: "Student Management Admin",
    permissions: ["manage_students", "verify_students", "view_analytics", "view_logs"],
  },
  communication_admin: {
    label: "Communication Admin",
    permissions: ["manage_announcements", "manage_groups", "view_analytics"],
  },
};

export const POINT_ACTIONS = {
  event_attendance: { label: "Event attendance", points: 10 },
  event_volunteering: { label: "Event volunteering", points: 15 },
  competition_win: { label: "Competition win", points: 50 },
  competition_participation: { label: "Competition participation", points: 15 },
  society_joined: { label: "Society membership", points: 20 },
  leadership_role: { label: "Leadership role", points: 30 },
  task_completed: { label: "Task completed", points: 5 },
};

export const ANNOUNCEMENT_CATEGORIES = ["general", "notice", "event", "recruitment", "competition", "society", "result"];
export const ANNOUNCEMENT_PRIORITIES = ["normal", "important", "urgent"];

export const SKILL_OPTIONS = [
  "Public Speaking",
  "Writing",
  "Designing",
  "Photography",
  "Programming",
  "Leadership",
  "Volunteering",
  "Science",
  "Event Management",
  "Debate",
  "Art",
  "Sports",
];

export const INTEREST_OPTIONS = [
  "Sports",
  "Public Speaking",
  "Writing",
  "Designing",
  "Photography",
  "Programming",
  "Leadership",
  "Volunteering",
  "Science",
  "Event Management",
  "Debate",
  "Art",
];

export const CLASS_YEARS = [
  "Intermediate Part I",
  "Intermediate Part II",
  "A Levels",
  "BS Semester 1",
  "BS Semester 2",
  "BS Semester 3",
  "BS Semester 4",
  "BS Semester 5",
  "BS Semester 6",
  "BS Semester 7",
  "BS Semester 8",
];

export const DEPARTMENTS = [
  "Pre-Engineering",
  "Pre-Medical",
  "Computer Science",
  "Business Administration",
  "Media Studies",
  "Psychology",
  "Mathematics",
  "General Science",
];

export const ORGANIZER_PERMISSIONS = [
  "manage_events",
  "manage_attendance",
  "manage_results",
  "issue_certificates",
];
