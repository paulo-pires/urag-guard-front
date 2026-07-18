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

interface RunTypesTabProps {
  chartData: any[];
}

export default function RunTypesTab({ chartData }: RunTypesTabProps) {
  return (
    <div className="space-y-6">
      {/* Run Count by Name */}
      <div className="p-5 rounded-lg border border-zinc-900 bg-zinc-950/40 space-y-4">
        <div>
          <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Run Count by Name, depth=1</h3>
          <p className="text-[11px] text-zinc-500">Run counts by name over time. Filtered to runs that occur at depth=1</p>
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
              <Bar name="agent" dataKey="run_agent_count" fill="#3b82f6" />
              <Bar name="chain" dataKey="run_chain_count" fill="#8b5cf6" />
              <Bar name="tool" dataKey="run_tool_count" fill="#10b981" />
              <Bar name="llm" dataKey="run_llm_count" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Latency & Error Rate Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Median Latency by Run Name */}
        <div className="p-5 rounded-lg border border-zinc-900 bg-zinc-950/40 space-y-4">
          <div>
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Median Latency by Run Name, depth=1</h3>
            <p className="text-[11px] text-zinc-500">Median run latency over time. Filtered to runs that occur at depth=1</p>
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
                <Line name="agent (ms)" type="monotone" dataKey="run_agent_latency" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
                <Line name="chain (ms)" type="monotone" dataKey="run_chain_latency" stroke="#8b5cf6" strokeWidth={1.5} dot={false} />
                <Line name="tool (ms)" type="monotone" dataKey="run_tool_latency" stroke="#10b981" strokeWidth={1.5} dot={false} />
                <Line name="llm (ms)" type="monotone" dataKey="run_llm_latency" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Error Rate by Run Name */}
        <div className="p-5 rounded-lg border border-zinc-900 bg-zinc-950/40 space-y-4">
          <div>
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Error Rate by Run Name, depth=1</h3>
            <p className="text-[11px] text-zinc-500">Run error rate over time. Filtered to runs that occur at depth=1</p>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#141416" />
                <XAxis dataKey="name" stroke="#3f3f46" fontSize={10} tickLine={false} />
                <YAxis stroke="#3f3f46" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "4px" }}
                  labelStyle={{ color: "#71717a", fontSize: "10px" }}
                  itemStyle={{ fontSize: "10px" }}
                />
                <Legend verticalAlign="top" height={36} iconSize={8} wrapperStyle={{ fontSize: "10px", color: "#a1a1aa" }} />
                <Area name="agent (%)" type="monotone" dataKey="run_agent_error" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.03} />
                <Area name="chain (%)" type="monotone" dataKey="run_chain_error" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.03} />
                <Area name="tool (%)" type="monotone" dataKey="run_tool_error" stroke="#10b981" fill="#10b981" fillOpacity={0.03} />
                <Area name="llm (%)" type="monotone" dataKey="run_llm_error" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.03} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
