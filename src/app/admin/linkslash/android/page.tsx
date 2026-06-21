"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Smartphone, Upload } from "lucide-react";
import { toAdminUrl } from "@/lib/auth/admin-access";
import { formatDownloadSize } from "@/lib/linkslash/format";

type Release = {
  id: string;
  version: string;
  buildNumber: number;
  requiredVersion: string;
  fileName: string;
  fileSize: number;
  active: boolean;
  uploadedBy: string;
  uploadedAt: string;
};

export default function AdminLinkSlashAndroidPage() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [version, setVersion] = useState("1.0.0");
  const [buildNumber, setBuildNumber] = useState("1");
  const [requiredVersion, setRequiredVersion] = useState("1.0.0");
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/admin/linkslash/apk");
    const d = await r.json();
    if (d.success) setReleases(d.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("version", version);
    fd.append("buildNumber", buildNumber);
    fd.append("requiredVersion", requiredVersion);
    fd.append("setActive", "true");
    const r = await fetch("/api/admin/linkslash/apk", { method: "POST", body: fd });
    const d = await r.json();
    setUploading(false);
    if (d.success) {
      setMsg("✓ APK yüklendi ve aktif sürüm olarak ayarlandı");
      setFile(null);
      load();
    } else {
      setMsg(d.error || "Yükleme başarısız");
    }
  }

  async function activate(id: string) {
    await fetch("/api/admin/linkslash/apk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "activate", id }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Bu sürüm silinsin mi?")) return;
    const r = await fetch("/api/admin/linkslash/apk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    const d = await r.json();
    if (!d.success) alert(d.error);
    load();
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href={toAdminUrl("/admin/linkslash")} className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Android APK Yönetimi</h1>
          <p className="text-sm text-gray-500">storage/downloads/linkslash — lisanslı token indirme</p>
        </div>
        <button type="button" onClick={load} className="ml-auto text-gray-500"><RefreshCw size={16} /></button>
      </div>

      <form onSubmit={upload} className="mb-8 rounded-xl border bg-white p-5 shadow-sm space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><Upload size={16} /> APK Yükle</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">Sürüm (x.y.z)<input value={version} onChange={(e) => setVersion(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" required /></label>
          <label className="text-sm">Build<input value={buildNumber} onChange={(e) => setBuildNumber(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" /></label>
          <label className="text-sm">Zorunlu min sürüm<input value={requiredVersion} onChange={(e) => setRequiredVersion(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" /></label>
        </div>
        <input type="file" accept=".apk,application/vnd.android.package-archive" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <button type="submit" disabled={uploading || !file} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {uploading ? "Yükleniyor…" : "Yükle ve Aktif Yap"}
        </button>
        {msg && <p className="text-sm text-gray-600">{msg}</p>}
      </form>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b font-semibold text-sm">Sürüm Geçmişi</div>
        {loading ? <p className="p-6 text-gray-400">Yükleniyor…</p> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">Sürüm</th>
                <th className="px-4 py-2 text-left">Dosya</th>
                <th className="px-4 py-2 text-left">Boyut</th>
                <th className="px-4 py-2 text-left">Durum</th>
                <th className="px-4 py-2 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {releases.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-mono">{r.version} (b{r.buildNumber})</td>
                  <td className="px-4 py-3 text-xs">{r.fileName}</td>
                  <td className="px-4 py-3">{formatDownloadSize(r.fileSize)}</td>
                  <td className="px-4 py-3">{r.active ? <span className="text-emerald-600 font-semibold">Aktif</span> : "—"}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {!r.active && <button type="button" onClick={() => activate(r.id)} className="text-cyan-600 text-xs">Aktif yap</button>}
                    {!r.active && <button type="button" onClick={() => remove(r.id)} className="text-red-500 text-xs">Sil</button>}
                  </td>
                </tr>
              ))}
              {!releases.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Henüz sürüm yok</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
