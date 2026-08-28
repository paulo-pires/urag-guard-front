import { useEffect, useState } from "react";
import AccountPanel, { type AccountOverview } from "./AccountPanel";
import { identityAccountClient } from "./identityAccount";

function readSession(): string {
  try {
    const match = document.cookie.match(/(?:^|;\s*)identity_session=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  } catch {
    // ignore
  }
  try {
    return localStorage.getItem("identity_session") || "";
  } catch {
    return "";
  }
}

function roleLabel(level: string) {
  const map: Record<string, string> = {
    admin: "Administrador",
    editor: "Gestor",
    viewer: "Colaborador",
    owner: "Proprietário",
    manager: "Gestor",
    member: "Colaborador",
  };
  return map[level] || level || "Conta";
}

function initials(name: string) {
  const t = name.trim();
  return t ? t.charAt(0).toUpperCase() : "?";
}

export default function AccountLauncher({ collapsed }: { collapsed?: boolean }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState<AccountOverview | null>(null);

  const apply = (acc: AccountOverview) => {
    setOverview({
      ...acc,
      identity_linked: acc.identity_linked !== false,
      can_manage_modules: acc.can_manage_modules ?? acc.can_contract,
    });
  };

  const client = () => identityAccountClient(readSession());

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível atualizar a conta");
    } finally {
      setBusy(false);
    }
  };

  const reload = async () => {
    const session = readSession();
    if (!session) throw new Error("Sessão Identity ausente");
    apply(await client().get());
  };

  useEffect(() => {
    const session = readSession();
    if (!session) return;
    client().get().then(apply).catch(() => undefined);
  }, []);

  const load = async () => {
    setOpen(true);
    setError("");
    const session = readSession();
    if (!session) {
      apply({
        tenant: { id: "", name: "Sem sessão", plan: "—", status: "—" },
        user: { email: "", name: "" },
        permission_level: "",
        can_contract: false,
        can_see_all: false,
        modules: [],
        identity_linked: false,
      });
      return;
    }
    try {
      apply(await client().get());
    } catch {
      apply({
        tenant: { id: "", name: "Identity inacessível", plan: "—", status: "—" },
        user: { email: "", name: "" },
        permission_level: "",
        can_contract: false,
        can_see_all: false,
        modules: [],
        identity_linked: false,
      });
    }
  };

  const name = overview?.user.name || overview?.user.email || "Conta";
  const role = overview ? roleLabel(overview.permission_level) : "tenant / time";
  const can = Boolean(overview?.can_contract);

  return (
    <>
      <button
        type="button"
        onClick={() => void load()}
        title="Conta, tenant e time"
        className="w-full flex items-center gap-2.5 rounded-xl border border-[#D3D1CE] bg-[#FAF8F5] px-2.5 py-2 text-left hover:bg-[#EBE7E2] transition-colors"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1A1A1A] text-[11px] font-bold text-[#F4F1EE]">
          {initials(name)}
        </span>
        {!collapsed && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-[#1A1A1A]">{name}</span>
            <span className="block truncate text-[10px] uppercase tracking-wider text-[#71706F]">{role}</span>
          </span>
        )}
      </button>
      {open && overview && (
        <AccountPanel
          overview={overview}
          busy={busy}
          error={error}
          onClose={() => setOpen(false)}
          onToggleModule={can ? (id, enabled) => void run(async () => apply(await client().toggle(overview, id, enabled))) : undefined}
          onApplyCombo={can ? (ids) => void run(async () => apply(await client().applyCombo(overview, ids))) : undefined}
          onInviteMember={
            can
              ? async (p) => {
                  let link: string | undefined;
                  await run(async () => {
                    const out = await client().invite(p);
                    link = out.invite_link;
                    await reload();
                  });
                  return link;
                }
              : undefined
          }
          onAssignRole={can ? (userId, roleId) => void run(async () => { await client().assign(userId, roleId); await reload(); }) : undefined}
          onCreateRole={can ? (p) => void run(async () => { await client().createRole(p); await reload(); }) : undefined}
        />
      )}
    </>
  );
}
