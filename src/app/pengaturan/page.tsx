"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getSettings, updateSetting, sendWhatsApp } from "@/lib/whatsapp";
import { supabase } from "@/lib/supabase";
import { AppUser, Akun, TIPE_AKUN_OPTIONS } from "@/lib/types";
import { Store, Users, MessageCircle, Target, Save, Plus, Trash2, Edit3, Wallet, QrCode } from "lucide-react";

export default function PengaturanPage() {
  const { isOwner } = useAuth();
  const [tab, setTab] = useState<"store" | "users" | "wa" | "target" | "akun" | "qris">("store");
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<AppUser[]>([]);
  const [akunList, setAkunList] = useState<Akun[]>([]);
  const [showAkunForm, setShowAkunForm] = useState(false);
  const [editingAkun, setEditingAkun] = useState<Akun | null>(null);
  const [akunForm, setAkunForm] = useState({ nama: "", tipe: "kas_fisik", warna: "#6B7280" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [waTestStatus, setWaTestStatus] = useState<string | null>(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [userForm, setUserForm] = useState({ username: "", pin: "", nama: "", role: "kasir" });

  const fetchData = useCallback(async () => {
    const s = await getSettings();
    setSettings(s);
    const { data } = await supabase.from("app_users").select("*").order("created_at");
    if (data) setUsers(data);
    const { data: akunData } = await supabase.from("akun").select("*").order("created_at");
    if (akunData) setAkunList(akunData);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSaveSettings = async (updates: Record<string, string>) => {
    setSaving(true);
    for (const [key, value] of Object.entries(updates)) {
      await updateSetting(key, value);
    }
    await fetchData();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSaveUser = async () => {
    if (!userForm.username || !userForm.pin || !userForm.nama) return;
    setSaving(true);
    if (editingUser) {
      await supabase.from("app_users").update({
        username: userForm.username,
        pin_hash: userForm.pin,
        nama: userForm.nama,
        role: userForm.role,
      }).eq("id", editingUser.id);
    } else {
      await supabase.from("app_users").insert({
        username: userForm.username,
        pin_hash: userForm.pin,
        nama: userForm.nama,
        role: userForm.role,
      });
    }
    setShowUserForm(false);
    setEditingUser(null);
    setUserForm({ username: "", pin: "", nama: "", role: "kasir" });
    await fetchData();
    setSaving(false);
  };

  const toggleUserAktif = async (id: string, aktif: boolean) => {
    await supabase.from("app_users").update({ aktif: !aktif }).eq("id", id);
    await fetchData();
  };

  const handleSaveAkun = async () => {
    if (!akunForm.nama) return;
    setSaving(true);
    const payload = { nama: akunForm.nama, tipe: akunForm.tipe, warna: akunForm.warna };
    if (editingAkun) await supabase.from("akun").update(payload).eq("id", editingAkun.id);
    else await supabase.from("akun").insert(payload);
    setShowAkunForm(false); setEditingAkun(null);
    setAkunForm({ nama: "", tipe: "kas_fisik", warna: "#6B7280" });
    await fetchData(); setSaving(false);
  };

  const toggleAkunAktif = async (id: string, aktif: boolean) => {
    await supabase.from("akun").update({ aktif: !aktif }).eq("id", id);
    await fetchData();
  };

  const hapusAkun = async (id: string) => {
    await supabase.from("akun").delete().eq("id", id);
    await fetchData();
  };

  if (!isOwner) {
    return <div className="flex items-center justify-center h-full th-muted">Akses ditolak</div>;
  }

  const tabs = [
    { key: "store", label: "Toko", icon: Store },
    { key: "users", label: "User", icon: Users },
    { key: "akun", label: "Akun", icon: Wallet },
    { key: "wa", label: "WhatsApp", icon: MessageCircle },
    { key: "target", label: "Target", icon: Target },
    { key: "qris", label: "QRIS", icon: QrCode },
  ] as const;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold th-text">Pengaturan</h1>
        <p className="text-sm th-text-secondary mt-1">Kelola konfigurasi aplikasi</p>
      </div>

      <div className="flex gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors touch-target ${tab === t.key ? "th-accent-bg text-white" : "th-card border th-border th-muted hover:th-text"}`}>
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "store" && (
        <div className="th-card border th-border rounded-2xl p-5 shadow-sm max-w-lg space-y-4">
          <h3 className="font-bold th-text">Profil Toko</h3>
          <div>
            <label className="block text-xs font-semibold th-muted uppercase mb-1.5">Nama Toko</label>
            <input type="text" value={settings.store_name || ""} onChange={(e) => setSettings({ ...settings, store_name: e.target.value })} className="w-full px-3 py-2.5 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent" />
          </div>
          <button onClick={() => handleSaveSettings({ store_name: settings.store_name })} disabled={saving} className="px-6 py-2.5 th-accent-bg text-white rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-50 touch-target">
            {saving ? "Menyimpan..." : saved ? "Tersimpan!" : "Simpan"}
          </button>
        </div>
      )}

      {tab === "users" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold th-text">Manajemen User</h3>
            <button onClick={() => { setEditingUser(null); setUserForm({ username: "", pin: "", nama: "", role: "kasir" }); setShowUserForm(true); }} className="flex items-center gap-2 px-4 py-2.5 th-accent-bg text-white rounded-xl font-semibold text-sm touch-target">
              <Plus size={16} /> Tambah User
            </button>
          </div>
          <div className="th-card border th-border rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full">
              <thead><tr className="border-b th-border bg-red-50/30 dark:bg-red-950/10">
                <th className="px-4 py-3 text-xs font-semibold th-muted uppercase text-left">Username</th>
                <th className="px-4 py-3 text-xs font-semibold th-muted uppercase text-left">Nama</th>
                <th className="px-4 py-3 text-xs font-semibold th-muted uppercase text-left">Role</th>
                <th className="px-4 py-3 text-xs font-semibold th-muted uppercase text-left">Status</th>
                <th className="px-4 py-3 text-xs font-semibold th-muted uppercase text-right">Aksi</th>
              </tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b th-border/30 hover:bg-red-50/20 dark:hover:bg-red-950/10">
                    <td className="px-4 py-3 text-sm font-mono th-text">{u.username}</td>
                    <td className="px-4 py-3 text-sm th-text">{u.nama}</td>
                    <td className="px-4 py-3"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${u.role === "owner" ? "bg-red-50 dark:bg-red-950/30 th-accent" : "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400"}`}>{u.role}</span></td>
                    <td className="px-4 py-3"><span className={`text-xs font-semibold ${u.aktif ? "text-success" : "text-danger"}`}>{u.aktif ? "Aktif" : "Nonaktif"}</span></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setEditingUser(u); setUserForm({ username: u.username, pin: "", nama: u.nama, role: u.role }); setShowUserForm(true); }} className="p-2 th-muted hover:th-accent"><Edit3 size={14} /></button>
                        <button onClick={() => toggleUserAktif(u.id, u.aktif)} className="p-2 th-muted hover:text-danger"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "akun" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold th-text">Media Penyimpanan</h3>
              <p className="text-xs th-text-secondary mt-0.5">Kelola rekening, e-wallet, dan kas fisik</p>
            </div>
            <button onClick={() => { setEditingAkun(null); setAkunForm({ nama: "", tipe: "kas_fisik", warna: "#6B7280" }); setShowAkunForm(true); }} className="flex items-center gap-2 px-4 py-2.5 th-accent-bg text-white rounded-xl font-semibold text-sm touch-target">
              <Plus size={16} /> Tambah Akun
            </button>
          </div>
          <div className="th-card border th-border rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full">
              <thead><tr className="border-b th-border bg-red-50/30 dark:bg-red-950/10">
                <th className="px-4 py-3 text-xs font-semibold th-muted uppercase text-left">Warna</th>
                <th className="px-4 py-3 text-xs font-semibold th-muted uppercase text-left">Nama</th>
                <th className="px-4 py-3 text-xs font-semibold th-muted uppercase text-left">Tipe</th>
                <th className="px-4 py-3 text-xs font-semibold th-muted uppercase text-left">Status</th>
                <th className="px-4 py-3 text-xs font-semibold th-muted uppercase text-right">Aksi</th>
              </tr></thead>
              <tbody>
                {akunList.map((a) => (
                  <tr key={a.id} className="border-b th-border/30 hover:bg-red-50/20 dark:hover:bg-red-950/10">
                    <td className="px-4 py-3"><div className="w-6 h-6 rounded-full border th-border" style={{ background: a.warna }} /></td>
                    <td className="px-4 py-3 text-sm font-medium th-text">{a.nama}</td>
                    <td className="px-4 py-3"><span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 th-text-secondary capitalize">{a.tipe === "kas_fisik" ? "Kas Fisik" : a.tipe === "bank" ? "Bank" : "E-Wallet"}</span></td>
                    <td className="px-4 py-3"><span className={`text-xs font-semibold ${a.aktif ? "text-success" : "text-danger"}`}>{a.aktif ? "Aktif" : "Nonaktif"}</span></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setEditingAkun(a); setAkunForm({ nama: a.nama, tipe: a.tipe, warna: a.warna }); setShowAkunForm(true); }} className="p-2 th-muted hover:th-accent"><Edit3 size={14} /></button>
                        <button onClick={() => toggleAkunAktif(a.id, a.aktif)} className="p-2 th-muted hover:text-danger"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {akunList.length === 0 && <tr><td colSpan={5} className="px-5 py-12 text-center th-muted text-sm">Belum ada media penyimpanan</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "wa" && (
        <div className="th-card border th-border rounded-2xl p-5 shadow-sm max-w-lg space-y-4">
          <h3 className="font-bold th-text">WhatsApp Gateway</h3>
          <p className="text-xs th-text-secondary">Konfigurasi untuk mengirim laporan harian otomatis ke WhatsApp</p>
          <div>
            <label className="block text-xs font-semibold th-muted uppercase mb-1.5">API Key</label>
            <input type="text" value={settings.wa_api_key || ""} onChange={(e) => setSettings({ ...settings, wa_api_key: e.target.value })} className="w-full px-3 py-2.5 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent" placeholder="Masukkan API key" />
          </div>
          <div>
            <label className="block text-xs font-semibold th-muted uppercase mb-1.5">Nomor WhatsApp Tujuan</label>
            <input type="text" value={settings.wa_phone || ""} onChange={(e) => setSettings({ ...settings, wa_phone: e.target.value })} className="w-full px-3 py-2.5 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent" placeholder="628xxxxxxxxxx" />
          </div>
          <div>
            <label className="block text-xs font-semibold th-muted uppercase mb-1.5">Nomor Pengirim (Sender)</label>
            <input type="text" value={settings.wa_sender || ""} onChange={(e) => setSettings({ ...settings, wa_sender: e.target.value })} className="w-full px-3 py-2.5 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent" placeholder="62888xxxx" />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm th-text">Kirim otomatis saat tutup kasir</label>
            <button onClick={() => setSettings({ ...settings, wa_auto_send: settings.wa_auto_send === "true" ? "false" : "true" })} className={`w-12 h-6 rounded-full transition-colors ${settings.wa_auto_send === "true" ? "bg-success" : "th-surface border th-border"}`}>
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${settings.wa_auto_send === "true" ? "translate-x-6" : "translate-x-0.5"}`} />
            </button>
          </div>
          <div className="flex gap-3">
            <button onClick={() => handleSaveSettings({ wa_api_key: settings.wa_api_key, wa_phone: settings.wa_phone, wa_sender: settings.wa_sender, wa_auto_send: settings.wa_auto_send })} disabled={saving} className="px-6 py-2.5 th-accent-bg text-white rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-50 touch-target">
              {saving ? "Menyimpan..." : saved ? "Tersimpan!" : "Simpan"}
            </button>
            <button onClick={async () => {
              setWaTestStatus(null);
              await handleSaveSettings({ wa_api_key: settings.wa_api_key, wa_phone: settings.wa_phone, wa_sender: settings.wa_sender, wa_auto_send: settings.wa_auto_send });
              const res = await sendWhatsApp(`*${settings.store_name || "Sabana FC"}*\nTest notifikasi WhatsApp.\nJika pesan ini masuk, konfigurasi sudah benar.`);
              setWaTestStatus(res.success ? "Terkirim!" : `Gagal: ${res.error}`);
              setTimeout(() => setWaTestStatus(null), 5000);
            }} disabled={saving} className="px-6 py-2.5 border th-border rounded-xl font-semibold text-sm th-muted hover:th-text touch-target">
              Test WA
            </button>
          </div>
          {waTestStatus && (
            <p className={`text-sm font-medium ${waTestStatus === "Terkirim!" ? "text-success" : "text-danger"}`}>{waTestStatus}</p>
          )}
        </div>
      )}

      {tab === "target" && (
        <div className="th-card border th-border rounded-2xl p-5 shadow-sm max-w-lg space-y-4">
          <h3 className="font-bold th-text">Target Harian</h3>
          <div>
            <label className="block text-xs font-semibold th-muted uppercase mb-1.5">Target Omzet (Rp)</label>
            <input type="number" value={settings.daily_target || "1500000"} onChange={(e) => setSettings({ ...settings, daily_target: e.target.value })} className="w-full px-3 py-2.5 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent" />
          </div>
          <button onClick={() => handleSaveSettings({ daily_target: settings.daily_target })} disabled={saving} className="px-6 py-2.5 th-accent-bg text-white rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-50 touch-target">
            {saving ? "Menyimpan..." : saved ? "Tersimpan!" : "Simpan"}
          </button>
        </div>
      )}

      {tab === "qris" && (
        <div className="th-card border th-border rounded-2xl p-5 shadow-sm max-w-lg space-y-4">
          <h3 className="font-bold th-text">Pengaturan QRIS</h3>
          <p className="text-xs th-text-secondary">Masukkan string QRIS statis dari merchant. Saat kasir pilih QRIS, sistem akan otomatis generate QR dinamis sesuai nominal transaksi.</p>
          <div>
            <label className="block text-xs font-semibold th-muted uppercase mb-1.5">QRIS Static String</label>
            <textarea value={settings.qris_string || ""} onChange={(e) => setSettings({ ...settings, qris_string: e.target.value })} rows={4} className="w-full px-3 py-2.5 th-card border th-border rounded-xl text-xs font-mono th-text focus:outline-none focus:border-accent resize-none" placeholder="00020101021126570011ID.DANA.WWW..." />
            <p className="text-[10px] th-muted mt-1">String QRIS statis dari DANA, GoPay, OVO, dll. Bisa didapat dari dashboard merchant.</p>
          </div>
          <button onClick={() => handleSaveSettings({ qris_string: settings.qris_string })} disabled={saving} className="px-6 py-2.5 th-accent-bg text-white rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-50 touch-target">
            {saving ? "Menyimpan..." : saved ? "Tersimpan!" : "Simpan"}
          </button>
        </div>
      )}

      {showUserForm && (
        <div className="fixed inset-0 th-overlay flex items-center justify-center z-50 p-4" onClick={() => setShowUserForm(false)}>
          <div className="th-card border th-border rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b th-border">
              <h2 className="text-lg font-bold th-text">{editingUser ? "Edit User" : "Tambah User"}</h2>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold th-muted uppercase mb-1.5">Username</label>
                <input type="text" value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} className="w-full px-3 py-2.5 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-xs font-semibold th-muted uppercase mb-1.5">PIN</label>
                <input type="password" inputMode="numeric" maxLength={6} value={userForm.pin} onChange={(e) => setUserForm({ ...userForm, pin: e.target.value.replace(/[^0-9]/g, "") })} className="w-full px-3 py-2.5 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent tracking-widest" placeholder={editingUser ? "Kosongkan jika tidak diubah" : "4-6 digit"} />
              </div>
              <div>
                <label className="block text-xs font-semibold th-muted uppercase mb-1.5">Nama Lengkap</label>
                <input type="text" value={userForm.nama} onChange={(e) => setUserForm({ ...userForm, nama: e.target.value })} className="w-full px-3 py-2.5 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-xs font-semibold th-muted uppercase mb-1.5">Role</label>
                <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })} className="w-full px-3 py-2.5 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent">
                  <option value="kasir">Kasir</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowUserForm(false)} className="flex-1 py-3 border th-border rounded-xl text-sm font-medium th-muted touch-target">Batal</button>
                <button onClick={handleSaveUser} disabled={saving} className="flex-1 py-3 th-accent-bg text-white rounded-xl font-bold hover:opacity-90 disabled:opacity-50 touch-target">{saving ? "Menyimpan..." : "Simpan"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAkunForm && (
        <div className="fixed inset-0 th-overlay flex items-center justify-center z-50 p-4" onClick={() => setShowAkunForm(false)}>
          <div className="th-card border th-border rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b th-border">
              <h2 className="text-lg font-bold th-text">{editingAkun ? "Edit Akun" : "Tambah Akun"}</h2>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold th-muted uppercase mb-1.5">Nama Akun</label>
                <input type="text" value={akunForm.nama} onChange={(e) => setAkunForm({ ...akunForm, nama: e.target.value })} className="w-full px-3 py-2.5 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent" placeholder="Contoh: BCA, Dana, Kas Laci" />
              </div>
              <div>
                <label className="block text-xs font-semibold th-muted uppercase mb-1.5">Tipe</label>
                <select value={akunForm.tipe} onChange={(e) => setAkunForm({ ...akunForm, tipe: e.target.value })} className="w-full px-3 py-2.5 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent">
                  {TIPE_AKUN_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold th-muted uppercase mb-1.5">Warna</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={akunForm.warna} onChange={(e) => setAkunForm({ ...akunForm, warna: e.target.value })} className="w-10 h-10 rounded-lg border th-border cursor-pointer" />
                  <input type="text" value={akunForm.warna} onChange={(e) => setAkunForm({ ...akunForm, warna: e.target.value })} className="flex-1 px-3 py-2.5 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAkunForm(false)} className="flex-1 py-3 border th-border rounded-xl text-sm font-medium th-muted touch-target">Batal</button>
                <button onClick={handleSaveAkun} disabled={saving} className="flex-1 py-3 th-accent-bg text-white rounded-xl font-bold hover:opacity-90 disabled:opacity-50 touch-target">{saving ? "Menyimpan..." : "Simpan"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




