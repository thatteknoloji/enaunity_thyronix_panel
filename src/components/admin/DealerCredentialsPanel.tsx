"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { KeyRound, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type AccountsData = {
  users: { id: string; email: string; name: string; role: string; status: string }[];
  subUsers: { id: string; email: string; name: string }[];
  productLinks: {
    id: string;
    productType: string;
    status: string;
    externalUser: { username: string; email: string } | null;
    enaUser: { name: string; email: string };
  }[];
};

export function DealerCredentialsPanel({ dealerId }: { dealerId: string }) {
  const [data, setData] = useState<AccountsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [dealerEmail, setDealerEmail] = useState("");

  const load = () => {
    setLoading(true);
    fetch(`/api/admin/dealers/${dealerId}/accounts`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setData(d.data);
          setDealerEmail(d.data.dealer?.email || "");
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [dealerId]);

  const patch = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/dealers/${dealerId}/credentials`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await res.json();
    if (d.success) {
      toast.success("Güncellendi");
      load();
    } else toast.error(d.error || "Hata");
  };

  if (loading) return <p className="text-xs text-gray-400 py-4">Hesaplar yükleniyor…</p>;
  if (!data) return null;

  return (
    <div className="mt-4 border-t border-gray-100 pt-4 space-y-4">
      <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <KeyRound size={16} /> Hesap & Şifre Yönetimi
      </h4>

      <div className="flex flex-wrap gap-2 items-end">
        <label className="text-xs flex-1 min-w-[200px]">
          <span className="text-gray-500">Bayi e-posta</span>
          <input className="mt-1 w-full rounded border px-2 py-1.5 text-sm" value={dealerEmail} onChange={(e) => setDealerEmail(e.target.value)} />
        </label>
        <Button size="sm" variant="outline" onClick={() => patch({ action: "update_dealer_email", email: dealerEmail })}>
          <Mail size={14} className="mr-1" /> E-postayı Kaydet
        </Button>
      </div>

      {data.users.map((u) => (
        <div key={u.id} className="rounded-lg border border-gray-100 p-3 bg-gray-50/50">
          <p className="text-sm font-medium">{u.name} <span className="text-gray-400 font-normal">({u.email})</span></p>
          <p className="text-[10px] text-gray-400 mb-2">ENA giriş · {u.role} · {u.status}</p>
          <div className="flex flex-wrap gap-2">
            <input
              type="password"
              placeholder="Yeni şifre (min 6)"
              className="rounded border px-2 py-1 text-sm flex-1 min-w-[160px]"
              value={passwords[`u-${u.id}`] || ""}
              onChange={(e) => setPasswords({ ...passwords, [`u-${u.id}`]: e.target.value })}
            />
            <Button
              size="sm"
              onClick={() => patch({ action: "update_user_password", userId: u.id, password: passwords[`u-${u.id}`] })}
            >
              Şifreyi Sıfırla
            </Button>
          </div>
        </div>
      ))}

      {data.productLinks.map((link) => (
        <div key={link.id} className="rounded-lg border border-purple-100 p-3 bg-purple-50/30">
          <p className="text-sm font-medium">{link.productType} · {link.externalUser?.username}</p>
          <p className="text-[10px] text-gray-500 mb-2">{link.status} · {link.externalUser?.email}</p>
          <div className="flex flex-wrap gap-2">
            <input
              type="password"
              placeholder="Yeni modül şifresi"
              className="rounded border px-2 py-1 text-sm flex-1 min-w-[160px]"
              value={passwords[`p-${link.id}`] || ""}
              onChange={(e) => setPasswords({ ...passwords, [`p-${link.id}`]: e.target.value })}
            />
            <Button
              size="sm"
              onClick={() => patch({ action: "update_product_password", linkId: link.id, password: passwords[`p-${link.id}`] })}
            >
              Modül Şifresi
            </Button>
          </div>
        </div>
      ))}

      {data.subUsers.map((s) => (
        <div key={s.id} className="rounded-lg border border-gray-100 p-3">
          <p className="text-sm font-medium">Alt kullanıcı: {s.name} ({s.email})</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <input
              type="password"
              placeholder="Yeni şifre"
              className="rounded border px-2 py-1 text-sm flex-1 min-w-[160px]"
              value={passwords[`s-${s.id}`] || ""}
              onChange={(e) => setPasswords({ ...passwords, [`s-${s.id}`]: e.target.value })}
            />
            <Button size="sm" variant="outline" onClick={() => patch({ action: "update_subuser_password", subUserId: s.id, password: passwords[`s-${s.id}`] })}>
              Sıfırla
            </Button>
          </div>
        </div>
      ))}

      <button type="button" onClick={load} className="text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1">
        <RefreshCw size={12} /> Yenile
      </button>
    </div>
  );
}
