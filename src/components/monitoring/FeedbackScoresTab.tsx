import React from "react";
import { Search } from "lucide-react";

interface FeedbackScoresTabProps {
  onNavigateToTab: (tab: string) => void;
}

export default function FeedbackScoresTab({ onNavigateToTab }: FeedbackScoresTabProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 border border-zinc-900 rounded-lg bg-zinc-950/20 text-center space-y-4">
      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
        <Search size={22} className="text-zinc-500 animate-pulse" />
      </div>
      <div className="space-y-1.5 max-w-sm">
        <h3 className="text-xs font-bold text-zinc-300">No feedback scores to show.</h3>
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          Measure application performance by configuring{" "}
          <button
            onClick={() => onNavigateToTab("evals-configs")}
            className="text-emerald-400 hover:text-emerald-300 underline font-semibold focus:outline-none"
          >
            online evaluators
          </button>
          .
        </p>
      </div>
    </div>
  );
}
