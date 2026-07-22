import React from "react";
import { Search } from "lucide-react";

interface FeedbackScoresTabProps {
  onNavigateToTab: (tab: string) => void;
}

export default function FeedbackScoresTab({ onNavigateToTab }: FeedbackScoresTabProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 border border-[#e6e4df] rounded-lg bg-[#ffffff] shadow-xs text-center space-y-4">
      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-[#f5f4f0] border border-[#e6e4df] text-[#6e6d68]">
        <Search size={22} className="text-[#6e6d68] animate-pulse" />
      </div>
      <div className="space-y-1.5 max-w-sm">
        <h3 className="font-serif italic text-xs font-bold text-[#1a1a1a]">No feedback scores to show.</h3>
        <p className="text-[11px] text-[#6e6d68] leading-relaxed">
          Measure application performance by configuring{" "}
          <button
            onClick={() => onNavigateToTab("evals-configs")}
            className="text-[#1a1a1a] hover:underline font-semibold focus:outline-none"
          >
            online evaluators
          </button>
          .
        </p>
      </div>
    </div>
  );
}
