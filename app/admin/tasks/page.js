"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ListTodo,
  Pencil,
  Plus,
  RefreshCw,
  Save,
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
  fetchJson,
  useApi,
  useDebounced,
} from "@/components/layout/ui";
import StatusBadge from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { TASK_PRIORITY_META, TASK_STATUSES, TASK_STATUS_META } from "@/lib/constants";
import { formatDate, cn } from "@/lib/utils";

const EMPTY_FORM = {
  societyId: "",
  groupId: "",
  title: "",
  description: "",
  assignedTo: "",
  dueDate: "",
  priority: "medium",
  status: "pending",
};

function toLocalInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AdminTasksPage() {
  const { toast } = useToast();
  const { data, loading, error, reload } = useApi("/api/tasks");
  const societiesApi = useApi("/api/societies");
  const studentsApi = useApi("/api/users?role=student&limit=100");

  const tasks = data?.tasks || [];
  const societies = societiesApi.data?.items || [];
  const students = studentsApi.data?.users || [];

  const [society, setSociety] = useState("");
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const debouncedQ = useDebounced(q, 250);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [groupOptions, setGroupOptions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!formOpen || !form.societyId) {
      setGroupOptions([]);
      return;
    }
    let cancelled = false;
    fetchJson(`/api/groups?society=${form.societyId}`)
      .then((json) => {
        if (!cancelled) setGroupOptions(json.groups || []);
      })
      .catch(() => {
        if (!cancelled) setGroupOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [formOpen, form.societyId]);

  const counts = useMemo(() => {
    const map = { all: tasks.length };
    for (const task of tasks) map[task.status] = (map[task.status] || 0) + 1;
    return map;
  }, [tasks]);

  const filtered = useMemo(() => {
    const needle = debouncedQ.trim().toLowerCase();
    return tasks.filter((task) => {
      if (society && task.society?.id !== society) return false;
      if (status !== "all" && task.status !== status) return false;
      if (!needle) return true;
      return [task.title, task.description, task.society?.name, task.assignedToName]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [tasks, society, status, debouncedQ]);

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, societyId: societies[0]?.id || "" });
    setFormError("");
    setFormOpen(true);
  };

  const openEdit = (task) => {
    setEditing(task);
    setForm({
      societyId: task.society?.id || "",
      groupId: task.groupId || "",
      title: task.title || "",
      description: task.description || "",
      assignedTo: task.assignedTo?.id || "",
      dueDate: toLocalInput(task.dueDate),
      priority: task.priority || "medium",
      status: task.status || "pending",
    });
    setFormError("");
    setFormOpen(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        societyId: form.societyId,
        groupId: form.groupId,
        title: form.title,
        description: form.description,
        assignedTo: form.assignedTo,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : "",
        priority: form.priority,
      };
      if (editing) {
        await fetchJson(`/api/tasks/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, status: form.status }),
        });
        toast("Task updated.", "success");
      } else {
        await fetchJson("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast("Task assigned and the student notified.", "success");
      }
      setFormOpen(false);
      await reload();
    } catch (err) {
      setFormError(err.message || "Could not save the task.");
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (task, nextStatus) => {
    setBusyId(task.id);
    try {
      await fetchJson(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      toast(`Task marked ${TASK_STATUS_META[nextStatus]?.label || nextStatus}.`, "success");
      await reload();
    } catch (err) {
      toast(err.message || "Could not update the task.", "error");
    } finally {
      setBusyId("");
    }
  };

  const deleteTask = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetchJson(`/api/tasks/${deleteTarget.id}`, { method: "DELETE" });
      toast("Task deleted.", "success");
      setDeleteTarget(null);
      await reload();
    } catch (err) {
      toast(err.message || "Could not delete the task.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: "title",
      label: "Task",
      render: (task) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{task.title}</p>
          <p className="line-clamp-1 text-[0.68rem] text-mist">{task.description || "No description"}</p>
        </div>
      ),
    },
    {
      key: "society",
      label: "Society",
      render: (task) => (
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: task.society?.color || "#6d28d9" }} />
          <span className="truncate text-[0.74rem] text-ink">{task.society?.name || "—"}</span>
        </div>
      ),
    },
    {
      key: "assignee",
      label: "Assignee",
      render: (task) => (
        <span className="block max-w-[160px] truncate text-[0.74rem] text-ink">{task.assignedToName || "Unassigned"}</span>
      ),
    },
    { key: "priority", label: "Priority", render: (task) => <StatusBadge status={task.priority} kind="priority" /> },
    {
      key: "due",
      label: "Due",
      render: (task) => {
        const overdue = task.dueDate && task.status !== "completed" && new Date(task.dueDate) < new Date();
        return (
          <span className={cn("whitespace-nowrap text-[0.72rem]", overdue ? "font-semibold text-rose-600" : "text-mist")}>
            {formatDate(task.dueDate)}
            {overdue ? " · overdue" : ""}
          </span>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      render: (task) => (
        <div className="flex items-center gap-1.5">
          <StatusBadge status={task.status} kind="task" />
          <select
            className="field !w-auto !py-1.5 text-[0.7rem]"
            value={task.status}
            disabled={busyId === task.id}
            onChange={(event) => changeStatus(task, event.target.value)}
            aria-label={`Update status for ${task.title}`}
          >
            {TASK_STATUSES.map((value) => (
              <option key={value} value={value}>{TASK_STATUS_META[value]?.label || value}</option>
            ))}
          </select>
        </div>
      ),
    },
    {
      key: "actions",
      label: "",
      className: "text-right",
      render: (task) => (
        <div className="flex justify-end gap-1">
          <button type="button" className="grid h-7 w-7 place-items-center rounded-lg border border-line text-mist transition hover:text-purple" onClick={() => openEdit(task)} aria-label="Edit task">
            <Pencil size={13} />
          </button>
          <button type="button" className="grid h-7 w-7 place-items-center rounded-lg border border-line text-mist transition hover:border-rose-200 hover:text-rose-600" onClick={() => setDeleteTarget(task)} aria-label="Delete task">
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <ConsoleHeading
        eyebrow="Society operations"
        title="Tasks"
        description="Work assigned to society members. Students see their tasks in the dashboard and earn points on completion."
        actions={
          <>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => reload()} disabled={loading}>
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
              <Plus size={14} /> New task
            </button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Tasks" value={tasks.length} icon="registrations" hint="All assignments" />
        <StatTile label="Pending" value={counts.pending || 0} icon="applications" tone="amber" hint="Not started" />
        <StatTile label="In progress" value={counts.in_progress || 0} icon="events" tone="blue" hint="Being worked on" />
        <StatTile label="Completed" value={counts.completed || 0} icon="certificates" tone="emerald" hint="Points awarded" />
      </div>

      <Panel bodyClassName="">
        <Toolbar>
          <SearchBox value={q} onChange={setQ} placeholder="Search tasks…" />
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
              ...TASK_STATUSES.map((key) => ({ value: key, label: `${TASK_STATUS_META[key].label} ${counts[key] || 0}` })),
            ]}
          />
        </Toolbar>
        <DataTable
          columns={columns}
          rows={filtered}
          loading={loading}
          error={error}
          rowKey={(task) => task.id}
          emptyMessage="No tasks match this view."
          footer={`${filtered.length} of ${tasks.length} tasks`}
        />
      </Panel>

      <Modal
        open={formOpen}
        onClose={() => (saving ? null : setFormOpen(false))}
        title={editing ? "Edit task" : "Assign a task"}
        description="The assignee must belong to the selected society. They are notified immediately."
        wide
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button type="submit" form="task-form" className="btn btn-primary btn-sm" disabled={saving}>
              <Save size={13} /> {saving ? "Saving…" : editing ? "Save task" : "Assign task"}
            </button>
          </>
        }
      >
        <form id="task-form" onSubmit={submit} className="space-y-3">
          {formError ? <Alert tone="error">{formError}</Alert> : null}
          {societiesApi.error ? <Alert tone="warning">{societiesApi.error}</Alert> : null}
          {studentsApi.error ? <Alert tone="warning">{studentsApi.error}</Alert> : null}
          <FormField label="Task title">
            <input className="field" value={form.title} onChange={(e) => setField("title", e.target.value)} placeholder="e.g. Design event poster" required />
          </FormField>
          <FormField label="Description">
            <textarea className="field min-h-[64px]" value={form.description} onChange={(e) => setField("description", e.target.value)} />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Society">
              <select
                className="field"
                value={form.societyId}
                onChange={(e) => {
                  setField("societyId", e.target.value);
                  setField("groupId", "");
                }}
                required
              >
                <option value="">Choose a society…</option>
                {societies.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Group" hint="Optional — links the task to a chat room.">
              <select className="field" value={form.groupId} onChange={(e) => setField("groupId", e.target.value)}>
                <option value="">No group</option>
                {groupOptions.map((group) => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
                {editing?.groupId && !groupOptions.some((group) => group.id === editing.groupId) ? (
                  <option value={editing.groupId}>Current group</option>
                ) : null}
              </select>
            </FormField>
            <FormField label="Assignee">
              <select className="field" value={form.assignedTo} onChange={(e) => setField("assignedTo", e.target.value)} required>
                <option value="">Choose a student…</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} · {student.matricRollNumber || student.email}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Due date">
              <input type="datetime-local" className="field" value={form.dueDate} onChange={(e) => setField("dueDate", e.target.value)} />
            </FormField>
            <FormField label="Priority">
              <select className="field" value={form.priority} onChange={(e) => setField("priority", e.target.value)}>
                {Object.entries(TASK_PRIORITY_META).map(([key, meta]) => (
                  <option key={key} value={key}>{meta.label}</option>
                ))}
              </select>
            </FormField>
            {editing ? (
              <FormField label="Status">
                <select className="field" value={form.status} onChange={(e) => setField("status", e.target.value)}>
                  {TASK_STATUSES.map((key) => (
                    <option key={key} value={key}>{TASK_STATUS_META[key]?.label || key}</option>
                  ))}
                </select>
              </FormField>
            ) : null}
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => (deleting ? null : setDeleteTarget(null))}
        title="Delete task"
        description={deleteTarget ? `"${deleteTarget.title}" will be removed permanently.` : ""}
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </button>
            <button type="button" className="btn btn-danger btn-sm" onClick={deleteTask} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete task"}
            </button>
          </>
        }
      >
        <Alert tone="warning">
          <span className="inline-flex items-center gap-1.5">
            <ListTodo size={14} /> Completed task points are not reversed. The task disappears for the assignee.
          </span>
        </Alert>
      </Modal>
    </div>
  );
}
