"use client";

import { useEffect, useMemo, useState } from "react";
import {
  KeyRound,
  Pencil,
  Plus,
  RefreshCw,
  Shield,
  ShieldCheck,
  UserCog,
  UserPlus,
  Users,
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
import { ADMIN_PERMISSIONS, ADMIN_PERMISSION_META, ADMIN_ROLE_PRESETS } from "@/lib/constants";
import { formatDateTime, initials } from "@/lib/utils";

function roleLabelFor(staff, roles) {
  if (staff.adminRole && ADMIN_ROLE_PRESETS[staff.adminRole]) return ADMIN_ROLE_PRESETS[staff.adminRole].label;
  const match = roles.find((role) => role.slug === staff.adminRole);
  if (match) return match.name;
  if (staff.adminRole) return staff.adminRole.replace(/_/g, " ");
  return staff.role === "superadmin" ? "Super Admin" : "Administrator";
}

function PermissionGrid({ permissions, onToggle }) {
  return (
    <div className="grid max-h-72 gap-1.5 overflow-y-auto rounded-xl border border-line bg-ivory/50 p-2.5 sm:grid-cols-2">
      {ADMIN_PERMISSIONS.map((permission) => (
        <label
          key={permission}
          className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[0.76rem] text-ink-2 transition hover:bg-white"
        >
          <input
            type="checkbox"
            checked={permissions.includes(permission)}
            onChange={() => onToggle(permission)}
            className="h-3.5 w-3.5 accent-violet-600"
          />
          <span className="truncate">{ADMIN_PERMISSION_META[permission]}</span>
        </label>
      ))}
    </div>
  );
}

const EMPTY_CREATE = {
  name: "",
  email: "",
  password: "",
  role: "admin",
  adminRole: "",
  adminPermissions: [],
};

export default function AdminAdminsPage() {
  const { toast } = useToast();
  const staffApi = useApi("/api/users?role=admin&limit=100");
  const rolesApi = useApi("/api/admin/roles");
  const meApi = useApi("/api/auth/me");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const staff = staffApi.data?.users || [];
  const roles = rolesApi.data?.roles || [];
  const meId = meApi.data?.user?.id;

  useEffect(() => {
    if (!createOpen) setCreateForm(EMPTY_CREATE);
  }, [createOpen]);

  const roleOptions = useMemo(() => {
    const map = new Map();
    Object.entries(ADMIN_ROLE_PRESETS).forEach(([slug, preset]) => map.set(slug, preset.label));
    roles.forEach((role) => map.set(role.slug, role.name));
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [roles]);

  const filtered = staff.filter((member) => {
    if (activeFilter && String(Boolean(member.isActive)) !== activeFilter) return false;
    if (roleFilter && member.adminRole !== roleFilter) return false;
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    return [member.name, member.email, member.adminRole].join(" ").toLowerCase().includes(needle);
  });

  const togglePermission = (list, setList, permission) => {
    setList(
      list.includes(permission) ? list.filter((item) => item !== permission) : [...list, permission]
    );
  };

  const openCreate = () => {
    setCreateForm(EMPTY_CREATE);
    setCreateOpen(true);
  };

  const submitCreate = async (event) => {
    event.preventDefault();
    if (!createForm.name.trim() || !createForm.email.trim()) {
      toast("Name and email are required.", "error");
      return;
    }
    if (createForm.password.length < 8) {
      toast("Password must be at least 8 characters.", "error");
      return;
    }
    setSaving(true);
    try {
      await fetchJson("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name.trim(),
          email: createForm.email.trim(),
          password: createForm.password,
          role: createForm.role,
          adminRole:
            createForm.adminRole.trim() || (createForm.role === "superadmin" ? "superadmin" : ""),
          adminPermissions: createForm.adminPermissions,
        }),
      });
      toast("Staff account created.", "success");
      setCreateOpen(false);
      await staffApi.reload();
    } catch (err) {
      toast(err.message || "Could not create the staff account.", "error");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (member) => {
    setEditing(member);
    setEditForm({
      name: member.name || "",
      phone: member.phone || "",
      adminRole: member.adminRole || "",
      adminPermissions: member.adminPermissions || [],
    });
  };

  const submitEdit = async (event) => {
    event.preventDefault();
    if (!editing || !editForm) return;
    setSaving(true);
    try {
      await fetchJson(`/api/users/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name.trim(),
          phone: editForm.phone.trim(),
          adminRole: editForm.adminRole.trim(),
          adminPermissions: editForm.adminPermissions,
        }),
      });
      toast("Staff permissions updated.", "success");
      setEditing(null);
      setEditForm(null);
      await staffApi.reload();
    } catch (err) {
      toast(err.message || "Could not update this staff account.", "error");
    } finally {
      setSaving(false);
    }
  };

  const setActive = async (member, isActive) => {
    setSaving(true);
    try {
      await fetchJson(`/api/users/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      toast(isActive ? `${member.name} can sign in again.` : `${member.name} has been deactivated.`, isActive ? "success" : "info");
      setConfirmTarget(null);
      await staffApi.reload();
    } catch (err) {
      toast(err.message || "Could not update the account.", "error");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: "staff",
      label: "Staff member",
      render: (row) => (
        <div className="flex min-w-[13rem] items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-blue-600 text-[0.66rem] font-bold text-white">
            {initials(row.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">
              {row.name}
              {row.id === meId ? <span className="ml-1.5 badge badge-violet">You</span> : null}
            </p>
            <p className="truncate text-[0.7rem] text-mist">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      label: "Role",
      render: (row) => (
        <div className="min-w-[9rem]">
          <p className="text-[0.8rem] font-medium text-ink">{roleLabelFor(row, roles)}</p>
          <span className={`badge mt-1 ${row.role === "superadmin" ? "badge-violet" : "badge-blue"}`}>
            {row.role === "superadmin" ? "Super admin" : "Admin"}
          </span>
        </div>
      ),
    },
    {
      key: "permissions",
      label: "Permissions",
      render: (row) =>
        row.role === "superadmin" ? (
          <span className="badge badge-emerald">All permissions</span>
        ) : row.adminPermissions.length ? (
          <div className="max-w-[16rem]">
            <div className="flex flex-wrap gap-1">
              {row.adminPermissions.slice(0, 2).map((permission) => (
                <span key={permission} className="chip !py-0.5">
                  {ADMIN_PERMISSION_META[permission] || permission}
                </span>
              ))}
              {row.adminPermissions.length > 2 ? (
                <span className="badge badge-slate">+{row.adminPermissions.length - 2}</span>
              ) : null}
            </div>
            <p className="mt-1 text-[0.64rem] text-mist">{row.adminPermissions.length} permissions granted</p>
          </div>
        ) : (
          <span className="badge badge-amber">No permissions</span>
        ),
    },
    {
      key: "lastLoginAt",
      label: "Last login",
      render: (row) => (
        <span className="whitespace-nowrap text-[0.72rem] text-mist">
          {row.lastLoginAt ? formatDateTime(row.lastLoginAt) : "Never"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <span className={`badge ${row.isActive ? "badge-emerald" : "badge-slate"}`}>
          {row.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      className: "text-right",
      render: (row) => (
        <div className="flex justify-end gap-1.5">
          <button type="button" onClick={() => openEdit(row)} className="btn btn-secondary btn-sm" title="Edit permissions">
            <Pencil size={13} /> Edit
          </button>
          {row.isActive ? (
            <button
              type="button"
              onClick={() => setConfirmTarget(row)}
              disabled={row.id === meId}
              className="btn btn-danger btn-sm"
              title={row.id === meId ? "You cannot deactivate your own account" : "Deactivate"}
            >
              Deactivate
            </button>
          ) : (
            <button type="button" onClick={() => setActive(row, true)} className="btn btn-ghost btn-sm">
              Activate
            </button>
          )}
        </div>
      ),
    },
  ];

  const forbidden = Boolean(staffApi.error && /permission|access/i.test(staffApi.error));

  return (
    <div className="space-y-5">
      <ConsoleHeading
        eyebrow="People & access"
        title="Admins & roles"
        description="Staff accounts, their role presets and the granular console permissions each one holds. Permission changes take effect on the next request."
        actions={
          <>
            <button type="button" onClick={() => { staffApi.reload(); rolesApi.reload(); }} className="btn btn-ghost btn-sm">
              <RefreshCw size={14} /> Refresh
            </button>
            <button type="button" onClick={openCreate} className="btn btn-primary btn-sm">
              <UserPlus size={14} /> Create admin
            </button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Staff accounts" value={staff.length} icon="students" hint="Admins and superadmins" />
        <StatTile
          label="Superadmins"
          value={staff.filter((member) => member.role === "superadmin").length}
          icon="certificates"
          tone="emerald"
          hint="Full console access"
        />
        <StatTile
          label="Active staff"
          value={staff.filter((member) => member.isActive).length}
          icon="analytics"
          tone="blue"
          hint="Can sign in today"
        />
        <StatTile label="Role presets" value={roles.length} icon="applications" tone="amber" hint="Defined in the database" />
      </div>

      {forbidden ? (
        <Alert tone="error">
          Your admin role does not include the <strong>Admins & roles</strong> permission. Ask a superadmin to grant
          <span className="font-mono"> manage_admins</span>.
        </Alert>
      ) : null}

      <Panel>
        <Toolbar>
          <SearchBox value={search} onChange={setSearch} placeholder="Search staff name, email or role…" />
          <FilterSelect value={roleFilter} onChange={setRoleFilter} options={roleOptions} placeholder="All staff roles" />
          <FilterSelect
            value={activeFilter}
            onChange={setActiveFilter}
            options={[
              { value: "true", label: "Active accounts" },
              { value: "false", label: "Inactive accounts" },
            ]}
            placeholder="All accounts"
          />
          <span className="ml-auto inline-flex items-center gap-1.5 text-[0.72rem] text-mist">
            <ShieldCheck size={14} /> {filtered.length} account{filtered.length === 1 ? "" : "s"}
          </span>
        </Toolbar>
        <DataTable
          columns={columns}
          rows={filtered}
          loading={staffApi.loading}
          error={staffApi.error}
          rowKey={(row) => row.id}
          emptyMessage="No staff accounts match these filters."
        />
      </Panel>

      <Panel
        title="Admin role presets"
        description="Presets from the platform constants. Custom roles live in the database and are applied by slug."
        actions={
          <button type="button" onClick={openCreate} className="btn btn-ghost btn-sm">
            <Plus size={13} /> New admin
          </button>
        }
      >
        <div className="grid gap-3 px-5 py-5 sm:grid-cols-2 xl:grid-cols-3">
          {(roles.length ? roles : Object.entries(ADMIN_ROLE_PRESETS).map(([slug, preset]) => ({
            id: slug,
            slug,
            name: preset.label,
            permissions: preset.permissions,
            isSystem: true,
            userCount: staff.filter((member) => member.adminRole === slug).length,
          }))).map((role) => (
            <div key={role.id} className="rounded-xl border border-line bg-ivory/40 px-4 py-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[0.84rem] font-semibold text-ink">{role.name}</p>
                  <p className="font-mono text-[0.66rem] text-mist">{role.slug}</p>
                </div>
                <span className={`badge ${role.isSystem ? "badge-violet" : "badge-blue"}`}>
                  {role.isSystem ? "System" : "Custom"}
                </span>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1">
                {role.permissions.slice(0, 3).map((permission) => (
                  <span key={permission} className="chip !py-0.5 !text-[0.64rem]">
                    {ADMIN_PERMISSION_META[permission] || permission}
                  </span>
                ))}
                {role.permissions.length > 3 ? (
                  <span className="chip !py-0.5 !text-[0.64rem]">+{role.permissions.length - 3}</span>
                ) : null}
                {role.permissions.length === 0 ? <span className="text-[0.68rem] text-mist">No permissions</span> : null}
              </div>
              <p className="mt-2.5 flex items-center justify-between text-[0.68rem] text-mist">
                <span>{role.permissions.length} permissions</span>
                <span className="inline-flex items-center gap-1">
                  <Users size={12} /> {role.userCount || 0} assigned
                </span>
              </p>
            </div>
          ))}
        </div>
      </Panel>

      <Modal
        open={createOpen}
        onClose={() => (saving ? null : setCreateOpen(false))}
        title="Create staff account"
        description="The account is verified automatically and can sign in immediately."
        wide
        footer={
          <>
            <button type="button" onClick={() => setCreateOpen(false)} disabled={saving} className="btn btn-ghost btn-sm">
              Cancel
            </button>
            <button type="submit" form="create-admin-form" disabled={saving} className="btn btn-primary btn-sm">
              <UserCog size={14} /> {saving ? "Creating…" : "Create admin"}
            </button>
          </>
        }
      >
        <form id="create-admin-form" onSubmit={submitCreate} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Full name">
              <input
                value={createForm.name}
                onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
                className="field"
                placeholder="Ayesha Khan"
                required
              />
            </FormField>
            <FormField label="Email">
              <input
                type="email"
                value={createForm.email}
                onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))}
                className="field"
                placeholder="staff@kips.edu.pk"
                required
              />
            </FormField>
            <FormField label="Temporary password" hint="Minimum 8 characters. Share it securely.">
              <input
                type="password"
                value={createForm.password}
                onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))}
                className="field"
                minLength={8}
                required
              />
            </FormField>
            <FormField label="Account type" hint="Only a superadmin can create another superadmin.">
              <select
                value={createForm.role}
                onChange={(event) => {
                  const role = event.target.value;
                  setCreateForm((current) => ({
                    ...current,
                    role,
                    adminRole: role === "superadmin" ? "superadmin" : current.adminRole === "superadmin" ? "" : current.adminRole,
                    adminPermissions: role === "superadmin" ? [...ADMIN_PERMISSIONS] : current.adminPermissions,
                  }));
                }}
                className="field"
              >
                <option value="admin">Admin</option>
                <option value="superadmin">Super Admin</option>
              </select>
            </FormField>
          </div>

          <FormField label="Role preset" hint="Picking a preset fills the permission list — adjust it afterwards if needed.">
            <select
              value={createForm.adminRole}
              onChange={(event) => {
                const slug = event.target.value;
                setCreateForm((current) => ({
                  ...current,
                  adminRole: slug,
                  adminPermissions: ADMIN_ROLE_PRESETS[slug] ? [...ADMIN_ROLE_PRESETS[slug].permissions] : current.adminPermissions,
                }));
              }}
              className="field"
            >
              <option value="">No preset</option>
              {Object.entries(ADMIN_ROLE_PRESETS).map(([slug, preset]) => (
                <option key={slug} value={slug}>
                  {preset.label} ({preset.permissions.length} permissions)
                </option>
              ))}
            </select>
          </FormField>

          <div>
            <p className="label">Permissions ({createForm.adminPermissions.length})</p>
            <PermissionGrid
              permissions={createForm.adminPermissions}
              onToggle={(permission) =>
                togglePermission(createForm.adminPermissions, (next) =>
                  setCreateForm((current) => ({ ...current, adminPermissions: next })), permission)
              }
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(editing)}
        onClose={() => (saving ? null : (setEditing(null), setEditForm(null)))}
        title={editing ? `Edit ${editing.name}` : "Edit staff account"}
        description="Role changes and permission edits are written as an activity log entry."
        wide
        footer={
          <>
            <button
              type="button"
              onClick={() => { setEditing(null); setEditForm(null); }}
              disabled={saving}
              className="btn btn-ghost btn-sm"
            >
              Cancel
            </button>
            <button type="submit" form="edit-admin-form" disabled={saving} className="btn btn-primary btn-sm">
              <Shield size={14} /> {saving ? "Saving…" : "Save changes"}
            </button>
          </>
        }
      >
        {editForm && editing ? (
          <form id="edit-admin-form" onSubmit={submitEdit} className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-ivory/60 px-3.5 py-2.5">
              <span className="badge badge-violet">{editing.role === "superadmin" ? "Super admin" : "Admin"}</span>
              <span className="text-[0.72rem] text-mist">{editing.email}</span>
              <span className="ml-auto inline-flex items-center gap-1 text-[0.68rem] text-mist">
                <KeyRound size={12} /> Account type is fixed after creation
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Full name">
                <input
                  value={editForm.name}
                  onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))}
                  className="field"
                  required
                  minLength={2}
                />
              </FormField>
              <FormField label="Phone">
                <input
                  value={editForm.phone}
                  onChange={(event) => setEditForm((current) => ({ ...current, phone: event.target.value }))}
                  className="field"
                  placeholder="+92 300 0000000"
                />
              </FormField>
            </div>
            <FormField label="Admin role" hint="Preset slug or custom role name.">
              <select
                value={editForm.adminRole}
                onChange={(event) => {
                  const slug = event.target.value;
                  setEditForm((current) => ({
                    ...current,
                    adminRole: slug,
                    adminPermissions: ADMIN_ROLE_PRESETS[slug]
                      ? [...ADMIN_ROLE_PRESETS[slug].permissions]
                      : current.adminPermissions,
                  }));
                }}
                className="field"
              >
                <option value="">No preset</option>
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </FormField>
            <div>
              <p className="label">Permissions ({editForm.adminPermissions.length})</p>
              <PermissionGrid
                permissions={editForm.adminPermissions}
                onToggle={(permission) =>
                  togglePermission(editForm.adminPermissions, (next) =>
                    setEditForm((current) => ({ ...current, adminPermissions: next })), permission)
                }
              />
              {editing.id === meId ? (
                <p className="mt-2 text-[0.7rem] text-amber-700">You cannot change your own role or permission set.</p>
              ) : null}
            </div>
          </form>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(confirmTarget)}
        onClose={() => (saving ? null : setConfirmTarget(null))}
        title="Deactivate staff account"
        description="The account immediately loses console access. Activity history is preserved."
        footer={
          <>
            <button type="button" onClick={() => setConfirmTarget(null)} disabled={saving} className="btn btn-ghost btn-sm">
              Keep active
            </button>
            <button type="button" onClick={() => setActive(confirmTarget, false)} disabled={saving} className="btn btn-danger btn-sm">
              {saving ? "Saving…" : "Deactivate"}
            </button>
          </>
        }
      >
        {confirmTarget ? (
          <Alert tone="warning">
            <strong>{confirmTarget.name}</strong> ({confirmTarget.email}) will be signed out of the console on their next request.
          </Alert>
        ) : null}
      </Modal>
    </div>
  );
}
