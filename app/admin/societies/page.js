"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  Plus,
  RefreshCw,
  Sparkles,
  Star,
  Trash2,
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
import { useToast } from "@/components/ui/Toast";
import { SOCIETY_CATEGORIES } from "@/lib/constants";
import { cn, initials } from "@/lib/utils";

const EMPTY_FORM = {
  name: "",
  tagline: "",
  description: "",
  purpose: "",
  activities: "",
  category: "General",
  color: "#7c3aed",
  logo: "",
  cover: "",
  foundedYear: "",
  email: "",
  meetingSchedule: "",
  featured: false,
  isActive: true,
};

function MiniSwitch({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2 py-1 text-[0.66rem] font-medium text-mist transition hover:border-violet-200 hover:text-ink disabled:opacity-50",
        checked && "border-violet-200 text-purple"
      )}
    >
      <span className={cn("relative h-3.5 w-6 rounded-full transition", checked ? "bg-gradient-to-r from-violet-600 to-blue-600" : "bg-line")}>
        <span className={cn("absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white shadow transition-all", checked ? "left-3" : "left-0.5")} />
      </span>
      {label}
    </button>
  );
}

function SocietyMark({ society, size = "md" }) {
  const box = size === "sm" ? "h-8 w-8 text-[0.68rem]" : "h-11 w-11 text-[0.78rem]";
  if (society.logo) {
    return <img src={society.logo} alt="" className={cn("shrink-0 rounded-xl border border-line object-cover", box)} />;
  }
  return (
    <span
      className={cn("grid shrink-0 place-items-center rounded-xl font-bold text-white", box)}
      style={{ backgroundColor: society.color || "#6d28d9" }}
    >
      {initials(society.name) || <Building2 size={16} />}
    </span>
  );
}

export default function AdminSocietiesPage() {
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const debouncedQ = useDebounced(q, 300);
  const [category, setCategory] = useState("");
  const [view, setView] = useState("grid");

  const query = new URLSearchParams();
  if (debouncedQ.trim()) query.set("q", debouncedQ.trim());
  if (category) query.set("category", category);
  const { data, loading, error, reload, setData } = useApi(`/api/societies?${query.toString()}`);
  const items = data?.items || [];

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiving, setArchiving] = useState(false);

  const stats = useMemo(
    () => ({
      total: items.length,
      members: items.reduce((sum, item) => sum + (item.memberCount || 0), 0),
      featured: items.filter((item) => item.featured).length,
      recruitments: items.reduce((sum, item) => sum + (item.openRecruitments || 0), 0),
    }),
    [items]
  );

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormError("");
    setCreateOpen(true);
  };

  const submitCreate = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setFormError("");
    try {
      await fetchJson("/api/societies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          tagline: form.tagline,
          description: form.description,
          purpose: form.purpose,
          activities: form.activities,
          category: form.category,
          color: form.color || "#7c3aed",
          logo: form.logo,
          cover: form.cover,
          foundedYear: form.foundedYear === "" ? null : Number(form.foundedYear),
          email: form.email,
          meetingSchedule: form.meetingSchedule,
          featured: form.featured,
          isActive: form.isActive,
        }),
      });
      toast(`${form.name.trim()} created.`, "success", "Society added");
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      await reload();
    } catch (err) {
      setFormError(err.message || "Could not create the society.");
    } finally {
      setSaving(false);
    }
  };

  const patchSociety = async (society, payload, message) => {
    setBusyId(society.id);
    try {
      const result = await fetchJson(`/api/societies/${society.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setData((current) => ({
        ...(current || {}),
        items:
          payload.isActive === false
            ? (current?.items || []).filter((row) => row.id !== society.id)
            : (current?.items || []).map((row) => (row.id === society.id ? { ...row, ...result.item } : row)),
      }));
      toast(message, "success");
      if (payload.isActive === false) await reload();
    } catch (err) {
      toast(err.message || "Update failed.", "error");
    } finally {
      setBusyId("");
    }
  };

  const confirmArchive = async () => {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await fetchJson(`/api/societies/${archiveTarget.id}`, { method: "DELETE" });
      toast(`${archiveTarget.name} archived.`, "success");
      setArchiveTarget(null);
      await reload();
    } catch (err) {
      toast(err.message || "Could not archive the society.", "error");
    } finally {
      setArchiving(false);
    }
  };

  const columns = [
    {
      key: "name",
      label: "Society",
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <SocietyMark society={row} size="sm" />
          <div className="min-w-0">
            <Link href={`/admin/societies/${row.id}`} className="block truncate font-semibold text-ink hover:text-purple">
              {row.name}
            </Link>
            <p className="truncate text-[0.68rem] text-mist">{row.tagline || row.category}</p>
          </div>
        </div>
      ),
    },
    { key: "category", label: "Category", render: (row) => <span className="badge badge-violet">{row.category || "General"}</span> },
    { key: "members", label: "Members", className: "text-right", render: (row) => row.memberCount || 0 },
    { key: "events", label: "Events", className: "text-right", render: (row) => row.eventCount || 0 },
    { key: "recruitment", label: "Open roles", className: "text-right", render: (row) => row.openRecruitments || 0 },
    {
      key: "featured",
      label: "Featured",
      render: (row) => (
        <MiniSwitch
          checked={Boolean(row.featured)}
          disabled={busyId === row.id}
          label={row.featured ? "Featured" : "Not featured"}
          onChange={(value) => patchSociety(row, { featured: value }, value ? `${row.name} is featured.` : `${row.name} removed from featured.`)}
        />
      ),
    },
    {
      key: "actions",
      label: "",
      className: "text-right",
      render: (row) => (
        <div className="flex justify-end gap-1.5">
          <Link href={`/admin/societies/${row.id}`} className="btn btn-ghost btn-sm">
            Manage <ArrowUpRight size={12} />
          </Link>
          <button type="button" className="btn btn-ghost btn-sm !text-rose-600" onClick={() => setArchiveTarget(row)}>
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <ConsoleHeading
        eyebrow="Societies & recruitment"
        title="Societies"
        description="The clubs students join. Manage profiles, membership, featured placement and the group rooms attached to each society."
        actions={
          <>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => reload()} disabled={loading}>
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
              <Plus size={14} /> New society
            </button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Societies" value={stats.total} icon="societies" hint="Active on campus" />
        <StatTile label="Total members" value={stats.members} icon="students" tone="blue" hint="Across all societies" />
        <StatTile label="Featured" value={stats.featured} icon="competitions" tone="amber" hint="Highlighted publicly" />
        <StatTile label="Open recruitments" value={stats.recruitments} icon="applications" tone="emerald" hint="Accepting applications" />
      </div>

      <Panel bodyClassName="">
        <Toolbar>
          <SearchBox value={q} onChange={setQ} placeholder="Search societies…" />
          <FilterSelect
            value={category}
            onChange={setCategory}
            placeholder="All categories"
            options={SOCIETY_CATEGORIES}
          />
          <ChipTabs
            className="sm:ml-auto"
            value={view}
            onChange={setView}
            tabs={[
              { value: "grid", label: "Grid" },
              { value: "table", label: "Table" },
            ]}
          />
        </Toolbar>

        {error ? (
          <div className="p-5">
            <Alert tone="error">{error}</Alert>
          </div>
        ) : view === "table" ? (
          <DataTable
            columns={columns}
            rows={items}
            loading={loading}
            rowKey={(row) => row.id}
            emptyMessage="No societies match this view yet."
            footer={`${items.length} societ${items.length === 1 ? "y" : "ies"}`}
          />
        ) : loading ? (
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-48 animate-pulse rounded-2xl bg-lavender/60" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-14 text-center">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lavender text-purple">
              <Sparkles size={18} />
            </span>
            <p className="text-[0.84rem] font-medium text-ink">No societies found</p>
            <p className="max-w-sm text-[0.76rem] text-mist">
              {q || category ? "Try a different search or category." : "Create the first society to get started."}
            </p>
            <button type="button" className="btn btn-primary btn-sm mt-2" onClick={openCreate}>
              <Plus size={13} /> New society
            </button>
          </div>
        ) : (
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((society) => (
              <article
                key={society.id}
                className="flex flex-col rounded-2xl border border-line bg-white p-4 transition hover:border-violet-200 hover:shadow-[0_18px_40px_-30px_rgba(109,40,217,0.5)]"
              >
                <div className="flex items-start gap-3">
                  <SocietyMark society={society} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/admin/societies/${society.id}`} className="truncate text-[0.9rem] font-semibold text-ink hover:text-purple">
                        {society.name}
                      </Link>
                      {society.featured ? <Star size={14} className="mt-0.5 shrink-0 fill-amber-400 text-amber-500" /> : null}
                    </div>
                    <p className="mt-0.5 truncate text-[0.695rem] text-mist">{society.tagline || "No tagline yet"}</p>
                    <span className="badge badge-violet mt-1.5">{society.category || "General"}</span>
                  </div>
                </div>

                <p className="mt-3 line-clamp-2 min-h-[2.1rem] text-[0.73rem] leading-relaxed text-mist">
                  {society.description || "No description yet."}
                </p>

                <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-xl border border-line bg-ivory/70 py-2 text-center">
                  <div>
                    <p className="text-[0.78rem] font-bold text-ink">{society.memberCount || 0}</p>
                    <p className="text-[0.6rem] uppercase tracking-wide text-mist">Members</p>
                  </div>
                  <div className="border-x border-line">
                    <p className="text-[0.78rem] font-bold text-ink">{society.eventCount || 0}</p>
                    <p className="text-[0.6rem] uppercase tracking-wide text-mist">Events</p>
                  </div>
                  <div>
                    <p className="text-[0.78rem] font-bold text-ink">{society.openRecruitments || 0}</p>
                    <p className="text-[0.6rem] uppercase tracking-wide text-mist">Hiring</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <MiniSwitch
                    checked={Boolean(society.featured)}
                    disabled={busyId === society.id}
                    label={society.featured ? "Featured" : "Feature"}
                    onChange={(value) =>
                      patchSociety(society, { featured: value }, value ? `${society.name} is featured.` : `${society.name} removed from featured.`)
                    }
                  />
                  <MiniSwitch
                    checked={Boolean(society.isActive)}
                    disabled={busyId === society.id}
                    label="Active"
                    onChange={(value) =>
                      patchSociety(society, { isActive: value }, value ? `${society.name} is active.` : `${society.name} archived.`)
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setArchiveTarget(society)}
                    className="ml-auto grid h-7 w-7 place-items-center rounded-full border border-line text-mist transition hover:border-rose-200 hover:text-rose-600"
                    aria-label={`Archive ${society.name}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <Link href={`/admin/societies/${society.id}`} className="btn btn-secondary btn-sm mt-3 justify-center">
                  Open society <ArrowUpRight size={13} />
                </Link>
              </article>
            ))}
          </div>
        )}
      </Panel>

      <Modal
        open={createOpen}
        onClose={() => (saving ? null : setCreateOpen(false))}
        title="Create a society"
        description="Public profile details plus the internal settings admins use."
        wide
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCreateOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button type="submit" form="society-create-form" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? "Creating…" : "Create society"}
            </button>
          </>
        }
      >
        <form id="society-create-form" onSubmit={submitCreate} className="space-y-4">
          {formError ? <Alert tone="error">{formError}</Alert> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Society name" className="sm:col-span-2">
              <input className="field" value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="e.g. Computing Society" required />
            </FormField>
            <FormField label="Tagline" className="sm:col-span-2">
              <input className="field" maxLength={140} value={form.tagline} onChange={(e) => setField("tagline", e.target.value)} placeholder="One line shown on cards" />
            </FormField>
            <FormField label="Description" className="sm:col-span-2" hint="At least 10 characters.">
              <textarea className="field min-h-[84px]" value={form.description} onChange={(e) => setField("description", e.target.value)} required />
            </FormField>
            <FormField label="Purpose" className="sm:col-span-2">
              <textarea className="field min-h-[60px]" value={form.purpose} onChange={(e) => setField("purpose", e.target.value)} placeholder="Why this society exists" />
            </FormField>
            <FormField label="Activities" className="sm:col-span-2" hint="One activity per line.">
              <textarea className="field min-h-[64px]" value={form.activities} onChange={(e) => setField("activities", e.target.value)} placeholder={"Weekly workshops\nHackathons"} />
            </FormField>
            <FormField label="Category">
              <select className="field" value={form.category} onChange={(e) => setField("category", e.target.value)}>
                {SOCIETY_CATEGORIES.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Accent colour">
              <div className="flex items-center gap-2">
                <input type="color" value={form.color} onChange={(e) => setField("color", e.target.value)} className="h-9 w-12 cursor-pointer rounded-lg border border-line bg-white p-1" />
                <input className="field" value={form.color} onChange={(e) => setField("color", e.target.value)} placeholder="#7c3aed" />
              </div>
            </FormField>
            <FormField label="Logo URL">
              <input className="field" value={form.logo} onChange={(e) => setField("logo", e.target.value)} placeholder="https://…" />
            </FormField>
            <FormField label="Cover URL">
              <input className="field" value={form.cover} onChange={(e) => setField("cover", e.target.value)} placeholder="https://…" />
            </FormField>
            <FormField label="Founded year">
              <input type="number" min="1900" max="2100" className="field" value={form.foundedYear} onChange={(e) => setField("foundedYear", e.target.value)} placeholder="2019" />
            </FormField>
            <FormField label="Contact email">
              <input type="email" className="field" value={form.email} onChange={(e) => setField("email", e.target.value)} placeholder="society@college.edu" />
            </FormField>
            <FormField label="Meeting schedule" className="sm:col-span-2">
              <input className="field" value={form.meetingSchedule} onChange={(e) => setField("meetingSchedule", e.target.value)} placeholder="Wednesdays · 4:00 PM · Room 12" />
            </FormField>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Toggle checked={form.featured} onChange={(value) => setField("featured", value)} label="Featured" description="Highlight on the public site." />
            <Toggle checked={form.isActive} onChange={(value) => setField("isActive", value)} label="Active" description="Visible to students." />
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(archiveTarget)}
        onClose={() => (archiving ? null : setArchiveTarget(null))}
        title="Archive society"
        description={archiveTarget ? `${archiveTarget.name} will be hidden from students and public listings. Memberships are kept.` : ""}
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setArchiveTarget(null)} disabled={archiving}>
              Cancel
            </button>
            <button type="button" className="btn btn-danger btn-sm" onClick={confirmArchive} disabled={archiving}>
              {archiving ? "Archiving…" : "Archive society"}
            </button>
          </>
        }
      >
        <Alert tone="warning">
          This is a soft delete. The society can only be reactivated from the database or by an API call — it disappears from this list.
        </Alert>
      </Modal>
    </div>
  );
}
