"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Loader2, RefreshCw, ScrollText, TriangleAlert } from "lucide-react";
import {
  Alert,
  ConsoleHeading,
  FilterSelect,
  Panel,
  SearchBox,
  Toolbar,
  useApi,
  useDebounced,
} from "@/components/layout/ui";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime, timeAgo } from "@/lib/utils";

const ROLE_TONE = {
  superadmin: "badge-violet",
  admin: "badge-blue",
  organizer: "badge-amber",
  student: "badge-slate",
};

function uniqueOptions(values) {
  return Array.from(new Set(values.filter(Boolean))).sort().map((value) => ({ value, label: value }));
}

export default function AdminLogsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const q = useDebounced(search, 350);
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [actor, setActor] = useState("");
  const [limit, setLimit] = useState("100");
  const [expanded, setExpanded] = useState("");

  const url = useMemo(() => {
    const params = new URLSearchParams({ limit });
    if (q.trim()) params.set("q", q.trim());
    if (action) params.set("action", action);
    if (entityType) params.set("entityType", entityType);
    if (actor) params.set("actor", actor);
    return `/api/admin/logs?${params.toString()}`;
  }, [q, action, entityType, actor, limit]);

  const { data, loading, error, reload } = useApi(url);
  const logs = data?.logs || [];

  const actorOptions = useMemo(() => {
    const map = new Map();
    logs.forEach((log) => {
      if (log.actor) map.set(log.actor, log.actorName || "Unknown actor");
    });
    if (actor && !map.has(actor)) map.set(actor, "Selected actor");
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [logs, actor]);

  const actionOptions = useMemo(() => {
    const options = uniqueOptions(logs.map((log) => log.action));
    if (action && !options.some((option) => option.value === action)) options.unshift({ value: action, label: action });
    return options;
  }, [logs, action]);

  const entityOptions = useMemo(() => {
    const options = uniqueOptions(logs.map((log) => log.entityType));
    if (entityType && !options.some((option) => option.value === entityType)) {
      options.unshift({ value: entityType, label: entityType });
    }
    return options;
  }, [logs, entityType]);

  const hasFilters = Boolean(q || action || entityType || actor);
  const forbidden = Boolean(error && /permission|access/i.test(error));

  const reset = () => {
    setSearch("");
    setAction("");
    setEntityType("");
    setActor("");
  };

  return (
    <div className="space-y-5">
      <ConsoleHeading
        eyebrow="System audit"
        title="Activity logs"
        description="Every administrative mutation is recorded with its actor, entity and optional metadata. Newest entries first."
        actions={
          <button type="button" onClick={reload} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} /> Refresh
          </button>
        }
      />

      {forbidden ? (
        <Alert tone="error">
          Your admin role does not include the <strong>Activity logs</strong> permission. Ask a superadmin to grant
          <span className="font-mono"> view_logs</span>.
        </Alert>
      ) : null}

      <Panel>
        <Toolbar>
          <SearchBox value={search} onChange={setSearch} placeholder="Search the log summary…" />
          <FilterSelect value={action} onChange={setAction} options={actionOptions} placeholder="All actions" />
          <FilterSelect value={entityType} onChange={setEntityType} options={entityOptions} placeholder="All entity types" />
          <FilterSelect value={actor} onChange={setActor} options={actorOptions} placeholder="All actors" />
          <FilterSelect
            value={limit}
            onChange={setLimit}
            options={[
              { value: "50", label: "50 entries" },
              { value: "100", label: "100 entries" },
              { value: "200", label: "200 entries" },
            ]}
          />
          {hasFilters ? (
            <button type="button" onClick={reset} className="btn btn-ghost btn-sm">
              Clear
            </button>
          ) : null}
        </Toolbar>

        <div className="overflow-x-auto">
          <table className="table-console">
            <thead>
              <tr>
                <th className="w-8" />
                <th>Time</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Summary</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="!py-12 text-center">
                    <span className="inline-flex items-center gap-2 text-[0.8rem] text-mist">
                      <Loader2 size={16} className="animate-spin" /> Loading activity…
                    </span>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="!py-12 text-center">
                    <span className="inline-flex items-center gap-2 text-[0.8rem] text-rose-600">
                      <TriangleAlert size={16} /> {error}
                    </span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="!py-14 text-center">
                    <span className="mx-auto flex max-w-xs flex-col items-center gap-2 text-[0.8rem] text-mist">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lavender text-purple">
                        <ScrollText size={18} />
                      </span>
                      No activity matches these filters.
                    </span>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const open = expanded === log.id;
                  const metaText = log.meta && Object.keys(log.meta).length
                    ? JSON.stringify(log.meta, null, 2)
                    : "";
                  return (
                    <Fragment key={log.id}>
                      <tr>
                        <td className="!pr-0">
                          {metaText ? (
                            <button
                              type="button"
                              onClick={() => setExpanded(open ? "" : log.id)}
                              className="grid h-6 w-6 place-items-center rounded-md border border-line text-mist transition hover:border-violet-300 hover:text-purple"
                              aria-label={open ? "Hide metadata" : "Show metadata"}
                            >
                              {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                            </button>
                          ) : (
                            <span className="block h-6 w-6" />
                          )}
                        </td>
                        <td className="whitespace-nowrap">
                          <span className="font-mono text-[0.72rem] text-ink-2">{formatDateTime(log.createdAt)}</span>
                          <span className="mt-0.5 block text-[0.64rem] text-mist">{timeAgo(log.createdAt)}</span>
                        </td>
                        <td>
                          <p className="text-[0.78rem] font-medium text-ink">{log.actorName || "System"}</p>
                          {log.actorRole ? (
                            <span className={`badge mt-1 ${ROLE_TONE[log.actorRole] || "badge-slate"}`}>{log.actorRole}</span>
                          ) : null}
                        </td>
                        <td>
                          <span className="chip font-mono !text-[0.66rem]">{log.action}</span>
                        </td>
                        <td className="whitespace-nowrap">
                          <p className="text-[0.76rem] text-ink-2">{log.entityType || "—"}</p>
                          {log.entityId ? (
                            <p className="font-mono text-[0.62rem] text-mist">…{log.entityId.slice(-6)}</p>
                          ) : null}
                        </td>
                        <td>
                          <p className="max-w-[28rem] truncate text-[0.78rem] text-ink-2" title={log.summary}>
                            {log.summary || "—"}
                          </p>
                        </td>
                      </tr>
                      {open && metaText ? (
                        <tr className="!bg-ivory/70">
                          <td colSpan={6} className="!pb-4">
                            <pre className="max-h-64 overflow-auto rounded-xl border border-line bg-white p-3 font-mono text-[0.68rem] leading-relaxed text-ink-2">
                              {metaText}
                            </pre>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-4 py-2.5 text-[0.72rem] text-mist">
          Showing {logs.length} most recent {logs.length === 1 ? "entry" : "entries"}
          {hasFilters ? " matching the filters" : ""} · newest first
        </div>
      </Panel>

      <Panel className="bg-lavender/40">
        <div className="flex flex-wrap items-center gap-2 px-5 py-4 text-[0.74rem] text-mist">
          <ScrollText size={15} className="text-purple" />
          Filters map to the log API: <span className="font-mono">q</span> searches summaries,
          <span className="font-mono"> action</span> matches prefixes and <span className="font-mono">actor</span> must be a
          user id. Actor and action lists are derived from the entries currently loaded.
          <button
            type="button"
            onClick={() => {
              if (!logs.length) {
                toast("There are no entries to copy.", "info");
                return;
              }
              const text = logs
                .map((log) => `${log.createdAt} · ${log.actorName || "System"} · ${log.action} · ${log.summary}`)
                .join("\n");
              navigator.clipboard
                ?.writeText(text)
                .then(() => toast("Loaded entries copied to clipboard.", "success"))
                .catch(() => toast("Clipboard access was blocked.", "error"));
            }}
            className="btn btn-ghost btn-sm ml-auto"
          >
            Copy visible log
          </button>
        </div>
      </Panel>
    </div>
  );
}
