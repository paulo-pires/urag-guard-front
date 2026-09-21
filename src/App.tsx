import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import DashboardView from "./components/DashboardView";
import RunsView from "./components/RunsView";
import RunDetailView from "./components/RunDetailView";
import SessionsView from "./components/SessionsView";
import SessionDetailView from "./components/SessionDetailView";
import GuardrailRulesView from "./components/GuardrailRulesView";
import GuardrailEventsView from "./components/GuardrailEventsView";
import EvalConfigsView from "./components/EvalConfigsView";
import EvalScoresView from "./components/EvalScoresView";
import UsageView from "./components/UsageView";
import ProjectsView from "./components/ProjectsView";
import { ModelsView } from "./components/ModelsView";
import { DriftView } from "./components/DriftView";
import { SimulationView } from "./components/SimulationView";
import { AssuranceView } from "./components/AssuranceView";
import { PromptsView } from "./components/PromptsView";
import { DatasetsView } from "./components/DatasetsView";
import TenantSettingsView from "./components/TenantSettingsView";
import OverviewView from "./components/OverviewView";
import GuardDocsView from "./components/GuardDocsView";
import { ViewModeProvider } from "./context/ViewModeContext";
import { api } from "./lib/api";
import { ModelRegistry, McpServerConfig } from "./types";
import SentryTestView from "./components/SentryTestView";

export default function App() {
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [historyStack, setHistoryStack] = useState<string[]>([]);

  // Global Period & Source Filters
  const [period, setPeriod] = useState("7d");

  // Helper to format date as YYYY-MM-DD
  const formatDate = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const today = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 7);

  const [customFrom, setCustomFrom] = useState(formatDate(sevenDaysAgo));
  const [customTo, setCustomTo] = useState(formatDate(today));
  const [selectedSources, setSelectedSources] = useState<string[]>([]); // empty represents "All"

  // Contagens da navegação. O Sidebar NÃO busca nada por conta própria: quem
  // sabe período e fontes é aqui, e a mesma chamada que a Visão Geral técnica
  // já faz serve para o badge. Sem este produtor, `badgeCounts` seria uma prop
  // que ninguém alimenta — caminho de leitura sem caminho de escrita.
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({});

  // Simulation / ModelOps state
  const [models, setModels] = useState<ModelRegistry[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const mcpConfig: McpServerConfig = {
    modelOpsPort: 8091,
    simulationPort: 8091,
    assurancePort: 8091,
    auditPort: 8091,
    host: "localhost",
    token: "",
    forceDemoMode: false,
  };

  useEffect(() => {
    let vivo = true;
    api
      .getDashboardStats({
        from: period,
        source: selectedSources.join(","),
      })
      .then((st) => {
        if (!vivo) return;
        // Só violação de guardrail vira badge: é a única contagem em que
        // "tem coisa nova" muda o que a pessoa faz a seguir. Número de runs
        // sobe sempre e viraria ruído permanente.
        setBadgeCounts({ "guardrails-events": st.guardrail_violations ?? 0 });
      })
      .catch(() => {
        // Badge é informação acessória: falha não pode derrubar a navegação.
        if (vivo) setBadgeCounts({});
      });
    return () => {
      vivo = false;
    };
  }, [period, selectedSources]);

  const fetchModels = async () => {
    setLoadingModels(true);
    try {
      const { callMCPTool } = await import("./lib/api");
      const res = await callMCPTool<{ models: ModelRegistry[] }>("list_models", {});
      setModels(res.models || []);
    } catch {
      // keep current
    } finally {
      setLoadingModels(false);
    }
  };

  const onSelectModelForDrift = (modelId: string) => {
    setCurrentTab(`drift-${modelId}`);
  };

  // Navigation with history tracking for precise backtrack
  const handleNavigateToTab = (nextTab: string) => {
    setHistoryStack((prev) => [...prev, currentTab]);
    setCurrentTab(nextTab);
  };

  const handleBack = (defaultTab: string) => {
    if (historyStack.length > 0) {
      const prev = historyStack[historyStack.length - 1];
      setHistoryStack((prevStack) => prevStack.slice(0, -1));
      setCurrentTab(prev);
    } else {
      setCurrentTab(defaultTab);
    }
  };

  const renderActiveTab = () => {
    if (currentTab.startsWith("run-detail-")) {
      const runId = currentTab.replace("run-detail-", "");
      return (
        <RunDetailView
          runId={runId}
          onNavigateToTab={handleNavigateToTab}
          onBack={() => handleBack("runs")}
        />
      );
    }

    if (currentTab.startsWith("session-detail-")) {
      const sessionId = currentTab.replace("session-detail-", "");
      return (
        <SessionDetailView
          sessionId={sessionId}
          onNavigateToTab={handleNavigateToTab}
          onBack={() => handleBack("sessions")}
        />
      );
    }

    if (currentTab.startsWith("drift-")) {
      const modelId = currentTab.replace("drift-", "");
      return (
        <DriftView
          models={models}
          driftData={{}}
          auditLogs={[]}
          selectedModelId={modelId}
          onSelectModel={onSelectModelForDrift}
          config={mcpConfig}
          onRefresh={fetchModels}
        />
      );
    }

    switch (currentTab) {
      case "dashboard":
        return (
          <OverviewView
            period={period}
            customFrom={customFrom}
            customTo={customTo}
            selectedSources={selectedSources}
            onNavigateToTab={handleNavigateToTab}
          />
        );
      case "dashboard-legacy":
        return (
          <DashboardView
            period={period}
            customFrom={customFrom}
            customTo={customTo}
            selectedSources={selectedSources}
            onNavigateToTab={handleNavigateToTab}
          />
        );
      case "runs":
        return (
          <RunsView
            period={period}
            customFrom={customFrom}
            customTo={customTo}
            selectedSources={selectedSources}
            onNavigateToTab={handleNavigateToTab}
          />
        );
      case "sessions":
        return (
          <SessionsView
            period={period}
            customFrom={customFrom}
            customTo={customTo}
            selectedSources={selectedSources}
            onNavigateToTab={handleNavigateToTab}
          />
        );
      case "guardrails-rules":
        return <GuardrailRulesView />;
      case "guardrails-events":
        return (
          <GuardrailEventsView
            period={period}
            customFrom={customFrom}
            customTo={customTo}
            selectedSources={selectedSources}
            onNavigateToTab={handleNavigateToTab}
          />
        );
      case "evals-configs":
        return <EvalConfigsView />;
      case "evals-scores":
        return (
          <EvalScoresView
            period={period}
            customFrom={customFrom}
            customTo={customTo}
            selectedSources={selectedSources}
            onNavigateToTab={handleNavigateToTab}
          />
        );
      case "usage":
        return (
          <UsageView
            period={period}
            customFrom={customFrom}
            customTo={customTo}
            selectedSources={selectedSources}
          />
        );
      case "projects":
        return <ProjectsView />;
      case "tenant-settings":
        return <TenantSettingsView />;
      case "docs":
        return <GuardDocsView />;
      case "models":
        return (
          <ModelsView
            models={models}
            config={mcpConfig}
            onRefresh={fetchModels}
            onSelectModelForDrift={onSelectModelForDrift}
            isLoading={loadingModels}
          />
        );
      case "drift":
        return (
          <DriftView
            models={models}
            driftData={{}}
            auditLogs={[]}
            selectedModelId={models[0]?.id ?? ""}
            onSelectModel={onSelectModelForDrift}
            config={mcpConfig}
            onRefresh={fetchModels}
          />
        );
      case "simulation":
        return (
          <SimulationView
            models={models}
            config={mcpConfig}
            simulations={[]}
            onRefresh={() => {}}
          />
        );
      case "assurance":
        return (
          <AssuranceView
            models={models}
            config={mcpConfig}
          />
        );
      case "prompts":
        return <PromptsView />;
      case "datasets":
        return <DatasetsView onNavigateToTab={handleNavigateToTab} />;
      default:
        return (
          <DashboardView
            period={period}
            customFrom={customFrom}
            customTo={customTo}
            selectedSources={selectedSources}
            onNavigateToTab={handleNavigateToTab}
          />
        );
    }
  };

  if (typeof window !== "undefined" && window.location.pathname.includes("sentry-test")) {
    return <SentryTestView />;
  }

  return (
    <ViewModeProvider>
    <div className="flex w-full h-screen bg-[#F4F1EE] text-[#1A1A1A] overflow-hidden font-sans">
      {/* Sidebar navigation */}
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} badgeCounts={badgeCounts} />

      {/* Main panel */}
      <div className="flex flex-col flex-1 h-screen overflow-hidden">
        {/* Top filter bar */}
        <Topbar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          period={period}
          setPeriod={setPeriod}
          customFrom={customFrom}
          setCustomFrom={setCustomFrom}
          customTo={customTo}
          setCustomTo={setCustomTo}
          selectedSources={selectedSources}
          setSelectedSources={setSelectedSources}
        />

        {/* Content container */}
        <main className="flex-1 overflow-y-auto px-6 py-6 bg-[#F4F1EE]">
          <div className="max-w-7xl mx-auto space-y-6">
            {renderActiveTab()}
          </div>
        </main>
      </div>
    </div>
    </ViewModeProvider>
  );
}
