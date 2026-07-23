import React, { useId } from "react";
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
  const uid = useId();
  return (
    <div className="space-y-6 text-[#1a1a1a]">
      {/* Trace Count */}
      <div className="p-5 rounded-lg border border-[#e6e4df] bg-[#ffffff] shadow-xs space-y-4">
        <div>
          <h3 className="font-serif italic text-xs font-bold text-[#1a1a1a] uppercase tracking-wider">Trace Count</h3>
          <p className="text-[11px] text-[#6e6d68]">Total number of traces over time</p>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e6e4df" />
              <XAxis dataKey="name" stroke="#8e8d87" fontSize={10} tickLine={false} />
              <YAxis width={40} stroke="#8e8d87" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e6e4df", borderRadius: "6px", color: "#1a1a1a" }}
                labelStyle={{ color: "#6e6d68", fontSize: "10px" }}
                itemStyle={{ fontSize: "10px" }}
              />
              <Legend verticalAlign="top" height={36} iconSize={8} wrapperStyle={{ fontSize: "10px", color: "#575652" }} />
              <Line name="Success" type="monotone" dataKey="traces_success" stroke="#059669" strokeWidth={2} dot={false} />
              <Line name="Error" type="monotone" dataKey="traces_error" stroke="#dc2626" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Latency & Error Rate Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trace Latency */}
        <div className="p-5 rounded-lg border border-[#e6e4df] bg-[#ffffff] shadow-xs space-y-4">
          <div>
            <h3 className="font-serif italic text-xs font-bold text-[#1a1a1a] uppercase tracking-wider">Trace Latency</h3>
            <p className="text-[11px] text-[#6e6d68]">Trace latency percentiles over time</p>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6e4df" />
                <XAxis dataKey="name" stroke="#8e8d87" fontSize={10} tickLine={false} />
                <YAxis width={40} stroke="#8e8d87" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e6e4df", borderRadius: "6px", color: "#1a1a1a" }}
                  labelStyle={{ color: "#6e6d68", fontSize: "10px" }}
                  itemStyle={{ fontSize: "10px" }}
                />
                <Legend verticalAlign="top" height={36} iconSize={8} wrapperStyle={{ fontSize: "10px", color: "#575652" }} />
                <Line name="p50" type="monotone" dataKey="latency_p50" stroke="#2563eb" strokeWidth={1.5} dot={false} />
                <Line name="p95" type="monotone" dataKey="latency_p95" stroke="#d97706" strokeWidth={1.5} dot={false} />
                <Line name="p99" type="monotone" dataKey="latency_p99" stroke="#7c3aed" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trace Error Rate */}
        <div className="p-5 rounded-lg border border-[#e6e4df] bg-[#ffffff] shadow-xs space-y-4">
          <div>
            <h3 className="font-serif italic text-xs font-bold text-[#1a1a1a] uppercase tracking-wider">Trace Error Rate</h3>
            <p className="text-[11px] text-[#6e6d68]">Percent of traces that errored over time</p>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`colorErrorRate${uid}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6e4df" />
                <XAxis dataKey="name" stroke="#8e8d87" fontSize={10} tickLine={false} />
                <YAxis width={40} stroke="#8e8d87" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e6e4df", borderRadius: "6px", color: "#1a1a1a" }}
                  labelStyle={{ color: "#6e6d68", fontSize: "10px" }}
                  itemStyle={{ fontSize: "10px" }}
                />
                <Area name="Error Rate (%)" type="monotone" dataKey="error_rate" stroke="#dc2626" strokeWidth={2} fillOpacity={1} fill={`url(#colorErrorRate${uid})`} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
