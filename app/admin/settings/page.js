"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Database,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Settings,
  Trash2,
} from "lucide-react";
import {
  Alert,
  ConsoleHeading,
  DataTable,
  FormField,
  Modal,
  Panel,
  Skeleton,
  Toolbar,
  fetchJson,
  useApi,
} from "@/components/layout/ui";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime } from "@/lib/utils";

const EMPTY_CATEGORY = { name: "", color: "#7c3aed", scope: "both", description: "" };

const EMPTY_PROFILE = {
  name: "",
  shortName: "",
  tagline: "",
  city: "",
  emailDomain: "",
  principal: "",
  registrar: "",
  activitiesHead: "",
  primary: "#7c3aed",
  accent: "#3b82f6",
  logoText: "KIPS",
};

function ColorField({ value, onChange, label }) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#7c3aed"}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-12 cursor-pointer rounded-lg border border-line bg-white p-1"
          aria-label={`${label} swatch`}
        />
        <input value={value} onChange={(event) => onChange(event.target.value)} className="field font-mono !text-[0.78rem]" placeholder="#7c3aed" />
      </div>
    </div>
  );
}

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const instituteApi = useApi("/api/institute");
  const categoriesApi = useApi("/api/categories");

  const institute = instituteApi.data?.item;
  const categories = categoriesApi.data?.categories || [];

  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [loadedAt, setLoadedAt] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [categoryEditor, setCategoryEditor] = useState(null);
  const [categoryForm, setCategoryForm] = useState(EMPTY_CATEGORY);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [savingCategory, setSavingCategory] = useState(false);

  useEffect(() => {
    if (!institute) return;
    setProfile({
      name: institute.name || "",
      shortName: institute.shortName || "",
      tagline: institute.tagline || "",
      city: institute.city || "",
      emailDomain: institute.emailDomain || "",
      principal: institute.leadership?.principal || "",
      registrar: institute.leadership?.registrar || "",
      activitiesHead: institute.leadership?.activitiesHead || "",
      primary: institute.branding?.primary || "#7c3aed",
      accent: institute.branding?.accent || "#3b82f6",
      logoText: institute.branding?.logoText || "KIPS",
    });
    setLoadedAt(new Date().toISOString());
  }, [institute]);

  const saveProfile = async (event) => {
    event.preventDefault();
    if (profile.name.trim().length < 2 || profile.shortName.trim().length < 2) {
      toast("Institute name and short name are required.", "error");
      return;
    }
    setSavingProfile(true);
    try {
      await fetchJson("/api/institute", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name.trim(),
          shortName: profile.shortName.trim(),
          tagline: profile.tagline.trim(),
          city: profile.city.trim(),
          emailDomain: profile.emailDomain.trim(),
          leadership: {
            principal: profile.principal.trim(),
            registrar: profile.registrar.trim(),
            activitiesHead: profile.activitiesHead.trim(),
          },
          branding: {
            primary: profile.primary.trim(),
            accent: profile.accent.trim(),
            logoText: profile.logoText.trim(),
          },
        }),
      });
      toast("Institute profile updated.", "success");
      await instituteApi.reload();
      router.refresh();
    } catch (err) {
      toast(err.message || "Could not save the institute profile.", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  const openAddCategory = () => {
    setCategoryForm(EMPTY_CATEGORY);
    setCategoryEditor("new");
  };

  const openEditCategory = (category) => {
    setCategoryForm({
      name: category.name || "",
      color: category.color || "#7c3aed",
      scope: category.scope || "both",
      description: category.description || "",
    });
    setCategoryEditor(category);
  };

  const saveCategory = async (event) => {
    event.preventDefault();
    if (categoryForm.name.trim().length < 2) {
      toast("Enter a category name of at least 2 characters.", "error");
      return;
    }
    setSavingCategory(true);
    const payload = {
      name: categoryForm.name.trim(),
      color: categoryForm.color.trim(),
      scope: categoryForm.scope,
      description: categoryForm.description.trim(),
    };
    try {
      if (categoryEditor === "new") {
        await fetchJson("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast("Category added.", "success");
      } else {
        await fetchJson(`/api/categories/${categoryEditor.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast("Category updated.", "success");
      }
      setCategoryEditor(null);
      await categoriesApi.reload();
    } catch (err) {
      toast(err.message || "Could not save the category.", "error");
    } finally {
      setSavingCategory(false);
    }
  };

  const removeCategory = async () => {
    if (!deleteTarget) return;
    setSavingCategory(true);
    try {
      await fetchJson(`/api/categories/${deleteTarget.id}`, { method: "DELETE" });
      toast("Category deleted.", "success");
      setDeleteTarget(null);
      await categoriesApi.reload();
    } catch (err) {
      toast(err.message || "Could not delete the category.", "error");
    } finally {
      setSavingCategory(false);
    }
  };

  const categoryColumns = [
    {
      key: "name",
      label: "Category",
      render: (row) => (
        <div className="flex min-w-[11rem] items-center gap-2.5">
          <span className="h-3 w-3 shrink-0 rounded-full border border-line" style={{ backgroundColor: row.color }} />
          <div>
            <p className="font-semibold text-ink">{row.name}</p>
            <p className="font-mono text-[0.64rem] text-mist">{row.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: "scope",
      label: "Scope",
      render: (row) => <span className="badge badge-blue capitalize">{row.scope}</span>,
    },
    {
      key: "description",
      label: "Description",
      render: (row) => <span className="text-[0.76rem] text-ink-2">{row.description || "—"}</span>,
    },
    {
      key: "color",
      label: "Colour",
      render: (row) => <span className="font-mono text-[0.72rem] text-mist">{row.color}</span>,
    },
    {
      key: "actions",
      label: "",
      className: "text-right",
      render: (row) => (
        <div className="flex justify-end gap-1.5">
          <button type="button" onClick={() => openEditCategory(row)} className="btn btn-secondary btn-sm !px-2.5" title="Rename category">
            <Pencil size={13} />
          </button>
          <button type="button" onClick={() => setDeleteTarget(row)} className="btn btn-danger btn-sm !px-2.5" title="Delete category">
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  const forbidden = Boolean(instituteApi.error && /permission|access/i.test(instituteApi.error));
  const stats = institute?.stats;

  return (
    <div className="space-y-5">
      <ConsoleHeading
        eyebrow="Platform settings"
        title="Settings"
        description="Institute identity, branding, leadership signatures and the category catalogue used across events and competitions."
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                instituteApi.reload();
                categoriesApi.reload();
              }}
              className="btn btn-ghost btn-sm"
            >
              <RefreshCw size={14} /> Refresh
            </button>
            <button type="submit" form="institute-form" disabled={savingProfile} className="btn btn-primary btn-sm">
              <Save size={14} /> {savingProfile ? "Saving…" : "Save profile"}
            </button>
          </>
        }
      />

      {forbidden ? (
        <Alert tone="error">
          Your admin role does not include the <strong>Institute settings</strong> permission. Ask a superadmin to grant
          <span className="font-mono"> manage_settings</span>.
        </Alert>
      ) : null}

      {instituteApi.loading ? (
        <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      ) : instituteApi.error ? (
        <Panel>
          <div className="px-5 py-6">
            <Alert tone="error">{instituteApi.error}</Alert>
          </div>
        </Panel>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
          <Panel title="Institute profile" description="These values drive page titles, email domains and console branding.">
            <form id="institute-form" onSubmit={saveProfile} className="space-y-4 px-5 py-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Institute name">
                  <input
                    value={profile.name}
                    onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}
                    className="field"
                    required
                    minLength={2}
                  />
                </FormField>
                <FormField label="Short name" hint="Used in the console shell and certificates.">
                  <input
                    value={profile.shortName}
                    onChange={(event) => setProfile((current) => ({ ...current, shortName: event.target.value }))}
                    className="field"
                    required
                    minLength={2}
                    maxLength={24}
                  />
                </FormField>
                <FormField label="Tagline" className="sm:col-span-2">
                  <input
                    value={profile.tagline}
                    onChange={(event) => setProfile((current) => ({ ...current, tagline: event.target.value }))}
                    className="field"
                    maxLength={160}
                    placeholder="Where campus life happens."
                  />
                </FormField>
                <FormField label="City">
                  <input
                    value={profile.city}
                    onChange={(event) => setProfile((current) => ({ ...current, city: event.target.value }))}
                    className="field"
                    maxLength={80}
                  />
                </FormField>
                <FormField label="Email domain" hint="Students signing up with this domain are auto-approved.">
                  <input
                    value={profile.emailDomain}
                    onChange={(event) => setProfile((current) => ({ ...current, emailDomain: event.target.value }))}
                    className="field"
                    maxLength={120}
                    placeholder="kips.edu.pk"
                  />
                </FormField>
              </div>

              <div className="border-t border-line pt-4">
                <p className="text-[0.82rem] font-semibold text-ink">Leadership signatures</p>
                <p className="mb-2.5 text-[0.7rem] text-mist">Printed on certificates and official notices.</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <FormField label="Principal">
                    <input
                      value={profile.principal}
                      onChange={(event) => setProfile((current) => ({ ...current, principal: event.target.value }))}
                      className="field"
                      maxLength={80}
                    />
                  </FormField>
                  <FormField label="Registrar">
                    <input
                      value={profile.registrar}
                      onChange={(event) => setProfile((current) => ({ ...current, registrar: event.target.value }))}
                      className="field"
                      maxLength={80}
                    />
                  </FormField>
                  <FormField label="Activities head">
                    <input
                      value={profile.activitiesHead}
                      onChange={(event) => setProfile((current) => ({ ...current, activitiesHead: event.target.value }))}
                      className="field"
                      maxLength={80}
                    />
                  </FormField>
                </div>
              </div>

              <div className="border-t border-line pt-4">
                <p className="text-[0.82rem] font-semibold text-ink">Branding</p>
                <p className="mb-2.5 text-[0.7rem] text-mist">
                  The institute API persists primary/accent hex colours and a logo text mark — it has no logo URL field.
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <ColorField
                    label="Primary colour"
                    value={profile.primary}
                    onChange={(value) => setProfile((current) => ({ ...current, primary: value }))}
                  />
                  <ColorField
                    label="Accent colour"
                    value={profile.accent}
                    onChange={(value) => setProfile((current) => ({ ...current, accent: value }))}
                  />
                  <FormField label="Logo text">
                    <input
                      value={profile.logoText}
                      onChange={(event) => setProfile((current) => ({ ...current, logoText: event.target.value }))}
                      className="field"
                      maxLength={12}
                    />
                  </FormField>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
                <span className="inline-flex items-center gap-1.5 text-[0.68rem] text-mist">
                  <Settings size={12} /> Changes are written to MongoDB and logged as institute.settings_updated.
                </span>
                <button type="submit" disabled={savingProfile} className="btn btn-primary btn-sm">
                  <Save size={14} /> {savingProfile ? "Saving…" : "Save profile"}
                </button>
              </div>
            </form>
          </Panel>

          <div className="space-y-4">
            <Panel title="Platform info" description="Read directly from the institute endpoint.">
              <div className="space-y-2.5 px-5 py-4 text-[0.78rem]">
                <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                    <CheckCircle2 size={14} /> API connected
                  </span>
                  <span className="text-[0.68rem] text-emerald-700">
                    {loadedAt ? formatDateTime(loadedAt) : "just now"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-line pb-2">
                  <span className="text-mist">Institute id</span>
                  <span className="truncate font-mono text-[0.7rem] text-ink-2">{institute?.id || "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-line pb-2">
                  <span className="text-mist">Slug</span>
                  <span className="font-mono text-[0.7rem] text-ink-2">{institute?.slug || "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-line pb-2">
                  <span className="text-mist">Active societies</span>
                  <span className="font-semibold text-ink">{stats?.societies ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-line pb-2">
                  <span className="text-mist">Events on record</span>
                  <span className="font-semibold text-ink">{stats?.events ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-line pb-2">
                  <span className="text-mist">Active students</span>
                  <span className="font-semibold text-ink">{stats?.students ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-mist">Catalogue categories</span>
                  <span className="font-semibold text-ink">{categories.length}</span>
                </div>
                <p className="flex items-start gap-1.5 rounded-lg bg-lavender/60 px-2.5 py-2 text-[0.68rem] leading-relaxed text-mist">
                  <Database size={12} className="mt-0.5 shrink-0 text-purple" />
                  Status is derived from successful reads of <span className="font-mono">/api/institute</span> and{" "}
                  <span className="font-mono">/api/categories</span> against MongoDB.
                </p>
              </div>
            </Panel>
          </div>
        </div>
      )}

      <Panel
        title="Category catalogue"
        description="Custom categories power event and competition filters. Counts are not exposed by the categories API."
        actions={
          <button type="button" onClick={openAddCategory} className="btn btn-primary btn-sm">
            <Plus size={14} /> Add category
          </button>
        }
      >
        <Toolbar>
          <span className="text-[0.74rem] text-mist">
            {categories.length} categor{categories.length === 1 ? "y" : "ies"} · slugs are generated automatically
          </span>
          <span className="ml-auto badge badge-slate">GET /api/categories</span>
        </Toolbar>
        <DataTable
          columns={categoryColumns}
          rows={categories}
          loading={categoriesApi.loading}
          error={categoriesApi.error}
          rowKey={(row) => row.id}
          emptyMessage="No categories yet. Add the first one."
        />
      </Panel>

      <Modal
        open={Boolean(categoryEditor)}
        onClose={() => (savingCategory ? null : setCategoryEditor(null))}
        title={categoryEditor === "new" ? "Add category" : "Edit category"}
        description="Renaming regenerates the slug, which may affect filters that reference it."
        footer={
          <>
            <button type="button" onClick={() => setCategoryEditor(null)} disabled={savingCategory} className="btn btn-ghost btn-sm">
              Cancel
            </button>
            <button type="submit" form="category-form" disabled={savingCategory} className="btn btn-primary btn-sm">
              {savingCategory ? "Saving…" : categoryEditor === "new" ? "Add category" : "Save changes"}
            </button>
          </>
        }
      >
        <form id="category-form" onSubmit={saveCategory} className="space-y-4">
          <FormField label="Name">
            <input
              value={categoryForm.name}
              onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))}
              className="field"
              maxLength={60}
              placeholder="Robotics"
              required
            />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Scope">
              <select
                value={categoryForm.scope}
                onChange={(event) => setCategoryForm((current) => ({ ...current, scope: event.target.value }))}
                className="field"
              >
                <option value="both">Events & competitions</option>
                <option value="event">Events only</option>
                <option value="competition">Competitions only</option>
              </select>
            </FormField>
            <ColorField
              label="Colour"
              value={categoryForm.color}
              onChange={(value) => setCategoryForm((current) => ({ ...current, color: value }))}
            />
          </div>
          <FormField label="Description" hint="Optional, shown in pickers.">
            <input
              value={categoryForm.description}
              onChange={(event) => setCategoryForm((current) => ({ ...current, description: event.target.value }))}
              className="field"
              maxLength={200}
            />
          </FormField>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => (savingCategory ? null : setDeleteTarget(null))}
        title="Delete category"
        description="Existing events keep their stored label, but the category disappears from pickers."
        footer={
          <>
            <button type="button" onClick={() => setDeleteTarget(null)} disabled={savingCategory} className="btn btn-ghost btn-sm">
              Cancel
            </button>
            <button type="button" onClick={removeCategory} disabled={savingCategory} className="btn btn-danger btn-sm">
              {savingCategory ? "Deleting…" : "Delete category"}
            </button>
          </>
        }
      >
        {deleteTarget ? (
          <Alert tone="warning">
            Delete <strong>{deleteTarget.name}</strong> from the catalogue?
          </Alert>
        ) : null}
      </Modal>
    </div>
  );
}
