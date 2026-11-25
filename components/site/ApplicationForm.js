"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileUp, Loader2, Save, Send } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import StatusBadge from "@/components/ui/StatusBadge";

export default function ApplicationForm({ recruitment, questions, isAuthed, verified, myApplication }) {
  const router = useRouter();
  const { toast } = useToast();
  const [answers, setAnswers] = useState({});
  const [files, setFiles] = useState({});
  const [uploading, setUploading] = useState({});
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");

  const setAnswer = (questionId, value) => setAnswers((current) => ({ ...current, [questionId]: value }));

  const uploadFile = async (questionId, file) => {
    if (!file) return;
    setUploading((current) => ({ ...current, [questionId]: true }));
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", "application");
      form.append("questionId", questionId);
      const res = await fetch("/api/uploads", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Upload failed.", "error");
        return;
      }
      setFiles((current) => ({ ...current, [questionId]: data.item }));
      toast("File uploaded.", "success");
    } catch {
      toast("Upload failed. Please try again.", "error");
    } finally {
      setUploading((current) => ({ ...current, [questionId]: false }));
    }
  };

  const submit = async (shouldSubmit) => {
    setError("");
    if (shouldSubmit) {
      for (const question of questions) {
        if (!question.required) continue;
        if (question.type === "file" && !files[question.id]) {
          setError(`Attach a file for “${question.label}”.`);
          return;
        }
        const value = answers[question.id];
        if (question.type !== "file" && (value === undefined || value === "" || (Array.isArray(value) && !value.length))) {
          setError(`Answer “${question.label}” to continue.`);
          return;
        }
      }
    }
    setLoading(shouldSubmit ? "submit" : "draft");
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recruitmentId: recruitment.id,
          submit: shouldSubmit,
          answers: questions.map((question) => ({
            questionId: question.id,
            value: question.type === "file" ? "" : answers[question.id] ?? "",
            fileIds: files[question.id] ? [files[question.id].id] : [],
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save your application.");
        return;
      }
      toast(shouldSubmit ? "Application submitted." : "Draft saved.", "success", shouldSubmit ? "Good luck!" : "Saved");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading("");
    }
  };

  if (myApplication) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-emerald/30 bg-emerald/5 px-4 py-3.5">
          <p className="flex items-center gap-1.5 text-[0.72rem] font-bold uppercase tracking-[0.12em] text-emerald">
            <CheckCircle2 size={14} /> Application on file
          </p>
          <p className="mt-1.5 flex items-center gap-2 text-[0.82rem] text-ink-2">
            Current status <StatusBadge status={myApplication.status} kind="application" />
          </p>
        </div>
        {myApplication.statusHistory?.length ? (
          <div className="rounded-xl border border-line p-4">
            <p className="text-[0.64rem] font-bold uppercase tracking-[0.14em] text-mist">History</p>
            <div className="mt-2.5 space-y-2">
              {myApplication.statusHistory.map((entry, index) => (
                <div key={index} className="flex items-start gap-2.5">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-purple" />
                  <div>
                    <p className="text-[0.78rem] font-semibold capitalize text-ink">{entry.status.replace(/_/g, " ")}</p>
                    {entry.note ? <p className="text-[0.72rem] text-mist">{entry.note}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <Link href="/dashboard/applications" className="btn btn-secondary btn-sm w-full">
          Open applications dashboard
        </Link>
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div className="space-y-3">
        <Link href={`/login?next=/recruitment/${recruitment.id}`} className="btn btn-primary w-full">
          Sign in to apply
        </Link>
        <p className="text-center text-[0.72rem] text-mist">Verify your student account to submit applications.</p>
      </div>
    );
  }

  if (!verified) {
    return (
      <p className="rounded-xl bg-amber/10 px-3.5 py-3 text-center text-[0.76rem] text-amber">
        Your account must be verified by the campus office before you can apply.
      </p>
    );
  }

  if (!recruitment.isOpen) {
    return (
      <p className="rounded-xl bg-lavender px-4 py-3 text-center text-[0.8rem] font-semibold text-mist">
        Applications are closed for this recruitment.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {questions.map((question, index) => (
        <div key={question.id} className="rounded-xl border border-line p-4">
          <label className="block text-[0.82rem] font-semibold text-ink">
            {index + 1}. {question.label}
            {question.required ? <span className="ml-0.5 text-rose">*</span> : null}
          </label>
          {question.helpText ? <p className="mt-0.5 text-[0.72rem] text-mist">{question.helpText}</p> : null}

          <div className="mt-2.5">
            {question.type === "short_text" ? (
              <input className="field" value={answers[question.id] || ""} onChange={(event) => setAnswer(question.id, event.target.value)} placeholder="Your answer" />
            ) : question.type === "long_text" ? (
              <textarea className="field min-h-[96px]" value={answers[question.id] || ""} onChange={(event) => setAnswer(question.id, event.target.value)} placeholder="Write your answer" />
            ) : question.type === "dropdown" ? (
              <select className="field" value={answers[question.id] || ""} onChange={(event) => setAnswer(question.id, event.target.value)}>
                <option value="">Select an option</option>
                {question.options.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            ) : question.type === "single_choice" ? (
              <div className="flex flex-wrap gap-2">
                {question.options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setAnswer(question.id, option)}
                    className={`chip ${answers[question.id] === option ? "bg-purple text-white" : ""}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : question.type === "multiple_choice" ? (
              <div className="flex flex-wrap gap-2">
                {question.options.map((option) => {
                  const list = Array.isArray(answers[question.id]) ? answers[question.id] : [];
                  const active = list.includes(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setAnswer(question.id, active ? list.filter((item) => item !== option) : [...list, option])}
                      className={`chip ${active ? "bg-purple text-white" : ""}`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            ) : question.type === "yes_no" ? (
              <div className="flex gap-2">
                {["Yes", "No"].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setAnswer(question.id, option)}
                    className={`chip ${answers[question.id] === option ? "bg-purple text-white" : ""}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : question.type === "rating" ? (
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAnswer(question.id, value)}
                    className={`grid h-9 w-9 place-items-center rounded-lg border text-[0.8rem] font-semibold transition ${
                      Number(answers[question.id]) === value
                        ? "border-purple bg-purple text-white"
                        : "border-line bg-white text-ink-2 hover:border-purple/50"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            ) : question.type === "file" ? (
              <div>
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-purple/40 bg-lavender/50 px-3.5 py-3 text-[0.78rem] font-semibold text-purple">
                  {uploading[question.id] ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
                  {files[question.id] ? files[question.id].name : uploading[question.id] ? "Uploading…" : "Choose a file (PDF, DOC, image)"}
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.txt"
                    onChange={(event) => uploadFile(question.id, event.target.files?.[0])}
                  />
                </label>
              </div>
            ) : (
              <input className="field" value={answers[question.id] || ""} onChange={(event) => setAnswer(question.id, event.target.value)} />
            )}
          </div>
        </div>
      ))}

      {error ? <p className="rounded-lg bg-rose/10 px-3 py-2 text-[0.76rem] text-rose">{error}</p> : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={() => submit(true)} disabled={Boolean(loading)} className="btn btn-primary flex-1">
          {loading === "submit" ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          {loading === "submit" ? "Submitting…" : "Submit application"}
        </button>
        <button type="button" onClick={() => submit(false)} disabled={Boolean(loading)} className="btn btn-secondary flex-1">
          {loading === "draft" ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Save draft
        </button>
      </div>
    </div>
  );
}
