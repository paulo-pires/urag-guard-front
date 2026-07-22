import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

interface LLMCallsTabProps {
  chartData: any[];
}

export default function LLMCallsTab({ chartData }: LLMCallsTabProps) {
  return (
    <div className="space-y-6 text-[#1a1a1a]">
      {/* LLM Call Count */}
      <div className="p-5 rounded-lg border border-[#e6e4df] bg-[#ffffff] shadow-xs space-y-4">
        <div>
          <h3 className="font-serif italic text-xs font-bold text-[#1a1a1a] uppercase tracking-wider">LLM Call Count</h3>
          <p className="text-[11px] text-[#6e6d68]">Total number of LLM invocations over time</p>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e6e4df" />
              <XAxis dataKey="name" stroke="#8e8d87" fontSize={10} tickLine={false} />
              <YAxis stroke="#8e8d87" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e6e4df", borderRadius: "6px", color: "#1a1a1a" }}
                labelStyle={{ color: "#6e6d68", fontSize: "10px" }}
                itemStyle={{ fontSize: "10px" }}
              />
              <Legend verticalAlign="top" height={36} iconSize={8} wrapperStyle={{ fontSize: "10px", color: "#575652" }} />
              <Bar name="LLM Calls" dataKey="llm_calls" fill="#7c3aed" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Latency & Success Rate Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LLM Latency */}
        <div className="p-5 rounded-lg border border-[#e6e4df] bg-[#ffffff] shadow-xs space-y-4">
          <div>
            <h3 className="font-serif italic text-xs font-bold text-[#1a1a1a] uppercase tracking-wider">LLM Latency</h3>
            <p className="text-[11px] text-[#6e6d68]">Average LLM execution time over time</p>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6e4df" />
                <XAxis dataKey="name" stroke="#8e8d87" fontSize={10} tickLine={false} />
                <YAxis stroke="#8e8d87" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e6e4df", borderRadius: "6px", color: "#1a1a1a" }}
                  labelStyle={{ color: "#6e6d68", fontSize: "10px" }}
                  itemStyle={{ fontSize: "10px" }}
                />
                <Legend verticalAlign="top" height={36} iconSize={8} wrapperStyle={{ fontSize: "10px", color: "#575652" }} />
                <Line name="Latency (ms)" type="monotone" dataKey="llm_latency" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* LLM Success Rate */}
        <div className="p-5 rounded-lg border border-[#e6e4df] bg-[#ffffff] shadow-xs space-y-4">
          <div>
            <h3 className="font-serif italic text-xs font-bold text-[#1a1a1a] uppercase tracking-wider">LLM Success Rate</h3>
            <p className="text-[11px] text-[#6e6d68]">Percentage of successful LLM calls over time</p>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLlmSuccess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6e4df" />
                <XAxis dataKey="name" stroke="#8e8d87" fontSize={10} tickLine={false} />
                <YAxis stroke="#8e8d87" fontSize={10} tickLine={false} domain={[90, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e6e4df", borderRadius: "6px", color: "#1a1a1a" }}
                  labelStyle={{ color: "#6e6d68", fontSize: "10px" }}
                  itemStyle={{ fontSize: "10px" }}
                />
                <Area name="Success Rate (%)" type="monotone" dataKey="llm_success_rate" stroke="#059669" strokeWidth={2} fillOpacity={1} fill="url(#colorLlmSuccess)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
