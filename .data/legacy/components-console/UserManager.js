"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, PlusCircle, Search, ShieldCheck, UserCheck, UserX } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { ORGANIZER_PERMISSIONS } from "@/lib/constants";
import { cn, formatDate, initials } from "@/lib/utils";

const PERMISSION_LABELS = {
  manage_events: "Manage events",
  manage_attendance: "Manage attendance",
  manage_results: "Manage results",
  issue_certificates: "Issue certificates",
};

const EMPTY_FORM = { name: "", email: "", password: "", department: "" };

export default function UserManager({ users, role }) {
  const router = useRouter();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState("");
  const [editing, setEditing] = useState(null);
  const [perms, setPerms] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return users.filter((user) =>
      [user.name, user.email, user.rollNumber, user.department, user.program]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [users, query]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const create = async (event) => {
    event.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, role: "organizer" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Could not create the organizer.", "error");
        return;
      }
      toast("Organizer account created.", "success");
      setForm(EMPTY_FORM);
      router.refresh();
    } catch {
      toast("Something went wrong.", "error");
    } finally {
      setCreating(false);
    }
  };

  const patch = async (user, body, message) => {
    setBusy(user.id);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Could not update the account.", "error");
        return;
      }
      toast(message, "success");
      router.refresh();
    } catch {
      toast("Something went wrong.", "error");
    } finally {
      setBusy("");
    }
  };

  const openPermissions = (user) => {
    if (editing === user.id) {
      setEditing(null);
      return;
    }
    setEditing(user.id);
    setPerms(user.organizerPermissions || []);
  };

  const togglePerm = (value) =>
    setPerms((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));

  return (
    <div className="space-y-4">
      {role === "organizer" ? (
        <form onSubmit={create} className="panel p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg border border-violet-400/25 bg-violet-500/10 text-violet-300">
              <PlusCircle size={14} />
            </span>
            <div>
              <h2 className="font-display text-[0.95rem] font-semibold text-white">Add an organizer</h2>
              <p className="text-[0.7rem] text-mist">They can sign in immediately with the password you set.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
              required
              minLength={3}
              placeholder="Full name"
              className="field py-2 text-[0.78rem]"
            />
            <input
              type="email"
              value={form.email}
              onChange={(event) => update("email", event.target.value)}
              required
              placeholder="Email address"
              className="field py-2 text-[0.78rem]"
            />
            <input
              value={form.department}
              onChange={(event) => update("department", event.target.value)}
              placeholder="Department"
              className="field py-2 text-[0.78rem]"
            />
            <input
              type="password"
              value={form.password}
              onChange={(event) => update("password", event.target.value)}
              required
              minLength={8}
              placeholder="Temporary password"
              className="field py-2 text-[0.78rem]"
            />
          </div>
          <div className="mt-3 flex justify-end">
            <button type="submit" disabled={creating} className="btn btn-primary btn-sm">
              {creating ? <Loader2 size={13} className="animate-spin" /> : <PlusCircle size={13} />}
              Create organizer
            </button>
          </div>
        </form>
      ) : null}

      <div className="mb-1 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mist" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={role === "organizer" ? "Search organizers…" : "Search students…"}
            className="field py-2 pl-9 text-[0.78rem]"
          />
        </div>
        <span className="ml-auto text-[0.72rem] text-mist">
          {filtered.length} of {users.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center text-[0.8rem] text-mist">
          No accounts match this view.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/[0.06] bg-white/[0.015]">
          <table className="table-console">
            <thead>
              <tr>
                <th>{role === "organizer" ? "Organizer" : "Student"}</th>
                <th>Details</th>
                <th className="text-center">Registrations</th>
                <th className="text-center">Entries</th>
                <th className="text-center">Certificates</th>
                <th>Account</th>
                <th>Joined</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <Fragment key={user.id}>
                  <tr>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-violet-500/60 to-blue-500/60 text-[0.6rem] font-bold text-white">
                          {initials(user.name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[0.8rem] font-medium text-white">{user.name}</span>
                          <span className="block truncate text-[0.66rem] text-mist">{user.email}</span>
                        </span>
                      </div>
                    </td>
                    <td>
                      <p className="text-[0.76rem] text-white/80">{user.department || "—"}</p>
                      <p className="text-[0.64rem] text-mist">
                        {role === "student"
                          ? [user.rollNumber, user.program, user.semester].filter(Boolean).join(" · ") || "Profile incomplete"
                          : `${(user.organizerPermissions || []).length} of ${ORGANIZER_PERMISSIONS.length} permissions`}
                      </p>
                    </td>
                    <td className="text-center font-mono text-[0.78rem] text-white/80">{user.registrations}</td>
                    <td className="text-center font-mono text-[0.78rem] text-blue-200">{user.entries}</td>
                    <td className="text-center font-mono text-[0.78rem] text-amber-200">{user.certificates}</td>
                    <td>
                      <span className={user.isActive ? "badge badge-emerald" : "badge badge-rose"}>
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-[0.72rem] text-mist">{formatDate(user.createdAt)}</td>
                    <td>
                      <div className="flex items-center justify-end gap-1.5">
                        {role === "organizer" ? (
                          <button
                            type="button"
                            onClick={() => openPermissions(user)}
                            className={cn("btn btn-ghost btn-sm", editing === user.id ? "text-violet-300" : "")}
                          >
                            <ShieldCheck size={12} /> Permissions
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() =>
                            patch(
                              user,
                              { isActive: !user.isActive },
                              user.isActive ? "Account deactivated." : "Account reactivated."
                            )
                          }
                          disabled={busy === user.id}
                          className={cn(
                            "btn btn-ghost btn-sm",
                            user.isActive ? "text-rose-300 hover:bg-rose-500/10" : "text-emerald-300 hover:bg-emerald-500/10"
                          )}
                        >
                          {busy === user.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : user.isActive ? (
                            <UserX size={12} />
                          ) : (
                            <UserCheck size={12} />
                          )}
                          {user.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editing === user.id ? (
                    <tr>
                      <td colSpan={8}>
                        <div className="rounded-xl border border-violet-400/20 bg-violet-500/[0.05] p-4">
                          <p className="text-[0.68rem] uppercase tracking-[0.16em] text-mist">
                            Permissions for {user.name}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {ORGANIZER_PERMISSIONS.map((permission) => {
                              const active = perms.includes(permission);
                              return (
                                <button
                                  key={permission}
                                  type="button"
                                  onClick={() => togglePerm(permission)}
                                  className={cn(
                                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.72rem] transition",
                                    active
                                      ? "border-violet-400/40 bg-violet-500/15 text-white"
                                      : "border-white/10 text-mist hover:border-white/25 hover:text-white"
                                  )}
                                >
                                  {active ? <Check size={11} /> : null}
                                  {PERMISSION_LABELS[permission]}
                                </button>
                              );
                            })}
                          </div>
                          <div className="mt-3 flex justify-end gap-2">
                            <button type="button" onClick={() => setEditing(null)} className="btn btn-ghost btn-sm">
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={busy === user.id}
                              onClick={() => {
                                patch(user, { organizerPermissions: perms }, "Permissions updated.");
                                setEditing(null);
                              }}
                              className="btn btn-primary btn-sm"
                            >
                              Save permissions
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
