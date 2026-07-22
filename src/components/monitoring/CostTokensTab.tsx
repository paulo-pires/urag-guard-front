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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-[#1a1a1a]">
      {/* Output Tokens */}
      <div className="p-5 rounded-lg border border-[#e6e4df] bg-[#ffffff] shadow-xs space-y-4">
        <div>
          <h3 className="font-serif italic text-xs font-bold text-[#1a1a1a] uppercase tracking-wider">Output Tokens</h3>
          <p className="text-[11px] text-[#6e6d68]">Total output tokens over time</p>
        </div>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e6e4df" />
              <XAxis dataKey="name" stroke="#8e8d87" fontSize={10} tickLine={false} />
              <YAxis stroke="#8e8d87" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e6e4df", borderRadius: "6px", color: "#1a1a1a" }}
                labelStyle={{ color: "#6e6d68", fontSize: "10px" }}
                itemStyle={{ fontSize: "10px" }}
              />
              <Legend verticalAlign="top" height={36} iconSize={8} wrapperStyle={{ fontSize: "10px", color: "#575652" }} />
              <Line name="Output" type="monotone" dataKey="output_tokens" stroke="#65a30d" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Output Tokens per Trace */}
      <div className="p-5 rounded-lg border border-[#e6e4df] bg-[#ffffff] shadow-xs space-y-4">
        <div>
          <h3 className="font-serif italic text-xs font-bold text-[#1a1a1a] uppercase tracking-wider">Output Tokens per Trace</h3>
          <p className="text-[11px] text-[#6e6d68]">Output tokens used per trace over time</p>
        </div>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e6e4df" />
              <XAxis dataKey="name" stroke="#8e8d87" fontSize={10} tickLine={false} />
              <YAxis stroke="#8e8d87" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e6e4df", borderRadius: "6px", color: "#1a1a1a" }}
                labelStyle={{ color: "#6e6d68", fontSize: "10px" }}
                itemStyle={{ fontSize: "10px" }}
              />
              <Legend verticalAlign="top" height={36} iconSize={8} wrapperStyle={{ fontSize: "10px", color: "#575652" }} />
              <Line name="Output/Trace" type="monotone" dataKey="output_tokens_per_trace" stroke="#0891b2" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Input Tokens */}
      <div className="p-5 rounded-lg border border-[#e6e4df] bg-[#ffffff] shadow-xs space-y-4">
        <div>
          <h3 className="font-serif italic text-xs font-bold text-[#1a1a1a] uppercase tracking-wider">Input Tokens</h3>
          <p className="text-[11px] text-[#6e6d68]">Total input tokens over time</p>
        </div>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e6e4df" />
              <XAxis dataKey="name" stroke="#8e8d87" fontSize={10} tickLine={false} />
              <YAxis stroke="#8e8d87" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e6e4df", borderRadius: "6px", color: "#1a1a1a" }}
                labelStyle={{ color: "#6e6d68", fontSize: "10px" }}
                itemStyle={{ fontSize: "10px" }}
              />
              <Legend verticalAlign="top" height={36} iconSize={8} wrapperStyle={{ fontSize: "10px", color: "#575652" }} />
              <Line name="Input" type="monotone" dataKey="input_tokens" stroke="#7c3aed" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Input Tokens per Trace */}
      <div className="p-5 rounded-lg border border-[#e6e4df] bg-[#ffffff] shadow-xs space-y-4">
        <div>
          <h3 className="font-serif italic text-xs font-bold text-[#1a1a1a] uppercase tracking-wider">Input Tokens per Trace</h3>
          <p className="text-[11px] text-[#6e6d68]">Input tokens used per trace over time</p>
        </div>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e6e4df" />
              <XAxis dataKey="name" stroke="#8e8d87" fontSize={10} tickLine={false} />
              <YAxis stroke="#8e8d87" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e6e4df", borderRadius: "6px", color: "#1a1a1a" }}
                labelStyle={{ color: "#6e6d68", fontSize: "10px" }}
                itemStyle={{ fontSize: "10px" }}
              />
              <Legend verticalAlign="top" height={36} iconSize={8} wrapperStyle={{ fontSize: "10px", color: "#575652" }} />
              <Line name="Input/Trace" type="monotone" dataKey="input_tokens_per_trace" stroke="#db2777" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
