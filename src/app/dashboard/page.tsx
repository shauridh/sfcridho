"use client";

import { useState, useEffect, useCallback } from "react";
import { useTransaksi } from "@/hooks/useTransaksi";
import { useKas } from "@/hooks/useKas";
import { useTotalSaldo } from "@/hooks/useTotalSaldo";
import SummaryCards from "@/components/laporan/SummaryCards";
import HourlyChart from "@/components/laporan/HourlyChart";
import TransactionList from "@/components/laporan/TransactionList";
import BestSellers from "@/components/laporan/BestSellers";
import WeeklyTrend from "@/components/laporan/WeeklyTrend";
import LoadingScreen from "@/components/LoadingScreen";
import { formatTanggal, formatRupiah } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Calendar, ArrowUpCircle, ArrowDownCircle, Banknote, QrCode, Wallet, Info } from "lucide-react";

export default function DashboardPage() {
  const { getLaporanHariIni, getWeeklyTrend } = useTransaksi();
  const { totalMasuk, totalKeluar, selisih, refresh: refreshKas } = useKas();
  const { breakdown, loading: loadingSaldo } = useTotalSaldo();
  const [date, setDate] = useState(new Date());
  const [data, setData] = useState<any>(null);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSaldoDetail, setShowSaldoDetail] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const result = await getLaporanHariIni(date);
    setData(result);
    await refreshKas(date);
    setLoading(false);
  }, [date, getLaporanHariIni, refreshKas]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { getWeeklyTrend().then(setWeeklyData); }, [getWeeklyTrend]);

  const prevDay = () => setDate((d) => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; });
  const nextDay = () => setDate((d) => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; });
  const isToday = date.toDateString() === new Date().toDateString();

  if (loading || !data) {
    return <LoadingScreen label="Memuat dashboard..." />;
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 overflow-auto h-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold th-text">Dashboard</h1>
          <p className="text-xs md:text-sm th-text-secondary">
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

      <div className="th-card border th-border rounded-2xl p-4 md:p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3 md:mb-4">
          <Wallet size={16} className="th-accent" />
          <h3 className="text-sm font-bold th-text">Ringkasan Keuangan</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
          <div className="bg-purple-50 dark:bg-purple-950/20 rounded-xl p-3 border border-purple-200 dark:border-purple-800 cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-950/30 transition-colors" onClick={() => setShowSaldoDetail(true)}>
            <div className="flex items-center gap-1.5 mb-1">
              <Wallet size={14} className="text-purple-600" />
              <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 uppercase">Total Saldo</span>
            </div>
            <p className="text-lg font-bold text-purple-700 dark:text-purple-300">{loadingSaldo ? "..." : breakdown.totalFormatted}</p>
            <p className="text-[10px] text-purple-500 flex items-center gap-1">Semua sumber <Info size={10} className="opacity-50" /></p>
          </div>
          <div className="bg-green-50 dark:bg-green-950/20 rounded-xl p-3 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-1.5 mb-1">
              <ArrowUpCircle size={14} className="text-green-600" />
              <span className="text-[10px] font-semibold text-green-600 dark:text-green-400 uppercase">Kas Masuk</span>
            </div>
            <p className="text-lg font-bold text-green-700 dark:text-green-300">{formatRupiah(totalMasuk)}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-950/20 rounded-xl p-3 border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-1.5 mb-1">
              <ArrowDownCircle size={14} className="text-red-600" />
              <span className="text-[10px] font-semibold text-red-600 dark:text-red-400 uppercase">Kas Keluar</span>
            </div>
            <p className="text-lg font-bold text-red-700 dark:text-red-300">{formatRupiah(totalKeluar)}</p>
          </div>
          <div className={`rounded-xl p-3 border ${selisih >= 0 ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800" : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"}`}>
            <span className={`text-[10px] font-semibold uppercase ${selisih >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>Bersih</span>
            <p className={`text-lg font-bold ${selisih >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}>{formatRupiah(selisih)}</p>
          </div>
          {data.metodeBayar && (
            <>
              <div className="bg-green-50 dark:bg-green-950/20 rounded-xl p-3 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-1.5 mb-1">
                  <Banknote size={14} className="text-green-600" />
                  <span className="text-[10px] font-semibold text-green-600 dark:text-green-400 uppercase">Tunai</span>
                </div>
                <p className="text-lg font-bold text-green-700 dark:text-green-300">{formatRupiah(data.metodeBayar.tunai.total)}</p>
                <p className="text-[10px] text-green-500">{data.metodeBayar.tunai.count} trx</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-xl p-3 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-1.5 mb-1">
                  <QrCode size={14} className="text-blue-600" />
                  <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase">QRIS</span>
                </div>
                <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{formatRupiah(data.metodeBayar.qris.total)}</p>
                <p className="text-[10px] text-blue-500">{data.metodeBayar.qris.count} trx</p>
              </div>
            </>
          )}
        </div>
      </div>

      {showSaldoDetail && (
        <div className="fixed inset-0 th-overlay flex items-center justify-center z-50 p-4" onClick={() => setShowSaldoDetail(false)}>
          <div className="th-card border th-border rounded-2xl w-full max-w-sm shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <Wallet size={18} className="th-accent" />
              <h3 className="text-base font-bold th-text">Rincian Total Saldo</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b th-border/30">
                <span className="th-text-secondary">Drawer (Shift Aktif)</span>
                <span className="font-semibold th-text">{breakdown.drawerFormatted}</span>
              </div>
              <div className="flex justify-between py-2 border-b th-border/30">
                <span className="th-text-secondary">Kas Masuk (Manual)</span>
                <span className="font-semibold text-success">{breakdown.kasMasukFormatted}</span>
              </div>
              <div className="flex justify-between py-2 border-b th-border/30">
                <span className="th-text-secondary">Kas Keluar (Manual)</span>
                <span className="font-semibold text-danger">-{breakdown.kasKeluarFormatted}</span>
              </div>
              <div className="flex justify-between py-2 border-b th-border/30">
                <span className="th-text-secondary">Bank / E-Wallet</span>
                <span className="font-semibold th-text">{formatRupiah(breakdown.akunBank + breakdown.akunEwallet + breakdown.akunKasFisik)}</span>
              </div>
              <div className="flex justify-between py-3 border-t-2 th-border">
                <span className="font-bold th-text">Total Saldo</span>
                <span className="text-lg font-bold th-accent">{breakdown.totalFormatted}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <HourlyChart data={data.hourlyData} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BestSellers items={data.bestSellersList || []} />
        <WeeklyTrend data={weeklyData} />
      </div>

      <TransactionList transaksiList={data.transaksiList} />
    </div>
  );
}
