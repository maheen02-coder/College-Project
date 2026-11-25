export const ADMIN_NAV = [
  {
    label: "Overview",
    items: [
      { href: "/admin", label: "Command center", icon: "dashboard" },
      { href: "/admin/analytics", label: "Analytics", icon: "analytics", permission: "view_analytics" },
      { href: "/admin/logs", label: "Activity logs", icon: "logs", permission: "view_logs" },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/admin/students", label: "Students", icon: "students", permission: "manage_students" },
      { href: "/admin/admins", label: "Admins & roles", icon: "admins", permission: "manage_admins" },
    ],
  },
  {
    label: "Societies & recruitment",
    items: [
      { href: "/admin/societies", label: "Societies", icon: "societies", permission: "manage_societies" },
      { href: "/admin/recruitment", label: "Recruitment", icon: "recruitment", permission: "manage_recruitment" },
      { href: "/admin/applications", label: "Applications", icon: "applications", permission: "review_applications" },
      { href: "/admin/files", label: "Files & documents", icon: "files", permission: "review_applications" },
      { href: "/admin/groups", label: "Groups & chat", icon: "groups", permission: "manage_groups" },
      { href: "/admin/tasks", label: "Tasks", icon: "tasks", permission: "manage_tasks" },
    ],
  },
  {
    label: "Events & awards",
    items: [
      { href: "/admin/events", label: "Events", icon: "events", permission: "manage_events" },
      { href: "/admin/competitions", label: "Competitions", icon: "competitions", permission: "manage_competitions" },
      { href: "/admin/registrations", label: "Registrations", icon: "registrations", permission: "manage_registrations" },
      { href: "/admin/participants", label: "Participants", icon: "participants", permission: "manage_registrations" },
      { href: "/admin/attendance", label: "Attendance & QR", icon: "attendance", permission: "manage_attendance" },
      { href: "/admin/results", label: "Results", icon: "results", permission: "manage_competitions" },
      { href: "/admin/certificates", label: "Certificates", icon: "certificates", permission: "manage_certificates" },
    ],
  },
  {
    label: "Communication",
    items: [
      { href: "/admin/announcements", label: "Announcements", icon: "announcements", permission: "manage_announcements" },
      { href: "/admin/galleries", label: "Galleries", icon: "galleries", permission: "manage_galleries" },
      { href: "/admin/feedback", label: "Feedback", icon: "feedback", permission: "manage_feedback" },
    ],
  },
  {
    label: "System",
    items: [{ href: "/admin/settings", label: "Settings", icon: "settings", permission: "manage_settings" }],
  },
];

export const STUDENT_NAV = [
  {
    label: "My campus",
    items: [
      { href: "/dashboard", label: "Overview", icon: "dashboard" },
      { href: "/dashboard/events", label: "My events", icon: "events" },
      { href: "/dashboard/competitions", label: "Competitions", icon: "competitions" },
      { href: "/dashboard/applications", label: "Applications", icon: "applications" },
      { href: "/dashboard/societies", label: "My societies", icon: "societies" },
      { href: "/dashboard/groups", label: "Groups & chat", icon: "groups" },
      { href: "/dashboard/tasks", label: "Tasks", icon: "tasks" },
    ],
  },
  {
    label: "Records",
    items: [
      { href: "/dashboard/attendance", label: "Attendance", icon: "attendance" },
      { href: "/dashboard/certificates", label: "Certificates", icon: "certificates" },
      { href: "/dashboard/achievements", label: "Achievements", icon: "results" },
      { href: "/dashboard/notifications", label: "Notifications", icon: "notifications" },
      { href: "/dashboard/activity", label: "Activity", icon: "logs" },
    ],
  },
  {
    label: "Account",
    items: [{ href: "/dashboard/profile", label: "Profile & academics", icon: "profile" }],
  },
];

export function filterNav(nav, can) {
  return nav
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.permission || can(item.permission)),
    }))
    .filter((group) => group.items.length > 0);
}
