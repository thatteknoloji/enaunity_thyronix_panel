"use client";

import { useEffect, useState } from "react";
import { Bell, Check, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import toast from "react-hot-toast";

interface Notif { id: string; title: string; message: string; type: string; read: boolean; link: string; createdAt: string; }

export default function DealerNotificationsPage() {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  const fetchNotifs = () => {
    fetch("/api/notifications").then(r => r.json()).then(d => setNotifs(d.data || [])).finally(() => setLoading(false));
  };

  useEffect(() => { fetchNotifs(); }, []);

  const markRead = async (id: string) => {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    fetchNotifs();
  };

  const markAll = async () => {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) });
    fetchNotifs(); toast.success("Tümü okundu");
  };

  const filtered = filter === "all" ? notifs : notifs.filter(n => filter === "unread" ? !n.read : n.read);
  const unread = notifs.filter(n => !n.read).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ena-text">Bildirimler</h1>
          <p className="text-sm text-ena-light/50 mt-1">{unread} okunmamış bildirim</p>
        </div>
        {unread > 0 && <Button variant="outline" size="sm" onClick={markAll}><Check size={14} className="mr-1" /> Tümünü Okundu İşaretle</Button>}
      </div>

      <div className="flex gap-2 mb-4">
        {(["all","unread","read"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? "bg-ena-primary text-white" : "text-ena-light/50 hover:bg-ena-card/30"}`}>
            {f === "all" ? "Tümü" : f === "unread" ? "Okunmamış" : "Okunmuş"}
          </button>
        ))}
      </div>

      {loading ? <p className="text-ena-light/40 text-center py-12">Yükleniyor...</p> : filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-ena-border rounded-xl bg-ena-card/30">
          <Bell size={40} className="mx-auto text-ena-light/30" />
          <p className="mt-3 text-ena-light/50">{filter === "unread" ? "Okunmamış bildirim yok" : "Bildirim yok"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(n => (
            <div key={n.id} className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${n.read ? "border-ena-border bg-ena-card/30" : "border-ena-border bg-ena-card/50"}`}>
              <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${n.read ? "bg-ena-light/30" : "bg-blue-500"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-ena-text">{n.title}</span>
                  <span className="text-[10px] text-ena-light/40">{formatDate(n.createdAt)}</span>
                </div>
                <p className="text-sm text-ena-light/70">{n.message}</p>
                {n.link && <Link href={n.link} className="text-xs text-ena-primary hover:underline mt-1 inline-block">Detay →</Link>}
              </div>
              {!n.read && (
                <button onClick={() => markRead(n.id)} className="shrink-0 p-1 text-ena-light/40 hover:text-blue-500"><Check size={14} /></button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
