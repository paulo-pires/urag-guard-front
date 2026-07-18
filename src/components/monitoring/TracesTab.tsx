import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

interface TracesTabProps {
  chartData: any[];
}

export default function TracesTab({ chartData }: TracesTabProps) {
  return (
    <div className="space-y-6">
      {/* Trace Count */}
      <div className="p-5 rounded-lg border border-zinc-900 bg-zinc-950/40 space-y-4">
        <div>
          <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Trace Count</h3>
          <p className="text-[11px] text-zinc-500">Total number of traces over time</p>
        </div>
        <div className="h-64">
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
              <Line name="Success" type="monotone" dataKey="traces_success" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line name="Error" type="monotone" dataKey="traces_error" stroke="#ef4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Latency & Error Rate Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trace Latency */}
        <div className="p-5 rounded-lg border border-zinc-900 bg-zinc-950/40 space-y-4">
          <div>
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Trace Latency</h3>
            <p className="text-[11px] text-zinc-500">Trace latency percentiles over time</p>
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
                <Line name="p50" type="monotone" dataKey="latency_p50" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
                <Line name="p95" type="monotone" dataKey="latency_p95" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                <Line name="p99" type="monotone" dataKey="latency_p99" stroke="#8b5cf6" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trace Error Rate */}
        <div className="p-5 rounded-lg border border-zinc-900 bg-zinc-950/40 space-y-4">
          <div>
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Trace Error Rate</h3>
            <p className="text-[11px] text-zinc-500">Percent of traces that errored over time</p>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorErrorRate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#141416" />
                <XAxis dataKey="name" stroke="#3f3f46" fontSize={10} tickLine={false} />
                <YAxis stroke="#3f3f46" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "4px" }}
                  labelStyle={{ color: "#71717a", fontSize: "10px" }}
                  itemStyle={{ fontSize: "10px" }}
                />
                <Area name="Error Rate (%)" type="monotone" dataKey="error_rate" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorErrorRate)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
