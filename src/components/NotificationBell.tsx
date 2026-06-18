"use client";

import { useEffect, useState, useRef } from "react";
import { Bell, X, Check } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link: string;
  createdAt: string;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/notifications").then(r => r.json()).then(d => setNotifications(d.data || []));
    const interval = setInterval(() => {
      fetch("/api/notifications").then(r => r.json()).then(d => setNotifications(d.data || []));
    }, 30000);

    // SSE for real-time updates
    const evtSource = new EventSource("/api/notifications/sse");
    evtSource.onmessage = (event) => {
      try {
        const newNotifs = JSON.parse(event.data);
        setNotifications((prev) => {
          const ids = new Set(prev.map((n) => n.id));
          const fresh = newNotifs.filter((n: Notification) => !ids.has(n.id));
          return [...fresh, ...prev];
        });
      } catch { /* ignore */ }
    };

    return () => { clearInterval(interval); evtSource.close(); };
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const unread = notifications.filter(n => !n.read).length;

  const markRead = async (id: string) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, read: true }),
    });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    await Promise.all(notifications.filter(n => !n.read).map(n =>
      fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: n.id, read: true }),
      })
    ));
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const typeColor: Record<string, string> = {
    info: "bg-blue-500/10 text-blue-400",
    success: "bg-green-500/10 text-green-400",
    warning: "bg-amber-500/10 text-amber-400",
    order: "bg-purple-500/10 text-purple-400",
    payment: "bg-emerald-500/10 text-emerald-400",
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="relative p-1.5 rounded-lg hover:bg-black/5 hover:dark:bg-white/10 transition-colors">
        <Bell size={18} className="text-gray-500 dark:text-ena-light" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-ena-primary text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-ena-card border border-ena-border rounded-xl shadow-lg z-50 max-h-96 flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-ena-border shrink-0">
            <span className="text-sm font-semibold text-ena-text">Bildirimler</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
                <Check size={12} /> Tümünü Okundu İşaretle
              </button>
            )}
          </div>
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-ena-light/40 text-sm">Bildirim yok</div>
            ) : (
              notifications.slice(0, 20).map((n) => (
                <div key={n.id} className={`p-3 border-b border-ena-border/50 hover:bg-ena-card/50 transition-colors ${!n.read ? "bg-ena-primary/5" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${typeColor[n.type] || "bg-ena-gray/50 text-ena-light"}`}>
                          {n.type}
                        </span>
                        <span className="text-xs text-ena-light/40">{new Date(n.createdAt).toLocaleDateString("tr-TR")}</span>
                      </div>
                      <p className="text-sm font-medium text-ena-text truncate">{n.title}</p>
                      <p className="text-xs text-ena-light/50 truncate">{n.message}</p>
                    </div>
                    {!n.read && (
                      <button onClick={() => markRead(n.id)} className="shrink-0 p-1 text-ena-light/40 hover:text-ena-light/70">
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
