"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  Download,
  FileText,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Save,
  Star,
  Video,
  XCircle,
} from "lucide-react";
import {
  Alert,
  ConsoleHeading,
  FormField,
  Modal,
  Panel,
  Skeleton,
  fetchJson,
  useApi,
} from "@/components/layout/ui";
import StatusBadge from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { APPLICATION_STATUS_META } from "@/lib/constants";
import { cn, formatDate, formatDateTime, initials } from "@/lib/utils";

const MODES = { on_campus: "On campus", online: "Online" };
const CHOICE_TYPES = ["single_choice", "multiple_choice", "dropdown", "yes_no"];

function toLocalInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fileSize(bytes) {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AnswerValue({ answer }) {
  if (answer.files?.length) {
    return (
      <div className="mt-1.5 space-y-1.5">
        {answer.files.map((file) => (
          <div key={file.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-ivory/60 px-2.5 py-2">
            <FileText size={14} className="shrink-0 text-purple" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.76rem] font-medium text-ink">{file.name}</p>
              <p className="text-[0.64rem] text-mist">{fileSize(file.size)} · {file.mimeType}</p>
            </div>
            <StatusBadge status={file.status} kind="file" />
            <a
              href={`/api/files/${file.id}/download`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary btn-sm"
            >
              <Download size={12} /> Download
            </a>
          </div>
        ))}
      </div>
    );
  }
  if (answer.value === undefined || answer.value === null || answer.value === "") {
    return <p className="mt-1 text-[0.78rem] italic text-mist">No answer recorded.</p>;
  }
  if (Array.isArray(answer.value)) {
    return <p className="mt-1 text-[0.82rem] leading-relaxed text-ink">{answer.value.join(", ")}</p>;
  }
  if (answer.type === "rating") {
    return (
      <div className="mt-1 flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star
            key={index}
            size={14}
            className={index < Number(answer.value) ? "fill-amber-400 text-amber-500" : "text-line"}
          />
        ))}
        <span className="ml-1 text-[0.72rem] text-mist">{answer.value} / 5</span>
      </div>
    );
  }
  if (CHOICE_TYPES.includes(answer.type)) {
    return <span className="mt-1 inline-block rounded-full border border-line bg-lavender/60 px-2.5 py-1 text-[0.76rem] text-ink">{String(answer.value)}</span>;
  }
  return <p className="mt-1 whitespace-pre-wrap text-[0.82rem] leading-relaxed text-ink">{String(answer.value)}</p>;
}

export default function AdminApplicationDetailPage() {
  const params = useParams();
  const id = params?.id;
  const { toast } = useToast();

  const applicationApi = useApi(id ? `/api/applications/${id}` : null);
  const item = applicationApi.data?.item;

  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [statusBusy, setStatusBusy] = useState("");
  const [decision, setDecision] = useState(null);

  const [interviewForm, setInterviewForm] = useState({
    scheduledAt: "",
    mode: "on_campus",
    location: "",
    meetingLink: "",
    panel: "",
    feedback: "",
    score: "",
  });
  const [savingInterview, setSavingInterview] = useState(false);
  const [interviewError, setInterviewError] = useState("");
  const [outcomeBusy, setOutcomeBusy] = useState("");

  useEffect(() => {
    if (!item) return;
    setNotes(item.reviewNotes || "");
    const interview = item.interview;
    setInterviewForm({
      scheduledAt: toLocalInput(interview?.scheduledAt),
      mode: interview?.mode || "on_campus",
      location: interview?.location || "",
      meetingLink: interview?.meetingLink || "",
      panel: (interview?.panel || []).join("\n"),
      feedback: interview?.feedback || "",
      score: interview?.score == null ? "" : String(interview.score),
    });
  }, [item]);

  const setInterviewField = (key, value) =>
    setInterviewForm((current) => ({ ...current, [key]: value }));

  const updateStatus = async (nextStatus) => {
    setStatusBusy(nextStatus);
    try {
      await fetchJson(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      toast(`Application moved to ${APPLICATION_STATUS_META[nextStatus]?.label || nextStatus}.`, "success");
      setDecision(null);
      await applicationApi.reload();
    } catch (err) {
      toast(err.message || "Could not update the application.", "error");
    } finally {
      setStatusBusy("");
    }
  };

  const saveNotes = async () => {
    setSavingNotes(true);
    try {
      await fetchJson(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewNotes: notes }),
      });
      toast("Private review notes saved.", "success");
      await applicationApi.reload();
    } catch (err) {
      toast(err.message || "Could not save notes.", "error");
    } finally {
      setSavingNotes(false);
    }
  };

  const saveInterview = async (event) => {
    event.preventDefault();
    if (savingInterview) return;
    if (!interviewForm.scheduledAt) {
      setInterviewError("Choose the interview date and time.");
      return;
    }
    setInterviewError("");
    setSavingInterview(true);
    try {
      await fetchJson(`/api/applications/${id}/interview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt: new Date(interviewForm.scheduledAt).toISOString(),
          mode: interviewForm.mode,
          location: interviewForm.location,
          meetingLink: interviewForm.meetingLink,
          panel: interviewForm.panel,
          feedback: interviewForm.feedback,
          score: interviewForm.score === "" ? null : Number(interviewForm.score),
        }),
      });
      toast("Interview saved and the student notified.", "success");
      await applicationApi.reload();
    } catch (err) {
      setInterviewError(err.message || "Could not schedule the interview.");
    } finally {
      setSavingInterview(false);
    }
  };

  const updateInterviewOutcome = async (status) => {
    setOutcomeBusy(status);
    try {
      await fetchJson(`/api/applications/${id}/interview`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      toast(`Interview marked ${status.replace("_", " ")}.`, "success");
      await applicationApi.reload();
    } catch (err) {
      toast(err.message || "Could not update the interview.", "error");
    } finally {
      setOutcomeBusy("");
    }
  };

  const stats = useMemo(() => {
    if (!item) return null;
    return {
      answered: (item.answers || []).length,
      files: (item.answers || []).reduce((sum, answer) => sum + (answer.files?.length || 0), 0),
      history: (item.statusHistory || []).length,
    };
  }, [item]);

  if (applicationApi.loading && !item) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (applicationApi.error || !item) {
    return (
      <div className="space-y-4">
        <ConsoleHeading eyebrow="Applications" title="Application" description="Could not load this application." />
        <Alert tone="error">{applicationApi.error || "Application not found."}</Alert>
        <Link href="/admin/applications" className="btn btn-secondary btn-sm">
          <ArrowLeft size={13} /> Back to applications
        </Link>
      </div>
    );
  }

  const applicant = item.applicant || {};
  const interview = item.interview;

  const quickActions = [
    { status: "under_review", label: "Under review" },
    { status: "shortlisted", label: "Shortlist" },
  ].filter((action) => item.status !== action.status);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link href="/admin/applications" className="btn btn-ghost btn-sm">
          <ArrowLeft size={13} /> Applications
        </Link>
        <span className="text-mist">/</span>
        <span className="truncate text-[0.78rem] font-medium text-ink">{applicant.name || "Applicant"}</span>
      </div>

      <ConsoleHeading
        eyebrow={`${item.society?.name || "Society"} · ${item.recruitment?.title || "Recruitment"}`}
        title={applicant.name || "Applicant"}
        description={`Applied ${formatDateTime(item.submittedAt || item.createdAt)} · round ${item.roundKey || "default"}`}
        actions={
          <>
            <StatusBadge status={item.status} kind="application" />
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => applicationApi.reload()}>
              <RefreshCw size={13} /> Refresh
            </button>
            {quickActions.map((action) => (
              <button
                key={action.status}
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={Boolean(statusBusy)}
                onClick={() => updateStatus(action.status)}
              >
                {statusBusy === action.status ? "Saving…" : action.label}
              </button>
            ))}
            {item.status !== "accepted" ? (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setDecision({ status: "accepted", label: "Accept applicant" })}
              >
                <CheckCircle2 size={13} /> Accept
              </button>
            ) : null}
            {item.status !== "rejected" ? (
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => setDecision({ status: "rejected", label: "Reject applicant" })}
              >
                <XCircle size={13} /> Reject
              </button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <div className="space-y-5">
          <Panel title="Applicant" description="Academic profile recorded at application time.">
            <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
              {applicant.avatar ? (
                <img loading="lazy" decoding="async" src={applicant.avatar} alt="" className="h-14 w-14 rounded-2xl border border-line object-cover" />
              ) : (
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-lavender text-[1rem] font-bold text-purple">
                  {initials(applicant.name || "")}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-[0.98rem] font-semibold text-ink">{applicant.name || "Applicant"}</p>
                  <StatusBadge status={applicant.verificationStatus || "unverified"} kind="verification" />
                </div>
                <p className="mt-0.5 truncate text-[0.76rem] text-mist">{applicant.email || "No email"}</p>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[0.72rem] text-mist">
                  <span className="inline-flex items-center gap-1"><Phone size={12} /> {applicant.phone || "No phone"}</span>
                  <span className="inline-flex items-center gap-1"><Mail size={12} /> {applicant.email || "—"}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-px border-t border-line bg-line sm:grid-cols-4">
              {[
                { label: "Matric roll", value: applicant.matricRollNumber || "—" },
                { label: "Matric %", value: applicant.matricPercentage != null ? `${applicant.matricPercentage}%` : "—" },
                { label: "Class", value: applicant.classYear || "—" },
                { label: "Department", value: applicant.department || "—" },
              ].map((fact) => (
                <div key={fact.label} className="bg-white px-4 py-3">
                  <p className="text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-mist">{fact.label}</p>
                  <p className="mt-0.5 truncate text-[0.8rem] font-semibold text-ink">{fact.value}</p>
                </div>
              ))}
            </div>
            {applicant.section ? (
              <p className="border-t border-line px-5 py-2 text-[0.7rem] text-mist">Section {applicant.section}</p>
            ) : null}
          </Panel>

          <Panel title="Application answers" description="Responses exactly as submitted, with attached documents.">
            <div className="divide-y divide-line">
              {(item.answers || []).length === 0 ? (
                <p className="px-5 py-8 text-center text-[0.8rem] text-mist">No answers recorded on this application.</p>
              ) : (
                item.answers.map((answer, index) => (
                  <div key={`${answer.questionId}-${index}`} className="px-5 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[0.8rem] font-semibold text-ink">
                        {index + 1}. {answer.label}
                      </p>
                      <span className="badge badge-slate shrink-0">{answer.type?.replace("_", " ")}</span>
                    </div>
                    <AnswerValue answer={answer} />
                  </div>
                ))
              )}
            </div>
          </Panel>

          <Panel title="Review history" description="Every status change recorded on this application.">
            <ol className="space-y-0 px-5 py-2">
              {(item.statusHistory || []).length === 0 ? (
                <p className="py-6 text-center text-[0.76rem] text-mist">No history yet.</p>
              ) : (
                [...(item.statusHistory || [])].reverse().map((entry, index) => (
                  <li key={`${entry.at}-${index}`} className="relative flex gap-3 border-b border-line py-3 last:border-0">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-purple" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={entry.status} kind="application" />
                        <span className="text-[0.68rem] text-mist">{formatDateTime(entry.at)}</span>
                        {entry.byName ? <span className="text-[0.68rem] text-mist">by {entry.byName}</span> : null}
                      </div>
                      {entry.note ? <p className="mt-1 text-[0.74rem] leading-relaxed text-mist">{entry.note}</p> : null}
                    </div>
                  </li>
                ))
              )}
            </ol>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Society & recruitment">
            <div className="space-y-3 p-5">
              <div className="flex items-center gap-2.5">
                <span
                  className="grid h-10 w-10 place-items-center rounded-xl text-[0.75rem] font-bold text-white"
                  style={{ backgroundColor: item.society?.color || "#6d28d9" }}
                >
                  {initials(item.society?.name || "S")}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[0.84rem] font-semibold text-ink">{item.society?.name || "Society"}</p>
                  <p className="truncate text-[0.68rem] text-mist">{item.society?.category || "Campus society"}</p>
                </div>
              </div>
              <div className="rounded-xl border border-line bg-ivory/60 px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[0.78rem] font-medium text-ink">{item.recruitment?.title || "Recruitment"}</p>
                  <StatusBadge status={item.recruitment?.status || "draft"} kind="recruitment" />
                </div>
                <p className="mt-0.5 text-[0.68rem] text-mist">
                  {item.recruitment?.opensAt ? `${formatDate(item.recruitment.opensAt)} – ${formatDate(item.recruitment.closesAt)}` : "No window recorded"}
                </p>
              </div>
              {item.recruitment?.instructions ? (
                <p className="text-[0.72rem] leading-relaxed text-mist">{item.recruitment.instructions}</p>
              ) : null}
              <div className="flex flex-wrap gap-1.5">
                {item.society?.slug ? (
                  <a href={`/societies/${item.society.slug}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                    Society page <ArrowUpRight size={12} />
                  </a>
                ) : null}
                {item.recruitment?.id ? (
                  <Link href={`/admin/recruitment/${item.recruitment.id}`} className="btn btn-ghost btn-sm">
                    Recruitment <ArrowUpRight size={12} />
                  </Link>
                ) : null}
              </div>
            </div>
          </Panel>

          <Panel title="Private review notes" description="Only admins can see this.">
            <div className="space-y-2 p-5">
              <textarea
                className="field min-h-[90px]"
                maxLength={2000}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Screening impressions, strengths, concerns…"
              />
              <div className="flex items-center justify-between">
                <span className="text-[0.66rem] text-mist">{notes.length} / 2000</span>
                <button type="button" className="btn btn-secondary btn-sm" onClick={saveNotes} disabled={savingNotes}>
                  <Save size={12} /> {savingNotes ? "Saving…" : "Save notes"}
                </button>
              </div>
            </div>
          </Panel>

          <Panel
            title="Interview"
            description={interview ? "Manage the scheduled interview and outcome." : "Schedule an interview for this applicant."}
          >
            <div className="space-y-3 p-5">
              {interview ? (
                <div className="rounded-xl border border-line bg-ivory/60 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <StatusBadge status={interview.status} kind="interview" />
                    <span className="text-[0.7rem] text-mist">{formatDateTime(interview.scheduledAt)}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[0.7rem] text-mist">
                    <span className="inline-flex items-center gap-1">
                      {interview.mode === "online" ? <Video size={12} /> : <MapPin size={12} />}
                      {MODES[interview.mode] || interview.mode}
                      {interview.mode === "online" ? ` · ${interview.meetingLink || "No link"}` : ` · ${interview.location || "No venue"}`}
                    </span>
                    {interview.score != null ? <span>Score {interview.score}/100</span> : null}
                  </div>
                  {interview.feedback ? <p className="mt-1.5 text-[0.72rem] leading-relaxed text-mist">{interview.feedback}</p> : null}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {["completed", "no_show", "cancelled"].map((outcome) => (
                      <button
                        key={outcome}
                        type="button"
                        className={cn("btn btn-sm", outcome === "completed" ? "btn-secondary" : "btn-ghost", outcome !== "completed" && "!text-rose-600")}
                        disabled={Boolean(outcomeBusy) || interview.status === outcome}
                        onClick={() => updateInterviewOutcome(outcome)}
                      >
                        {outcomeBusy === outcome
                          ? "Saving…"
                          : outcome === "completed"
                            ? "Mark completed"
                            : outcome === "no_show"
                              ? "No show"
                              : "Cancel interview"}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <form onSubmit={saveInterview} className="space-y-2.5">
                {interviewError ? <Alert tone="error">{interviewError}</Alert> : null}
                <FormField label="Date & time">
                  <input
                    type="datetime-local"
                    className="field !py-2 text-[0.78rem]"
                    value={interviewForm.scheduledAt}
                    onChange={(e) => setInterviewField("scheduledAt", e.target.value)}
                    required
                  />
                </FormField>
                <FormField label="Mode">
                  <select
                    className="field !py-2 text-[0.78rem]"
                    value={interviewForm.mode}
                    onChange={(e) => setInterviewField("mode", e.target.value)}
                  >
                    <option value="on_campus">On campus</option>
                    <option value="online">Online</option>
                  </select>
                </FormField>
                {interviewForm.mode === "online" ? (
                  <FormField label="Meeting link">
                    <input
                      className="field !py-2 text-[0.78rem]"
                      value={interviewForm.meetingLink}
                      onChange={(e) => setInterviewField("meetingLink", e.target.value)}
                      placeholder="https://meet.google.com/…"
                    />
                  </FormField>
                ) : (
                  <FormField label="Location">
                    <input
                      className="field !py-2 text-[0.78rem]"
                      value={interviewForm.location}
                      onChange={(e) => setInterviewField("location", e.target.value)}
                      placeholder="Room 12, main block"
                    />
                  </FormField>
                )}
                <FormField label="Panel" hint="One name per line.">
                  <textarea
                    className="field min-h-[48px] text-[0.78rem]"
                    value={interviewForm.panel}
                    onChange={(e) => setInterviewField("panel", e.target.value)}
                  />
                </FormField>
                <FormField label="Feedback">
                  <textarea
                    className="field min-h-[48px] text-[0.78rem]"
                    value={interviewForm.feedback}
                    onChange={(e) => setInterviewField("feedback", e.target.value)}
                  />
                </FormField>
                <FormField label="Score (0–100)">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="field !py-2 text-[0.78rem]"
                    value={interviewForm.score}
                    onChange={(e) => setInterviewField("score", e.target.value)}
                    placeholder="Optional"
                  />
                </FormField>
                <button type="submit" className="btn btn-primary btn-sm w-full justify-center" disabled={savingInterview}>
                  <CalendarClock size={13} /> {savingInterview ? "Saving…" : interview ? "Update interview" : "Schedule interview"}
                </button>
              </form>
            </div>
          </Panel>

          <Panel title="At a glance">
            <div className="grid grid-cols-3 gap-px bg-line">
              <div className="bg-white px-3 py-3 text-center">
                <p className="text-lg font-bold text-ink">{stats?.answered || 0}</p>
                <p className="text-[0.62rem] uppercase tracking-wide text-mist">Answers</p>
              </div>
              <div className="bg-white px-3 py-3 text-center">
                <p className="text-lg font-bold text-ink">{stats?.files || 0}</p>
                <p className="text-[0.62rem] uppercase tracking-wide text-mist">Files</p>
              </div>
              <div className="bg-white px-3 py-3 text-center">
                <p className="text-lg font-bold text-ink">{stats?.history || 0}</p>
                <p className="text-[0.62rem] uppercase tracking-wide text-mist">Events</p>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <Modal
        open={Boolean(decision)}
        onClose={() => (statusBusy ? null : setDecision(null))}
        title={decision?.status === "accepted" ? "Accept applicant" : "Reject applicant"}
        description={
          decision?.status === "accepted"
            ? "The student becomes an active society member and receives joining points."
            : "The student is notified with the review note, if any."
        }
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDecision(null)} disabled={Boolean(statusBusy)}>
              Cancel
            </button>
            <button
              type="button"
              className={decision?.status === "accepted" ? "btn btn-primary btn-sm" : "btn btn-danger btn-sm"}
              disabled={Boolean(statusBusy)}
              onClick={() => updateStatus(decision.status)}
            >
              {statusBusy ? "Saving…" : decision?.label}
            </button>
          </>
        }
      >
        {decision?.status === "accepted" ? (
          <Alert tone="info">
            <span className="inline-flex items-center gap-1.5">
              <GraduationCap size={14} /> Membership is created automatically if the student is not already a member.
            </span>
          </Alert>
        ) : (
          <Alert tone="warning">Rejection is final for this round, though the application history stays visible.</Alert>
        )}
      </Modal>
    </div>
  );
}
