import { useState } from "react";
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

    switch (currentTab) {
      case "dashboard":
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

  return (
    <div className="flex w-full h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* Sidebar navigation */}
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />

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
        <main className="flex-1 overflow-y-auto px-6 py-6 bg-zinc-950">
          <div className="max-w-7xl mx-auto space-y-6">
            {renderActiveTab()}
          </div>
        </main>
      </div>
    </div>
  );
}
