"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, ListChecks, Loader2, Play, RotateCcw, Users } from "lucide-react";
import { ConsoleHeading, Panel, Skeleton, StatTile, fetchJson, useApi } from "@/components/layout/ui";
import StatusBadge from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { EmptyState, ErrorState } from "@/components/dashboard/common";
import { formatDate } from "@/lib/utils";

const GROUPS = [
  { key: "pending", title: "To do", tone: "amber" },
  { key: "in_progress", title: "In progress", tone: "blue" },
  { key: "completed", title: "Completed", tone: "emerald" },
];

function TaskCard({ task, busy, onStatus }) {
  const overdue =
    task.dueDate && task.status !== "completed" && new Date(task.dueDate).getTime() < Date.now();
  const societyColor = task.society?.color || "#7c3aed";

  return (
    <article className={`rounded-xl border bg-white p-3.5 ${overdue ? "border-rose-200 bg-rose-50/40" : "border-line"}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-[0.84rem] font-semibold leading-snug text-ink">{task.title}</p>
        <StatusBadge status={task.priority} kind="priority" />
      </div>
      {task.description ? <p className="mt-1.5 line-clamp-2 text-[0.72rem] leading-relaxed text-mist">{task.description}</p> : null}

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.68rem] text-mist">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: societyColor }} />
          {task.society?.name || "Society"}
        </span>
        <span className={`inline-flex items-center gap-1 ${overdue ? "font-semibold text-rose-600" : ""}`}>
          <Clock size={11} /> {task.dueDate ? formatDate(task.dueDate) : "No due date"}
        </span>
        {overdue ? <span className="badge badge-rose">Overdue</span> : null}
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-line pt-2.5">
        {task.status === "pending" ? (
          <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => onStatus(task, "in_progress")}>
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />} Start
          </button>
        ) : null}
        {task.status === "in_progress" ? (
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => onStatus(task, "completed")}>
            {busy ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Mark complete
          </button>
        ) : null}
        {task.status === "completed" ? (
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => onStatus(task, "in_progress")}>
            {busy ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />} Reopen
          </button>
        ) : null}
        {task.status === "completed" && task.completedAt ? (
          <span className="ml-auto text-[0.64rem] text-mist">Done {formatDate(task.completedAt)}</span>
        ) : null}
      </div>
    </article>
  );
}

export default function MyTasksPage() {
  const { toast } = useToast();
  const { data, loading, error, reload } = useApi("/api/tasks");
  const [busyId, setBusyId] = useState("");

  const tasks = useMemo(() => data?.tasks || [], [data]);
  const grouped = useMemo(
    () => ({
      pending: tasks.filter((task) => task.status === "pending"),
      in_progress: tasks.filter((task) => task.status === "in_progress"),
      completed: tasks.filter((task) => task.status === "completed"),
      cancelled: tasks.filter((task) => task.status === "cancelled"),
    }),
    [tasks]
  );
  const overdue = tasks.filter((task) => task.dueDate && task.status !== "completed" && new Date(task.dueDate).getTime() < Date.now());

  const changeStatus = async (task, status) => {
    setBusyId(task.id);
    try {
      await fetchJson(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      toast(status === "completed" ? "Task completed — +5 participation points." : "Task status updated.", "success");
      await reload();
    } catch (err) {
      toast(err.message || "Could not update this task.", "error");
    } finally {
      setBusyId("");
    }
  };

  return (
    <>
      <ConsoleHeading
        eyebrow="Society work"
        title="My tasks"
        description="Everything assigned to you by your societies, grouped by progress with overdue items highlighted."
        actions={
          <Link href="/dashboard/groups" className="btn btn-secondary btn-sm">
            <Users size={14} /> Team groups
          </Link>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatTile label="Open tasks" value={grouped.pending.length + grouped.in_progress.length} icon="files" tone="blue" hint="Pending or in progress" />
        <StatTile label="Completed" value={grouped.completed.length} icon="certificates" tone="emerald" hint="Each completion earns points" />
        <StatTile label="Overdue" value={overdue.length} icon="analytics" tone="rose" hint="Past the due date" />
      </div>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-64" />
          ))}
        </div>
      ) : error ? (
        <Panel>
          <ErrorState message={error} onRetry={reload} />
        </Panel>
      ) : tasks.length === 0 ? (
        <Panel>
          <EmptyState
            icon={ListChecks}
            title="No tasks assigned"
            description="When a society assigns you work, it will appear here with priority and due dates."
            action={<Link href="/dashboard/societies" className="btn btn-secondary btn-sm">My societies</Link>}
          />
        </Panel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {GROUPS.map((group) => (
            <Panel
              key={group.key}
              title={group.title}
              description={`${grouped[group.key].length} ${grouped[group.key].length === 1 ? "task" : "tasks"}`}
              actions={<span className={`badge badge-${group.tone}`}>{grouped[group.key].length}</span>}
            >
              <div className="space-y-2.5 p-3">
                {grouped[group.key].length === 0 ? (
                  <p className="rounded-xl border border-dashed border-line px-3 py-8 text-center text-[0.74rem] text-mist">
                    Nothing here right now.
                  </p>
                ) : (
                  grouped[group.key].map((task) => (
                    <TaskCard key={task.id} task={task} busy={busyId === task.id} onStatus={changeStatus} />
                  ))
                )}
              </div>
            </Panel>
          ))}
        </div>
      )}

      {grouped.cancelled.length ? (
        <p className="mt-4 text-[0.72rem] text-mist">
          {grouped.cancelled.length} cancelled {grouped.cancelled.length === 1 ? "task is" : "tasks are"} hidden from the board.
        </p>
      ) : null}
    </>
  );
}
