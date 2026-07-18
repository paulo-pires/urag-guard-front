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

interface ToolsTabProps {
  chartData: any[];
}

export default function ToolsTab({ chartData }: ToolsTabProps) {
  return (
    <div className="space-y-6">
      {/* Run Count by Tool */}
      <div className="p-5 rounded-lg border border-zinc-900 bg-zinc-950/40 space-y-4">
        <div>
          <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Run Count by Tool</h3>
          <p className="text-[11px] text-zinc-500">Tool run counts over time</p>
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
              <Bar name="webSearch" dataKey="tool_search_runs" fill="#3b82f6" stackId="a" />
              <Bar name="retriever" dataKey="tool_retrieve_runs" fill="#10b981" stackId="a" />
              <Bar name="dbQuery" dataKey="tool_db_runs" fill="#f59e0b" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Latency & Error Rate Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Median Latency by Tool */}
        <div className="p-5 rounded-lg border border-zinc-900 bg-zinc-950/40 space-y-4">
          <div>
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Median Latency by Tool</h3>
            <p className="text-[11px] text-zinc-500">Median tool latency over time</p>
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
                <Line name="webSearch (ms)" type="monotone" dataKey="tool_search_latency" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
                <Line name="retriever (ms)" type="monotone" dataKey="tool_retrieve_latency" stroke="#10b981" strokeWidth={1.5} dot={false} />
                <Line name="dbQuery (ms)" type="monotone" dataKey="tool_db_latency" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Error Rate by Tool */}
        <div className="p-5 rounded-lg border border-zinc-900 bg-zinc-950/40 space-y-4">
          <div>
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Error Rate by Tool</h3>
            <p className="text-[11px] text-zinc-500">Tool error rate over time</p>
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
                <Area name="webSearch (%)" type="monotone" dataKey="tool_search_error" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.05} />
                <Area name="retriever (%)" type="monotone" dataKey="tool_retrieve_error" stroke="#10b981" fill="#10b981" fillOpacity={0.05} />
                <Area name="dbQuery (%)" type="monotone" dataKey="tool_db_error" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.05} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
