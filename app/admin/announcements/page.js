"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  EyeOff,
  Megaphone,
  Pencil,
  Pin,
  PinOff,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  Alert,
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
} from "@/components/layout/ui";
import { useToast } from "@/components/ui/Toast";
import { ANNOUNCEMENT_CATEGORIES, ANNOUNCEMENT_PRIORITIES } from "@/lib/constants";
import { formatDate, timeAgo, truncate } from "@/lib/utils";

const PRIORITY_STYLE = {
  normal: { label: "Normal", tone: "badge-slate" },
  important: { label: "Important", tone: "badge-amber" },
  urgent: { label: "Urgent", tone: "badge-rose" },
};

const EMPTY_FORM = {
  title: "",
  body: "",
  category: "general",
  priority: "normal",
  audience: "all",
  pinned: false,
  isActive: true,
  expiresAt: "",
  image: "",
  link: "",
  societyId: "",
};

function toLocalInput(value) {
  if (!value) return "";
  const date = new Date(value);
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function isExpired(announcement) {
  return announcement.expiresAt ? new Date(announcement.expiresAt).getTime() < Date.now() : false;
}

export default function AdminAnnouncementsPage() {
  const { toast } = useToast();
  const board = useApi("/api/announcements?scope=admin&limit=100");
  const societies = useApi("/api/societies");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [editor, setEditor] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const items = board.data?.announcements || [];
  const societyOptions = (societies.data?.items || []).map((society) => ({
    value: society.id,
    label: society.name,
  }));

  useEffect(() => {
    if (!editor) setForm(EMPTY_FORM);
  }, [editor]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditor("new");
  };

  const openEdit = (announcement) => {
    setForm({
      title: announcement.title || "",
      body: announcement.body || "",
      category: announcement.category || "general",
      priority: announcement.priority || "normal",
      audience: announcement.audience || "all",
      pinned: Boolean(announcement.pinned),
      isActive: Boolean(announcement.isActive),
      expiresAt: toLocalInput(announcement.expiresAt),
      image: announcement.image || "",
      link: announcement.link || "",
      societyId: announcement.society?.id || "",
    });
    setEditor(announcement);
  };

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return items
      .filter((item) => (categoryFilter ? item.category === categoryFilter : true))
      .filter((item) =>
        needle
          ? [item.title, item.body, item.publishedByName, item.society?.name]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(needle)
          : true
      )
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });
  }, [items, search, categoryFilter]);

  const save = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || form.body.trim().length < 5) {
      toast("Add a title and at least a short body.", "error");
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      body: form.body.trim(),
      category: form.category,
      priority: form.priority,
      audience: form.audience,
      pinned: form.pinned,
      image: form.image.trim(),
      link: form.link.trim(),
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
    };
    try {
      if (editor === "new") {
        const created = await fetchJson("/api/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, societyId: form.societyId || undefined }),
        });
        if (!form.isActive && created.announcement?.id) {
          await fetchJson(`/api/announcements/${created.announcement.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: false }),
          });
        }
        toast("Announcement published.", "success");
      } else {
        await fetchJson(`/api/announcements/${editor.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, isActive: form.isActive }),
        });
        toast("Announcement updated.", "success");
      }
      setEditor(null);
      await board.reload();
    } catch (err) {
      toast(err.message || "Could not save the announcement.", "error");
    } finally {
      setSaving(false);
    }
  };

  const patch = async (announcement, body, message) => {
    try {
      await fetchJson(`/api/announcements/${announcement.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      toast(message, "success");
      await board.reload();
    } catch (err) {
      toast(err.message || "Could not update the announcement.", "error");
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await fetchJson(`/api/announcements/${deleteTarget.id}`, { method: "DELETE" });
      toast("Announcement deleted.", "success");
      setDeleteTarget(null);
      await board.reload();
    } catch (err) {
      toast(err.message || "Could not delete the announcement.", "error");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: "title",
      label: "Announcement",
      render: (row) => (
        <div className="min-w-[16rem] max-w-[26rem]">
          <p className="flex items-center gap-1.5 font-semibold text-ink">
            {row.pinned ? <Pin size={12} className="shrink-0 text-purple" /> : null}
            <span className="truncate">{row.title}</span>
          </p>
          <p className="mt-0.5 text-[0.72rem] leading-relaxed text-mist">{truncate(row.body, 110)}</p>
          {row.society ? <p className="mt-1 text-[0.64rem] text-purple">{row.society.name}</p> : null}
        </div>
      ),
    },
    {
      key: "category",
      label: "Category",
      render: (row) => (
        <div className="flex flex-col items-start gap-1">
          <span className="badge badge-violet capitalize">{row.category}</span>
          <span className={`badge ${PRIORITY_STYLE[row.priority]?.tone || "badge-slate"}`}>
            {PRIORITY_STYLE[row.priority]?.label || row.priority}
          </span>
        </div>
      ),
    },
    {
      key: "audience",
      label: "Audience",
      render: (row) => <span className="chip capitalize">{row.audience}</span>,
    },
    {
      key: "author",
      label: "Author",
      render: (row) => (
        <div className="min-w-[8rem]">
          <p className="text-[0.76rem] font-medium text-ink">{row.publishedByName || "Admin"}</p>
          <p className="text-[0.64rem] text-mist">{timeAgo(row.createdAt)}</p>
        </div>
      ),
    },
    {
      key: "createdAt",
      label: "Created",
      render: (row) => <span className="whitespace-nowrap text-[0.72rem] text-mist">{formatDate(row.createdAt)}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <div className="flex flex-col items-start gap-1">
          <span className={`badge ${row.isActive ? "badge-emerald" : "badge-slate"}`}>
            {row.isActive ? "Live" : "Hidden"}
          </span>
          {row.expiresAt ? (
            <span className={`badge ${isExpired(row) ? "badge-rose" : "badge-blue"}`}>
              {isExpired(row) ? "Expired" : `Until ${formatDate(row.expiresAt)}`}
            </span>
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
          <button type="button" onClick={() => openEdit(row)} className="btn btn-ghost btn-sm !px-2.5" title="Edit">
            <Pencil size={13} />
          </button>
          <button
            type="button"
            onClick={() => patch(row, { pinned: !row.pinned }, row.pinned ? "Unpinned." : "Pinned to the top.")}
            className="btn btn-ghost btn-sm !px-2.5"
            title={row.pinned ? "Unpin" : "Pin"}
          >
            {row.pinned ? <PinOff size={13} className="text-purple" /> : <Pin size={13} />}
          </button>
          <button
            type="button"
            onClick={() => patch(row, { isActive: !row.isActive }, row.isActive ? "Announcement hidden." : "Announcement is live.")}
            className="btn btn-ghost btn-sm !px-2.5"
            title={row.isActive ? "Hide" : "Publish"}
          >
            {row.isActive ? <EyeOff size={13} className="text-mist" /> : <Eye size={13} className="text-emerald-600" />}
          </button>
          <button type="button" onClick={() => setDeleteTarget(row)} className="btn btn-ghost btn-sm !px-2.5" title="Delete">
            <Trash2 size={13} className="text-rose-600" />
          </button>
        </div>
      ),
    },
  ];

  const live = items.filter((item) => item.isActive).length;
  const pinned = items.filter((item) => item.pinned).length;
  const forbidden = Boolean(board.error && /permission|access/i.test(board.error));

  return (
    <div className="space-y-5">
      <ConsoleHeading
        eyebrow="Campus broadcast"
        title="Announcements"
        description="Publish notices to the public updates board and student dashboards. Pinned and urgent announcements also push notifications."
        actions={
          <>
            <button type="button" onClick={board.reload} className="btn btn-ghost btn-sm">
              <RefreshCw size={14} /> Refresh
            </button>
            <button type="button" onClick={openCreate} className="btn btn-primary btn-sm">
              <Plus size={14} /> New announcement
            </button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Total announcements" value={items.length} icon="applications" hint="Admin board (latest 100)" />
        <StatTile label="Live now" value={live} icon="events" tone="emerald" hint="Visible to the audience" />
        <StatTile label="Pinned" value={pinned} icon="competitions" tone="amber" hint="Pushed to notifications" />
      </div>

      {forbidden ? (
        <Alert tone="error">
          Your admin role does not include the <strong>Announcements</strong> permission. Ask a superadmin to grant
          <span className="font-mono"> manage_announcements</span>.
        </Alert>
      ) : null}

      <Panel>
        <Toolbar>
          <SearchBox value={search} onChange={setSearch} placeholder="Search title, body or author…" />
          <FilterSelect
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={ANNOUNCEMENT_CATEGORIES.map((category) => ({ value: category, label: category }))}
            placeholder="All categories"
          />
          <span className="ml-auto inline-flex items-center gap-1.5 text-[0.72rem] text-mist">
            <Megaphone size={14} /> {filtered.length} shown
          </span>
        </Toolbar>
        <DataTable
          columns={columns}
          rows={filtered}
          loading={board.loading}
          error={board.error}
          rowKey={(row) => row.id}
          emptyMessage="No announcements yet. Publish the first update."
        />
      </Panel>

      <Modal
        open={Boolean(editor)}
        onClose={() => (saving ? null : setEditor(null))}
        title={editor === "new" ? "New announcement" : "Edit announcement"}
        description="Pinned or urgent posts notify students automatically when created."
        wide
        footer={
          <>
            <button type="button" onClick={() => setEditor(null)} disabled={saving} className="btn btn-ghost btn-sm">
              Cancel
            </button>
            <button type="submit" form="announcement-form" disabled={saving} className="btn btn-primary btn-sm">
              {saving ? "Saving…" : editor === "new" ? "Publish announcement" : "Save changes"}
            </button>
          </>
        }
      >
        <form id="announcement-form" onSubmit={save} className="space-y-4">
          <FormField label="Title">
            <input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              className="field"
              maxLength={140}
              placeholder="Inter-class debate finals moved to the auditorium"
              required
            />
          </FormField>
          <FormField label="Body">
            <textarea
              value={form.body}
              onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
              className="field resize-y"
              rows={6}
              maxLength={4000}
              placeholder="Share the full notice, timings and who to contact…"
              required
            />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-3">
            <FormField label="Category">
              <select
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                className="field capitalize"
              >
                {ANNOUNCEMENT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Priority">
              <select
                value={form.priority}
                onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}
                className="field capitalize"
              >
                {ANNOUNCEMENT_PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Audience">
              <select
                value={form.audience}
                onChange={(event) => setForm((current) => ({ ...current, audience: event.target.value }))}
                className="field"
              >
                <option value="all">Everyone</option>
                <option value="students">Students</option>
                <option value="admins">Admins</option>
              </select>
            </FormField>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Expires at" hint="Leave empty for no expiry.">
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(event) => setForm((current) => ({ ...current, expiresAt: event.target.value }))}
                className="field"
              />
            </FormField>
            <FormField label="Link" hint="Optional destination, e.g. /events/annual-sports-day.">
              <input
                value={form.link}
                onChange={(event) => setForm((current) => ({ ...current, link: event.target.value }))}
                className="field"
                placeholder="/events/annual-sports-day"
              />
            </FormField>
          </div>
          <FormField label="Image URL" hint="Shown on the announcements board.">
            <input
              value={form.image}
              onChange={(event) => setForm((current) => ({ ...current, image: event.target.value }))}
              className="field"
              placeholder="https://…"
            />
          </FormField>
          {editor === "new" ? (
            <FormField label="Society" hint="Optional. Links the notice to a society page.">
              <select
                value={form.societyId}
                onChange={(event) => setForm((current) => ({ ...current, societyId: event.target.value }))}
                className="field"
              >
                <option value="">No society</option>
                {societyOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </FormField>
          ) : editor?.society ? (
            <Alert tone="info">
              Published under <strong>{editor.society.name}</strong>. The announcements API does not accept a society change
              on edit, so this link is fixed.
            </Alert>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-2">
            <Toggle
              checked={form.pinned}
              onChange={(next) => setForm((current) => ({ ...current, pinned: next }))}
              label="Pin to top"
              description="Pinned posts always sort first."
            />
            <Toggle
              checked={form.isActive}
              onChange={(next) => setForm((current) => ({ ...current, isActive: next }))}
              label={form.isActive ? "Visible to audience" : "Hidden draft"}
              description="Hidden posts stay in the admin board."
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => (saving ? null : setDeleteTarget(null))}
        title="Delete announcement"
        description="This removes the post from the board permanently."
        footer={
          <>
            <button type="button" onClick={() => setDeleteTarget(null)} disabled={saving} className="btn btn-ghost btn-sm">
              Cancel
            </button>
            <button type="button" onClick={remove} disabled={saving} className="btn btn-danger btn-sm">
              {saving ? "Deleting…" : "Delete announcement"}
            </button>
          </>
        }
      >
        {deleteTarget ? (
          <Alert tone="warning">
            Delete <strong>{deleteTarget.title}</strong>? Existing notifications already delivered to students are not
            recalled.
          </Alert>
        ) : null}
      </Modal>
    </div>
  );
}
