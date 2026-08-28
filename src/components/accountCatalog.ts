/** Catálogo comercial da stack: módulos, add-ons por módulo e combos.
 *  Preços em centavos BRL / mês. Combo sempre mais barato que a soma unitária.
 *  Combos ainda são rascunho de produto — a regra de saída (virar unitário
 *  ou cair num combo menor) já vale. */

export type StackModuleId =
  | "ignustec-ia"
  | "ignus-code"
  | "pipelines"
  | "sentisense-ai"
  | "appstudio"
  | "guard-front";

export type ModuleCatalogItem = {
  id: StackModuleId;
  name: string;
  description: string;
  unit_cents: number;
  alwaysOn?: boolean;
};

export type AddonCatalogItem = {
  id: string;
  name: string;
  description: string;
  unit_cents: number;
  modules: StackModuleId[];
  unlocks?: string;
};

export type ComboDef = {
  id: string;
  name: string;
  description: string;
  modules: StackModuleId[];
  discount_pct: number;
};

export const MODULE_CATALOG: readonly ModuleCatalogItem[] = [
  {
    id: "ignustec-ia",
    name: "Portal RAG",
    description: "Workspaces, chat, documentos, time e billing do cliente.",
    unit_cents: 34900,
  },
  {
    id: "ignus-code",
    name: "Proxy (Ignus Code)",
    description: "Acesso à API multi-provider. Sempre ativo na conta.",
    unit_cents: 0,
    alwaysOn: true,
  },
  {
    id: "pipelines",
    name: "Pipelines",
    description: "Editor visual de automações (32 tipos de nó).",
    unit_cents: 28900,
  },
  {
    id: "sentisense-ai",
    name: "Sentisense",
    description: "CRM, suporte, inbox e roteirização.",
    unit_cents: 28900,
  },
  {
    id: "appstudio",
    name: "App Studio",
    description: "Low-code, ontologia, conectores e apps.",
    unit_cents: 22900,
  },
  {
    id: "guard-front",
    name: "Guard Studio",
    description: "Observabilidade, evals, guardrails e projetos.",
    unit_cents: 22900,
  },
];

export const ADDON_CATALOG: readonly AddonCatalogItem[] = [
  {
    id: "broadcast",
    name: "Broadcast",
    description: "Mensagens em massa (WhatsApp, SMS) via fluxos da IA.",
    unit_cents: 4900,
    modules: ["ignustec-ia", "sentisense-ai"],
  },
  {
    id: "whitelabel",
    name: "White-label & Identidade",
    description: "Marca, cores, logotipo e domínio do portal.",
    unit_cents: 4900,
    modules: ["ignustec-ia"],
  },
  {
    id: "whatsapp",
    name: "Conexão WhatsApp",
    description: "Canal WhatsApp e nós de ligação no pipeline.",
    unit_cents: 4900,
    modules: ["ignustec-ia", "sentisense-ai", "pipelines"],
    unlocks: "Nós de ligação no editor de pipelines.",
  },
  {
    id: "sentiment",
    name: "Radar de Sentimento",
    description: "Detecta insatisfação no atendimento.",
    unit_cents: 2900,
    modules: ["sentisense-ai"],
  },
  {
    id: "upsell",
    name: "Vendedor Automático",
    description: "Ofertas no momento da intenção de compra.",
    unit_cents: 2900,
    modules: ["sentisense-ai"],
  },
  {
    id: "copilot-inbox",
    name: "Copiloto de IA (Inbox)",
    description: "Fila WhatsApp com hand-off IA→humano.",
    unit_cents: 4900,
    modules: ["sentisense-ai"],
  },
  {
    id: "leads",
    name: "Pipeline de Leads",
    description: "Funil Kanban, atividades e automação por etapa.",
    unit_cents: 4900,
    modules: ["sentisense-ai", "pipelines"],
  },
  {
    id: "course-manager",
    name: "Gerenciador de Cursos",
    description: "Curso → módulo → aula e publicação.",
    unit_cents: 4900,
    modules: ["ignustec-ia"],
  },
  {
    id: "guard",
    name: "uRag Guard",
    description: "Rails, PII e eval RAG. Libera nós Guard no pipeline.",
    unit_cents: 4900,
    modules: ["guard-front", "pipelines"],
    unlocks: "Nós Guard no editor de pipelines.",
  },
];

/** Combos rascunho. Desconto sobre a soma unitária dos módulos do pacote. */
export const COMBOS: readonly ComboDef[] = [
  {
    id: "crm",
    name: "Portal + Sentisense",
    description: "Atendimento e base de conhecimento juntos.",
    modules: ["ignustec-ia", "sentisense-ai"],
    discount_pct: 15,
  },
  {
    id: "automacao",
    name: "Portal + Pipelines",
    description: "RAG com automações visuais.",
    modules: ["ignustec-ia", "pipelines"],
    discount_pct: 15,
  },
  {
    id: "atendimento",
    name: "Sentisense + Pipelines",
    description: "CRM com automações de fluxo.",
    modules: ["sentisense-ai", "pipelines"],
    discount_pct: 15,
  },
  {
    id: "ops",
    name: "Portal + Sentisense + Pipelines",
    description: "Combo operacional (o mais pedido).",
    modules: ["ignustec-ia", "sentisense-ai", "pipelines"],
    discount_pct: 22,
  },
  {
    id: "studio",
    name: "App Studio + Guard",
    description: "Construção e observabilidade.",
    modules: ["appstudio", "guard-front"],
    discount_pct: 15,
  },
  {
    id: "full",
    name: "Stack completa",
    description: "Todos os fronts pagos da plataforma.",
    modules: ["ignustec-ia", "pipelines", "sentisense-ai", "appstudio", "guard-front"],
    discount_pct: 30,
  },
];

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function moduleById(id: string): ModuleCatalogItem | undefined {
  return MODULE_CATALOG.find((m) => m.id === id);
}

export function unitCents(id: string): number {
  return moduleById(id)?.unit_cents ?? 0;
}

export function comboUnitSum(combo: ComboDef): number {
  return combo.modules.reduce((s, id) => s + unitCents(id), 0);
}

export function comboPrice(combo: ComboDef): number {
  const sum = comboUnitSum(combo);
  return Math.floor((sum * (100 - combo.discount_pct)) / 100);
}

function billedIds(enabled: string[]): string[] {
  return [...new Set(enabled)].filter((id) => unitCents(id) > 0).sort();
}

function isSubset(inner: string[], outer: Set<string>): boolean {
  return inner.every((id) => outer.has(id));
}

function disjoint(a: string[], b: Set<string>): boolean {
  return a.every((id) => !b.has(id));
}

export type ComboApplied = {
  id: string;
  name: string;
  modules: string[];
  unit_cents: number;
  combo_cents: number;
  savings_cents: number;
};

export type Quote = {
  enabled: string[];
  unit_total_cents: number;
  total_cents: number;
  savings_cents: number;
  combos_applied: ComboApplied[];
  remainder: { id: string; name: string; cents: number }[];
};

function packCombos(paid: string[]): ComboApplied[] {
  const paidSet = new Set(paid);
  const candidates = COMBOS.filter((c) => isSubset(c.modules, paidSet)).map((c) => ({
    def: c,
    save: comboUnitSum(c) - comboPrice(c),
  }));
  candidates.sort((a, b) => b.save - a.save || b.def.modules.length - a.def.modules.length);

  const best: ComboApplied[] = [];
  let bestSave = -1;

  const search = (start: number, used: Set<string>, picked: ComboApplied[], save: number) => {
    if (save > bestSave) {
      bestSave = save;
      best.length = 0;
      best.push(...picked);
    }
    for (let i = start; i < candidates.length; i++) {
      const { def, save: s } = candidates[i];
      if (!disjoint(def.modules, used)) continue;
      const nextUsed = new Set(used);
      def.modules.forEach((id) => nextUsed.add(id));
      picked.push({
        id: def.id,
        name: def.name,
        modules: [...def.modules],
        unit_cents: comboUnitSum(def),
        combo_cents: comboPrice(def),
        savings_cents: s,
      });
      search(i + 1, nextUsed, picked, save + s);
      picked.pop();
    }
  };
  search(0, new Set(), [], 0);
  return best;
}

export function quoteModules(enabledIds: string[]): Quote {
  const enabled = [...new Set(enabledIds)].sort();
  const paid = billedIds(enabled);
  const applied = packCombos(paid);
  const covered = new Set(applied.flatMap((c) => c.modules));
  const remainder = paid
    .filter((id) => !covered.has(id))
    .map((id) => ({
      id,
      name: moduleById(id)?.name || id,
      cents: unitCents(id),
    }));
  const unitTotal = paid.reduce((s, id) => s + unitCents(id), 0);
  const comboPart = applied.reduce((s, c) => s + c.combo_cents, 0);
  const remainderPart = remainder.reduce((s, r) => s + r.cents, 0);
  const total = comboPart + remainderPart;
  return {
    enabled,
    unit_total_cents: unitTotal,
    total_cents: total,
    savings_cents: unitTotal - total,
    combos_applied: applied,
    remainder,
  };
}

export function quoteIfToggle(
  enabledIds: string[],
  id: string,
  enabled: boolean,
): { current: Quote; next: Quote; leaving_combo: boolean; message: string } {
  const current = quoteModules(enabledIds);
  const set = new Set(enabledIds);
  if (enabled) set.add(id);
  else set.delete(id);
  if (moduleById(id)?.alwaysOn) set.add(id);
  const next = quoteModules([...set]);
  const wasInCombo = current.combos_applied.some((c) => c.modules.includes(id));
  const leaving = Boolean(wasInCombo && !enabled);
  let message = "";
  if (leaving) {
    const dropped = current.combos_applied.filter((c) => c.modules.includes(id));
    const names = dropped.map((c) => c.name).join(", ");
    if (next.combos_applied.length) {
      message = `Saindo do combo ${names}. Restante entra no combo ${next.combos_applied.map((c) => c.name).join(", ")} (${formatBRL(next.total_cents)}/mês em vez de ${formatBRL(next.unit_total_cents)} unitário).`;
    } else {
      message = `Saindo do combo ${names}. Módulos restantes passam a preço unitário: ${formatBRL(next.total_cents)}/mês (antes ${formatBRL(current.total_cents)} no combo).`;
    }
  } else if (next.savings_cents > current.savings_cents && next.combos_applied.length) {
    message = `Com essa seleção o combo ${next.combos_applied.map((c) => c.name).join(", ")} aplica ${formatBRL(next.savings_cents)} de desconto vs unitário.`;
  }
  return { current, next, leaving_combo: leaving, message };
}

export function addonsForModule(moduleId: string): AddonCatalogItem[] {
  return ADDON_CATALOG.filter((a) => a.modules.includes(moduleId as StackModuleId));
}
