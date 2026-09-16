export const STACK_MODULE_IDS = [
  "ignustec-ia",
  "ignus-code",
  "pipelines",
  "sentisense-ai",
  "appstudio",
  "guard-front",
] as const;

export type StackModuleId = (typeof STACK_MODULE_IDS)[number];

export type StackModuleDef = {
  id: StackModuleId;
  name: string;
  description: string;
  alwaysOn?: boolean;
};

/** Fronts/funcionalidades da stack — não confundir com add-ons Stripe. */
export const STACK_MODULES: readonly StackModuleDef[] = [
  {
    id: "ignustec-ia",
    name: "Portal RAG",
    description: "Workspaces, chat, documentos, time e billing do cliente.",
  },
  {
    id: "ignus-code",
    name: "Proxy (Ignus Code)",
    description: "Acesso à API multi-provider. Sempre ativo na conta.",
    alwaysOn: true,
  },
  {
    id: "pipelines",
    name: "Pipelines",
    description: "Editor visual de automações (32 tipos de nó).",
  },
  {
    id: "sentisense-ai",
    name: "Sentisense",
    description: "CRM, suporte, inbox e roteirização.",
  },
  {
    id: "appstudio",
    name: "App Studio",
    description: "Low-code, ontologia, conectores e apps.",
  },
  {
    id: "guard-front",
    name: "Guard Studio",
    description: "Observabilidade, evals, guardrails e projetos.",
  },
];

import type { StackModuleState } from "@urag/ui";
export type { StackModuleState };

export function mergeStackModules(input: {
  modules?: StackModuleState[] | null;
  can_see_all?: boolean;
  identityConfigured?: boolean;
}): StackModuleState[] {
  const byId = new Map((input.modules || []).map((m) => [m.id, m]));
  const canSeeAll = Boolean(input.can_see_all);
  const configured = input.identityConfigured ?? (input.modules || []).length > 0;
  const out: StackModuleState[] = [];

  for (const cat of STACK_MODULES) {
    const found = byId.get(cat.id);
    const alwaysOn = Boolean(cat.alwaysOn || found?.always_on);
    const my = found?.my_access ?? null;
    const enabled =
      alwaysOn || (found ? Boolean(found.enabled) : !configured && canSeeAll);
    out.push({
      id: cat.id,
      name: found?.name || cat.name,
      description: cat.description,
      enabled,
      visible: true,
      always_on: alwaysOn,
      my_access: my,
    });
  }
  return out;
}

export function modulesPutBody(
  modules: StackModuleState[],
  id: string,
  enabled: boolean,
): { module: string; enabled: boolean }[] {
  const merged = mergeStackModules({
    modules,
    can_see_all: true,
    identityConfigured: modules.length > 0,
  });
  const byId = new Map(merged.map((m) => [m.id, m.enabled]));
  byId.set(id, enabled);
  for (const cat of STACK_MODULES) {
    if (cat.alwaysOn) byId.set(cat.id, true);
    if (!byId.has(cat.id)) byId.set(cat.id, Boolean(cat.alwaysOn));
  }
  return [...byId.entries()].map(([module, on]) => ({ module, enabled: on }));
}

/** Liga os módulos do combo sem desligar os já contratados. Proxy permanece on. */
export function modulesPutEnableIds(
  modules: StackModuleState[],
  enableIds: string[],
): { module: string; enabled: boolean }[] {
  const merged = mergeStackModules({
    modules,
    can_see_all: true,
    identityConfigured: modules.length > 0,
  });
  const extra = new Set(enableIds);
  return merged.map((m) => ({
    module: m.id,
    enabled: Boolean(m.always_on || m.enabled || extra.has(m.id)),
  }));
}
