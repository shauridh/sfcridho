"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getSettings, updateSetting, sendWhatsApp } from "@/lib/whatsapp";

import { supabase } from "@/lib/supabase";
import { AppUser, Akun, TIPE_AKUN_OPTIONS } from "@/lib/types";
import { Store, Users, MessageCircle, Save, Plus, Trash2, Edit3, Wallet, QrCode, Shield } from "lucide-react";

export default function PengaturanPage() {
  const { changePin } = useAuth();
  const [tab, setTab] = useState<"store" | "users" | "wa" | "akun" | "qris" | "pin">("store");
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<AppUser[]>([]);
  const [akunList, setAkunList] = useState<Akun[]>([]);
  const [showAkunForm, setShowAkunForm] = useState(false);
  const [editingAkun, setEditingAkun] = useState<Akun | null>(null);
  const [akunForm, setAkunForm] = useState({ nama: "", tipe: "kas_fisik", warna: "#6B7280" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [waTestStatus, setWaTestStatus] = useState<string | null>(null);
  const [newPin, setNewPin] = useState("");
  const [pinSaved, setPinSaved] = useState(false);
  const [qrisUploading, setQrisUploading] = useState(false);
  const [qrisUploadStatus, setQrisUploadStatus] = useState<string | null>(null);
  const qrisFileRef = useRef<HTMLInputElement>(null);
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

  const handleQrisUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setQrisUploading(true);
    setQrisUploadStatus(null);
    try {
      const img = new Image();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      img.src = dataUrl;
      await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const jsQRModule = await import("jsqr");
      const qr = jsQRModule.default(imageData.data, imageData.width, imageData.height);
      if (!qr?.data) {
        setQrisUploadStatus("QR code tidak terdeteksi dalam gambar");
        setQrisUploading(false);
        return;
      }
      if (!qr.data.startsWith("000201")) {
        setQrisUploadStatus("Gambar bukan QRIS yang valid");
        setQrisUploading(false);
        return;
      }
      setSettings({ ...settings, qris_string: qr.data });
      await updateSetting("qris_string", qr.data);
      setQrisUploadStatus("QRIS berhasil diupload & disimpan!");
    } catch (err: any) {
      setQrisUploadStatus("Gagal memproses gambar: " + (err.message || "Unknown error"));
    } finally {
      setQrisUploading(false);
      if (qrisFileRef.current) qrisFileRef.current.value = "";
    }
  };

  const tabs = [
    { key: "store", label: "Toko", icon: Store },
    { key: "users", label: "User", icon: Users },
    { key: "akun", label: "Akun", icon: Wallet },
    { key: "wa", label: "WhatsApp", icon: MessageCircle },
    { key: "qris", label: "QRIS", icon: QrCode },
    { key: "pin", label: "PIN", icon: Shield },
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

      {tab === "pin" && (
        <div className="th-card border th-border rounded-2xl p-5 shadow-sm max-w-lg space-y-4">
          <h3 className="font-bold th-text">Ubah PIN Admin</h3>
          <p className="text-xs th-text-secondary">PIN digunakan untuk mengakses halaman Kas dan Pengaturan.</p>
          <div>
            <label className="block text-xs font-semibold th-muted uppercase mb-1.5">PIN Baru (6 digit)</label>
            <input type="password" inputMode="numeric" maxLength={6} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ""))} className="w-full px-3 py-2.5 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent tracking-[0.5em] text-center font-bold" placeholder="······" />
          </div>
          <button onClick={async () => {
            if (newPin.length !== 6) return;
            setSaving(true);
            await changePin(newPin);
            setNewPin("");
            setPinSaved(true);
            setTimeout(() => setPinSaved(false), 3000);
            setSaving(false);
          }} disabled={saving || newPin.length !== 6} className="px-6 py-2.5 th-accent-bg text-white rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-50 touch-target">
            {saving ? "Menyimpan..." : pinSaved ? "PIN Tersimpan!" : "Simpan PIN"}
          </button>
        </div>
      )}

      {tab === "qris" && (
        <div className="th-card border th-border rounded-2xl p-5 shadow-sm max-w-lg space-y-4">
          <h3 className="font-bold th-text">Pengaturan QRIS</h3>
          <p className="text-xs th-text-secondary">Upload gambar QR code QRIS statis dari merchant. Sistem akan otomatis decode dan generate QR dinamis sesuai nominal transaksi di kasir.</p>

          <div>
            <label className="block text-xs font-semibold th-muted uppercase mb-1.5">Upload Gambar QRIS</label>
            <div
              onClick={() => qrisFileRef.current?.click()}
              className="border-2 border-dashed th-border rounded-xl p-6 text-center cursor-pointer hover:border-accent/50 transition-colors"
            >
              {qrisUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm th-muted">Membaca QR code...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <QrCode size={32} className="th-muted" />
                  <p className="text-sm th-text-secondary">Klik untuk upload gambar QRIS</p>
                  <p className="text-[10px] th-muted">PNG, JPG, atau screenshot QR code</p>
                </div>
              )}
            </div>
            <input ref={qrisFileRef} type="file" accept="image/*" onChange={handleQrisUpload} className="hidden" />
          </div>

          {qrisUploadStatus && (
            <p className={`text-sm font-medium ${qrisUploadStatus.includes("berhasil") ? "text-success" : "text-danger"}`}>{qrisUploadStatus}</p>
          )}

          {settings.qris_string && (
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl p-3">
              <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">QRIS Terdeteksi</p>
              <p className="text-[10px] font-mono text-green-700 dark:text-green-300 break-all">{settings.qris_string.slice(0, 60)}...</p>
            </div>
          )}

          <div className="border-t th-border pt-4">
            <label className="block text-xs font-semibold th-muted uppercase mb-1.5">Atau input manual string QRIS</label>
            <textarea value={settings.qris_string || ""} onChange={(e) => setSettings({ ...settings, qris_string: e.target.value })} rows={3} className="w-full px-3 py-2.5 th-card border th-border rounded-xl text-xs font-mono th-text focus:outline-none focus:border-accent resize-none" placeholder="00020101021126570011ID.DANA.WWW..." />
          </div>
          <button onClick={() => handleSaveSettings({ qris_string: settings.qris_string })} disabled={saving} className="px-6 py-2.5 th-accent-bg text-white rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-50 touch-target">
            {saving ? "Menyimpan..." : saved ? "Tersimpan!" : "Simpan"}
          </button>
        </div>
      )}

      {showUserForm && (
        <div className="fixed inset-0 th-overlay flex items-center justify-center z-50 p-4" >
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
                <button  className="flex-1 py-3 border th-border rounded-xl text-sm font-medium th-muted touch-target">Batal</button>
                <button onClick={handleSaveUser} disabled={saving} className="flex-1 py-3 th-accent-bg text-white rounded-xl font-bold hover:opacity-90 disabled:opacity-50 touch-target">{saving ? "Menyimpan..." : "Simpan"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAkunForm && (
        <div className="fixed inset-0 th-overlay flex items-center justify-center z-50 p-4" >
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
                <button  className="flex-1 py-3 border th-border rounded-xl text-sm font-medium th-muted touch-target">Batal</button>
                <button onClick={handleSaveAkun} disabled={saving} className="flex-1 py-3 th-accent-bg text-white rounded-xl font-bold hover:opacity-90 disabled:opacity-50 touch-target">{saving ? "Menyimpan..." : "Simpan"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}












