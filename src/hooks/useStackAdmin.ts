import { useState, useEffect, useCallback } from "react";
import type { AccountOverview, StackAdminPlan } from "@urag/ui";
import { readSession } from "./useAccountSession";
import { identityAccountClient } from "../components/identityAccount";

export function useStackAdmin() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState<AccountOverview | null>(null);

  const apply = useCallback((acc: AccountOverview) => {
    setOverview({
      ...acc,
      identity_linked: acc.identity_linked !== false,
      can_manage_modules: acc.can_manage_modules ?? acc.can_contract,
    });
  }, []);

  const client = useCallback(() => identityAccountClient(readSession()), []);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível atualizar a conta");
    } finally {
      setBusy(false);
    }
  }, []);

  const reload = useCallback(async () => {
    const session = readSession();
    if (!session) throw new Error("Sessão Identity ausente");
    apply(await client().get());
  }, [apply, client]);

  const load = useCallback(async () => {
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
  }, [apply, client]);

  useEffect(() => {
    const session = readSession();
    if (!session) return;
    client()
      .get()
      .then(apply)
      .catch(() => undefined);
  }, [apply, client]);

  const handleSelectPlan = useCallback((_plan: StackAdminPlan) => {
    window.location.href = "/billing";
  }, []);

  const handleContractAddon = useCallback((_id: string) => {
    window.location.href = "/billing";
  }, []);

  const handleToggleModule = useCallback(
    (id: string, enabled: boolean) => {
      if (!overview?.can_contract) return;
      void run(async () => apply(await client().toggle(overview, id, enabled)));
    },
    [apply, client, overview, run],
  );

  const handleApplyCombo = useCallback(
    (ids: string[]) => {
      if (!overview?.can_contract) return;
      void run(async () => apply(await client().applyCombo(overview, ids)));
    },
    [apply, client, overview, run],
  );

  const handleInviteMember = useCallback(
    async (p: { email: string; name: string; role_id?: string }) => {
      if (!overview?.can_contract) return;
      let link: string | undefined;
      await run(async () => {
        const out = await client().invite(p);
        link = out.invite_link;
        await reload();
      });
      return link;
    },
    [client, overview?.can_contract, reload, run],
  );

  const handleAssignRole = useCallback(
    (userId: string, roleId: string) => {
      if (!overview?.can_contract) return;
      void run(async () => {
        await client().assign(userId, roleId);
        await reload();
      });
    },
    [client, overview?.can_contract, reload, run],
  );

  const handleCreateRole = useCallback(
    (p: { name: string; permissions: { app_id: string; permission_level: string }[] }) => {
      if (!overview?.can_contract) return;
      void run(async () => {
        await client().createRole(p);
        await reload();
      });
    },
    [client, overview?.can_contract, reload, run],
  );

  return {
    overview,
    busy,
    error,
    load,
    reload,
    handleSelectPlan,
    handleToggleModule,
    handleApplyCombo,
    handleContractAddon,
    handleInviteMember,
    handleAssignRole,
    handleCreateRole,
  };
}
