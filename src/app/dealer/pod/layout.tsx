"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAdminRole } from "@/lib/auth/admin-access";

export default function DealerPodLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<"loading" | "ok" | "denied">("loading");
  const [denyMessage, setDenyMessage] = useState("POD Creator lisansınız aktif değil.");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((me) => {
        if (me.success && isAdminRole(me.data?.role)) {
          setState("ok");
          return;
        }
        return fetch("/api/gateway/pod")
          .then((r) => r.json())
          .then((d) => {
            if (d.success && d.data?.step === "ready") {
              setState("ok");
              return;
            }
            setDenyMessage(d.data?.message || d.error || "POD Creator lisansınız aktif değil.");
            setState("denied");
          });
      })
      .catch(() => {
        setDenyMessage("POD Creator lisansınız aktif değil.");
        setState("denied");
      });
  }, [router]);

  if (state === "loading") {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-ena-light text-sm">POD Creator erişimi kontrol ediliyor…</div>
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <p className="text-sm font-medium text-white">{denyMessage}</p>
        <button
          type="button"
          onClick={() => router.push("/dealer/modules")}
          className="mt-4 text-sm text-emerald-400 hover:underline"
        >
          Modül Pazarına dön
        </button>
      </div>
    );
  }

  return <div data-module-shell="pod">{children}</div>;
}
