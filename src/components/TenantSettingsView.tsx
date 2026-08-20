import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  Cpu,
  Shield,
  UserPlus,
  ChevronDown,
  Trash2,
  ArrowUp,
  ArrowDown,
  X,
  Save,
  RotateCcw,
  AlertTriangle,
  Check,
  Mail,
  Crown,
  Settings,
  Zap,
  Lock,
} from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────────────

interface TenantMember {
  id: string;
  email: string;
  name: string;
  role: "owner" | "admin" | "member";
  status: "active" | "invited" | "suspended";
  joined_at: string;
}

interface ModelRouterRule {
  id: string;
  taskType: "code" | "long_text" | "vision" | "reasoning" | "fast";
  preferredModel: string;
  fallbackModel: string;
  priority: number;
}

interface TenantSettings {
  modelRouterEnabled: boolean;
  modelRouterRules: ModelRouterRule[];
  defaultModel: string;
  memberPermissions: {
    canCreateWorkflows: boolean;
    canPublishApps: boolean;
    canViewObservabilityLogs: boolean;
    canCallProxyLLM: boolean;
    canViewTokenCosts: boolean;
    canInviteMembers: boolean;
  };
}

type SettingsTab = "members" | "model-router" | "permissions";

// ── Available Models (mock) ──────────────────────────────────────────────────

const AVAILABLE_MODELS = [
  { id: "deepseek-v3", name: "DeepSeek V3", provider: "DeepSeek" },
  { id: "claude-sonnet-4", name: "Claude Sonnet 4", provider: "Anthropic" },
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "Google" },
  { id: "mistral-large", name: "Mistral Large", provider: "Mistral" },
  { id: "llama-3.1-405b", name: "Llama 3.1 405B", provider: "Meta" },
];

const TASK_TYPE_OPTIONS = [
  { value: "code", label: "Código", icon: "🧑‍💻", hint: "DeepSeek recomendado" },
  { value: "long_text", label: "Texto Longo", icon: "📄", hint: "Claude recomendado" },
  { value: "vision", label: "Visão", icon: "🖼️", hint: "Gemini recomendado" },
  { value: "reasoning", label: "Raciocínio", icon: "🧠", hint: "Claude ou GPT-4o" },
  { value: "fast", label: "Rápido/Econômico", icon: "⚡", hint: "Mistral recomendado" },
] as const;

const DEFAULT_ROUTER_RULES: Omit<ModelRouterRule, "id">[] = [
  { taskType: "code", preferredModel: "deepseek-v3", fallbackModel: "", priority: 1 },
  { taskType: "long_text", preferredModel: "claude-sonnet-4", fallbackModel: "gpt-4o", priority: 2 },
  { taskType: "vision", preferredModel: "gemini-2.5-flash", fallbackModel: "", priority: 3 },
  { taskType: "reasoning", preferredModel: "claude-sonnet-4", fallbackModel: "gpt-4o", priority: 4 },
  { taskType: "fast", preferredModel: "mistral-large", fallbackModel: "", priority: 5 },
];

// ── Helper: Role badge ──────────────────────────────────────────────────────

const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  const styles: Record<string, string> = {
    owner: "bg-amber-100 text-amber-800 border-amber-200",
    admin: "bg-blue-100 text-blue-800 border-blue-200",
    member: "bg-neutral-100 text-neutral-600 border-neutral-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${styles[role] || styles.member}`}
    >
      {role === "owner" && <Crown size={10} className="mr-1" />}
      {role}
    </span>
  );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    invited: "bg-amber-50 text-amber-700 border-amber-200",
    suspended: "bg-rose-50 text-rose-700 border-rose-200",
  };
  const labels: Record<string, string> = {
    active: "Ativo",
    invited: "Convidado",
    suspended: "Suspenso",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${styles[status] || styles.active}`}
    >
      {labels[status] || status}
    </span>
  );
};

// ── Members Tab ─────────────────────────────────────────────────────────────

const MembersTab: React.FC<{
  currentRole: "owner" | "admin" | "member";
  currentUserEmail: string;
}> = ({ currentRole, currentUserEmail }) => {
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const canEdit = currentRole === "owner" || currentRole === "admin";

  const loadMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/tenant/members");
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } catch {
      // Use demo data
      setMembers([
        {
          id: "1",
          email: currentUserEmail,
          name: "Você",
          role: currentRole,
          status: "active",
          joined_at: "2026-01-15",
        },
      ]);
    }
  }, [currentRole, currentUserEmail]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    try {
      const res = await fetch("/api/tenant/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      if (res.ok) {
        setMembers((prev) => [
          ...prev,
          {
            id: `inv-${Date.now()}`,
            email: inviteEmail,
            name: inviteEmail.split("@")[0],
            role: inviteRole,
            status: "invited",
            joined_at: new Date().toISOString(),
          },
        ]);
        setInviteEmail("");
        setShowInviteModal(false);
      }
    } catch {
      // silently fail
    }
  };

  const handleAction = async (memberId: string, action: string) => {
    setActionMenuOpen(null);
    try {
      const res = await fetch(`/api/tenant/members/${memberId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        loadMembers();
      }
    } catch {
      // silently fail
    }
  };

  const getActionsForRole = (member: TenantMember) => {
    if (member.email === currentUserEmail) return [];
    if (member.role === "owner") return [];
    if (currentRole === "owner") {
      return [
        ...(member.role === "admin"
          ? [{ label: "Rebaixar a Member", action: "demote", icon: ArrowDown }]
          : [{ label: "Promover a Admin", action: "promote", icon: ArrowUp }]),
        { label: "Suspender", action: "suspend", icon: AlertTriangle },
        { label: "Remover", action: "remove", icon: Trash2 },
      ];
    }
    if (currentRole === "admin" && member.role === "member") {
      return [
        { label: "Promover a Admin", action: "promote", icon: ArrowUp },
        { label: "Suspender", action: "suspend", icon: AlertTriangle },
        { label: "Remover", action: "remove", icon: Trash2 },
      ];
    }
    return [];
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#1A1A1A]">Membros do Tenant</h3>
          <p className="text-[11px] text-[#71706F] mt-0.5">
            {members.length} {members.length === 1 ? "membro" : "membros"}
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1A1A] text-white rounded text-[11px] font-bold hover:bg-[#333] transition-colors"
          >
            <UserPlus size={12} /> Convidar membro
          </button>
        )}
      </div>

      {/* Members Table */}
      <div className="bg-white border border-[#D3D1CE] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#D3D1CE] bg-[#FAF8F5]">
              <th className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-[#71706F]">
                Membro
              </th>
              <th className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-[#71706F]">
                Role
              </th>
              <th className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-[#71706F]">
                Status
              </th>
              <th className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-[#71706F]">
                Entrada
              </th>
              {canEdit && (
                <th className="text-right px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-[#71706F]">
                  Ações
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <Users className="mx-auto mb-2 text-[#D3D1CE]" size={32} />
                  <p className="text-sm text-[#71706F]">
                    Nenhum membro além de você. Convide colaboradores para trabalhar juntos.
                  </p>
                </td>
              </tr>
            ) : (
              members.map((m) => {
                const actions = getActionsForRole(m);
                return (
                  <tr key={m.id} className="border-b border-[#D3D1CE] last:border-0 hover:bg-[#FAF8F5] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#1A1A1A]/10 flex items-center justify-center text-[11px] font-bold text-[#1A1A1A]">
                          {m.name?.[0]?.toUpperCase() || m.email[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[#1A1A1A]">{m.name}</p>
                          <p className="text-[10px] text-[#71706F]">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={m.role} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={m.status} />
                    </td>
                    <td className="px-4 py-3 text-[11px] text-[#71706F] font-mono">
                      {new Date(m.joined_at).toLocaleDateString("pt-BR")}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right relative">
                        {actions.length > 0 && (
                          <div className="relative inline-block">
                            <button
                              onClick={() =>
                                setActionMenuOpen(actionMenuOpen === m.id ? null : m.id)
                              }
                              className="p-1 rounded hover:bg-[#EBE7E2] text-[#71706F] hover:text-[#1A1A1A] transition-colors"
                            >
                              <Settings size={14} />
                            </button>
                            {actionMenuOpen === m.id && (
                              <div className="absolute right-0 mt-1 w-48 bg-white border border-[#D3D1CE] rounded-lg shadow-lg z-50 py-1">
                                {actions.map((a) => (
                                  <button
                                    key={a.action}
                                    onClick={() => handleAction(m.id, a.action)}
                                    className={`flex items-center gap-2 w-full px-3 py-2 text-[11px] hover:bg-[#FAF8F5] text-left transition-colors ${
                                      a.action === "remove"
                                        ? "text-rose-600 hover:bg-rose-50"
                                        : "text-[#1A1A1A]"
                                    }`}
                                  >
                                    <a.icon size={12} />
                                    {a.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl border border-[#D3D1CE] shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[#1A1A1A]">Convidar Membro</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-1 rounded hover:bg-[#EBE7E2] text-[#71706F]"
              >
                <X size={14} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#71706F] block mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colaborador@empresa.com"
                  className="w-full border border-[#D3D1CE] rounded px-3 py-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A] bg-[#FAF8F5]"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#71706F] block mb-1">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "member" | "admin")}
                  className="w-full border border-[#D3D1CE] rounded px-3 py-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A] bg-[#FAF8F5]"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-3 py-2 rounded text-xs font-bold text-[#71706F] hover:bg-[#EBE7E2] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleInvite}
                  disabled={!inviteEmail.trim()}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#1A1A1A] text-white rounded text-xs font-bold hover:bg-[#333] disabled:opacity-40 transition-colors"
                >
                  <Mail size={12} /> Enviar convite
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Model Router Tab ────────────────────────────────────────────────────────

const ModelRouterTab: React.FC<{ canEdit: boolean }> = ({ canEdit }) => {
  const [enabled, setEnabled] = useState(false);
  const [rules, setRules] = useState<ModelRouterRule[]>([]);
  const [defaultModel, setDefaultModel] = useState("deepseek-v3");
  const [saving, setSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    // Load from API or use defaults
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/tenant/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.model_router) {
            setEnabled(data.model_router.enabled ?? false);
            setRules(data.model_router.rules ?? []);
            setDefaultModel(data.model_router.default_model ?? "deepseek-v3");
            return;
          }
        }
      } catch {
        // Use defaults
      }
    };
    loadSettings();
  }, []);

  const addRule = () => {
    const usedTypes = rules.map((r) => r.taskType);
    const nextType = TASK_TYPE_OPTIONS.find((t) => !usedTypes.includes(t.value));
    setRules((prev) => [
      ...prev,
      {
        id: `rule-${Date.now()}`,
        taskType: nextType?.value || "fast",
        preferredModel: "deepseek-v3",
        fallbackModel: "",
        priority: prev.length + 1,
      },
    ]);
  };

  const removeRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRule = (id: string, field: string, value: string | number) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const restoreDefaults = () => {
    setRules(
      DEFAULT_ROUTER_RULES.map((r, i) => ({
        ...r,
        id: `rule-default-${i}`,
      }))
    );
    setDefaultModel("deepseek-v3");
    setEnabled(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/tenant/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model_router: {
            enabled,
            rules,
            default_model: defaultModel,
          },
        }),
      });
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 3000);
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toggle + Description */}
      <div className="flex items-start gap-4 p-4 bg-white border border-[#D3D1CE] rounded-lg">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-[#1A1A1A]" />
            <h3 className="text-sm font-bold text-[#1A1A1A]">
              Roteamento Inteligente de Modelos
            </h3>
          </div>
          <p className="text-[11px] text-[#71706F] mt-1 leading-relaxed">
            Quando ativo, o sistema seleciona automaticamente o melhor modelo de IA para cada tarefa,
            otimizando custo e qualidade.
          </p>
          {!canEdit && (
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
              <Lock size={10} />
              Apenas administradores podem alterar esta configuração
            </div>
          )}
        </div>
        <button
          onClick={() => canEdit && setEnabled(!enabled)}
          disabled={!canEdit}
          className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${
            enabled ? "bg-[#1A1A1A]" : "bg-[#D3D1CE]"
          } ${!canEdit ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <div
            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
              enabled ? "translate-x-6" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {/* Rules Table */}
      {enabled && (
        <div className="bg-white border border-[#D3D1CE] rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#D3D1CE] bg-[#FAF8F5]">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-[#1A1A1A]">Regras de Roteamento</h4>
              <span className="px-1.5 py-0.5 bg-[#1A1A1A]/10 rounded text-[9px] font-mono text-[#71706F]">
                {rules.length} {rules.length === 1 ? "regra" : "regras"}
              </span>
            </div>
            {canEdit && (
              <button
                onClick={addRule}
                className="text-[10px] font-bold text-[#1A1A1A] hover:bg-[#EBE7E2] px-2 py-1 rounded transition-colors"
              >
                + Adicionar regra
              </button>
            )}
          </div>
          <div className="divide-y divide-[#D3D1CE]">
            {rules.map((rule) => {
              const taskInfo = TASK_TYPE_OPTIONS.find((t) => t.value === rule.taskType);
              return (
                <div key={rule.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#FAF8F5] transition-colors">
                  {/* Task Type */}
                  <div className="w-32 shrink-0">
                    <select
                      value={rule.taskType}
                      onChange={(e) => updateRule(rule.id, "taskType", e.target.value)}
                      disabled={!canEdit}
                      className="w-full border border-[#D3D1CE] rounded px-2 py-1.5 text-[11px] text-[#1A1A1A] bg-white focus:outline-none focus:border-[#1A1A1A]"
                    >
                      {TASK_TYPE_OPTIONS.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.icon} {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Preferred Model */}
                  <div className="flex-1">
                    <select
                      value={rule.preferredModel}
                      onChange={(e) => updateRule(rule.id, "preferredModel", e.target.value)}
                      disabled={!canEdit}
                      className="w-full border border-[#D3D1CE] rounded px-2 py-1.5 text-[11px] text-[#1A1A1A] bg-white focus:outline-none focus:border-[#1A1A1A]"
                    >
                      {AVAILABLE_MODELS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.provider})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Fallback Model */}
                  <div className="flex-1">
                    <select
                      value={rule.fallbackModel}
                      onChange={(e) => updateRule(rule.id, "fallbackModel", e.target.value)}
                      disabled={!canEdit}
                      className="w-full border border-[#D3D1CE] rounded px-2 py-1.5 text-[11px] text-[#71706F] bg-white focus:outline-none focus:border-[#1A1A1A]"
                    >
                      <option value="">Sem fallback</option>
                      {AVAILABLE_MODELS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.provider})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Priority */}
                  <div className="w-16 shrink-0">
                    <input
                      type="number"
                      value={rule.priority}
                      onChange={(e) =>
                        updateRule(rule.id, "priority", parseInt(e.target.value) || 1)
                      }
                      disabled={!canEdit}
                      min={1}
                      className="w-full border border-[#D3D1CE] rounded px-2 py-1.5 text-[11px] text-center text-[#1A1A1A] bg-white focus:outline-none focus:border-[#1A1A1A]"
                    />
                  </div>

                  {/* Remove */}
                  {canEdit && (
                    <button
                      onClick={() => removeRule(rule.id)}
                      className="p-1.5 rounded hover:bg-rose-50 text-[#71706F] hover:text-rose-600 transition-colors shrink-0"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Default Model */}
      {enabled && (
        <div className="bg-white border border-[#D3D1CE] rounded-lg p-4">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#71706F] block mb-1.5">
            Modelo padrão (fallback global)
          </label>
          <p className="text-[10px] text-[#71706F] mb-2">
            Quando nenhuma regra se aplicar, usar:
          </p>
          <select
            value={defaultModel}
            onChange={(e) => setDefaultModel(e.target.value)}
            disabled={!canEdit}
            className="w-full border border-[#D3D1CE] rounded px-3 py-2 text-xs text-[#1A1A1A] bg-[#FAF8F5] focus:outline-none focus:border-[#1A1A1A]"
          >
            {AVAILABLE_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.provider})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Actions */}
      {enabled && canEdit && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1A1A1A] text-white rounded text-xs font-bold hover:bg-[#333] disabled:opacity-60 transition-colors"
          >
            {saving ? (
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={12} />
            )}
            {saving ? "Salvando..." : "Salvar configurações"}
          </button>
          <button
            onClick={restoreDefaults}
            className="flex items-center gap-1.5 px-4 py-2 border border-[#D3D1CE] text-[#71706F] rounded text-xs font-bold hover:bg-[#EBE7E2] transition-colors"
          >
            <RotateCcw size={12} /> Restaurar padrões
          </button>
          {showSaved && (
            <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
              <Check size={12} /> Salvo!
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// ── Permissions Tab ─────────────────────────────────────────────────────────

const PermissionsTab: React.FC = () => {
  const [permissions, setPermissions] = useState<TenantSettings["memberPermissions"]>({
    canCreateWorkflows: true,
    canPublishApps: true,
    canViewObservabilityLogs: true,
    canCallProxyLLM: true,
    canViewTokenCosts: false,
    canInviteMembers: false,
  });
  const [saving, setSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [transferEmail, setTransferEmail] = useState("");
  const [confirmProjectName, setConfirmProjectName] = useState("");
  const [showTransferModal, setShowTransferModal] = useState(false);

  const togglePermission = (key: keyof typeof permissions) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/tenant/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_permissions: permissions }),
      });
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 3000);
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferEmail || !confirmProjectName) return;
    try {
      const res = await fetch("/api/tenant/transfer-ownership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          new_owner_email: transferEmail,
          confirm_project_name: confirmProjectName,
        }),
      });
      if (res.ok) {
        setShowTransferModal(false);
        setTransferEmail("");
        setConfirmProjectName("");
      }
    } catch {
      // silently fail
    }
  };

  const permissionConfig: { key: keyof typeof permissions; label: string; default: boolean }[] = [
    { key: "canCreateWorkflows", label: "Members podem criar novos workflows", default: true },
    { key: "canPublishApps", label: "Members podem publicar apps", default: true },
    { key: "canViewObservabilityLogs", label: "Members podem ver logs de observabilidade", default: true },
    { key: "canCallProxyLLM", label: "Members podem chamar o proxy LLM diretamente", default: true },
    { key: "canViewTokenCosts", label: "Members podem ver custos de tokens", default: false },
    { key: "canInviteMembers", label: "Members podem convidar outros members", default: false },
  ];

  return (
    <div className="space-y-6">
      {/* Permissions Section */}
      <div className="bg-white border border-[#D3D1CE] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#D3D1CE] bg-[#FAF8F5]">
          <h3 className="text-xs font-bold text-[#1A1A1A] flex items-center gap-2">
            <Shield size={14} /> Permissões de Membros
          </h3>
          <p className="text-[10px] text-[#71706F] mt-0.5">
            Configure o que members (não admins) podem fazer no tenant.
          </p>
        </div>
        <div className="divide-y divide-[#D3D1CE]">
          {permissionConfig.map((p) => (
            <div key={p.key} className="flex items-center justify-between px-4 py-3 hover:bg-[#FAF8F5] transition-colors">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#1A1A1A]">{p.label}</span>
                <span className="text-[9px] text-[#71706F]">(padrão: {p.default ? "sim" : "não"})</span>
              </div>
              <button
                onClick={() => togglePermission(p.key)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  permissions[p.key] ? "bg-[#1A1A1A]" : "bg-[#D3D1CE]"
                }`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    permissions[p.key] ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#1A1A1A] text-white rounded text-xs font-bold hover:bg-[#333] disabled:opacity-60 transition-colors"
        >
          {saving ? (
            <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save size={12} />
          )}
          {saving ? "Salvando..." : "Salvar"}
        </button>
        {showSaved && (
          <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
            <Check size={12} /> Salvo!
          </span>
        )}
      </div>

      {/* Transfer Ownership */}
      <div className="bg-white border border-rose-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-rose-200 bg-rose-50">
          <h3 className="text-xs font-bold text-rose-800 flex items-center gap-2">
            <AlertTriangle size={14} /> Transferência de Ownership
          </h3>
          <p className="text-[10px] text-rose-700 mt-0.5">
            Esta ação é irreversível. Você se tornará admin.
          </p>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-[11px] text-[#71706F]">
            Selecione o email do novo owner (apenas admins do tenant):
          </p>
          <input
            type="email"
            value={transferEmail}
            onChange={(e) => setTransferEmail(e.target.value)}
            placeholder="admin@empresa.com"
            className="w-full border border-[#D3D1CE] rounded px-3 py-2 text-xs text-[#1A1A1A] bg-[#FAF8F5] focus:outline-none focus:border-rose-400"
          />
          <button
            onClick={() => transferEmail && setShowTransferModal(true)}
            disabled={!transferEmail}
            className="flex items-center gap-1.5 px-4 py-2 border border-rose-300 text-rose-700 rounded text-xs font-bold hover:bg-rose-50 disabled:opacity-40 transition-colors"
          >
            Transferir ownership
          </button>
        </div>
      </div>

      {/* Transfer Confirmation Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl border border-[#D3D1CE] shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={16} className="text-rose-600" />
              <h3 className="text-sm font-bold text-[#1A1A1A]">Confirmar Transferência</h3>
            </div>
            <p className="text-xs text-[#71706F] mb-4">
              Esta ação é irreversível. Você se tornará admin. Confirme digitando o nome do projeto:
            </p>
            <input
              type="text"
              value={confirmProjectName}
              onChange={(e) => setConfirmProjectName(e.target.value)}
              placeholder="Nome do projeto"
              className="w-full border border-[#D3D1CE] rounded px-3 py-2 text-xs text-[#1A1A1A] bg-[#FAF8F5] focus:outline-none focus:border-rose-400 mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowTransferModal(false)}
                className="flex-1 px-3 py-2 rounded text-xs font-bold text-[#71706F] hover:bg-[#EBE7E2] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleTransfer}
                disabled={!confirmProjectName}
                className="flex-1 px-3 py-2 bg-rose-600 text-white rounded text-xs font-bold hover:bg-rose-700 disabled:opacity-40 transition-colors"
              >
                Confirmar transferência
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main TenantSettingsView ─────────────────────────────────────────────────

const TenantSettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("members");
  const [currentRole, setCurrentRole] = useState<"owner" | "admin" | "member">("owner");
  const [currentUserEmail, setCurrentUserEmail] = useState("admin@example.com");

  useEffect(() => {
    const loadMe = async () => {
      try {
        const res = await fetch("/api/tenant/me");
        if (res.ok) {
          const data = await res.json();
          setCurrentRole(data.role || "owner");
          setCurrentUserEmail(data.email || "admin@example.com");
        }
      } catch {
        // Use defaults
      }
    };
    loadMe();
  }, []);

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode; requiresAdmin: boolean }[] = [
    { id: "members", label: "Membros", icon: <Users size={14} />, requiresAdmin: false },
    { id: "model-router", label: "Model Router", icon: <Cpu size={14} />, requiresAdmin: true },
    { id: "permissions", label: "Permissões", icon: <Shield size={14} />, requiresAdmin: true },
  ];

  const canAccessTab = (tab: typeof tabs[0]) => {
    if (tab.requiresAdmin) return currentRole === "owner" || currentRole === "admin";
    return true;
  };

  const canEditTab = (tab: typeof tabs[0]) => {
    if (tab.id === "permissions") return currentRole === "owner";
    return currentRole === "owner" || currentRole === "admin";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#1A1A1A]">Configurações do Tenant</h2>
          <p className="text-xs text-[#71706F] mt-0.5">
            Gerencie membros, modelos e permissões do seu tenant.
          </p>
        </div>
        <RoleBadge role={currentRole} />
      </div>

      {/* Admin restriction banner */}
      {currentRole === "member" && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800">
          <AlertTriangle size={14} />
          <span>
            Apenas administradores podem editar essas configurações. Entre em contato com o admin do tenant.
          </span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-[#D3D1CE]">
        {tabs.map((tab) => {
          const accessible = canAccessTab(tab);
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => accessible && setActiveTab(tab.id)}
              disabled={!accessible}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                active
                  ? "border-[#1A1A1A] text-[#1A1A1A]"
                  : accessible
                  ? "border-transparent text-[#71706F] hover:text-[#1A1A1A] hover:border-[#D3D1CE]"
                  : "border-transparent text-[#D3D1CE] cursor-not-allowed"
              }`}
            >
              {tab.icon}
              {tab.label}
              {!accessible && <Lock size={10} className="ml-1 opacity-50" />}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === "members" && (
          <MembersTab currentRole={currentRole} currentUserEmail={currentUserEmail} />
        )}
        {activeTab === "model-router" && (
          <ModelRouterTab canEdit={canEditTab(tabs[1])} />
        )}
        {activeTab === "permissions" && <PermissionsTab />}
      </div>
    </div>
  );
};

export default TenantSettingsView;
