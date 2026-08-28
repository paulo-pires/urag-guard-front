import { modulesPutBody, modulesPutEnableIds } from "./stackModules";
import type { AccountOverview } from "./AccountPanel";

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
