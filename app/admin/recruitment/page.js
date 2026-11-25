"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  Alert,
  ChipTabs,
  ConsoleHeading,
  DataTable,
  FilterSelect,
  FormField,
  Modal,
  Panel,
  SearchBox,
  StatTile,
  Toolbar,
  Toggle,
  fetchJson,
  useApi,
  useDebounced,
} from "@/components/layout/ui";
import StatusBadge from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { RECRUITMENT_STATUS_META } from "@/lib/constants";
import { formatDate, slugify } from "@/lib/utils";

function toLocalInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function futureLocal(days) {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  return toLocalInput(date);
}

function emptyForm() {
  return {
    title: "",
    description: "",
    societyId: "",
    opensAt: toLocalInput(new Date()),
    closesAt: futureLocal(14),
    instructions: "",
    status: "draft",
    maxSocietiesPerStudent: 3,
    rounds: [],
  };
}

export default function AdminRecruitmentPage() {
  const { toast } = useToast();
  const { data, loading, error, reload } = useApi("/api/recruitment?scope=admin");
  const societiesApi = useApi("/api/societies");
  const items = data?.items || [];
  const societies = societiesApi.data?.items || [];

  const [status, setStatus] = useState("all");
  const [society, setSociety] = useState("");
  const [q, setQ] = useState("");
  const debouncedQ = useDebounced(q, 250);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [busyId, setBusyId] = useState("");

  const counts = useMemo(() => {
    const map = { all: items.length };
    for (const row of items) map[row.status] = (map[row.status] || 0) + 1;
    return map;
  }, [items]);

  const filtered = useMemo(() => {
    const needle = debouncedQ.trim().toLowerCase();
    return items.filter((row) => {
      if (status !== "all" && row.status !== status) return false;
      if (society && row.society?.id !== society) return false;
      if (!needle) return true;
      return [row.title, row.society?.name, row.description].join(" ").toLowerCase().includes(needle);
    });
  }, [items, status, society, debouncedQ]);

  const stats = useMemo(
    () => ({
      total: items.length,
      open: items.filter((row) => row.status === "open").length,
      questions: items.reduce((sum, row) => sum + (row.questionCount || 0), 0),
      applications: items.reduce((sum, row) => sum + (row.applicationCount || 0), 0),
    }),
    [items]
  );

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const openCreate = () => {
    setForm({ ...emptyForm(), societyId: societies[0]?.id || "" });
    setFormError("");
    setCreateOpen(true);
  };

  const updateRound = (index, key, value) => {
    setForm((current) => ({
      ...current,
      rounds: current.rounds.map((round, i) => (i === index ? { ...round, [key]: value } : round)),
    }));
  };

  const addRound = () => {
    setForm((current) => ({
      ...current,
      rounds: [
        ...current.rounds,
        { key: "", name: "", opensAt: "", closesAt: "", isActive: true },
      ],
    }));
  };

  const removeRound = (index) => {
    setForm((current) => ({ ...current, rounds: current.rounds.filter((_, i) => i !== index) }));
  };

  const submitCreate = async (event) => {
    event.preventDefault();
    if (saving) return;
    setFormError("");
    if (form.opensAt && form.closesAt && new Date(form.closesAt) <= new Date(form.opensAt)) {
      setFormError("Closing date must be after the opening date.");
      return;
    }
    setSaving(true);
    try {
      const rounds = form.rounds
        .filter((round) => round.name.trim())
        .map((round) => ({
          key: (round.key || slugify(round.name) || "round").trim(),
          name: round.name.trim(),
          opensAt: round.opensAt ? new Date(round.opensAt).toISOString() : "",
          closesAt: round.closesAt ? new Date(round.closesAt).toISOString() : "",
          isActive: round.isActive !== false,
        }));
      await fetchJson("/api/recruitment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          societyId: form.societyId,
          title: form.title,
          description: form.description,
          status: form.status,
          opensAt: new Date(form.opensAt).toISOString(),
          closesAt: new Date(form.closesAt).toISOString(),
          instructions: form.instructions,
          rounds,
          maxSocietiesPerStudent: Number(form.maxSocietiesPerStudent) || 3,
        }),
      });
      toast(`${form.title.trim()} created.`, "success", "Recruitment added");
      setCreateOpen(false);
      setForm(emptyForm());
      await reload();
    } catch (err) {
      setFormError(err.message || "Could not create the recruitment.");
    } finally {
      setSaving(false);
    }
  };

  const setRecruitmentStatus = async (row, nextStatus) => {
    setBusyId(row.id);
    try {
      await fetchJson(`/api/recruitment/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      toast(`${row.title} is now ${nextStatus}.`, "success");
      await reload();
    } catch (err) {
      toast(err.message || "Could not update the status.", "error");
    } finally {
      setBusyId("");
    }
  };

  const columns = [
    {
      key: "title",
      label: "Recruitment",
      render: (row) => (
        <div className="min-w-0">
          <Link href={`/admin/recruitment/${row.id}`} className="block truncate font-semibold text-ink hover:text-purple">
            {row.title}
          </Link>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: row.society?.color || "#6d28d9" }} />
            <span className="truncate text-[0.7rem] text-mist">{row.society?.name || "Society"}</span>
          </div>
        </div>
      ),
    },
    { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} kind="recruitment" /> },
    {
      key: "window",
      label: "Window",
      render: (row) => (
        <div className="whitespace-nowrap text-[0.73rem]">
          <p className="text-ink">{formatDate(row.opensAt)}</p>
          <p className="text-mist">to {formatDate(row.closesAt)}</p>
        </div>
      ),
    },
    {
      key: "questions",
      label: "Questions",
      className: "text-right",
      render: (row) => <span className="font-semibold text-ink">{row.questionCount || 0}</span>,
    },
    {
      key: "applications",
      label: "Applications",
      className: "text-right",
      render: (row) => (
        <div>
          <p className="font-semibold text-ink">{row.applicationCount || 0}</p>
          {row.statusCounts?.shortlisted ? (
            <p className="text-[0.64rem] text-mist">{row.statusCounts.shortlisted} shortlisted</p>
          ) : null}
        </div>
      ),
    },
    {
      key: "actions",
      label: "",
      className: "text-right",
      render: (row) => (
        <div className="flex justify-end gap-1.5">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={busyId === row.id}
            onClick={() => setRecruitmentStatus(row, row.status === "open" ? "closed" : "open")}
          >
            {row.status === "open" ? "Close" : "Open"}
          </button>
          <Link href={`/admin/recruitment/${row.id}`} className="btn btn-secondary btn-sm">
            Manage <ArrowUpRight size={12} />
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <ConsoleHeading
        eyebrow="Societies & recruitment"
        title="Recruitment"
        description="Intake rounds run by societies. Publish an application window, build the questionnaire and review the pipeline."
        actions={
          <>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => reload()} disabled={loading}>
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
              <Plus size={14} /> New recruitment
            </button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Rounds" value={stats.total} icon="applications" hint="All time" />
        <StatTile label="Open now" value={stats.open} icon="events" tone="emerald" hint="Accepting applications" />
        <StatTile label="Questions" value={stats.questions} icon="files" tone="blue" hint="Across all forms" />
        <StatTile label="Applications" value={stats.applications} icon="students" tone="amber" hint="Received" />
      </div>

      <Panel bodyClassName="">
        <Toolbar>
          <SearchBox value={q} onChange={setQ} placeholder="Search recruitment…" />
          <FilterSelect
            value={society}
            onChange={setSociety}
            placeholder="All societies"
            options={societies.map((item) => ({ value: item.id, label: item.name }))}
          />
          <ChipTabs
            className="sm:ml-auto"
            value={status}
            onChange={setStatus}
            tabs={[
              { value: "all", label: `All ${counts.all || 0}` },
              ...Object.keys(RECRUITMENT_STATUS_META).map((key) => ({
                value: key,
                label: `${RECRUITMENT_STATUS_META[key].label} ${counts[key] || 0}`,
              })),
            ]}
          />
        </Toolbar>
        <DataTable
          columns={columns}
          rows={filtered}
          loading={loading}
          error={error}
          rowKey={(row) => row.id}
          emptyMessage="No recruitment rounds match this view."
          footer={`${filtered.length} of ${items.length} rounds`}
        />
      </Panel>

      <Modal
        open={createOpen}
        onClose={() => (saving ? null : setCreateOpen(false))}
        title="New recruitment round"
        description="Dates, status and optional rounds. You can add questions after creating it."
        wide
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCreateOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button type="submit" form="recruitment-form" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? "Creating…" : "Create recruitment"}
            </button>
          </>
        }
      >
        <form id="recruitment-form" onSubmit={submitCreate} className="space-y-4">
          {formError ? <Alert tone="error">{formError}</Alert> : null}
          {societiesApi.error ? <Alert tone="warning">{societiesApi.error}</Alert> : null}
          {societies.length === 0 && !societiesApi.loading ? (
            <Alert tone="warning">Create a society before launching a recruitment round.</Alert>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Title" className="sm:col-span-2">
              <input className="field" value={form.title} onChange={(e) => setField("title", e.target.value)} placeholder="e.g. Core team intake 2026" required />
            </FormField>
            <FormField label="Society">
              <select className="field" value={form.societyId} onChange={(e) => setField("societyId", e.target.value)} required>
                <option value="">Choose a society…</option>
                {societies.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Status">
              <select className="field" value={form.status} onChange={(e) => setField("status", e.target.value)}>
                {Object.entries(RECRUITMENT_STATUS_META).map(([key, meta]) => (
                  <option key={key} value={key}>{meta.label}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Opens at">
              <input type="datetime-local" className="field" value={form.opensAt} onChange={(e) => setField("opensAt", e.target.value)} required />
            </FormField>
            <FormField label="Closes at">
              <input type="datetime-local" className="field" value={form.closesAt} onChange={(e) => setField("closesAt", e.target.value)} required />
            </FormField>
            <FormField label="Max societies per student">
              <input type="number" min="1" max="20" className="field" value={form.maxSocietiesPerStudent} onChange={(e) => setField("maxSocietiesPerStudent", e.target.value)} />
            </FormField>
            <FormField label="Description" className="sm:col-span-2">
              <textarea className="field min-h-[72px]" value={form.description} onChange={(e) => setField("description", e.target.value)} placeholder="What this intake is for" />
            </FormField>
            <FormField label="Instructions for applicants" className="sm:col-span-2">
              <textarea className="field min-h-[64px]" value={form.instructions} onChange={(e) => setField("instructions", e.target.value)} placeholder="Documents to prepare, interview format…" />
            </FormField>
          </div>

          <div className="rounded-2xl border border-line bg-ivory/60 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[0.8rem] font-semibold text-ink">Rounds</p>
                <p className="text-[0.7rem] text-mist">Optional. The first active round is attached to new applications.</p>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={addRound}>
                <Plus size={12} /> Add round
              </button>
            </div>
            <div className="mt-2.5 space-y-2">
              {form.rounds.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line px-3 py-4 text-center text-[0.72rem] text-mist">
                  No rounds — applications go into a single pool.
                </p>
              ) : (
                form.rounds.map((round, index) => (
                  <div key={index} className="rounded-xl border border-line bg-white p-2.5">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        className="field !py-1.5 text-[0.76rem]"
                        placeholder="Round name (e.g. Interviews)"
                        value={round.name}
                        onChange={(event) => updateRound(index, "name", event.target.value)}
                      />
                      <input
                        className="field !py-1.5 text-[0.76rem]"
                        placeholder="Key (auto from name)"
                        value={round.key}
                        onChange={(event) => updateRound(index, "key", event.target.value)}
                      />
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <input type="datetime-local" className="field !py-1.5 text-[0.76rem]" value={round.opensAt} onChange={(event) => updateRound(index, "opensAt", event.target.value)} />
                      <input type="datetime-local" className="field !py-1.5 text-[0.76rem]" value={round.closesAt} onChange={(event) => updateRound(index, "closesAt", event.target.value)} />
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <Toggle checked={round.isActive !== false} onChange={(value) => updateRound(index, "isActive", value)} label="Active" />
                      <button type="button" className="btn btn-ghost btn-sm !text-rose-600" onClick={() => removeRound(index)}>
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
