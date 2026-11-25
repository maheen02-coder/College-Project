import { NextResponse } from "next/server";
import { getSessionUser, hasAdminPermission, isAdmin } from "@/lib/auth";

export function ok(data = {}, init) {
  return NextResponse.json({ ok: true, ...data }, init);
}

export function fail(message, status = 400, extra = {}) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

export async function readJson(request) {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? body : {};
  } catch {
    return {};
  }
}

export async function requireUser(roles) {
  const user = await getSessionUser();
  if (!user) return { user: null, response: fail("Authentication required.", 401) };
  if (!user.isActive) return { user: null, response: fail("Account is inactive.", 403) };
  if (roles && roles.length && !roles.includes(user.role)) {
    return { user: null, response: fail("You do not have permission to do that.", 403) };
  }
  return { user, response: null };
}

export async function requireAdmin(permission) {
  const { user, response } = await requireUser();
  if (response) return { user: null, response };
  if (!isAdmin(user)) return { user: null, response: fail("Administrator access required.", 403) };
  if (permission && !hasAdminPermission(user, permission)) {
    return { user: null, response: fail("You do not have permission to do that.", 403) };
  }
  return { user, response: null };
}

export async function requireStudent() {
  const { user, response } = await requireUser(["student"]);
  if (response) return { user: null, response };
  return { user, response: null };
}

export function firstIssue(error) {
  if (!error) return "Invalid request.";
  if (error.issues?.length) {
    const issue = error.issues[0];
    return issue.message || "Invalid request.";
  }
  return error.message || "Invalid request.";
}
