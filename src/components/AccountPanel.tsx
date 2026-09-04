"use client";

import { useEffect, useMemo, useState, type ReactNode, type Key } from "react";
import { mergeStackModules, type StackModuleState } from "./stackModules";
import {
  ADDON_CATALOG,
  COMBOS,
  addonsForModule,
  formatBRL,
  moduleById,
  quoteIfToggle,
  quoteModules,
} from "./accountCatalog";

export interface AccountModule extends StackModuleState {
  unit_cents?: number;
}

export interface AccountAddon {
  id: string;
  name: string;
  description?: string;
  active?: boolean;
  included_in_plan?: boolean;
  allow_purchase?: boolean;
  price_cents?: number;
  price_label?: string;
  href?: string;
  unlocks?: string;
  modules?: string[];
}

export interface AccountPlan {
  id: string;
  name: string;
  current: boolean;
  summary?: string;
  price_id?: string;
  price_label?: string;
}

export interface AccountTeamMember {
  id: string;
  email: string;
  name: string;
  status: string;
  permissions?: { app_id: string; permission_level: string }[];
}

export interface AccountRole {
  id: string;
  name: string;
  builtin?: boolean;
  permissions?: { app_id: string; permission_level: string }[];
}

export interface AccountOverview {
  tenant: { id: string; name: string; plan: string; status: string };
  user: { id?: string; email: string; name: string };
  permission_level: string;
  can_contract: boolean;
  can_manage_modules?: boolean;
  can_see_all: boolean;
  modules: AccountModule[];
  addons?: AccountAddon[];
  plans?: AccountPlan[];
  combos?: { id: string; name: string; active?: boolean }[];
  team?: AccountTeamMember[];
  roles?: AccountRole[];
  billingHref?: string;
  pluginsHref?: string;
  teamHref?: string;
  identity_linked?: boolean;
}

const LEVEL_LABEL: Record<string, string> = {
  admin: "Administrador",
  editor: "Gestor",
  viewer: "Colaborador",
  owner: "Proprietário",
  manager: "Gestor",
  member: "Colaborador",
  ADMIN: "Administrador",
  USER: "Colaborador",
};

type TabId = "geral" | "plano" | "modulos" | "addons" | "time";

const ink = "#1A1A1A";
const muted = "#71706F";
const border = "#D3D1CE";
const surface = "#FAF8F5";
const panel = "#F4F1EE";

function NavBtn({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        border: "none",
        borderRadius: 8,
        padding: "8px 10px",
        fontSize: 13,
        fontWeight: active ? 600 : 500,
        cursor: "pointer",
        background: active ? ink : "transparent",
        color: active ? surface : ink,
      }}
    >
      {children}
    </button>
  );
}

function Row({ title, subtitle, action }: { title: string; subtitle?: string; action: ReactNode; key?: Key }) {
  return (
    <li
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 16,
        padding: "14px 0",
        borderBottom: `1px solid ${border}`,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: ink }}>{title}</div>
        {subtitle ? (
          <div style={{ fontSize: 12, color: muted, marginTop: 4, lineHeight: 1.45 }}>{subtitle}</div>
        ) : null}
      </div>
      <div style={{ flexShrink: 0 }}>{action}</div>
    </li>
  );
}

function PrimaryBtn({
  children,
  disabled,
  onClick,
  ghost,
  submit,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  ghost?: boolean;
  submit?: boolean;
}) {
  return (
    <button
      type={submit ? "submit" : "button"}
      disabled={disabled}
      onClick={onClick}
      style={{
        fontSize: 12,
        fontWeight: 600,
        borderRadius: 8,
        border: `1px solid ${ghost ? border : ink}`,
        background: ghost ? surface : ink,
        color: ghost ? ink : surface,
        padding: "7px 12px",
        cursor: disabled ? "wait" : "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function Status({ children, on }: { children: ReactNode; on?: boolean }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        color: on ? "#0f766e" : muted,
      }}
    >
      {children}
    </span>
  );
}

export default function AccountPanel({
  overview,
  busy,
  error,
  onClose,
  onToggleModule,
  onApplyCombo,
  onContractAddon,
  onSelectPlan,
  onInviteMember,
  onAssignRole,
  onCreateRole,
}: {
  overview: AccountOverview;
  busy?: boolean;
  error?: string;
  onClose: () => void;
  onToggleModule?: (id: string, enabled: boolean) => void;
  onApplyCombo?: (moduleIds: string[]) => void;
  onContractAddon?: (id: string) => void;
  onSelectPlan?: (plan: AccountPlan) => void;
  onInviteMember?: (p: { email: string; name: string; role_id?: string }) => Promise<string | void> | void;
  onAssignRole?: (userId: string, roleId: string) => void | Promise<void>;
  onCreateRole?: (p: { name: string; permissions: { app_id: string; permission_level: string }[] }) => void | Promise<void>;
}) {
  const [tab, setTab] = useState<TabId>("modulos");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("preset-viewer");
  const [inviteLink, setInviteLink] = useState("");
  const [newRoleName, setNewRoleName] = useState("");
  const canManageModules = overview.can_manage_modules ?? overview.can_contract;
  const level = LEVEL_LABEL[overview.permission_level] || overview.permission_level || "—";
  const modules = useMemo(
    () =>
      mergeStackModules({
        modules: overview.modules,
        can_see_all: true,
        identityConfigured: overview.identity_linked !== false && overview.modules.length > 0,
      }),
    [overview.modules, overview.identity_linked],
  );
  const enabledIds = modules.filter((m) => m.enabled).map((m) => m.id);
  const quote = quoteModules(enabledIds);
  const addonState = useMemo(() => {
    const byId = new Map((overview.addons || []).map((a) => [a.id, a]));
    return ADDON_CATALOG.map((cat) => {
      const found = byId.get(cat.id);
      return {
        ...cat,
        active: Boolean(found?.active || found?.included_in_plan),
        included_in_plan: Boolean(found?.included_in_plan),
        allow_purchase: found?.allow_purchase ?? !found?.active,
        href: found?.href,
      };
    });
  }, [overview.addons]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const togglePreview = (id: string, enabled: boolean) => quoteIfToggle(enabledIds, id, enabled);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Configurações da conta"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(26,26,26,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <style>{`
        .urag-account-dialog { display:flex; width:min(920px,100%); height:min(680px,92vh); overflow:hidden; background:${surface}; color:${ink}; border:1px solid ${border}; border-radius:16px; box-shadow:0 24px 80px rgba(26,26,26,0.22); }
        .urag-account-nav { width:220px; flex-shrink:0; background:${panel}; border-right:1px solid ${border}; padding:18px 12px; display:flex; flex-direction:column; gap:4px; }
        .urag-account-body { flex:1; min-width:0; overflow:auto; padding:28px 32px 36px; }
        .urag-account-input { width:100%; border:1px solid ${border}; border-radius:8px; padding:8px 10px; font-size:13px; background:${surface}; color:${ink}; }
        @media (max-width: 720px) {
          .urag-account-dialog { flex-direction:column; height:min(92vh,100%); }
          .urag-account-nav { width:100%; flex-direction:row; overflow-x:auto; border-right:none; border-bottom:1px solid ${border}; padding:10px 12px; }
        }
      `}</style>
      <div className="urag-account-dialog" onClick={(e) => e.stopPropagation()}>
        <aside className="urag-account-nav">
          <div style={{ padding: "4px 10px 14px" }}>
            <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: muted }}>
              Conta
            </p>
            <h2 style={{ margin: "4px 0 0", fontSize: 16, fontWeight: 700 }}>Configurações</h2>
          </div>
          <NavBtn active={tab === "geral"} onClick={() => setTab("geral")}>Geral</NavBtn>
          <NavBtn active={tab === "plano"} onClick={() => setTab("plano")}>Planos e combos</NavBtn>
          <NavBtn active={tab === "modulos"} onClick={() => setTab("modulos")}>Módulos</NavBtn>
          <NavBtn active={tab === "addons"} onClick={() => setTab("addons")}>Add-ons</NavBtn>
          <NavBtn active={tab === "time"} onClick={() => setTab("time")}>Time</NavBtn>
        </aside>

        <div className="urag-account-body" style={{ position: "relative" }}>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            style={{
              position: "absolute",
              top: 16,
              right: 18,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontSize: 22,
              color: muted,
            }}
          >
            ×
          </button>

          {error && <p style={{ margin: "0 0 16px", fontSize: 13, color: "#b42318" }}>{error}</p>}

          {tab === "geral" && (
            <>
              <h3 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 650 }}>{overview.tenant.name || "Conta"}</h3>
              <p style={{ margin: "0 0 22px", fontSize: 13, color: muted }}>
                {overview.user.name || overview.user.email}
                {overview.user.email ? ` · ${overview.user.email}` : ""}
              </p>
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                <Row title="Papel nesta conta" subtitle={level} action={<Status on>{level}</Status>} />
                <Row title="Status" subtitle={overview.tenant.status || "active"} action={<Status on>{overview.tenant.status || "active"}</Status>} />
                <Row
                  title="Mensalidade da stack"
                  subtitle={
                    quote.savings_cents > 0
                      ? `${formatBRL(quote.total_cents)}/mês no combo (unitário ${formatBRL(quote.unit_total_cents)})`
                      : `${formatBRL(quote.total_cents)}/mês a preço unitário`
                  }
                  action={<Status on>{formatBRL(quote.total_cents)}</Status>}
                />
              </ul>
              {!overview.can_contract && (
                <p style={{ margin: "18px 0 0", fontSize: 12, color: muted, lineHeight: 1.5 }}>
                  Só o administrador da conta contrata, cancela ou convida. Você vê o catálogo completo.
                </p>
              )}
            </>
          )}

          {tab === "plano" && (
            <>
              <h3 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 650 }}>Planos e combos</h3>
              <p style={{ margin: "0 0 16px", fontSize: 13, color: muted, lineHeight: 1.5 }}>
                Contratar módulos juntos sai mais barato do que um a um. Se você sair de um combo, o
                restante cai num combo menor ou no preço unitário.
              </p>
              <div style={{ padding: "14px 16px", background: panel, borderRadius: 12, border: `1px solid ${border}`, marginBottom: 20 }}>
                <div style={{ fontSize: 13, color: muted }}>Seleção atual</div>
                <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{formatBRL(quote.total_cents)}/mês</div>
                <div style={{ fontSize: 12, color: muted, marginTop: 4 }}>
                  Unitário: {formatBRL(quote.unit_total_cents)}
                  {quote.savings_cents > 0 ? ` · economia ${formatBRL(quote.savings_cents)}` : " · sem combo ativo"}
                </div>
                {quote.combos_applied.length > 0 && (
                  <div style={{ fontSize: 12, marginTop: 8 }}>
                    Combo: {quote.combos_applied.map((c) => c.name).join(", ")}
                  </div>
                )}
                {quote.remainder.length > 0 && (
                  <div style={{ fontSize: 12, color: muted, marginTop: 4 }}>
                    Fora do combo (unitário): {quote.remainder.map((r) => `${r.name} ${formatBRL(r.cents)}`).join(" · ")}
                  </div>
                )}
              </div>
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {COMBOS.map((c) => {
                  const active = quote.combos_applied.some((a) => a.id === c.id);
                  const unit = c.modules.reduce((s, id) => s + (moduleById(id)?.unit_cents || 0), 0);
                  const price = Math.floor((unit * (100 - c.discount_pct)) / 100);
                  return (
                    <Row
                      key={c.id}
                      title={c.name}
                      subtitle={`${c.description} ${c.modules.map((id) => moduleById(id)?.name).join(" + ")}. Unitário ${formatBRL(unit)} → combo ${formatBRL(price)} (−${c.discount_pct}%).`}
                      action={
                        active ? (
                          <Status on>combo ativo</Status>
                        ) : canManageModules && onApplyCombo ? (
                          <PrimaryBtn disabled={busy} onClick={() => onApplyCombo(c.modules)}>
                            Contratar combo
                          </PrimaryBtn>
                        ) : (
                          <Status>{formatBRL(price)}</Status>
                        )
                      }
                    />
                  );
                })}
              </ul>
              {(overview.plans ?? []).length > 0 && (
                <>
                  <h4 style={{ margin: "24px 0 8px", fontSize: 14 }}>Plano de uso do Portal RAG</h4>
                  <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                    {overview.plans!.map((p) => (
                      <Row
                        key={p.id}
                        title={p.name}
                        subtitle={[p.summary, p.price_label].filter(Boolean).join(" · ")}
                        action={
                          p.current ? (
                            <Status on>plano atual</Status>
                          ) : overview.can_contract ? (
                            <PrimaryBtn
                              disabled={busy}
                              onClick={() => {
                                if (onSelectPlan) onSelectPlan(p);
                                else if (overview.billingHref) window.location.assign(overview.billingHref);
                              }}
                            >
                              Assinar
                            </PrimaryBtn>
                          ) : (
                            <Status>indisponível</Status>
                          )
                        }
                      />
                    ))}
                  </ul>
                </>
              )}
            </>
          )}

          {tab === "modulos" && (
            <>
              <h3 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 650 }}>Módulos da plataforma</h3>
              <p style={{ margin: "0 0 18px", fontSize: 13, color: muted, lineHeight: 1.5 }}>
                Todos os fronts da stack. O Proxy é sempre ativo. Cancelar um módulo de combo mostra o
                preço dos que restam.
              </p>
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {modules.map((m) => {
                  const locked = Boolean(m.always_on);
                  const preview = locked ? null : togglePreview(m.id, !m.enabled);
                  const addons = addonsForModule(m.id);
                  const unit = m.unit_cents ?? moduleById(m.id)?.unit_cents ?? 0;
                  return (
                    <li key={m.id} style={{ padding: "14px 0", borderBottom: `1px solid ${border}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>{m.name}</div>
                          <div style={{ fontSize: 12, color: muted, marginTop: 4, lineHeight: 1.45 }}>
                            {m.description}
                            {unit > 0 ? ` · ${formatBRL(unit)}/mês unitário` : " · incluso"}
                            {m.my_access ? ` · seu acesso: ${LEVEL_LABEL[m.my_access] || m.my_access}` : ""}
                          </div>
                          {preview?.message ? (
                            <div style={{ fontSize: 12, color: "#9a3412", marginTop: 6 }}>{preview.message}</div>
                          ) : null}
                          {addons.length > 0 && (
                            <div style={{ fontSize: 11, color: muted, marginTop: 8 }}>
                              Add-ons: {addons.map((a) => a.name).join(", ")}
                            </div>
                          )}
                        </div>
                        {locked ? (
                          <Status on>sempre ativo</Status>
                        ) : canManageModules && onToggleModule ? (
                          <PrimaryBtn ghost={m.enabled} disabled={busy} onClick={() => onToggleModule(m.id, !m.enabled)}>
                            {m.enabled ? "Cancelar" : "Contratar"}
                          </PrimaryBtn>
                        ) : (
                          <Status on={m.enabled}>{m.enabled ? "ativo" : "não contratado"}</Status>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {tab === "addons" && (
            <>
              <h3 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 650 }}>Add-ons</h3>
              <p style={{ margin: "0 0 18px", fontSize: 13, color: muted, lineHeight: 1.5 }}>
                Extras por módulo (WhatsApp, white-label, radar, nós Guard no pipeline…). Independentes
                da mensalidade da stack.
              </p>
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {addonState.map((a) => {
                  const canBuy = overview.can_contract && a.allow_purchase && onContractAddon && !a.active;
                  return (
                    <Row
                      key={a.id}
                      title={a.name}
                      subtitle={[
                        a.description,
                        a.unlocks,
                        `Módulos: ${a.modules.map((id) => moduleById(id)?.name || id).join(", ")}`,
                        `${formatBRL(a.unit_cents)}`,
                      ].join(" · ")}
                      action={
                        a.included_in_plan ? (
                          <Status on>incluso no plano</Status>
                        ) : a.active ? (
                          <Status on>ativo</Status>
                        ) : canBuy ? (
                          <PrimaryBtn disabled={busy} onClick={() => onContractAddon(a.id)}>
                            Contratar
                          </PrimaryBtn>
                        ) : (
                          <Status>não contratado</Status>
                        )
                      }
                    />
                  );
                })}
              </ul>
            </>
          )}

          {tab === "time" && (
            <>
              <h3 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 650 }}>Time e papéis</h3>
              <p style={{ margin: "0 0 18px", fontSize: 13, color: muted, lineHeight: 1.5 }}>
                Convide pessoas, crie papéis e libere acesso por módulo (o mesmo modelo do Identity).
              </p>
              {(overview.team ?? []).length === 0 && (
                <p style={{ fontSize: 13, color: muted }}>
                  {overview.identity_linked === false
                    ? "Sessão Identity ausente — o time da stack ainda não carregou."
                    : "Nenhum membro listado."}
                </p>
              )}
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {(overview.team ?? []).map((m) => (
                  <Row
                    key={m.id}
                    title={m.name || m.email}
                    subtitle={`${m.email} · ${m.status}${
                      m.permissions?.length
                        ? " · " + m.permissions.map((p) => `${moduleById(p.app_id)?.name || p.app_id}:${LEVEL_LABEL[p.permission_level] || p.permission_level}`).join(", ")
                        : ""
                    }`}
                    action={
                      overview.can_contract && onAssignRole && (overview.roles ?? []).length > 0 ? (
                        <select
                          className="urag-account-input"
                          style={{ width: 180 }}
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) onAssignRole(m.id, e.target.value);
                          }}
                        >
                          <option value="">Aplicar papel…</option>
                          {(overview.roles ?? []).map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Status on={m.status === "active"}>{m.status}</Status>
                      )
                    }
                  />
                ))}
              </ul>

              {overview.can_contract && onInviteMember && (
                <form
                  style={{ marginTop: 22, display: "grid", gap: 8 }}
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!inviteEmail.trim()) return;
                    const link = await onInviteMember({
                      email: inviteEmail.trim(),
                      name: inviteName.trim(),
                      role_id: inviteRole,
                    });
                    if (typeof link === "string" && link) setInviteLink(link);
                    setInviteEmail("");
                    setInviteName("");
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Convidar</div>
                  <input className="urag-account-input" placeholder="E-mail" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                  <input className="urag-account-input" placeholder="Nome (opcional)" value={inviteName} onChange={(e) => setInviteName(e.target.value)} />
                  <select className="urag-account-input" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                    {(overview.roles ?? [
                      { id: "preset-viewer", name: "Colaborador" },
                      { id: "preset-editor", name: "Gestor" },
                      { id: "preset-admin", name: "Administrador" },
                    ]).map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <PrimaryBtn submit disabled={busy}>Enviar convite</PrimaryBtn>
                </form>
              )}
              {inviteLink && (
                <p style={{ marginTop: 12, fontSize: 12, color: muted, wordBreak: "break-all" }}>
                  Link do convite (copie e envie): {inviteLink}
                </p>
              )}

              {overview.can_contract && onCreateRole && (
                <form
                  style={{ marginTop: 22, display: "grid", gap: 8 }}
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newRoleName.trim()) return;
                    onCreateRole({
                      name: newRoleName.trim(),
                      permissions: modules.map((m) => ({ app_id: m.id, permission_level: "viewer" })),
                    });
                    setNewRoleName("");
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Novo papel</div>
                  <p style={{ margin: 0, fontSize: 12, color: muted }}>
                    Cria um papel com acesso de colaborador em todos os módulos (ajuste depois no Identity).
                  </p>
                  <input className="urag-account-input" placeholder="Nome do papel" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} />
                  <PrimaryBtn submit ghost disabled={busy}>Criar papel</PrimaryBtn>
                </form>
              )}

              {(overview.roles ?? []).filter((r) => !r.builtin).length > 0 && (
                <div style={{ marginTop: 18, fontSize: 12, color: muted }}>
                  Papéis customizados: {(overview.roles ?? []).filter((r) => !r.builtin).map((r) => r.name).join(", ")}
                </div>
              )}
              {overview.teamHref && (
                <p style={{ marginTop: 16 }}>
                  <a href={overview.teamHref} style={{ fontSize: 13, fontWeight: 600, color: ink }}>
                    Time do Portal RAG (assentos) →
                  </a>
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
