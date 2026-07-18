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
    <div className="space-y-6">
      {/* LLM Call Count */}
      <div className="p-5 rounded-lg border border-zinc-900 bg-zinc-950/40 space-y-4">
        <div>
          <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">LLM Call Count</h3>
          <p className="text-[11px] text-zinc-500">Total number of LLM invocations over time</p>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#141416" />
              <XAxis dataKey="name" stroke="#3f3f46" fontSize={10} tickLine={false} />
              <YAxis stroke="#3f3f46" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "4px" }}
                labelStyle={{ color: "#71717a", fontSize: "10px" }}
                itemStyle={{ fontSize: "10px" }}
              />
              <Legend verticalAlign="top" height={36} iconSize={8} wrapperStyle={{ fontSize: "10px", color: "#a1a1aa" }} />
              <Bar name="LLM Calls" dataKey="llm_calls" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Latency & Success Rate Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LLM Latency */}
        <div className="p-5 rounded-lg border border-zinc-900 bg-zinc-950/40 space-y-4">
          <div>
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">LLM Latency</h3>
            <p className="text-[11px] text-zinc-500">Average LLM execution time over time</p>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#141416" />
                <XAxis dataKey="name" stroke="#3f3f46" fontSize={10} tickLine={false} />
                <YAxis stroke="#3f3f46" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "4px" }}
                  labelStyle={{ color: "#71717a", fontSize: "10px" }}
                  itemStyle={{ fontSize: "10px" }}
                />
                <Legend verticalAlign="top" height={36} iconSize={8} wrapperStyle={{ fontSize: "10px", color: "#a1a1aa" }} />
                <Line name="Latency (ms)" type="monotone" dataKey="llm_latency" stroke="#a78bfa" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* LLM Success Rate */}
        <div className="p-5 rounded-lg border border-zinc-900 bg-zinc-950/40 space-y-4">
          <div>
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">LLM Success Rate</h3>
            <p className="text-[11px] text-zinc-500">Percentage of successful LLM calls over time</p>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLlmSuccess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#141416" />
                <XAxis dataKey="name" stroke="#3f3f46" fontSize={10} tickLine={false} />
                <YAxis stroke="#3f3f46" fontSize={10} tickLine={false} domain={[90, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "4px" }}
                  labelStyle={{ color: "#71717a", fontSize: "10px" }}
                  itemStyle={{ fontSize: "10px" }}
                />
                <Area name="Success Rate (%)" type="monotone" dataKey="llm_success_rate" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorLlmSuccess)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
