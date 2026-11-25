"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  ExternalLink,
  FileText,
  MapPin,
  Video,
  X,
} from "lucide-react";
import {
  Alert,
  ConsoleHeading,
  Modal,
  Panel,
  Skeleton,
  fetchJson,
  useApi,
} from "@/components/layout/ui";
import StatusBadge from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { EmptyState, ErrorState, SocietyAvatar, formatBytes } from "@/components/dashboard/common";
import { APPLICATION_STATUS_META } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/utils";

const STAGES = ["draft", "submitted", "pending_review", "under_review", "shortlisted", "interview_scheduled", "accepted"];
const CLOSED = ["rejected", "withdrawn"];

function statusLabel(status) {
  return APPLICATION_STATUS_META[status]?.label || status;
}

function AnswerValue({ answer }) {
  if (answer.files?.length) {
    return (
      <div className="space-y-2">
        {answer.files.map((file) => (
          <a
            key={file.id}
            href={`/api/files/${file.id}/download`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2.5 rounded-xl border border-line bg-lavender/40 px-3 py-2 transition hover:border-violet-200"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-purple">
              <FileText size={14} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.78rem] font-medium text-ink">{file.name}</span>
              <span className="block text-[0.66rem] text-mist">{formatBytes(file.size)}</span>
            </span>
            <StatusBadge status={file.status} kind="file" />
          </a>
        ))}
      </div>
    );
  }
  if (Array.isArray(answer.value)) return <p className="text-[0.82rem] text-ink-2">{answer.value.join(", ")}</p>;
  if (answer.value === null || answer.value === undefined || answer.value === "") {
    return <p className="text-[0.8rem] italic text-mist">No answer provided</p>;
  }
  return <p className="whitespace-pre-wrap text-[0.82rem] leading-relaxed text-ink-2">{String(answer.value)}</p>;
}

export default function ApplicationDetailPage() {
  const params = useParams();
  const id = params?.id;
  const { toast } = useToast();
  const { data, loading, error, reload } = useApi(id ? `/api/applications/${id}` : null, { enabled: Boolean(id) });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const item = data?.item;

  const stage = useMemo(() => {
    if (!item) return { index: -1, reached: new Set() };
    const history = new Set([...(item.statusHistory || []).map((entry) => entry.status), item.status]);
    let index = STAGES.indexOf(item.status);
    if (CLOSED.includes(item.status)) {
      index = Math.max(1, ...STAGES.map((value, position) => (history.has(value) ? position : -1)));
    }
    return { index, reached: history };
  }, [item]);

  const withdraw = async () => {
    setBusy(true);
    try {
      await fetchJson(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "withdraw" }),
      });
      toast("Your application has been withdrawn.", "success", "Application withdrawn");
      setConfirmOpen(false);
      await reload();
    } catch (err) {
      toast(err.message || "Could not withdraw this application.", "error");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-36" />
        <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <Skeleton className="h-96" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <Panel>
        <ErrorState message={error || "Application not found."} onRetry={reload} />
        <div className="pb-6 text-center">
          <Link href="/dashboard/applications" className="btn btn-ghost btn-sm">
            <ArrowLeft size={13} /> Back to applications
          </Link>
        </div>
      </Panel>
    );
  }

  const canWithdraw = !["accepted", "rejected", "withdrawn"].includes(item.status);
  const history = [...(item.statusHistory || [])].sort((a, b) => new Date(a.at) - new Date(b.at));

  return (
    <>
      <div className="mb-3">
        <Link href="/dashboard/applications" className="inline-flex items-center gap-1.5 text-[0.74rem] font-medium text-purple hover:text-blue">
          <ArrowLeft size={13} /> All applications
        </Link>
      </div>

      <ConsoleHeading
        eyebrow={item.society?.name || "Society recruitment"}
        title={item.recruitment?.title || "Application"}
        description={`Applied ${formatDate(item.submittedAt || item.createdAt)}${item.recruitment?.status ? ` · recruitment ${item.recruitment.status}` : ""}`}
        actions={
          <>
            <StatusBadge status={item.status} kind="application" />
            {canWithdraw ? (
              <button type="button" className="btn btn-danger btn-sm" onClick={() => setConfirmOpen(true)}>
                Withdraw application
              </button>
            ) : null}
          </>
        }
      />

      {item.status === "rejected" ? (
        <div className="mb-5">
          <Alert tone="error">
            This application was not successful. {item.reviewNotes ? item.reviewNotes : "Contact the society for feedback."}
          </Alert>
        </div>
      ) : null}
      {item.status === "withdrawn" ? (
        <div className="mb-5">
          <Alert tone="warning">You withdrew this application. It is kept here for your records.</Alert>
        </div>
      ) : null}
      {item.status === "accepted" ? (
        <div className="mb-5">
          <Alert tone="success">Congratulations — you have been accepted. Welcome to {item.society?.name || "the society"}!</Alert>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          <Panel title="Application progress" description="Every stage your application has moved through.">
            <div className="px-5 py-4">
              <ol className="space-y-0">
                {STAGES.map((value, index) => {
                  const reached = index <= stage.index || stage.reached.has(value);
                  const current = item.status === value;
                  return (
                    <li key={value} className="relative flex gap-3 pb-5 last:pb-0">
                      {index < STAGES.length - 1 ? (
                        <span className={`absolute left-[13px] top-7 h-[calc(100%-1.25rem)] w-0.5 ${reached && index < stage.index ? "bg-violet-300" : "bg-line"}`} />
                      ) : null}
                      <span
                        className={`relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[0.62rem] font-bold ${
                          current
                            ? "border-violet-300 bg-gradient-to-br from-violet-600 to-blue-600 text-white"
                            : reached
                              ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                              : "border-line bg-white text-mist"
                        }`}
                      >
                        {reached && !current ? <Check size={12} /> : index + 1}
                      </span>
                      <div className="min-w-0 pt-0.5">
                        <p className={`text-[0.82rem] font-medium ${current ? "text-purple" : reached ? "text-ink" : "text-mist"}`}>
                          {statusLabel(value)}
                        </p>
                        {current ? <p className="text-[0.68rem] text-mist">Current stage</p> : null}
                      </div>
                    </li>
                  );
                })}
              </ol>

              {CLOSED.includes(item.status) ? (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-line bg-lavender/50 px-3 py-2.5">
                  <X size={14} className={item.status === "rejected" ? "text-rose-500" : "text-mist"} />
                  <span className="text-[0.78rem] font-medium text-ink">Closed as {statusLabel(item.status).toLowerCase()}</span>
                </div>
              ) : null}
            </div>
          </Panel>

          <Panel title="Your answers" description="Responses submitted with this application.">
            {item.answers?.length ? (
              <div className="divide-y divide-line">
                {item.answers.map((answer, index) => (
                  <div key={`${answer.questionId}-${index}`} className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[0.76rem] font-semibold text-ink">{answer.label}</p>
                      <span className="chip capitalize">{String(answer.type || "").replace(/_/g, " ")}</span>
                    </div>
                    <div className="mt-2">
                      <AnswerValue answer={answer} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={FileText} title="No answers recorded" description="This application was submitted without questions." />
            )}
          </Panel>

          {history.length ? (
            <Panel title="Status history" description="A dated audit trail of this application.">
              <ol className="space-y-4 px-5 py-4">
                {history.map((entry, index) => (
                  <li key={`${entry.status}-${index}`} className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-violet-400" />
                    <div className="min-w-0">
                      <p className="text-[0.8rem] font-medium text-ink">{statusLabel(entry.status)}</p>
                      <p className="text-[0.68rem] text-mist">
                        {entry.at ? formatDateTime(entry.at) : "—"}
                        {entry.byName ? ` · ${entry.byName}` : ""}
                      </p>
                      {entry.note ? <p className="mt-1 text-[0.74rem] leading-relaxed text-ink-2">{entry.note}</p> : null}
                    </div>
                  </li>
                ))}
              </ol>
            </Panel>
          ) : null}
        </div>

        <div className="space-y-5">
          <Panel title="Recruitment">
            <div className="space-y-4 p-5">
              <div className="flex items-center gap-3">
                <SocietyAvatar society={item.society} />
                <div className="min-w-0">
                  <p className="truncate text-[0.86rem] font-semibold text-ink">{item.society?.name || "Society"}</p>
                  {item.society?.slug ? (
                    <Link href={`/societies/${item.society.slug}`} className="inline-flex items-center gap-1 text-[0.7rem] font-medium text-purple hover:text-blue">
                      Visit society <ExternalLink size={11} />
                    </Link>
                  ) : null}
                </div>
              </div>
              <dl className="space-y-2.5 border-t border-line pt-3 text-[0.76rem]">
                <div className="flex justify-between gap-3">
                  <dt className="text-mist">Applied</dt>
                  <dd className="text-right font-medium text-ink">{formatDate(item.submittedAt || item.createdAt)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-mist">Recruitment</dt>
                  <dd className="text-right font-medium capitalize text-ink">{item.recruitment?.status || "—"}</dd>
                </div>
                {item.recruitment?.closesAt ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-mist">Closed</dt>
                    <dd className="text-right font-medium text-ink">{formatDate(item.recruitment.closesAt)}</dd>
                  </div>
                ) : null}
                {item.roundKey ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-mist">Round</dt>
                    <dd className="text-right font-medium text-ink">{item.roundKey}</dd>
                  </div>
                ) : null}
              </dl>
              {item.reviewNotes ? (
                <div className="rounded-xl bg-lavender px-3 py-2.5 text-[0.74rem] leading-relaxed text-ink-2">
                  <span className="font-semibold text-ink">Reviewer notes: </span>
                  {item.reviewNotes}
                </div>
              ) : null}
            </div>
          </Panel>

          <Panel title="Interview">
            {item.interview ? (
              <div className="space-y-3 p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[0.8rem] font-medium text-ink">
                    <CalendarClock size={14} className="text-purple" /> {formatDateTime(item.interview.scheduledAt)}
                  </span>
                  <StatusBadge status={item.interview.status} kind="interview" />
                </div>
                <p className="flex items-center gap-1.5 text-[0.76rem] text-mist">
                  <MapPin size={13} /> {item.interview.location || "Location to be announced"}
                </p>
                <p className="text-[0.72rem] capitalize text-mist">Mode: {String(item.interview.mode || "").replace(/_/g, " ")}</p>
                {item.interview.meetingLink ? (
                  <a href={item.interview.meetingLink} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm w-full">
                    <Video size={13} /> Join meeting
                  </a>
                ) : null}
                {item.interview.panel?.length ? (
                  <p className="text-[0.72rem] leading-relaxed text-mist">Panel: {item.interview.panel.join(", ")}</p>
                ) : null}
                {item.interview.feedback ? (
                  <p className="rounded-xl bg-lavender px-3 py-2 text-[0.74rem] leading-relaxed text-ink-2">{item.interview.feedback}</p>
                ) : null}
              </div>
            ) : (
              <EmptyState
                icon={CalendarClock}
                title="No interview yet"
                description="If you are shortlisted, the society will schedule an interview and it will appear here."
                className="py-9"
              />
            )}
          </Panel>
        </div>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => (busy ? null : setConfirmOpen(false))}
        title="Withdraw this application?"
        description={item.recruitment?.title}
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmOpen(false)} disabled={busy}>
              Keep application
            </button>
            <button type="button" className="btn btn-danger btn-sm" onClick={withdraw} disabled={busy}>
              {busy ? "Withdrawing…" : "Withdraw"}
            </button>
          </>
        }
      >
        <p className="text-[0.82rem] leading-relaxed text-mist">
          The society will no longer consider this application. You can only withdraw before a final decision is made.
        </p>
      </Modal>
    </>
  );
}
