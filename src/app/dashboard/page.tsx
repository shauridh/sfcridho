"use client";

import { useState, useEffect, useCallback } from "react";
import { useTransaksi } from "@/hooks/useTransaksi";
import { useKas } from "@/hooks/useKas";
import { useAuth } from "@/components/AuthProvider";
import SummaryCards from "@/components/laporan/SummaryCards";
import TargetProgress from "@/components/laporan/TargetProgress";
import HourlyChart from "@/components/laporan/HourlyChart";
import TransactionList from "@/components/laporan/TransactionList";
import BestSellers from "@/components/laporan/BestSellers";
import WeeklyTrend from "@/components/laporan/WeeklyTrend";
import { formatTanggal, formatRupiah } from "@/lib/utils";
import { getSettings } from "@/lib/whatsapp";
import { ChevronLeft, ChevronRight, Calendar, ArrowUpCircle, ArrowDownCircle } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const { getLaporanHariIni, getWeeklyTrend } = useTransaksi();
  const { totalMasuk, totalKeluar, selisih, refresh: refreshKas } = useKas();
  const [date, setDate] = useState(new Date());
  const [data, setData] = useState<any>(null);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetHarian, setTargetHarian] = useState(1500000);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const result = await getLaporanHariIni(date);
    setData(result);
    await refreshKas(date);
    const settings = await getSettings();
    if (settings.daily_target) setTargetHarian(parseInt(settings.daily_target) || 1500000);
    setLoading(false);
  }, [date, getLaporanHariIni, refreshKas]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { getWeeklyTrend().then(setWeeklyData); }, [getWeeklyTrend]);

  const prevDay = () => setDate((d) => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; });
  const nextDay = () => setDate((d) => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; });
  const isToday = date.toDateString() === new Date().toDateString();

  if (loading || !data) {
    return <div className="flex items-center justify-center h-full"><div className="th-muted">Memuat dashboard...</div></div>;
  }

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold th-text">Halo, {user?.nama || "Admin"}!</h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950/30 th-accent border th-border">
              {user?.role || "owner"}
            </span>
          </div>
          <p className="text-sm th-text-secondary">
            {date.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevDay} className="p-2 th-muted hover:th-text rounded-lg hover:th-surface touch-target"><ChevronLeft size={20} /></button>
          <div className="flex items-center gap-2 px-3 py-2 th-card border th-border rounded-xl shadow-sm">
            <Calendar size={14} className="th-muted" />
            <span className="text-sm font-medium th-text">{formatTanggal(date.toISOString())}</span>
          </div>
          <button onClick={nextDay} disabled={isToday} className="p-2 th-muted hover:th-text rounded-lg hover:th-surface disabled:opacity-30 touch-target"><ChevronRight size={20} /></button>
        </div>
      </div>

      <SummaryCards totalOmzet={data.totalOmzet} jumlahTransaksi={data.jumlahTransaksi} rataRata={data.rataRata} totalItem={data.totalItem} />

      <div className="grid grid-cols-3 gap-4">
        <div className="th-card border th-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950/30"><ArrowUpCircle size={16} className="text-success" /></div>
            <span className="text-xs font-semibold th-muted uppercase">Kas Masuk</span>
          </div>
          <p className="text-xl font-bold text-success">{formatRupiah(totalMasuk)}</p>
        </div>
        <div className="th-card border th-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/30"><ArrowDownCircle size={16} className="text-danger" /></div>
            <span className="text-xs font-semibold th-muted uppercase">Kas Keluar</span>
          </div>
          <p className="text-xl font-bold text-danger">{formatRupiah(totalKeluar)}</p>
        </div>
        <div className="th-card border th-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2"><span className="text-xs font-semibold th-muted uppercase">Bersih</span></div>
          <p className={`text-xl font-bold ${selisih >= 0 ? "text-success" : "text-danger"}`}>{formatRupiah(selisih)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TargetProgress current={data.totalOmzet} target={targetHarian} onTargetChange={setTargetHarian} />
        <HourlyChart data={data.hourlyData} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BestSellers items={data.bestSellersList || []} />
        <WeeklyTrend data={weeklyData} />
      </div>

      <TransactionList transaksiList={data.transaksiList} />
    </div>
  );
}
