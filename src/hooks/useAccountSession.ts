import { useState, useEffect } from "react";
import type { AccountSession, AccountOverview } from "@urag/ui";

/**
 * Lê o identificador da sessão nos formatos suportados por este front:
 * 1. Cookie 'identity_session'
 * 2. LocalStorage 'identity_session'
 */
export function readSession(): string {
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

/**
 * Constrói o objeto de sessão padronizado de `@urag/ui` a partir dos dados do overview.
 * Função pura e testável isoladamente sem dependência de DOM ou rede.
 */
export function buildAccountSession(
  overview?: Partial<AccountOverview> | null,
): AccountSession {
  const name =
    overview?.user?.name ||
    overview?.user?.email ||
    "Conta";

  const email = overview?.user?.email || "";
  const tenantName = overview?.tenant?.name || undefined;
  const planLabel = overview?.tenant?.plan;

  const isHighlight = Boolean(
    planLabel &&
      ["pro", "enterprise", "plus", "premium"].some((kw) =>
        planLabel.toLowerCase().includes(kw),
      ),
  );

  return {
    user: {
      name,
      email,
    },
    tenant: tenantName
      ? {
          name: tenantName,
          slug: overview?.tenant?.id,
        }
      : undefined,
    plan:
      planLabel && planLabel !== "—" && planLabel.trim() !== ""
        ? {
            label: planLabel,
            variant: isHighlight ? "highlight" : "default",
          }
        : undefined,
  };
}

/**
 * Hook que resolve a sessão de conta para o AccountLauncher de @urag/ui.
 *
 * O pacote @urag/ui NÃO lê sessão internamente e NÃO faz chamadas HTTP.
 * Este hook descobre a sessão (cookie / localStorage), inicializa síncronamente
 * com dados seguros e sincroniza com `/api/identity/v1/account` em segundo plano.
 */
export function useAccountSession(): AccountSession {
  const [session, setSession] = useState<AccountSession>(() => {
    return buildAccountSession(null);
  });

  useEffect(() => {
    const token = readSession();
    if (!token) {
      setSession(buildAccountSession(null));
      return;
    }

    let active = true;

    async function fetchAccountData() {
      try {
        const res = await fetch(
          `/api/identity/v1/account?session=${encodeURIComponent(token)}`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as AccountOverview;
        if (!active) return;

        setSession(buildAccountSession(data));
      } catch {
        // Falha graciosa se identity estiver offline
      }
    }

    void fetchAccountData();

    return () => {
      active = false;
    };
  }, []);

  return session;
}
