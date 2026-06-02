"use client";

import { formatRupiah } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Clock } from "lucide-react";

interface Props {
  data: { jam: string; omzet: number }[];
}

export default function HourlyChart({ data }: Props) {
  const maxOmzet = Math.max(...data.map((d) => d.omzet), 0);

  return (
    <div className="th-card border th-border rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Clock size={16} className="th-accent" />
        <h3 className="text-sm font-bold th-text">Omzet per Jam</h3>
      </div>

      {data.length === 0 || data.every((d) => d.omzet === 0) ? (
        <div className="flex items-center justify-center h-40 th-muted text-sm">Belum ada transaksi hari ini</div>
      ) : (
        <div className="h-[300px] w-full">
           <ResponsiveContainer width="100%" height="100%">
             <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
               <XAxis dataKey="jam" tick={{ fill: "#9CA3AF", fontSize: 10 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
               <YAxis tick={{ fill: "#9CA3AF", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
               <Tooltip
                 contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}
                 formatter={(value) => [formatRupiah(Number(value)), "Omzet"]}
                 labelStyle={{ color: "var(--text-secondary)" }}
                 itemStyle={{ color: "var(--text-primary)" }}
               />
               <Bar dataKey="omzet" radius={[4, 4, 0, 0]}>
                 {data.map((entry, index) => (
                   <Cell key={index} fill={entry.omzet === maxOmzet && maxOmzet > 0 ? "var(--accent)" : "var(--muted)"} />
                 ))}
               </Bar>
             </BarChart>
           </ResponsiveContainer>
         </div>
      )}
    </div>
  );
}
