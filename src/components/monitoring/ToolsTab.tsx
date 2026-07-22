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
    <div className="space-y-6 text-[#1a1a1a]">
      {/* Run Count by Tool */}
      <div className="p-5 rounded-lg border border-[#e6e4df] bg-[#ffffff] shadow-xs space-y-4">
        <div>
          <h3 className="font-serif italic text-xs font-bold text-[#1a1a1a] uppercase tracking-wider">Run Count by Tool</h3>
          <p className="text-[11px] text-[#6e6d68]">Tool run counts over time</p>
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
              <Bar name="webSearch" dataKey="tool_search_runs" fill="#2563eb" stackId="a" />
              <Bar name="retriever" dataKey="tool_retrieve_runs" fill="#059669" stackId="a" />
              <Bar name="dbQuery" dataKey="tool_db_runs" fill="#d97706" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Latency & Error Rate Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Median Latency by Tool */}
        <div className="p-5 rounded-lg border border-[#e6e4df] bg-[#ffffff] shadow-xs space-y-4">
          <div>
            <h3 className="font-serif italic text-xs font-bold text-[#1a1a1a] uppercase tracking-wider">Median Latency by Tool</h3>
            <p className="text-[11px] text-[#6e6d68]">Median tool latency over time</p>
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
                <Line name="webSearch (ms)" type="monotone" dataKey="tool_search_latency" stroke="#2563eb" strokeWidth={1.5} dot={false} />
                <Line name="retriever (ms)" type="monotone" dataKey="tool_retrieve_latency" stroke="#059669" strokeWidth={1.5} dot={false} />
                <Line name="dbQuery (ms)" type="monotone" dataKey="tool_db_latency" stroke="#d97706" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Error Rate by Tool */}
        <div className="p-5 rounded-lg border border-[#e6e4df] bg-[#ffffff] shadow-xs space-y-4">
          <div>
            <h3 className="font-serif italic text-xs font-bold text-[#1a1a1a] uppercase tracking-wider">Error Rate by Tool</h3>
            <p className="text-[11px] text-[#6e6d68]">Tool error rate over time</p>
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
                <Area name="webSearch (%)" type="monotone" dataKey="tool_search_error" stroke="#2563eb" fill="#2563eb" fillOpacity={0.05} />
                <Area name="retriever (%)" type="monotone" dataKey="tool_retrieve_error" stroke="#059669" fill="#059669" fillOpacity={0.05} />
                <Area name="dbQuery (%)" type="monotone" dataKey="tool_db_error" stroke="#d97706" fill="#d97706" fillOpacity={0.05} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
