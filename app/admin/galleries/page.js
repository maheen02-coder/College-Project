"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Image as ImageIcon,
  Images,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  Alert,
  ConsoleHeading,
  FilterSelect,
  FormField,
  Modal,
  Panel,
  SearchBox,
  Skeleton,
  StatTile,
  Toolbar,
  Toggle,
  fetchJson,
  useApi,
} from "@/components/layout/ui";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";

const EMPTY_FORM = {
  title: "",
  description: "",
  cover: "",
  imagesText: "",
  societyId: "",
  eventId: "",
  isPublished: true,
};

export default function AdminGalleriesPage() {
  const { toast } = useToast();
  const galleries = useApi("/api/galleries");
  const societies = useApi("/api/societies");
  const events = useApi("/api/events?scope=all&limit=100");

  const [search, setSearch] = useState("");
  const [societyFilter, setSocietyFilter] = useState("");
  const [drafts, setDrafts] = useState([]);
  const [editor, setEditor] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const published = galleries.data?.items || [];
  const merged = useMemo(() => {
    const publishedIds = new Set(published.map((item) => item.id));
    const extra = drafts.filter((item) => !publishedIds.has(item.id));
    return [...published, ...extra].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [published, drafts]);

  const societyOptions = (societies.data?.items || []).map((society) => ({ value: society.id, label: society.name }));
  const eventOptions = (events.data?.items || []).map((event) => ({ value: event.id, label: event.title }));

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return merged
      .filter((item) => (societyFilter ? item.society?.id === societyFilter : true))
      .filter((item) =>
        needle
          ? [item.title, item.description, item.society?.name, item.event?.title]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(needle)
          : true
      );
  }, [merged, search, societyFilter]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditor("new");
  };

  const openEdit = (gallery) => {
    setForm({
      title: gallery.title || "",
      description: gallery.description || "",
      cover: gallery.cover || "",
      imagesText: (gallery.images || []).join("\n"),
      societyId: gallery.society?.id || "",
      eventId: gallery.event?.id || "",
      isPublished: Boolean(gallery.isPublished),
    });
    setEditor(gallery);
  };

  const previewUrls = useMemo(() => {
    const urls = form.imagesText
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
    const cover = form.cover.trim();
    return Array.from(new Set([...(cover ? [cover] : []), ...urls]));
  }, [form.cover, form.imagesText]);

  const rememberDraft = (item) => {
    setDrafts((current) => {
      const without = current.filter((entry) => entry.id !== item.id);
      return item.isPublished ? without : [item, ...without];
    });
  };

  const save = async (event) => {
    event.preventDefault();
    const images = form.imagesText
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (!form.title.trim()) {
      toast("Gallery title is required.", "error");
      return;
    }
    if (!form.cover.trim() && images.length === 0) {
      toast("Add a cover image or at least one photo URL.", "error");
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      cover: form.cover.trim(),
      images,
      societyId: form.societyId,
      eventId: form.eventId,
      isPublished: form.isPublished,
    };
    try {
      const response =
        editor === "new"
          ? await fetchJson("/api/galleries", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })
          : await fetchJson(`/api/galleries/${editor.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
      if (response.item) rememberDraft(response.item);
      toast(
        form.isPublished
          ? "Gallery saved and published."
          : "Draft saved. Drafts only appear in this tab until published.",
        form.isPublished ? "success" : "info"
      );
      setEditor(null);
      await galleries.reload();
    } catch (err) {
      toast(err.message || "Could not save the gallery.", "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await fetchJson(`/api/galleries/${deleteTarget.id}`, { method: "DELETE" });
      setDrafts((current) => current.filter((item) => item.id !== deleteTarget.id));
      toast("Gallery deleted.", "success");
      setDeleteTarget(null);
      await galleries.reload();
    } catch (err) {
      toast(err.message || "Could not delete the gallery.", "error");
    } finally {
      setSaving(false);
    }
  };

  const photoCount = merged.reduce((sum, item) => sum + (item.images?.length || 0), 0);
  const societyCount = new Set(merged.map((item) => item.society?.id).filter(Boolean)).size;
  const forbidden = Boolean(galleries.error && /permission|access/i.test(galleries.error));

  return (
    <div className="space-y-5">
      <ConsoleHeading
        eyebrow="Media"
        title="Galleries"
        description="Curate photo galleries for events and societies. Published galleries appear on the public site; drafts stay in this console."
        actions={
          <>
            <button type="button" onClick={galleries.reload} className="btn btn-ghost btn-sm">
              <RefreshCw size={14} /> Refresh
            </button>
            <button type="button" onClick={openCreate} className="btn btn-primary btn-sm">
              <Plus size={14} /> New gallery
            </button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Galleries" value={merged.length} icon="files" hint="Published plus this session's drafts" />
        <StatTile label="Photos" value={photoCount} icon="galleries" tone="blue" hint="Across all galleries" />
        <StatTile label="Societies covered" value={societyCount} icon="societies" tone="emerald" hint="Linked galleries" />
      </div>

      {forbidden ? (
        <Alert tone="error">
          Your admin role does not include the <strong>Galleries</strong> permission. Ask a superadmin to grant
          <span className="font-mono"> manage_galleries</span>.
        </Alert>
      ) : (
        <Alert tone="info">
          The galleries API only returns published albums. Unpublished drafts are kept in this browser tab and disappear on
          reload until you publish them.
        </Alert>
      )}

      <Panel>
        <Toolbar>
          <SearchBox value={search} onChange={setSearch} placeholder="Search gallery, society or event…" />
          <FilterSelect value={societyFilter} onChange={setSocietyFilter} options={societyOptions} placeholder="All societies" />
          <span className="ml-auto inline-flex items-center gap-1.5 text-[0.72rem] text-mist">
            <Images size={14} /> {filtered.length} album{filtered.length === 1 ? "" : "s"}
          </span>
        </Toolbar>

        {galleries.loading ? (
          <div className="grid gap-4 px-4 py-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-64" />
            ))}
          </div>
        ) : galleries.error ? (
          <div className="px-4 py-5">
            <Alert tone="error">{galleries.error}</Alert>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lavender text-purple">
              <Images size={20} />
            </span>
            <p className="text-[0.84rem] text-mist">No galleries match this view yet.</p>
            <button type="button" onClick={openCreate} className="btn btn-primary btn-sm">
              <Plus size={14} /> Create the first gallery
            </button>
          </div>
        ) : (
          <div className="grid gap-4 px-4 py-5 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((gallery) => {
              const cover = gallery.cover || gallery.images?.[0] || "";
              return (
                <article key={gallery.id} className="overflow-hidden rounded-2xl border border-line bg-white">
                  <div className="relative h-40 bg-gradient-to-br from-violet-100 via-lavender to-blue-100">
                    {cover ? (
                      <img src={cover} alt={gallery.title} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <span className="grid h-full w-full place-items-center text-purple/60">
                        <ImageIcon size={28} />
                      </span>
                    )}
                    <span className={`absolute left-2.5 top-2.5 badge ${gallery.isPublished ? "badge-emerald" : "badge-amber"}`}>
                      {gallery.isPublished ? "Published" : "Draft"}
                    </span>
                    <span className="absolute right-2.5 top-2.5 badge badge-slate">
                      <Images size={11} /> {gallery.images?.length || 0}
                    </span>
                  </div>
                  <div className="space-y-2 p-4">
                    <h3 className="truncate text-[0.9rem] font-semibold text-ink">{gallery.title}</h3>
                    <p className="line-clamp-2 min-h-[2rem] text-[0.72rem] leading-relaxed text-mist">
                      {gallery.description || "No description."}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {gallery.society ? (
                        <span className="badge badge-violet" style={{ borderColor: `${gallery.society.color}44` }}>
                          {gallery.society.name}
                        </span>
                      ) : (
                        <span className="chip">No society</span>
                      )}
                      {gallery.event ? <span className="badge badge-blue">{gallery.event.title}</span> : null}
                    </div>
                    <p className="text-[0.66rem] text-mist">Created {formatDate(gallery.createdAt)}</p>
                    <div className="flex gap-2 border-t border-line pt-2.5">
                      <button type="button" onClick={() => openEdit(gallery)} className="btn btn-secondary btn-sm flex-1 justify-center">
                        <Pencil size={13} /> Edit
                      </button>
                      <button type="button" onClick={() => setDeleteTarget(gallery)} className="btn btn-danger btn-sm !px-2.5" aria-label="Delete gallery">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Panel>

      <Panel className="bg-lavender/40">
        <div className="flex flex-wrap items-center gap-2 px-5 py-4 text-[0.74rem] text-mist">
          <Images size={15} className="text-purple" />
          Galleries are saved via <span className="font-mono text-purple">/api/galleries</span> with society and event links.
          <Link href="/admin/events" className="ml-auto inline-flex items-center gap-1 font-semibold text-purple hover:underline">
            <Pencil size={12} /> Manage events
          </Link>
        </div>
      </Panel>

      <Modal
        open={Boolean(editor)}
        onClose={() => (saving ? null : setEditor(null))}
        title={editor === "new" ? "New gallery" : "Edit gallery"}
        description="Paste image URLs — no uploads are required."
        wide
        footer={
          <>
            <button type="button" onClick={() => setEditor(null)} disabled={saving} className="btn btn-ghost btn-sm">
              Cancel
            </button>
            <button type="submit" form="gallery-form" disabled={saving} className="btn btn-primary btn-sm">
              {saving ? "Saving…" : editor === "new" ? "Create gallery" : "Save changes"}
            </button>
          </>
        }
      >
        <form id="gallery-form" onSubmit={save} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Title" className="sm:col-span-2">
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                className="field"
                maxLength={120}
                placeholder="Annual Sports Day 2026"
                required
              />
            </FormField>
            <FormField label="Cover image URL" className="sm:col-span-2">
              <input
                value={form.cover}
                onChange={(event) => setForm((current) => ({ ...current, cover: event.target.value }))}
                className="field"
                placeholder="https://images.example.com/cover.jpg"
              />
            </FormField>
            <FormField label="Description" className="sm:col-span-2">
              <textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                rows={2}
                maxLength={600}
                className="field resize-none"
                placeholder="A short note about the day…"
              />
            </FormField>
            <FormField label="Society" hint="Optional link to a society.">
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
            <FormField label="Event" hint="Optional link to an event.">
              <select
                value={form.eventId}
                onChange={(event) => setForm((current) => ({ ...current, eventId: event.target.value }))}
                className="field"
              >
                <option value="">No event</option>
                {eventOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </FormField>
          </div>

          <FormField label="Photo URLs" hint="One image URL per line. The cover is shown first.">
            <textarea
              value={form.imagesText}
              onChange={(event) => setForm((current) => ({ ...current, imagesText: event.target.value }))}
              rows={5}
              className="field resize-y font-mono !text-[0.76rem]"
              placeholder={"https://images.example.com/1.jpg\nhttps://images.example.com/2.jpg"}
            />
          </FormField>

          {previewUrls.length ? (
            <div>
              <p className="label">Preview ({previewUrls.length})</p>
              <div className="grid grid-cols-4 gap-2">
                {previewUrls.slice(0, 8).map((url) => (
                  <div key={url} className="relative aspect-square overflow-hidden rounded-lg border border-line bg-lavender">
                    <img src={url} alt="Gallery preview" className="h-full w-full object-cover" loading="lazy" />
                  </div>
                ))}
              </div>
              {previewUrls.length > 8 ? (
                <p className="mt-1 text-[0.68rem] text-mist">+{previewUrls.length - 8} more photos</p>
              ) : null}
            </div>
          ) : null}

          <Toggle
            checked={form.isPublished}
            onChange={(next) => setForm((current) => ({ ...current, isPublished: next }))}
            label={form.isPublished ? "Published to the site" : "Draft (hidden)"}
            description="Drafts are not returned by the public galleries endpoint."
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => (saving ? null : setDeleteTarget(null))}
        title="Delete gallery"
        description="The album and its image references are removed permanently."
        footer={
          <>
            <button type="button" onClick={() => setDeleteTarget(null)} disabled={saving} className="btn btn-ghost btn-sm">
              Cancel
            </button>
            <button type="button" onClick={remove} disabled={saving} className="btn btn-danger btn-sm">
              {saving ? "Deleting…" : "Delete gallery"}
            </button>
          </>
        }
      >
        {deleteTarget ? (
          <Alert tone="warning">
            Delete <strong>{deleteTarget.title}</strong> with {deleteTarget.images?.length || 0} photos?
          </Alert>
        ) : null}
      </Modal>
    </div>
  );
}
