"use client";

import { useEffect, useState } from "react";
import { X, Download } from "lucide-react";

export default function PwaRegister() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) {
          if (reg.active?.scriptURL) {
            reg.unregister();
          }
        }
      });
      navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then((reg) => {
        reg.update();
      }).catch(() => {});
    }
  }, []);

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 animate-in slide-in-from-bottom">
      <button onClick={() => setShowPrompt(false)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600">
        <X size={16} />
      </button>
      <div className="flex items-center gap-3 mb-3">
        <div className="h-10 w-10 rounded-xl bg-ena-dark flex items-center justify-center">
          <span className="text-lg font-black text-ena-primary">E</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">Enaunity</p>
          <p className="text-xs text-gray-500">Uygulamayı yükle</p>
        </div>
      </div>
      <button
        onClick={async () => {
          if (deferredPrompt) {
            deferredPrompt.prompt();
            const result = await deferredPrompt.userChoice;
            if (result.outcome === "accepted") setShowPrompt(false);
          }
        }}
        className="w-full px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
      >
        <Download size={16} /> Uygulamayı Yükle
      </button>
    </div>
  );
}
