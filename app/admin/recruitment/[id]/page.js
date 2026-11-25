"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpRight,
  CalendarDays,
  Eye,
  ListChecks,
  Pencil,
  Plus,
  Save,
  Trash2,
  Users,
} from "lucide-react";
import {
  Alert,
  ChipTabs,
  ConsoleHeading,
  DataTable,
  FormField,
  Modal,
  Panel,
  Skeleton,
  StatTile,
  Toggle,
  fetchJson,
  useApi,
} from "@/components/layout/ui";
import StatusBadge from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import {
  APPLICATION_STATUS_META,
  QUESTION_TYPE_META,
  RECRUITMENT_STATUS_META,
} from "@/lib/constants";
import { formatDate, formatDateTime, slugify } from "@/lib/utils";
const CHOICE_TYPES = ["single_choice", "multiple_choice", "dropdown"];

const EMPTY_QUESTION = {
  label: "",
  description: "",
  type: "short_text",
  optionsText: "",
  required: false,
  roundKey: "",
};

function toLocalInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function QuestionPreview({ question, index }) {
  const options = question.options || [];
  return (
    <div className="rounded-xl border border-line bg-white px-3.5 py-3">
      <p className="text-[0.8rem] font-medium text-ink">
        {index + 1}. {question.label}
        {question.required ? <span className="ml-1 text-rose-600">*</span> : null}
      </p>
      {question.description ? <p className="mt-0.5 text-[0.7rem] text-mist">{question.description}</p> : null}
      <div className="mt-2">
        {question.type === "long_text" ? (
          <textarea disabled className="field min-h-[60px] opacity-80" placeholder="Long answer" />
        ) : question.type === "single_choice" || question.type === "yes_no" ? (
          <div className="flex flex-wrap gap-2">
            {(question.type === "yes_no" ? ["Yes", "No"] : options).map((option) => (
              <label key={option} className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[0.72rem] text-mist">
                <input type="radio" disabled className="accent-violet-600" /> {option}
              </label>
            ))}
          </div>
        ) : question.type === "multiple_choice" ? (
          <div className="flex flex-wrap gap-2">
            {options.map((option) => (
              <label key={option} className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[0.72rem] text-mist">
                <input type="checkbox" disabled className="accent-violet-600" /> {option}
              </label>
            ))}
          </div>
        ) : question.type === "dropdown" ? (
          <select disabled className="field">
            <option>Choose an option…</option>
            {options.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        ) : question.type === "rating" ? (
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((value) => (
              <span key={value} className="grid h-7 w-7 place-items-center rounded-lg border border-line text-[0.72rem] text-mist">{value}</span>
            ))}
          </div>
        ) : question.type === "file" ? (
          <div className="rounded-lg border border-dashed border-line px-3 py-3 text-center text-[0.7rem] text-mist">
            File upload
          </div>
        ) : (
          <input disabled className="field opacity-80" placeholder="Short answer" />
        )}
      </div>
    </div>
  );
}

export default function AdminRecruitmentDetailPage() {
  const params = useParams();
  const id = params?.id;
  const { toast } = useToast();

  const recruitmentApi = useApi(id ? `/api/recruitment/${id}` : null);
  const applicationsApi = useApi(id ? `/api/applications?recruitment=${id}&page=1` : null);

  const recruitment = recruitmentApi.data?.item || null;
  const questions = useMemo(
    () => [...(recruitment?.questions || [])].sort((a, b) => (a.order || 0) - (b.order || 0)),
    [recruitment]
  );
  const applications = applicationsApi.data?.items || [];
  const applicationCounts = applicationsApi.data?.counts || {};

  const [tab, setTab] = useState("details");
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [questionOpen, setQuestionOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionForm, setQuestionForm] = useState(EMPTY_QUESTION);
  const [questionSaving, setQuestionSaving] = useState(false);
  const [questionError, setQuestionError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);

  useEffect(() => {
    const item = recruitmentApi.data?.item;
    if (!item) return;
    setForm({
      title: item.title || "",
      description: item.description || "",
      instructions: item.instructions || "",
      status: item.status || "draft",
      opensAt: toLocalInput(item.opensAt),
      closesAt: toLocalInput(item.closesAt),
      maxSocietiesPerStudent: item.maxSocietiesPerStudent || 3,
      rounds: (item.rounds || []).map((round) => ({
        key: round.key || "",
        name: round.name || "",
        opensAt: toLocalInput(round.opensAt),
        closesAt: toLocalInput(round.closesAt),
        isActive: round.isActive !== false,
      })),
    });
  }, [recruitmentApi.data]);

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const saveDetails = async (event) => {
    event.preventDefault();
    if (!form || saving) return;
    setFormError("");
    if (form.opensAt && form.closesAt && new Date(form.closesAt) <= new Date(form.opensAt)) {
      setFormError("Closing date must be after the opening date.");
      return;
    }
    setSaving(true);
    try {
      await fetchJson(`/api/recruitment/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          instructions: form.instructions,
          status: form.status,
          opensAt: new Date(form.opensAt).toISOString(),
          closesAt: new Date(form.closesAt).toISOString(),
          maxSocietiesPerStudent: Number(form.maxSocietiesPerStudent) || 3,
          rounds: form.rounds
            .filter((round) => round.name.trim())
            .map((round) => ({
              key: (round.key || slugify(round.name) || "round").trim(),
              name: round.name.trim(),
              opensAt: round.opensAt ? new Date(round.opensAt).toISOString() : "",
              closesAt: round.closesAt ? new Date(round.closesAt).toISOString() : "",
              isActive: round.isActive !== false,
            })),
        }),
      });
      toast("Recruitment details saved.", "success");
      await recruitmentApi.reload();
    } catch (err) {
      setFormError(err.message || "Could not save the recruitment.");
    } finally {
      setSaving(false);
    }
  };

  const quickStatus = async (nextStatus) => {
    setStatusBusy(true);
    try {
      await fetchJson(`/api/recruitment/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      toast(`Recruitment marked ${nextStatus}.`, "success");
      await recruitmentApi.reload();
    } catch (err) {
      toast(err.message || "Could not update the status.", "error");
    } finally {
      setStatusBusy(false);
    }
  };

  const openQuestion = (question = null) => {
    setEditingQuestion(question);
    setQuestionError("");
    setQuestionForm(
      question
        ? {
            label: question.label || "",
            description: question.description || "",
            type: question.type || "short_text",
            optionsText: (question.options || []).join("\n"),
            required: Boolean(question.required),
            roundKey: question.roundKey || "",
          }
        : { ...EMPTY_QUESTION, roundKey: (recruitment?.rounds || [])[0]?.key || "" }
    );
    setQuestionOpen(true);
  };

  const submitQuestion = async (event) => {
    event.preventDefault();
    if (questionSaving) return;
    setQuestionError("");
    const options = questionForm.optionsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (CHOICE_TYPES.includes(questionForm.type) && options.length < 2) {
      setQuestionError("Choice questions need at least two options (one per line).");
      return;
    }
    setQuestionSaving(true);
    try {
      const payload = {
        label: questionForm.label,
        description: questionForm.description,
        type: questionForm.type,
        options: CHOICE_TYPES.includes(questionForm.type) ? options : [],
        required: questionForm.required,
        roundKey: questionForm.roundKey,
      };
      if (editingQuestion) {
        await fetchJson(`/api/questions/${editingQuestion.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast("Question updated.", "success");
      } else {
        await fetchJson(`/api/recruitment/${id}/questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast("Question added to the form.", "success");
      }
      setQuestionOpen(false);
      await recruitmentApi.reload();
    } catch (err) {
      setQuestionError(err.message || "Could not save the question.");
    } finally {
      setQuestionSaving(false);
    }
  };

  const deleteQuestion = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetchJson(`/api/questions/${deleteTarget.id}`, { method: "DELETE" });
      toast("Question deleted.", "success");
      setDeleteTarget(null);
      await recruitmentApi.reload();
    } catch (err) {
      toast(err.message || "Could not delete the question.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const moveQuestion = async (index, direction) => {
    const next = [...questions];
    const target = index + direction;
    if (target < 0 || target >= next.length || reordering) return;
    [next[index], next[target]] = [next[target], next[index]];
    setReordering(true);
    try {
      await fetchJson(`/api/recruitment/${id}/questions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: next.map((row) => row.id) }),
      });
      await recruitmentApi.reload();
    } catch (err) {
      toast(err.message || "Could not reorder questions.", "error");
    } finally {
      setReordering(false);
    }
  };

  if (recruitmentApi.loading && !recruitment) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (recruitmentApi.error || !recruitment) {
    return (
      <div className="space-y-4">
        <ConsoleHeading eyebrow="Recruitment" title="Recruitment round" description="Could not load this recruitment." />
        <Alert tone="error">{recruitmentApi.error || "Recruitment not found."}</Alert>
        <Link href="/admin/recruitment" className="btn btn-secondary btn-sm">
          <ArrowLeft size={13} /> Back to recruitment
        </Link>
      </div>
    );
  }

  const tabs = [
    { value: "details", label: "Details" },
    { value: "questions", label: `Questionnaire ${questions.length}` },
    { value: "applications", label: `Applications ${applicationsApi.data?.total || 0}` },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link href="/admin/recruitment" className="btn btn-ghost btn-sm">
          <ArrowLeft size={13} /> Recruitment
        </Link>
        <span className="text-mist">/</span>
        <span className="truncate text-[0.78rem] font-medium text-ink">{recruitment.title}</span>
      </div>

      <ConsoleHeading
        eyebrow={recruitment.society?.name || "Recruitment"}
        title={recruitment.title}
        description={
          recruitment.status === "open"
            ? `Open now${recruitment.closesAt ? ` · closes ${formatDate(recruitment.closesAt)}` : ""}. Build the form and review applicants below.`
            : RECRUITMENT_STATUS_META[recruitment.status]?.label || "Recruitment round"
        }
        actions={
          <>
            <StatusBadge status={recruitment.status} kind="recruitment" />
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPreviewOpen(true)}>
              <Eye size={13} /> Preview form
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={statusBusy}
              onClick={() => quickStatus(recruitment.status === "open" ? "closed" : "open")}
            >
              <CalendarDays size={13} /> {recruitment.status === "open" ? "Close round" : "Open round"}
            </button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Questions" value={questions.length} icon="files" hint="On the application form" />
        <StatTile label="Applications" value={applicationsApi.data?.total || 0} icon="applications" tone="blue" hint="Received so far" />
        <StatTile label="Shortlisted" value={applicationCounts.shortlisted || 0} icon="students" tone="emerald" hint="Ready for interview" />
        <StatTile
          label="Interviewing"
          value={applicationCounts.interview_scheduled || 0}
          icon="events"
          tone="amber"
          hint={recruitment.closesAt ? `Closes ${formatDate(recruitment.closesAt)}` : "No closing date"}
        />
      </div>

      <ChipTabs tabs={tabs} value={tab} onChange={setTab} />

      {tab === "details" ? (
        <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
          <Panel title="Round details" description="Applicants see this information on the public recruitment page.">
            {form ? (
              <form onSubmit={saveDetails} className="space-y-4 p-5">
                {formError ? <Alert tone="error">{formError}</Alert> : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label="Title" className="sm:col-span-2">
                    <input className="field" value={form.title} onChange={(e) => setField("title", e.target.value)} required />
                  </FormField>
                  <FormField label="Status">
                    <select className="field" value={form.status} onChange={(e) => setField("status", e.target.value)}>
                      {Object.entries(RECRUITMENT_STATUS_META).map(([key, meta]) => (
                        <option key={key} value={key}>{meta.label}</option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Max societies per student">
                    <input type="number" min="1" max="20" className="field" value={form.maxSocietiesPerStudent} onChange={(e) => setField("maxSocietiesPerStudent", e.target.value)} />
                  </FormField>
                  <FormField label="Opens at">
                    <input type="datetime-local" className="field" value={form.opensAt} onChange={(e) => setField("opensAt", e.target.value)} required />
                  </FormField>
                  <FormField label="Closes at">
                    <input type="datetime-local" className="field" value={form.closesAt} onChange={(e) => setField("closesAt", e.target.value)} required />
                  </FormField>
                  <FormField label="Description" className="sm:col-span-2">
                    <textarea className="field min-h-[84px]" value={form.description} onChange={(e) => setField("description", e.target.value)} />
                  </FormField>
                  <FormField label="Instructions" className="sm:col-span-2">
                    <textarea className="field min-h-[64px]" value={form.instructions} onChange={(e) => setField("instructions", e.target.value)} />
                  </FormField>
                </div>

                <div className="rounded-2xl border border-line bg-ivory/60 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[0.8rem] font-semibold text-ink">Rounds</p>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          rounds: [...current.rounds, { key: "", name: "", opensAt: "", closesAt: "", isActive: true }],
                        }))
                      }
                    >
                      <Plus size={12} /> Add round
                    </button>
                  </div>
                  <div className="mt-2 space-y-2">
                    {form.rounds.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-line px-3 py-3 text-center text-[0.72rem] text-mist">
                        Single-round recruitment.
                      </p>
                    ) : (
                      form.rounds.map((round, index) => (
                        <div key={index} className="rounded-xl border border-line bg-white p-2.5">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <input
                              className="field !py-1.5 text-[0.76rem]"
                              value={round.name}
                              placeholder="Round name"
                              onChange={(event) =>
                                setForm((current) => ({
                                  ...current,
                                  rounds: current.rounds.map((row, i) => (i === index ? { ...row, name: event.target.value } : row)),
                                }))
                              }
                            />
                            <input
                              className="field !py-1.5 text-[0.76rem]"
                              value={round.key}
                              placeholder="Key"
                              onChange={(event) =>
                                setForm((current) => ({
                                  ...current,
                                  rounds: current.rounds.map((row, i) => (i === index ? { ...row, key: event.target.value } : row)),
                                }))
                              }
                            />
                          </div>
                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            <input
                              type="datetime-local"
                              className="field !py-1.5 text-[0.76rem]"
                              value={round.opensAt}
                              onChange={(event) =>
                                setForm((current) => ({
                                  ...current,
                                  rounds: current.rounds.map((row, i) => (i === index ? { ...row, opensAt: event.target.value } : row)),
                                }))
                              }
                            />
                            <input
                              type="datetime-local"
                              className="field !py-1.5 text-[0.76rem]"
                              value={round.closesAt}
                              onChange={(event) =>
                                setForm((current) => ({
                                  ...current,
                                  rounds: current.rounds.map((row, i) => (i === index ? { ...row, closesAt: event.target.value } : row)),
                                }))
                              }
                            />
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <Toggle
                              checked={round.isActive !== false}
                              onChange={(value) =>
                                setForm((current) => ({
                                  ...current,
                                  rounds: current.rounds.map((row, i) => (i === index ? { ...row, isActive: value } : row)),
                                }))
                              }
                              label="Active"
                            />
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm !text-rose-600"
                              onClick={() => setForm((current) => ({ ...current, rounds: current.rounds.filter((_, i) => i !== index) }))}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                    <Save size={13} /> {saving ? "Saving…" : "Save details"}
                  </button>
                </div>
              </form>
            ) : null}
          </Panel>

          <div className="space-y-5">
            <Panel title="At a glance">
              <div className="space-y-3 p-5 text-[0.78rem]">
                <div className="flex items-center justify-between">
                  <span className="text-mist">Society</span>
                  <Link href={`/admin/societies/${recruitment.society?.id || ""}`} className="font-medium text-purple hover:underline">
                    {recruitment.society?.name || "—"}
                  </Link>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-mist">Opens</span>
                  <span className="font-medium text-ink">{formatDateTime(recruitment.opensAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-mist">Closes</span>
                  <span className="font-medium text-ink">{formatDateTime(recruitment.closesAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-mist">Rounds</span>
                  <span className="font-medium text-ink">{(recruitment.rounds || []).length || "Single"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-mist">Max societies / student</span>
                  <span className="font-medium text-ink">{recruitment.maxSocietiesPerStudent || "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-mist">Created</span>
                  <span className="font-medium text-ink">{formatDate(recruitment.createdAt)}</span>
                </div>
              </div>
            </Panel>

            <Panel title="Pipeline" description="Latest application states for this round.">
              <div className="space-y-1.5 p-5">
                {Object.keys(APPLICATION_STATUS_META).filter((key) => applicationCounts[key]).length === 0 ? (
                  <p className="text-[0.76rem] text-mist">No applications yet.</p>
                ) : (
                  Object.entries(applicationCounts).map(([key, count]) => (
                    <div key={key} className="flex items-center justify-between">
                      <StatusBadge status={key} kind="application" />
                      <span className="text-[0.78rem] font-semibold text-ink">{count}</span>
                    </div>
                  ))
                )}
                <Link href={`/admin/applications?recruitment=${id}`} className="btn btn-secondary btn-sm mt-2 w-full justify-center">
                  Open review desk <ArrowUpRight size={12} />
                </Link>
              </div>
            </Panel>

            <button type="button" className="btn btn-ghost btn-sm w-full justify-center !text-rose-600" onClick={() => setArchiveOpen(true)}>
              <Trash2 size={13} /> Archive round
            </button>
          </div>
        </div>
      ) : null}

      {tab === "questions" ? (
        <Panel
          title="Application form"
          description="Questions are shown in order. Reorder, edit or remove them anytime before closing."
          actions={
            <>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPreviewOpen(true)}>
                <Eye size={13} /> Preview
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => openQuestion(null)}>
                <Plus size={13} /> Add question
              </button>
            </>
          }
        >
          <div className="space-y-2.5 p-4">
            {questions.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line px-4 py-10 text-center">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-lavender text-purple">
                  <ListChecks size={17} />
                </span>
                <p className="text-[0.82rem] font-medium text-ink">The form has no questions</p>
                <p className="max-w-sm text-[0.74rem] text-mist">
                  Applicants can still submit, but add at least one question to collect useful information.
                </p>
                <button type="button" className="btn btn-primary btn-sm mt-1" onClick={() => openQuestion(null)}>
                  <Plus size={13} /> Add the first question
                </button>
              </div>
            ) : (
              questions.map((question, index) => (
                <div key={question.id} className="rounded-2xl border border-line bg-white p-3.5">
                  <div className="flex flex-wrap items-start gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-lavender text-[0.7rem] font-bold text-purple">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-[0.84rem] font-semibold text-ink">{question.label}</p>
                        <span className="badge badge-slate">{QUESTION_TYPE_META[question.type]?.label || question.type}</span>
                        {question.required ? <span className="badge badge-rose">Required</span> : null}
                        {question.roundKey ? <span className="badge badge-blue">{question.roundKey}</span> : null}
                        {question.isActive === false ? <span className="badge badge-slate">Hidden</span> : null}
                      </div>
                      {question.description ? <p className="mt-1 text-[0.72rem] text-mist">{question.description}</p> : null}
                      {(question.options || []).length ? (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {question.options.map((option) => (
                            <span key={option} className="rounded-full border border-line bg-ivory px-2 py-0.5 text-[0.66rem] text-mist">
                              {option}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        className="grid h-7 w-7 place-items-center rounded-lg border border-line text-mist transition hover:text-ink disabled:opacity-40"
                        onClick={() => moveQuestion(index, -1)}
                        disabled={index === 0 || reordering}
                        aria-label="Move up"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        type="button"
                        className="grid h-7 w-7 place-items-center rounded-lg border border-line text-mist transition hover:text-ink disabled:opacity-40"
                        onClick={() => moveQuestion(index, 1)}
                        disabled={index === questions.length - 1 || reordering}
                        aria-label="Move down"
                      >
                        <ArrowDown size={13} />
                      </button>
                      <button
                        type="button"
                        className="grid h-7 w-7 place-items-center rounded-lg border border-line text-mist transition hover:text-purple"
                        onClick={() => openQuestion(question)}
                        aria-label="Edit question"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        className="grid h-7 w-7 place-items-center rounded-lg border border-line text-mist transition hover:border-rose-200 hover:text-rose-600"
                        onClick={() => setDeleteTarget(question)}
                        aria-label="Delete question"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>
      ) : null}

      {tab === "applications" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {Object.entries(applicationCounts).length === 0 ? (
                <span className="text-[0.75rem] text-mist">No applications for this round yet.</span>
              ) : (
                Object.entries(applicationCounts).map(([key, count]) => (
                  <span key={key} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1 text-[0.7rem] font-semibold text-ink">
                    <StatusBadge status={key} kind="application" />
                    {count}
                  </span>
                ))
              )}
            </div>
            <Link href={`/admin/applications?recruitment=${id}`} className="btn btn-primary btn-sm ml-auto">
              Review all applications <ArrowUpRight size={13} />
            </Link>
          </div>
          <Panel title="Latest applications" description="The five most recent submissions for this round.">
            <DataTable
              columns={[
                {
                  key: "applicant",
                  label: "Applicant",
                  render: (row) => (
                    <div>
                      <p className="font-semibold text-ink">{row.applicant?.name || "Applicant"}</p>
                      <p className="text-[0.68rem] text-mist">{row.applicant?.matricRollNumber || row.applicant?.email || "—"}</p>
                    </div>
                  ),
                },
                { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} kind="application" /> },
                {
                  key: "applied",
                  label: "Applied",
                  render: (row) => <span className="whitespace-nowrap text-[0.74rem]">{formatDate(row.submittedAt || row.createdAt)}</span>,
                },
                {
                  key: "actions",
                  label: "",
                  className: "text-right",
                  render: (row) => (
                    <Link href={`/admin/applications/${row.id}`} className="btn btn-ghost btn-sm">
                      Review <ArrowUpRight size={12} />
                    </Link>
                  ),
                },
              ]}
              rows={applications.slice(0, 5)}
              loading={applicationsApi.loading}
              error={applicationsApi.error}
              rowKey={(row) => row.id}
              emptyMessage="No applications yet for this round."
            />
          </Panel>
        </div>
      ) : null}

      <Modal
        open={questionOpen}
        onClose={() => (questionSaving ? null : setQuestionOpen(false))}
        title={editingQuestion ? "Edit question" : "Add question"}
        description="All eight question types are supported, including file uploads and ratings."
        wide
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setQuestionOpen(false)} disabled={questionSaving}>
              Cancel
            </button>
            <button type="submit" form="question-form" className="btn btn-primary btn-sm" disabled={questionSaving}>
              {questionSaving ? "Saving…" : editingQuestion ? "Save question" : "Add question"}
            </button>
          </>
        }
      >
        <form id="question-form" onSubmit={submitQuestion} className="space-y-3">
          {questionError ? <Alert tone="error">{questionError}</Alert> : null}
          <FormField label="Question label">
            <input className="field" value={questionForm.label} onChange={(e) => setQuestionForm((c) => ({ ...c, label: e.target.value }))} required />
          </FormField>
          <FormField label="Help text" hint="Optional description shown under the label.">
            <textarea className="field min-h-[54px]" value={questionForm.description} onChange={(e) => setQuestionForm((c) => ({ ...c, description: e.target.value }))} />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Type">
              <select className="field" value={questionForm.type} onChange={(e) => setQuestionForm((c) => ({ ...c, type: e.target.value }))}>
                {Object.entries(QUESTION_TYPE_META).map(([key, meta]) => (
                  <option key={key} value={key}>{meta.label}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Round" hint="Optional. Groups this question under a round.">
              <select className="field" value={questionForm.roundKey} onChange={(e) => setQuestionForm((c) => ({ ...c, roundKey: e.target.value }))}>
                <option value="">All applicants</option>
                {(recruitment.rounds || []).map((round) => (
                  <option key={round.key} value={round.key}>{round.name || round.key}</option>
                ))}
              </select>
            </FormField>
          </div>
          {CHOICE_TYPES.includes(questionForm.type) ? (
            <FormField label="Options" hint="One option per line; at least two required.">
              <textarea
                className="field min-h-[90px]"
                value={questionForm.optionsText}
                onChange={(e) => setQuestionForm((c) => ({ ...c, optionsText: e.target.value }))}
              />
            </FormField>
          ) : (
            <Alert tone="info">This question type does not use options.</Alert>
          )}
          <Toggle
            checked={questionForm.required}
            onChange={(value) => setQuestionForm((c) => ({ ...c, required: value }))}
            label="Required"
            description="Applicants cannot submit without answering."
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => (deleting ? null : setDeleteTarget(null))}
        title="Delete question"
        description={deleteTarget ? `"${deleteTarget.label}" will be removed from the application form.` : ""}
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </button>
            <button type="button" className="btn btn-danger btn-sm" onClick={deleteQuestion} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete question"}
            </button>
          </>
        }
      >
        <Alert tone="warning">Existing applications keep their recorded answers even after the question is deleted.</Alert>
      </Modal>

      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Application form preview"
        description="This is how students see the form. Nothing is submitted from here."
        wide
        footer={
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPreviewOpen(false)}>
            Close preview
          </button>
        }
      >
        <div className="rounded-2xl border border-line bg-ivory/50 p-4">
          <div className="flex items-start gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ backgroundColor: `${recruitment.society?.color || "#6d28d9"}1a`, color: recruitment.society?.color || "#6d28d9" }}>
              <Users size={16} />
            </span>
            <div>
              <p className="text-[0.9rem] font-semibold text-ink">{recruitment.title}</p>
              <p className="text-[0.72rem] text-mist">
                {recruitment.society?.name || "Society"} · closes {formatDate(recruitment.closesAt)}
              </p>
            </div>
          </div>
          {recruitment.instructions ? (
            <p className="mt-3 rounded-xl border border-violet-100 bg-white px-3 py-2 text-[0.74rem] leading-relaxed text-mist">
              {recruitment.instructions}
            </p>
          ) : null}
          <div className="mt-3 space-y-2.5">
            {questions.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line bg-white px-3 py-8 text-center text-[0.76rem] text-mist">
                No questions on this form yet.
              </p>
            ) : (
              questions
                .filter((question) => question.isActive !== false)
                .map((question, index) => <QuestionPreview key={question.id} question={question} index={index} />)
            )}
          </div>
          <div className="mt-4 flex justify-end">
            <span className="btn btn-primary btn-sm opacity-70">Submit application</span>
          </div>
        </div>
      </Modal>

      <Modal
        open={archiveOpen}
        onClose={() => (statusBusy ? null : setArchiveOpen(false))}
        title="Archive recruitment"
        description={recruitment ? `${recruitment.title} will stop appearing publicly. Applications are kept.` : ""}
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setArchiveOpen(false)} disabled={statusBusy}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              disabled={statusBusy}
              onClick={async () => {
                await quickStatus("archived");
                setArchiveOpen(false);
              }}
            >
              {statusBusy ? "Archiving…" : "Archive round"}
            </button>
          </>
        }
      >
        <Alert tone="warning">Students keep their application history but can no longer submit or edit for this round.</Alert>
      </Modal>
    </div>
  );
}
