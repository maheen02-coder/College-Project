import {
  APPLICATION_STATUS_META,
  CERTIFICATE_TYPE_META,
  COMPETITION_STATUS_META,
  EVENT_STATUS_META,
  FILE_STATUS_META,
  INTERVIEW_STATUS_META,
  POSITION_META,
  RECRUITMENT_STATUS_META,
  REGISTRATION_STATUS_META,
  SOCIETY_ROLE_META,
  TASK_PRIORITY_META,
  TASK_STATUS_META,
  VERIFICATION_STATUS_META,
} from "@/lib/constants";

const MAPS = {
  event: EVENT_STATUS_META,
  competition: COMPETITION_STATUS_META,
  registration: REGISTRATION_STATUS_META,
  certificate: CERTIFICATE_TYPE_META,
  society_role: SOCIETY_ROLE_META,
  recruitment: RECRUITMENT_STATUS_META,
  application: APPLICATION_STATUS_META,
  file: FILE_STATUS_META,
  interview: INTERVIEW_STATUS_META,
  task: TASK_STATUS_META,
  priority: TASK_PRIORITY_META,
  verification: VERIFICATION_STATUS_META,
  position: POSITION_META,
};

export default function StatusBadge({ status, kind = "event", dot = false, className = "" }) {
  const meta = MAPS[kind]?.[status] || { label: status || "—", tone: "slate" };
  return (
    <span className={`badge badge-${meta.tone} ${className}`}>
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
      {meta.label}
    </span>
  );
}
