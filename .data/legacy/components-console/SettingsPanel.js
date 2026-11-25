"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, Plus, Save, Sparkles, Tags, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

const SCOPES = [
  ["both", "Events & competitions"],
  ["event", "Events only"],
  ["competition", "Competitions only"],
];

const EMPTY_CATEGORY = { name: "", scope: "both", color: "#7c3aed", description: "" };

export default function SettingsPanel({ institute, categories }) {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: institute.name || "",
    shortName: institute.shortName || "",
    tagline: institute.tagline || "",
    city: institute.city || "",
    emailDomain: institute.emailDomain || "",
    primary: institute.branding?.primary || "#7c3aed",
    accent: institute.branding?.accent || "#3b82f6",
    logoText: institute.branding?.logoText || "KIPS",
    principal: institute.leadership?.principal || "",
    registrar: institute.leadership?.registrar || "",
    activitiesHead: institute.leadership?.activitiesHead || "",
  });
  const [saving, setSaving] = useState(false);
  const [category, setCategory] = useState(EMPTY_CATEGORY);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState("");

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/institute", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          shortName: form.shortName,
          tagline: form.tagline,
          city: form.city,
          emailDomain: form.emailDomain,
          branding: { primary: form.primary, accent: form.accent, logoText: form.logoText },
          leadership: {
            principal: form.principal,
            registrar: form.registrar,
            activitiesHead: form.activitiesHead,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Could not save the settings.", "error");
        return;
      }
      toast("Institute settings saved.", "success");
      router.refresh();
    } catch {
      toast("Something went wrong.", "error");
    } finally {
      setSaving(false);
    }
  };

  const addCategory = async (event) => {
    event.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(category),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Could not add the category.", "error");
        return;
      }
      toast("Category added.", "success");
      setCategory(EMPTY_CATEGORY);
      router.refresh();
    } catch {
      toast("Something went wrong.", "error");
    } finally {
      setCreating(false);
    }
  };

  const removeCategory = async (item) => {
    if (!window.confirm(`Delete the "${item.name}" category?`)) return;
    setBusy(item.id);
    try {
      const res = await fetch(`/api/categories/${item.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Could not delete the category.", "error");
        return;
      }
      toast("Category deleted.", "info");
      router.refresh();
    } catch {
      toast("Something went wrong.", "error");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <form onSubmit={save} className="space-y-5">
        <section className="panel p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg border border-violet-400/25 bg-violet-500/10 text-violet-300">
              <Building2 size={14} />
            </span>
            <div>
              <h2 className="font-display text-[0.95rem] font-semibold text-white">Institute profile</h2>
              <p className="text-[0.7rem] text-mist">Shown across the public site, certificates and emails.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-[0.68rem] font-medium uppercase tracking-[0.14em] text-mist">
                Institute name
              </label>
              <input value={form.name} onChange={(event) => update("name", event.target.value)} required className="field" />
            </div>
            <div>
              <label className="mb-1.5 block text-[0.68rem] font-medium uppercase tracking-[0.14em] text-mist">
                Short name
              </label>
              <input value={form.shortName} onChange={(event) => update("shortName", event.target.value)} required className="field" />
            </div>
            <div>
              <label className="mb-1.5 block text-[0.68rem] font-medium uppercase tracking-[0.14em] text-mist">
                City
              </label>
              <input value={form.city} onChange={(event) => update("city", event.target.value)} className="field" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-[0.68rem] font-medium uppercase tracking-[0.14em] text-mist">
                Tagline
              </label>
              <input value={form.tagline} onChange={(event) => update("tagline", event.target.value)} className="field" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-[0.68rem] font-medium uppercase tracking-[0.14em] text-mist">
                Email domain
              </label>
              <input
                value={form.emailDomain}
                onChange={(event) => update("emailDomain", event.target.value)}
                placeholder="kips.edu.pk"
                className="field"
              />
            </div>
          </div>
        </section>

        <section className="panel p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg border border-blue-400/25 bg-blue-500/10 text-blue-300">
              <Sparkles size={14} />
            </span>
            <div>
              <h2 className="font-display text-[0.95rem] font-semibold text-white">Branding & leadership</h2>
              <p className="text-[0.7rem] text-mist">Certificate signatures and the platform accent palette.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-[0.68rem] font-medium uppercase tracking-[0.14em] text-mist">
                Primary colour
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.primary}
                  onChange={(event) => update("primary", event.target.value)}
                  className="h-9 w-10 cursor-pointer rounded-lg border border-white/10 bg-transparent"
                />
                <input value={form.primary} onChange={(event) => update("primary", event.target.value)} className="field py-2 text-[0.76rem]" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[0.68rem] font-medium uppercase tracking-[0.14em] text-mist">
                Accent colour
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.accent}
                  onChange={(event) => update("accent", event.target.value)}
                  className="h-9 w-10 cursor-pointer rounded-lg border border-white/10 bg-transparent"
                />
                <input value={form.accent} onChange={(event) => update("accent", event.target.value)} className="field py-2 text-[0.76rem]" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[0.68rem] font-medium uppercase tracking-[0.14em] text-mist">
                Logo text
              </label>
              <input value={form.logoText} onChange={(event) => update("logoText", event.target.value)} className="field py-2 text-[0.76rem]" />
            </div>
            <div>
              <label className="mb-1.5 block text-[0.68rem] font-medium uppercase tracking-[0.14em] text-mist">
                Principal
              </label>
              <input value={form.principal} onChange={(event) => update("principal", event.target.value)} className="field py-2 text-[0.76rem]" />
            </div>
            <div>
              <label className="mb-1.5 block text-[0.68rem] font-medium uppercase tracking-[0.14em] text-mist">
                Registrar
              </label>
              <input value={form.registrar} onChange={(event) => update("registrar", event.target.value)} className="field py-2 text-[0.76rem]" />
            </div>
            <div>
              <label className="mb-1.5 block text-[0.68rem] font-medium uppercase tracking-[0.14em] text-mist">
                Activities head
              </label>
              <input value={form.activitiesHead} onChange={(event) => update("activitiesHead", event.target.value)} className="field py-2 text-[0.76rem]" />
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn btn-primary btn-sm">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Save settings
          </button>
        </div>
      </form>

      <div className="space-y-5">
        <section className="panel p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg border border-emerald-400/25 bg-emerald-500/10 text-emerald-300">
              <Tags size={14} />
            </span>
            <div>
              <h2 className="font-display text-[0.95rem] font-semibold text-white">Event categories</h2>
              <p className="text-[0.7rem] text-mist">
                {categories.length} categor{categories.length === 1 ? "y" : "ies"} used when creating events and
                competitions.
              </p>
            </div>
          </div>

          <form onSubmit={addCategory} className="mt-5 space-y-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                value={category.name}
                onChange={(event) => setCategory((current) => ({ ...current, name: event.target.value }))}
                required
                minLength={2}
                placeholder="Category name"
                className="field py-2 text-[0.78rem]"
              />
              <input
                type="color"
                value={category.color}
                onChange={(event) => setCategory((current) => ({ ...current, color: event.target.value }))}
                aria-label="Category colour"
                className="h-9 w-12 cursor-pointer rounded-lg border border-white/10 bg-transparent"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={category.scope}
                onChange={(event) => setCategory((current) => ({ ...current, scope: event.target.value }))}
                className="field py-2 text-[0.78rem]"
              >
                {SCOPES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                value={category.description}
                onChange={(event) => setCategory((current) => ({ ...current, description: event.target.value }))}
                placeholder="Optional description"
                className="field py-2 text-[0.78rem]"
              />
            </div>
            <button type="submit" disabled={creating} className="btn btn-secondary btn-sm w-full">
              {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Add category
            </button>
          </form>

          <div className="mt-5 space-y-2">
            {categories.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-[0.76rem] text-mist">
                Custom categories appear here. Events use the built-in catalogue until you add one.
              </p>
            ) : (
              categories.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5"
                >
                  <span
                    className={cn("h-8 w-8 shrink-0 rounded-lg border border-white/10")}
                    style={{ backgroundColor: item.color || "#7c3aed" }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.8rem] font-medium text-white">{item.name}</p>
                    <p className="truncate text-[0.64rem] text-mist">
                      {item.scope === "both" ? "Events & competitions" : item.scope === "event" ? "Events" : "Competitions"}
                      {item.description ? ` · ${item.description}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCategory(item)}
                    disabled={busy === item.id}
                    aria-label={`Delete ${item.name}`}
                    className="btn btn-ghost btn-sm text-rose-300 hover:bg-rose-500/10"
                  >
                    {busy === item.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <p className="text-[0.68rem] uppercase tracking-[0.16em] text-mist">Multi-institute ready</p>
          <p className="mt-2 text-[0.76rem] leading-relaxed text-mist">
            Every event, registration, entry and certificate carries an institute reference. Onboarding a second
            campus only requires a new institute record — data stays fully isolated.
          </p>
        </section>
      </div>
    </div>
  );
}
