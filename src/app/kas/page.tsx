"use client";

import { useState, useEffect, useCallback } from "react";
import { useKas } from "@/hooks/useKas";
import { useTotalSaldo } from "@/hooks/useTotalSaldo";
import { formatRupiah, formatWaktu } from "@/lib/utils";
import { KATEGORI_KAS, Opex, Piutang, Akun } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { Plus, ArrowUpCircle, ArrowDownCircle, Trash2, ChevronLeft, ChevronRight, Calendar, Receipt, Repeat, CreditCard, TrendingDown, Wallet, CheckCircle2, Edit3, Info } from "lucide-react";

type Tab = "overview" | "kas" | "opex" | "piutang";

export default function KasPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [date, setDate] = useState(new Date());
  const { kasList, loading, totalMasuk, totalKeluar, selisih, totalKasAll, tambahKas, hapusKas, refresh } = useKas();
  const { breakdown, loading: loadingSaldo } = useTotalSaldo();
  const [showForm, setShowForm] = useState(false);
  const [showSaldoDetail, setShowSaldoDetail] = useState(false);
  const [tipe, setTipe] = useState<"masuk" | "keluar">("keluar");
  const [nominal, setNominal] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [kategori, setKategori] = useState("Operasional");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [opexList, setOpexList] = useState<Opex[]>([]);
  const [showOpexForm, setShowOpexForm] = useState(false);
  const [editingOpex, setEditingOpex] = useState<Opex | null>(null);
  const [opexForm, setOpexForm] = useState({ nama: "", nominal: "", frekuensi: "bulanan", jatuh_tempo: "" });

  const [piutangList, setPiutangList] = useState<Piutang[]>([]);
  const [showPiutangForm, setShowPiutangForm] = useState(false);
  const [editingPiutang, setEditingPiutang] = useState<Piutang | null>(null);
  const [piutangForm, setPiutangForm] = useState({ pihak: "", nominal: "", tipe: "hutang" as "hutang" | "piutang", keterangan: "", jatuh_tempo: "", tenor: "", bunga: "", cicilan: "" });

  const [akunList, setAkunList] = useState<Akun[]>([]);
  const [sumberAkunId, setSumberAkunId] = useState<string>("");
  const [tujuanAkunId, setTujuanAkunId] = useState<string>("");

  useEffect(() => { refresh(date); }, [date, refresh]);

  const fetchOpex = useCallback(async () => {
    const { data } = await supabase.from("opex").select("*").order("created_at");
    if (data) setOpexList(data);
  }, []);

  const fetchPiutang = useCallback(async () => {
    const { data } = await supabase.from("piutang").select("*").order("created_at", { ascending: false });
    if (data) setPiutangList(data);
  }, []);

  const fetchAkun = useCallback(async () => {
    const { data } = await supabase.from("akun").select("*").eq("aktif", true).order("created_at");
    if (data) setAkunList(data);
  }, []);

  useEffect(() => { fetchOpex(); fetchPiutang(); fetchAkun(); }, [fetchOpex, fetchPiutang, fetchAkun]);

  const prevDay = () => setDate((d) => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; });
  const nextDay = () => setDate((d) => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; });
  const isToday = date.toDateString() === new Date().toDateString();

  const handleSubmitKas = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(nominal.replace(/[^0-9]/g, ""), 10);
    if (!val || val <= 0) return;
    setSaving(true);
    await tambahKas({
      tipe,
      nominal: val,
      keterangan,
      kategori,
      sumber_akun_id: tipe === "keluar" && sumberAkunId ? sumberAkunId : null,
      tujuan_akun_id: tipe === "masuk" && tujuanAkunId ? tujuanAkunId : null,
    });
    setNominal(""); setKeterangan(""); setSumberAkunId(""); setTujuanAkunId(""); setShowForm(false); setSaving(false);
  };

  const handleSaveOpex = async () => {
    if (!opexForm.nama || !opexForm.nominal) return;
    setSaving(true);
    const payload = { nama: opexForm.nama, nominal: parseInt(opexForm.nominal) || 0, frekuensi: opexForm.frekuensi, jatuh_tempo: parseInt(opexForm.jatuh_tempo) || null };
    if (editingOpex) await supabase.from("opex").update(payload).eq("id", editingOpex.id);
    else await supabase.from("opex").insert(payload);
    setShowOpexForm(false); setEditingOpex(null); setOpexForm({ nama: "", nominal: "", frekuensi: "bulanan", jatuh_tempo: "" });
    await fetchOpex(); setSaving(false);
  };

  const hapusOpex = async (id: string) => { await supabase.from("opex").delete().eq("id", id); await fetchOpex(); };

  const handleSavePiutang = async () => {
    if (!piutangForm.pihak || !piutangForm.nominal) return;
    setSaving(true);
    const nominalVal = parseInt(piutangForm.nominal) || 0;
    const tenorVal = parseInt(piutangForm.tenor) || null;
    const bungaVal = parseFloat(piutangForm.bunga) || 0;
    const cicilanInput = parseInt(piutangForm.cicilan) || 0;
    let cicilanVal: number | null = null;
    if (tenorVal && tenorVal > 0 && nominalVal > 0) {
      const totalDenganBunga = nominalVal + Math.round(nominalVal * bungaVal / 100);
      cicilanVal = cicilanInput > 0 ? cicilanInput : Math.ceil(totalDenganBunga / tenorVal);
    }
    const payload = {
      pihak: piutangForm.pihak,
      nominal: nominalVal,
      tipe: piutangForm.tipe,
      keterangan: piutangForm.keterangan,
      jatuh_tempo: piutangForm.jatuh_tempo || null,
      tenor: tenorVal,
      bunga: bungaVal,
      cicilan: cicilanVal,
    };
    if (editingPiutang) await supabase.from("piutang").update(payload).eq("id", editingPiutang.id);
    else await supabase.from("piutang").insert(payload);
    setShowPiutangForm(false); setEditingPiutang(null);
    setPiutangForm({ pihak: "", nominal: "", tipe: "hutang", keterangan: "", jatuh_tempo: "", tenor: "", bunga: "", cicilan: "" });
    await fetchPiutang(); setSaving(false);
  };

  const togglePiutangStatus = async (id: string, current: string) => {
    await supabase.from("piutang").update({ status: current === "belum" ? "lunas" : "belum" }).eq("id", id);
    await fetchPiutang();
  };

  const hapusPiutang = async (id: string) => { await supabase.from("piutang").delete().eq("id", id); await fetchPiutang(); };

  const totalOpex = opexList.filter((o) => o.aktif).reduce((s, o) => s + o.nominal, 0);
  const totalHutang = piutangList.filter((p) => p.tipe === "hutang" && p.status === "belum").reduce((s, p) => s + p.nominal, 0);
  const totalCicilan = piutangList.filter((p) => p.tipe === "hutang" && p.status === "belum" && p.cicilan).reduce((s, p) => s + (p.cicilan || 0), 0);
  const totalPiutangBelum = piutangList.filter((p) => p.tipe === "piutang" && p.status === "belum").reduce((s, p) => s + p.nominal, 0);
  const sisaBersih = totalKasAll - totalOpex - totalCicilan;

  if (loading) return <div className="flex items-center justify-center h-full"><div className="th-muted">Memuat...</div></div>;

  const tabs = [
    { key: "overview" as Tab, label: "Ringkasan", icon: Wallet },
    { key: "kas" as Tab, label: "Kas Harian", icon: Receipt },
    { key: "opex" as Tab, label: "Opex", icon: Repeat },
    { key: "piutang" as Tab, label: "Hutang", icon: CreditCard },
  ];

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold th-text">Kas & Keuangan</h1>
          <p className="text-xs md:text-sm th-text-secondary mt-1">Kelola arus keuangan outlet</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {tab === "kas" && (
            <>
              <button onClick={() => { setTipe("masuk"); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700 touch-target"><ArrowUpCircle size={18} /> Masuk</button>
              <button onClick={() => { setTipe("keluar"); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-xl font-semibold text-sm hover:opacity-90 touch-target"><ArrowDownCircle size={18} /> Keluar</button>
            </>
          )}
          {tab === "opex" && (
            <button onClick={() => { setEditingOpex(null); setOpexForm({ nama: "", nominal: "", frekuensi: "bulanan", jatuh_tempo: "" }); setShowOpexForm(true); }} className="flex items-center gap-2 px-4 py-2.5 th-accent-bg text-white rounded-xl font-semibold text-sm hover:opacity-90 touch-target"><Plus size={18} /> Tambah Opex</button>
          )}
          {tab === "piutang" && (
            <button onClick={() => { setEditingPiutang(null); setPiutangForm({ pihak: "", nominal: "", tipe: "hutang", keterangan: "", jatuh_tempo: "", tenor: "", bunga: "", cicilan: "" }); setShowPiutangForm(true); }} className="flex items-center gap-2 px-4 py-2.5 th-accent-bg text-white rounded-xl font-semibold text-sm hover:opacity-90 touch-target"><Plus size={18} /> Tambah</button>
          )}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors touch-target ${tab === t.key ? "th-accent-bg text-white" : "th-card border th-border th-muted hover:th-text"}`}>
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

{tab === "overview" && (
        <div className="space-y-6">
          <div className="th-card border th-border rounded-2xl p-4 md:p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Wallet size={18} className="th-accent" />
              <h2 className="text-sm md:text-base font-bold th-text">Dashboard Keuangan</h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="bg-purple-50 dark:bg-purple-950/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800 cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-950/30 transition-colors" onClick={() => setShowSaldoDetail(true)}>
                <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase mb-1">Total Saldo</p>
                <p className="text-xl font-bold text-purple-700 dark:text-purple-300">{loadingSaldo ? "..." : breakdown.totalFormatted}</p>
                <p className="text-[10px] text-purple-500 mt-1 flex items-center gap-1">Semua sumber <Info size={10} className="opacity-50" /></p>
              </div>
              <div className="bg-green-50 dark:bg-green-950/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase mb-1">Total Kas</p>
                <p className="text-xl font-bold text-green-700 dark:text-green-300">{formatRupiah(totalKasAll)}</p>
                <p className="text-[10px] text-green-500 mt-1">Akumulasi masuk − keluar</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase mb-1">Opex / Bulan</p>
                <p className="text-xl font-bold text-amber-700 dark:text-amber-300">{formatRupiah(totalOpex)}</p>
                <p className="text-[10px] text-amber-500 mt-1">{opexList.filter((o) => o.aktif).length} item pengeluaran tetap</p>
              </div>
              <div className="bg-red-50 dark:bg-red-950/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
                <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase mb-1">Total Hutang</p>
                <p className="text-xl font-bold text-red-700 dark:text-red-300">{formatRupiah(totalHutang)}</p>
                <p className="text-[10px] text-red-500 mt-1">{piutangList.filter((p) => p.tipe === "hutang" && p.status === "belum").length} hutang aktif</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase mb-1">Cicilan / Bulan</p>
                <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{formatRupiah(totalCicilan)}</p>
                <p className="text-[10px] text-blue-500 mt-1">Total cicilan hutang aktif</p>
              </div>
              <div className={`rounded-xl p-4 border ${sisaBersih >= 0 ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800" : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"}`}>
                <p className={`text-xs font-semibold uppercase mb-1 ${sisaBersih >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>Sisa Bersih</p>
                <p className={`text-xl font-bold ${sisaBersih >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}>{formatRupiah(sisaBersih)}</p>
                <p className={`text-[10px] mt-1 ${sisaBersih >= 0 ? "text-emerald-500" : "text-red-500"}`}>Kas − Opex − Cicilan</p>
              </div>
            </div>
          </div>

          <div className="th-card border th-border rounded-2xl p-4 md:p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown size={16} className="th-muted" />
              <h3 className="text-xs md:text-sm font-bold th-text">Rincian Pengurangan</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1.5 border-b th-border/30">
                <span className="th-text-secondary">Total Kas (akumulasi)</span>
                <span className="font-semibold text-success">{formatRupiah(totalKasAll)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b th-border/30">
                <span className="th-text-secondary">− Opex Bulanan</span>
                <span className="font-semibold text-warning">−{formatRupiah(totalOpex)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b th-border/30">
                <span className="th-text-secondary">− Cicilan Hutang / Bulan</span>
                <span className="font-semibold text-danger">−{formatRupiah(totalCicilan)}</span>
              </div>
              {totalPiutangBelum > 0 && (
                <div className="flex justify-between py-1.5 border-b th-border/30">
                  <span className="th-text-secondary">+ Piutang (belum tertagih)</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">+{formatRupiah(totalPiutangBelum)}</span>
                </div>
              )}
              <div className="flex justify-between py-2 pt-3 border-t-2 th-border">
                <span className="font-bold th-text">Sisa Bersih</span>
                <span className={`text-lg font-bold ${sisaBersih >= 0 ? "text-success" : "text-danger"}`}>{formatRupiah(sisaBersih)}</span>
              </div>
</div>
          </div>
        </div>
      )}

      {showSaldoDetail && (
        <div className="fixed inset-0 th-overlay flex items-center justify-center z-50 p-4" onClick={() => setShowSaldoDetail(false)}>
          <div className="th-card border th-border rounded-2xl w-full max-w-sm shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <Wallet size={18} className="th-accent" />
              <h3 className="text-base font-bold th-text">Rincian Total Saldo</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b th-border/30">
                <span className="th-text-secondary">💰 Drawer (Shift Aktif)</span>
                <span className="font-semibold th-text">{breakdown.drawerFormatted}</span>
              </div>
              <div className="flex justify-between py-2 border-b th-border/30">
                <span className="th-text-secondary">+ Kas Masuk (Manual)</span>
                <span className="font-semibold text-success">{breakdown.kasMasukFormatted}</span>
              </div>
              <div className="flex justify-between py-2 border-b th-border/30">
                <span className="th-text-secondary">− Kas Keluar (Manual)</span>
                <span className="font-semibold text-danger">-{breakdown.kasKeluarFormatted}</span>
              </div>
              <div className="flex justify-between py-2 border-b th-border/30">
                <span className="th-text-secondary">🏦 Bank / E-Wallet</span>
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

      {tab === "kas" && (
        <>
          <div className="flex items-center gap-1 md:gap-2">
            <button onClick={prevDay} className="p-2 th-muted hover:th-text rounded-lg hover:th-surface touch-target"><ChevronLeft size={20} /></button>
            <div className="flex items-center gap-2 px-2 md:px-3 py-2 th-card border th-border rounded-xl shadow-sm flex-1 justify-center">
              <Calendar size={14} className="th-muted shrink-0" />
              <span className="text-xs md:text-sm font-medium th-text truncate">{date.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
            </div>
            <button onClick={nextDay} disabled={isToday} className="p-2 th-muted hover:th-text rounded-lg hover:th-surface disabled:opacity-30 touch-target"><ChevronRight size={20} /></button>
          </div>
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            <div className="th-card border th-border rounded-2xl p-3 md:p-4 shadow-sm"><p className="text-[10px] md:text-xs font-semibold th-muted uppercase mb-1">Masuk</p><p className="text-lg md:text-2xl font-bold text-success">{formatRupiah(totalMasuk)}</p></div>
            <div className="th-card border th-border rounded-2xl p-3 md:p-4 shadow-sm"><p className="text-[10px] md:text-xs font-semibold th-muted uppercase mb-1">Keluar</p><p className="text-lg md:text-2xl font-bold text-danger">{formatRupiah(totalKeluar)}</p></div>
            <div className="th-card border th-border rounded-2xl p-3 md:p-4 shadow-sm"><p className="text-[10px] md:text-xs font-semibold th-muted uppercase mb-1">Selisih</p><p className={`text-lg md:text-2xl font-bold ${selisih >= 0 ? "text-success" : "text-danger"}`}>{formatRupiah(selisih)}</p></div>
          </div>
          <div className="th-card border th-border rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b th-border bg-red-50/30 dark:bg-red-950/10">
                <th className="px-5 py-3 text-xs font-semibold th-muted uppercase text-left">Waktu</th>
                <th className="px-5 py-3 text-xs font-semibold th-muted uppercase text-left">Tipe</th>
                <th className="px-5 py-3 text-xs font-semibold th-muted uppercase text-left">Dari → Ke</th>
                <th className="px-5 py-3 text-xs font-semibold th-muted uppercase text-left">Kategori</th>
                <th className="px-5 py-3 text-xs font-semibold th-muted uppercase text-left">Keterangan</th>
                <th className="px-5 py-3 text-xs font-semibold th-muted uppercase text-right">Nominal</th>
                <th className="px-5 py-3 text-xs font-semibold th-muted uppercase text-right">Aksi</th>
              </tr></thead>
              <tbody>
                {kasList.map((k) => {
                  const sumberNama = k.sumber_akun_id ? akunList.find((a) => a.id === k.sumber_akun_id)?.nama : null;
                  const tujuanNama = k.tujuan_akun_id ? akunList.find((a) => a.id === k.tujuan_akun_id)?.nama : null;
                  return (
                  <tr key={k.id} className="border-b th-border/30 hover:bg-red-50/20 dark:hover:bg-red-950/10">
                    <td className="px-5 py-3 text-sm th-text-secondary">{formatWaktu(k.waktu)}</td>
                    <td className="px-5 py-3"><span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${k.tipe === "masuk" ? "text-success bg-green-50 dark:bg-green-950/30" : "text-danger bg-red-50 dark:bg-red-950/30"}`}>{k.tipe === "masuk" ? <ArrowUpCircle size={12} /> : <ArrowDownCircle size={12} />}{k.tipe === "masuk" ? "Masuk" : "Keluar"}</span></td>
                    <td className="px-5 py-3 text-xs th-text-secondary">
                      {sumberNama || tujuanNama ? (
                        <span className="flex items-center gap-1">
                          {sumberNama && <span className="font-medium th-text">{sumberNama}</span>}
                          {(sumberNama && tujuanNama) && <span className="th-muted">→</span>}
                          {tujuanNama && <span className="font-medium th-text">{tujuanNama}</span>}
                        </span>
                      ) : <span className="th-muted">-</span>}
                    </td>
                    <td className="px-5 py-3 text-sm th-text-secondary">{k.kategori}</td>
                    <td className="px-5 py-3 text-sm th-text">{k.keterangan}</td>
                    <td className={`px-5 py-3 text-sm font-bold text-right ${k.tipe === "masuk" ? "text-success" : "text-danger"}`}>{k.tipe === "masuk" ? "+" : "-"}{formatRupiah(k.nominal)}</td>
                    <td className="px-5 py-3 text-right">
                      {confirmDelete === k.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={async () => { await hapusKas(k.id); setConfirmDelete(null); }} className="px-2 py-1 bg-danger text-white rounded text-xs">Ya</button>
                          <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 th-muted text-xs">Batal</button>
                        </div>
                      ) : <button onClick={() => setConfirmDelete(k.id)} className="p-1.5 th-muted hover:text-danger"><Trash2 size={14} /></button>}
                    </td>
                  </tr>
                  );
                })}
                {kasList.length === 0 && <tr><td colSpan={7} className="px-5 py-12 text-center th-muted text-sm">Belum ada catatan kas hari ini</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "opex" && (
        <>
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div className="th-card border th-border rounded-2xl p-3 md:p-4 shadow-sm"><p className="text-[10px] md:text-xs font-semibold th-muted uppercase mb-1">Total Opex / Bulan</p><p className="text-lg md:text-2xl font-bold th-accent">{formatRupiah(totalOpex)}</p></div>
            <div className="th-card border th-border rounded-2xl p-3 md:p-4 shadow-sm"><p className="text-[10px] md:text-xs font-semibold th-muted uppercase mb-1">Jumlah Item</p><p className="text-lg md:text-2xl font-bold th-text">{opexList.filter((o) => o.aktif).length}</p></div>
          </div>
          <div className="th-card border th-border rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b th-border bg-red-50/30 dark:bg-red-950/10">
                <th className="px-5 py-3 text-xs font-semibold th-muted uppercase text-left">Nama</th>
                <th className="px-5 py-3 text-xs font-semibold th-muted uppercase text-left">Frekuensi</th>
                <th className="px-5 py-3 text-xs font-semibold th-muted uppercase text-left">Jatuh Tempo</th>
                <th className="px-5 py-3 text-xs font-semibold th-muted uppercase text-right">Nominal</th>
                <th className="px-5 py-3 text-xs font-semibold th-muted uppercase text-right">Aksi</th>
              </tr></thead>
              <tbody>
                {opexList.map((o) => (
                  <tr key={o.id} className={`border-b th-border/30 hover:bg-red-50/20 dark:hover:bg-red-950/10 ${!o.aktif ? "opacity-50" : ""}`}>
                    <td className="px-5 py-3 text-sm font-medium th-text">{o.nama}</td>
                    <td className="px-5 py-3 text-sm th-text-secondary capitalize">{o.frekuensi}</td>
                    <td className="px-5 py-3 text-sm th-text-secondary">{o.jatuh_tempo ? `Tanggal ${o.jatuh_tempo}` : "-"}</td>
                    <td className="px-5 py-3 text-sm font-bold th-accent text-right">{formatRupiah(o.nominal)}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setEditingOpex(o); setOpexForm({ nama: o.nama, nominal: o.nominal.toString(), frekuensi: o.frekuensi, jatuh_tempo: o.jatuh_tempo?.toString() || "" }); setShowOpexForm(true); }} className="p-1.5 th-muted hover:th-accent text-xs">Edit</button>
                        <button onClick={() => hapusOpex(o.id)} className="p-1.5 th-muted hover:text-danger"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {opexList.length === 0 && <tr><td colSpan={5} className="px-5 py-12 text-center th-muted text-sm">Belum ada data opex</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "piutang" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="th-card border th-border rounded-2xl p-3 md:p-4 shadow-sm"><p className="text-[10px] md:text-xs font-semibold th-muted uppercase mb-1">Total Hutang</p><p className="text-lg md:text-2xl font-bold text-danger">{formatRupiah(totalHutang)}</p></div>
            <div className="th-card border th-border rounded-2xl p-3 md:p-4 shadow-sm"><p className="text-[10px] md:text-xs font-semibold th-muted uppercase mb-1">Cicilan / Bulan</p><p className="text-lg md:text-2xl font-bold text-blue-600 dark:text-blue-400">{formatRupiah(totalCicilan)}</p></div>
            <div className="th-card border th-border rounded-2xl p-3 md:p-4 shadow-sm"><p className="text-[10px] md:text-xs font-semibold th-muted uppercase mb-1">Total Piutang</p><p className="text-lg md:text-2xl font-bold text-success">{formatRupiah(totalPiutangBelum)}</p></div>
            <div className="th-card border th-border rounded-2xl p-3 md:p-4 shadow-sm"><p className="text-[10px] md:text-xs font-semibold th-muted uppercase mb-1">Bersih</p><p className={`text-lg md:text-2xl font-bold ${totalPiutangBelum - totalHutang >= 0 ? "text-success" : "text-danger"}`}>{formatRupiah(totalPiutangBelum - totalHutang)}</p></div>
          </div>
          <div className="th-card border th-border rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b th-border bg-red-50/30 dark:bg-red-950/10">
                <th className="px-4 py-3 text-xs font-semibold th-muted uppercase text-left">Pihak</th>
                <th className="px-4 py-3 text-xs font-semibold th-muted uppercase text-left">Tipe</th>
                <th className="px-4 py-3 text-xs font-semibold th-muted uppercase text-right">Total</th>
                <th className="px-4 py-3 text-xs font-semibold th-muted uppercase text-right">Tenor</th>
                <th className="px-4 py-3 text-xs font-semibold th-muted uppercase text-right">Bunga</th>
                <th className="px-4 py-3 text-xs font-semibold th-muted uppercase text-right">Cicilan/bln</th>
                <th className="px-4 py-3 text-xs font-semibold th-muted uppercase text-left">Jatuh Tempo</th>
                <th className="px-4 py-3 text-xs font-semibold th-muted uppercase text-center">Status</th>
                <th className="px-4 py-3 text-xs font-semibold th-muted uppercase text-right">Aksi</th>
              </tr></thead>
              <tbody>
                {piutangList.map((p) => (
                  <tr key={p.id} className={`border-b th-border/30 hover:bg-red-50/20 dark:hover:bg-red-950/10 ${p.status === "lunas" ? "opacity-60" : ""}`}>
                    <td className="px-4 py-3 text-sm font-medium th-text">{p.pihak}</td>
                    <td className="px-4 py-3"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.tipe === "hutang" ? "text-danger bg-red-50 dark:bg-red-950/30" : "text-success bg-green-50 dark:bg-green-950/30"}`}>{p.tipe === "hutang" ? "Hutang" : "Piutang"}</span></td>
                    <td className="px-4 py-3 text-sm font-bold th-accent text-right">{formatRupiah(p.nominal)}</td>
                    <td className="px-4 py-3 text-sm th-text-secondary text-right">{p.tenor ? `${p.tenor} bln` : "-"}</td>
                    <td className="px-4 py-3 text-sm th-text-secondary text-right">{p.bunga ? `${p.bunga}%` : "-"}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-blue-600 dark:text-blue-400 text-right">{p.cicilan ? formatRupiah(p.cicilan) : "-"}</td>
                    <td className="px-4 py-3 text-sm th-text-secondary">{p.jatuh_tempo ? new Date(p.jatuh_tempo).toLocaleDateString("id-ID") : "-"}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => togglePiutangStatus(p.id, p.status)} className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.status === "lunas" ? "text-success bg-green-50 dark:bg-green-950/30" : "text-warning bg-amber-50 dark:bg-amber-950/30"}`}>
                        {p.status === "lunas" ? "Lunas" : "Belum"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {p.status === "belum" && (
                          <button onClick={() => togglePiutangStatus(p.id, p.status)} className="flex items-center gap-1 px-2 py-1.5 bg-green-50 dark:bg-green-950/30 text-success rounded-lg text-xs font-medium hover:bg-green-100 dark:hover:bg-green-950/50 transition-colors border border-green-200 dark:border-green-800">
                            <CheckCircle2 size={12} /> Lunas
                          </button>
                        )}
                        <button onClick={() => { setEditingPiutang(p); setPiutangForm({ pihak: p.pihak, nominal: p.nominal.toString(), tipe: p.tipe, keterangan: p.keterangan || "", jatuh_tempo: p.jatuh_tempo || "", tenor: p.tenor?.toString() || "", bunga: p.bunga?.toString() || "", cicilan: p.cicilan?.toString() || "" }); setShowPiutangForm(true); }} className="p-1.5 th-muted hover:th-accent text-xs"><Edit3 size={14} /></button>
                        <button onClick={() => hapusPiutang(p.id)} className="p-1.5 th-muted hover:text-danger"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {piutangList.length === 0 && <tr><td colSpan={9} className="px-5 py-12 text-center th-muted text-sm">Belum ada data hutang/piutang</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showForm && (
        <div className="fixed inset-0 th-overlay flex items-center justify-center z-50 p-4" >
          <div className="th-card border th-border rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b th-border"><h2 className="text-lg font-bold th-text">{tipe === "masuk" ? "Kas Masuk" : "Kas Keluar"}</h2></div>
            <form onSubmit={handleSubmitKas} className="p-5 space-y-4">
              <div><label className="block text-xs font-semibold th-muted uppercase mb-1.5">Nominal (Rp)</label><input type="text" inputMode="numeric" value={nominal} onChange={(e) => setNominal(e.target.value)} required autoFocus className="w-full px-3 py-3 th-card border th-border rounded-xl text-xl font-bold th-text focus:outline-none focus:border-accent text-center" placeholder="0" /></div>
              {tipe === "keluar" && akunList.length > 0 && (
                <div><label className="block text-xs font-semibold th-muted uppercase mb-1.5">Dari Akun (Sumber)</label><select value={sumberAkunId} onChange={(e) => setSumberAkunId(e.target.value)} className="w-full px-3 py-2.5 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent"><option value="">Pilih akun...</option>{akunList.map((a) => <option key={a.id} value={a.id}>{a.nama}</option>)}</select></div>
              )}
              {tipe === "masuk" && akunList.length > 0 && (
                <div><label className="block text-xs font-semibold th-muted uppercase mb-1.5">Ke Akun (Tujuan)</label><select value={tujuanAkunId} onChange={(e) => setTujuanAkunId(e.target.value)} className="w-full px-3 py-2.5 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent"><option value="">Pilih akun...</option>{akunList.map((a) => <option key={a.id} value={a.id}>{a.nama}</option>)}</select></div>
              )}
              <div><label className="block text-xs font-semibold th-muted uppercase mb-1.5">Kategori</label><select value={kategori} onChange={(e) => setKategori(e.target.value)} className="w-full px-3 py-2.5 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent">{KATEGORI_KAS.map((k) => <option key={k} value={k}>{k}</option>)}</select></div>
              <div><label className="block text-xs font-semibold th-muted uppercase mb-1.5">Keterangan</label><input type="text" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} required className="w-full px-3 py-2.5 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent" placeholder="Contoh: Beli minyak goreng" /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 text-sm font-medium th-muted touch-target">Batal</button>
                <button type="submit" disabled={saving} className={`px-6 py-2.5 text-white rounded-xl font-semibold text-sm touch-target ${tipe === "masuk" ? "bg-success hover:bg-green-700" : "bg-accent hover:opacity-90"} disabled:opacity-50`}>{saving ? "Menyimpan..." : "Simpan"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showOpexForm && (
        <div className="fixed inset-0 th-overlay flex items-center justify-center z-50 p-4" >
          <div className="th-card border th-border rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b th-border"><h2 className="text-lg font-bold th-text">{editingOpex ? "Edit Opex" : "Tambah Opex"}</h2></div>
            <div className="p-5 space-y-4">
              <div><label className="block text-xs font-semibold th-muted uppercase mb-1.5">Nama Pengeluaran</label><input type="text" value={opexForm.nama} onChange={(e) => setOpexForm({ ...opexForm, nama: e.target.value })} className="w-full px-3 py-2.5 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent" placeholder="Contoh: Sewa Tempat" /></div>
              <div><label className="block text-xs font-semibold th-muted uppercase mb-1.5">Nominal / Bulan (Rp)</label><input type="number" value={opexForm.nominal} onChange={(e) => setOpexForm({ ...opexForm, nominal: e.target.value })} className="w-full px-3 py-2.5 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold th-muted uppercase mb-1.5">Frekuensi</label><select value={opexForm.frekuensi} onChange={(e) => setOpexForm({ ...opexForm, frekuensi: e.target.value })} className="w-full px-3 py-2.5 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent"><option value="bulanan">Bulanan</option><option value="mingguan">Mingguan</option><option value="harian">Harian</option></select></div>
                <div><label className="block text-xs font-semibold th-muted uppercase mb-1.5">Tgl Jatuh Tempo</label><input type="number" min="1" max="31" value={opexForm.jatuh_tempo} onChange={(e) => setOpexForm({ ...opexForm, jatuh_tempo: e.target.value })} className="w-full px-3 py-2.5 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent" placeholder="1-31" /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowOpexForm(false)} className="flex-1 py-3 border th-border rounded-xl text-sm font-medium th-muted touch-target">Batal</button>
                <button onClick={handleSaveOpex} disabled={saving} className="flex-1 py-3 th-accent-bg text-white rounded-xl font-bold hover:opacity-90 disabled:opacity-50 touch-target">{saving ? "Menyimpan..." : "Simpan"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPiutangForm && (
        <div className="fixed inset-0 th-overlay flex items-center justify-center z-50 p-4" >
          <div className="th-card border th-border rounded-2xl w-full max-w-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b th-border"><h2 className="text-lg font-bold th-text">{editingPiutang ? "Edit" : "Tambah"} Hutang/Piutang</h2></div>
            <div className="p-5 space-y-4">
              <div><label className="block text-xs font-semibold th-muted uppercase mb-1.5">Pihak</label><input type="text" value={piutangForm.pihak} onChange={(e) => setPiutangForm({ ...piutangForm, pihak: e.target.value })} className="w-full px-3 py-2.5 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent" placeholder="Nama pihak / bank" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold th-muted uppercase mb-1.5">Tipe</label><select value={piutangForm.tipe} onChange={(e) => setPiutangForm({ ...piutangForm, tipe: e.target.value as any })} className="w-full px-3 py-2.5 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent"><option value="hutang">Hutang (kita berhutang)</option><option value="piutang">Piutang (orang berhutang)</option></select></div>
                <div><label className="block text-xs font-semibold th-muted uppercase mb-1.5">Total Hutang (Rp)</label><input type="number" value={piutangForm.nominal} onChange={(e) => setPiutangForm({ ...piutangForm, nominal: e.target.value })} className="w-full px-3 py-2.5 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-xs font-semibold th-muted uppercase mb-1.5">Tenor (bulan)</label><input type="number" min="1" value={piutangForm.tenor} onChange={(e) => {
                  const t = e.target.value;
                  const n = parseInt(piutangForm.nominal) || 0;
                  const ten = parseInt(t) || 0;
                  const bg = parseFloat(piutangForm.bunga) || 0;
                  const total = n + Math.round(n * bg / 100);
                  setPiutangForm({ ...piutangForm, tenor: t, cicilan: ten > 0 && n > 0 ? Math.ceil(total / ten).toString() : piutangForm.cicilan });
                }} className="w-full px-3 py-2.5 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent" placeholder="12" /></div>
                <div><label className="block text-xs font-semibold th-muted uppercase mb-1.5">Bunga (%/thn)</label><input type="number" min="0" step="0.5" value={piutangForm.bunga} onChange={(e) => {
                  const bg = e.target.value;
                  const n = parseInt(piutangForm.nominal) || 0;
                  const ten = parseInt(piutangForm.tenor) || 0;
                  const bgVal = parseFloat(bg) || 0;
                  const total = n + Math.round(n * bgVal / 100);
                  setPiutangForm({ ...piutangForm, bunga: bg, cicilan: ten > 0 && n > 0 ? Math.ceil(total / ten).toString() : piutangForm.cicilan });
                }} className="w-full px-3 py-2.5 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent" placeholder="0" /></div>
                <div><label className="block text-xs font-semibold th-muted uppercase mb-1.5">Cicilan/bln (Rp)</label><input type="number" value={piutangForm.cicilan} onChange={(e) => setPiutangForm({ ...piutangForm, cicilan: e.target.value })} className="w-full px-3 py-2.5 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent" placeholder="Otomatis" /></div>
              </div>
              <div><label className="block text-xs font-semibold th-muted uppercase mb-1.5">Keterangan</label><input type="text" value={piutangForm.keterangan} onChange={(e) => setPiutangForm({ ...piutangForm, keterangan: e.target.value })} className="w-full px-3 py-2.5 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent" placeholder="Opsional" /></div>
              <div><label className="block text-xs font-semibold th-muted uppercase mb-1.5">Jatuh Tempo</label><input type="date" value={piutangForm.jatuh_tempo} onChange={(e) => setPiutangForm({ ...piutangForm, jatuh_tempo: e.target.value })} className="w-full px-3 py-2.5 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent" /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowPiutangForm(false)} className="flex-1 py-3 border th-border rounded-xl text-sm font-medium th-muted touch-target">Batal</button>
                <button onClick={handleSavePiutang} disabled={saving} className="flex-1 py-3 th-accent-bg text-white rounded-xl font-bold hover:opacity-90 disabled:opacity-50 touch-target">{saving ? "Menyimpan..." : "Simpan"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


