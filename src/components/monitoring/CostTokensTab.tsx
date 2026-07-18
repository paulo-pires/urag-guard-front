import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

interface CostTokensTabProps {
  chartData: any[];
}

export default function CostTokensTab({ chartData }: CostTokensTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Output Tokens */}
      <div className="p-5 rounded-lg border border-zinc-900 bg-zinc-950/40 space-y-4">
        <div>
          <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Output Tokens</h3>
          <p className="text-[11px] text-zinc-500">Total output tokens over time</p>
        </div>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#141416" />
              <XAxis dataKey="name" stroke="#3f3f46" fontSize={10} tickLine={false} />
              <YAxis stroke="#3f3f46" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "4px" }}
                labelStyle={{ color: "#71717a", fontSize: "10px" }}
                itemStyle={{ fontSize: "10px" }}
              />
              <Legend verticalAlign="top" height={36} iconSize={8} wrapperStyle={{ fontSize: "10px", color: "#a1a1aa" }} />
              <Line name="Output" type="monotone" dataKey="output_tokens" stroke="#84cc16" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Output Tokens per Trace */}
      <div className="p-5 rounded-lg border border-zinc-900 bg-zinc-950/40 space-y-4">
        <div>
          <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Output Tokens per Trace</h3>
          <p className="text-[11px] text-zinc-500">Output tokens used per trace over time</p>
        </div>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#141416" />
              <XAxis dataKey="name" stroke="#3f3f46" fontSize={10} tickLine={false} />
              <YAxis stroke="#3f3f46" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "4px" }}
                labelStyle={{ color: "#71717a", fontSize: "10px" }}
                itemStyle={{ fontSize: "10px" }}
              />
              <Legend verticalAlign="top" height={36} iconSize={8} wrapperStyle={{ fontSize: "10px", color: "#a1a1aa" }} />
              <Line name="Output/Trace" type="monotone" dataKey="output_tokens_per_trace" stroke="#06b6d4" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Input Tokens */}
      <div className="p-5 rounded-lg border border-zinc-900 bg-zinc-950/40 space-y-4">
        <div>
          <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Input Tokens</h3>
          <p className="text-[11px] text-zinc-500">Total input tokens over time</p>
        </div>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#141416" />
              <XAxis dataKey="name" stroke="#3f3f46" fontSize={10} tickLine={false} />
              <YAxis stroke="#3f3f46" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "4px" }}
                labelStyle={{ color: "#71717a", fontSize: "10px" }}
                itemStyle={{ fontSize: "10px" }}
              />
              <Legend verticalAlign="top" height={36} iconSize={8} wrapperStyle={{ fontSize: "10px", color: "#a1a1aa" }} />
              <Line name="Input" type="monotone" dataKey="input_tokens" stroke="#8b5cf6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Input Tokens per Trace */}
      <div className="p-5 rounded-lg border border-zinc-900 bg-zinc-950/40 space-y-4">
        <div>
          <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Input Tokens per Trace</h3>
          <p className="text-[11px] text-zinc-500">Input tokens used per trace over time</p>
        </div>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#141416" />
              <XAxis dataKey="name" stroke="#3f3f46" fontSize={10} tickLine={false} />
              <YAxis stroke="#3f3f46" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "4px" }}
                labelStyle={{ color: "#71717a", fontSize: "10px" }}
                itemStyle={{ fontSize: "10px" }}
              />
              <Legend verticalAlign="top" height={36} iconSize={8} wrapperStyle={{ fontSize: "10px", color: "#a1a1aa" }} />
              <Line name="Input/Trace" type="monotone" dataKey="input_tokens_per_trace" stroke="#ec4899" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
