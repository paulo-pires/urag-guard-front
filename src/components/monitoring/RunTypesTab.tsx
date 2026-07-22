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
    <div className="space-y-6 text-[#1a1a1a]">
      {/* Run Count by Name */}
      <div className="p-5 rounded-lg border border-[#e6e4df] bg-[#ffffff] shadow-xs space-y-4">
        <div>
          <h3 className="font-serif italic text-xs font-bold text-[#1a1a1a] uppercase tracking-wider">Run Count by Name, depth=1</h3>
          <p className="text-[11px] text-[#6e6d68]">Run counts by name over time. Filtered to runs that occur at depth=1</p>
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
              <Bar name="agent" dataKey="run_agent_count" fill="#2563eb" />
              <Bar name="chain" dataKey="run_chain_count" fill="#7c3aed" />
              <Bar name="tool" dataKey="run_tool_count" fill="#059669" />
              <Bar name="llm" dataKey="run_llm_count" fill="#d97706" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Latency & Error Rate Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Median Latency by Run Name */}
        <div className="p-5 rounded-lg border border-[#e6e4df] bg-[#ffffff] shadow-xs space-y-4">
          <div>
            <h3 className="font-serif italic text-xs font-bold text-[#1a1a1a] uppercase tracking-wider">Median Latency by Run Name, depth=1</h3>
            <p className="text-[11px] text-[#6e6d68]">Median run latency over time. Filtered to runs that occur at depth=1</p>
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
                <Line name="agent (ms)" type="monotone" dataKey="run_agent_latency" stroke="#2563eb" strokeWidth={1.5} dot={false} />
                <Line name="chain (ms)" type="monotone" dataKey="run_chain_latency" stroke="#7c3aed" strokeWidth={1.5} dot={false} />
                <Line name="tool (ms)" type="monotone" dataKey="run_tool_latency" stroke="#059669" strokeWidth={1.5} dot={false} />
                <Line name="llm (ms)" type="monotone" dataKey="run_llm_latency" stroke="#d97706" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Error Rate by Run Name */}
        <div className="p-5 rounded-lg border border-[#e6e4df] bg-[#ffffff] shadow-xs space-y-4">
          <div>
            <h3 className="font-serif italic text-xs font-bold text-[#1a1a1a] uppercase tracking-wider">Error Rate by Run Name, depth=1</h3>
            <p className="text-[11px] text-[#6e6d68]">Run error rate over time. Filtered to runs that occur at depth=1</p>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6e4df" />
                <XAxis dataKey="name" stroke="#8e8d87" fontSize={10} tickLine={false} />
                <YAxis stroke="#8e8d87" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e6e4df", borderRadius: "6px", color: "#1a1a1a" }}
                  labelStyle={{ color: "#6e6d68", fontSize: "10px" }}
                  itemStyle={{ fontSize: "10px" }}
                />
                <Legend verticalAlign="top" height={36} iconSize={8} wrapperStyle={{ fontSize: "10px", color: "#575652" }} />
                <Area name="agent (%)" type="monotone" dataKey="run_agent_error" stroke="#2563eb" fill="#2563eb" fillOpacity={0.03} />
                <Area name="chain (%)" type="monotone" dataKey="run_chain_error" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.03} />
                <Area name="tool (%)" type="monotone" dataKey="run_tool_error" stroke="#059669" fill="#059669" fillOpacity={0.03} />
                <Area name="llm (%)" type="monotone" dataKey="run_llm_error" stroke="#d97706" fill="#d97706" fillOpacity={0.03} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
