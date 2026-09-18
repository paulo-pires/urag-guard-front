import { modulesPutBody, modulesPutEnableIds } from "./stackModules";
import type { AccountOverview } from "@urag/ui";

async function readJson<T = Record<string, unknown>>(res: Response): Promise<T> {
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

/** Cliente do modal de conta via proxy Identity (`/api/identity/v1/account`). */
export function identityAccountClient(session: string, base = "/api/identity/v1/account") {
  const qs = `session=${encodeURIComponent(session)}`;
  const call = (path: string, init?: RequestInit) => fetch(`${base}${path}?${qs}`, init);

  return {
    get: async () => readJson<AccountOverview>(await call("")),
    putModules: async (modules: { module: string; enabled: boolean }[]) =>
      readJson<AccountOverview>(
        await call("/modules", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ modules }),
        }),
      ),
    invite: async (p: { email: string; name: string; role_id?: string }) =>
      readJson<{ invite_link?: string }>(
        await call("/team/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(p),
        }),
      ),
    assign: async (userId: string, roleId: string) =>
      readJson(
        await call(`/team/${encodeURIComponent(userId)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role_id: roleId }),
        }),
      ),
    createRole: async (p: { name: string; permissions: { app_id: string; permission_level: string }[] }) =>
      readJson(
        await call("/roles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(p),
        }),
      ),
    toggle: async (overview: AccountOverview, id: string, enabled: boolean) =>
      readJson<AccountOverview>(
        await call("/modules", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ modules: modulesPutBody(overview.modules, id, enabled) }),
        }),
      ),
    applyCombo: async (overview: AccountOverview, ids: string[]) =>
      readJson<AccountOverview>(
        await call("/modules", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ modules: modulesPutEnableIds(overview.modules, ids) }),
        }),
      ),
  };
}

export interface TenantOption {
  tenant_id: string;
  tenant_name: string;
  user_id: string;
  current: boolean;
  modules: string[];
}

/** Workspaces onde este e-mail está ativo. */
export async function myTenants(session: string): Promise<TenantOption[]> {
  try {
    const res = await fetch(`/api/identity/v1/me/tenants`, {
      headers: { "X-Session-Token": session },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.tenants || []) as TenantOption[];
  } catch {
    return [];
  }
}

/** Troca de workspace sem novo login. Revalida emitindo nova sessão. */
export async function switchTenant(session: string, tenantId: string): Promise<string> {
  const res = await fetch(`/api/identity/v1/session/switch`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Session-Token": session },
    body: JSON.stringify({ tenant_id: tenantId }),
  });
  if (!res.ok) {
    let fallback = "Não foi possível trocar de workspace.";
    try {
      const data = await res.json();
      fallback = data.error || data.message || fallback;
    } catch {}
    throw new Error(fallback);
  }
  const data = await res.json();
  try {
    localStorage.setItem("identity_session", data.token);
    if (data.user) localStorage.setItem("identity_user", JSON.stringify(data.user));
  } catch {}
  return data.token as string;
}

