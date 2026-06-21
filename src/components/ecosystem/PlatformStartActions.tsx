"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { canSeeAdminEntry, getAdminSecretPath, isSuperAdmin } from "@/lib/auth/admin-access";
import { MARKETPLACE_MODULES, type MarketplaceModuleKey } from "@/lib/modules/marketplace";

const SLUG_TO_MODULE: Record<string, MarketplaceModuleKey> = {
  linkslash: "LINKSLASH",
  hive: "HIVE",
  thyronix: "THYRONIX",
  "page-factory": "AI_PAGE_FACTORY",
};

type Props = {
  slug: string;
  primaryText: string;
  primaryUrl: string;
  secondaryText?: string;
  secondaryUrl?: string;
  size?: "md" | "lg";
  layout?: "hero" | "footer";
};

type StartState =
  | { status: "loading" }
  | { status: "guest"; primaryHref: string; primaryLabel: string }
  | { status: "ready"; primaryHref: string; primaryLabel: string; licensed: boolean };

function resolveModule(slug: string): MarketplaceModuleKey | null {
  return SLUG_TO_MODULE[slug] ?? null;
}

export function PlatformStartActions({
  slug,
  primaryText,
  primaryUrl,
  secondaryText,
  secondaryUrl,
  size = "lg",
  layout = "hero",
}: Props) {
  const moduleKey = resolveModule(slug);
  const [state, setState] = useState<StartState>({ status: "loading" });

  useEffect(() => {
    if (!moduleKey) {
      setState({ status: "guest", primaryHref: primaryUrl, primaryLabel: primaryText });
      return;
    }

    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then(async (me) => {
        const user = me?.data;
        if (!user) {
          const meta = MARKETPLACE_MODULES[moduleKey];
          setState({
            status: "guest",
            primaryHref: meta.checkoutPath,
            primaryLabel: "Satın Al ve Başla",
          });
          return;
        }

        const modRes = await fetch("/api/dealer/modules").then((r) => r.json()).catch(() => null);
        const modules: Array<{ moduleKey: string; licensed: boolean; canEnter: boolean; ctaHref: string }> =
          modRes?.success ? modRes.data?.modules || [] : [];
        const card = modules.find((m) => m.moduleKey === moduleKey);
        const meta = MARKETPLACE_MODULES[moduleKey];

        if (canSeeAdminEntry(user.role)) {
          const secret = getAdminSecretPath();
          let adminHref = meta.gatewayPath;
          if (moduleKey === "AI_PAGE_FACTORY") adminHref = `${secret}/page-factory`;
          else if (moduleKey === "POD_CREATOR") adminHref = `${secret}/pod`;
          else if (isSuperAdmin(user.role)) adminHref = meta.appPath;
          setState({
            status: "ready",
            primaryHref: isSuperAdmin(user.role) ? meta.appPath : adminHref,
            primaryLabel: "Modüle Git",
            licensed: true,
          });
          return;
        }

        if (card?.licensed && card.canEnter) {
          setState({
            status: "ready",
            primaryHref: card.ctaHref || meta.gatewayPath,
            primaryLabel: "Başla",
            licensed: true,
          });
          return;
        }

        setState({
          status: "ready",
          primaryHref: meta.checkoutPath,
          primaryLabel: "Satın Al ve Başla",
          licensed: false,
        });
      })
      .catch(() => {
        setState({ status: "guest", primaryHref: primaryUrl, primaryLabel: primaryText });
      });
  }, [moduleKey, primaryText, primaryUrl, slug]);

  if (state.status === "loading") {
    return (
      <div className={`flex ${layout === "hero" ? "justify-center" : "justify-center"} gap-3`}>
        <Button size={size} disabled>
          <Loader2 size={16} className="animate-spin mr-2" />
          Yükleniyor…
        </Button>
      </div>
    );
  }

  const guestLoginHref = moduleKey
    ? `/auth/login?redirect=${encodeURIComponent(`/platform/${slug}`)}`
    : primaryUrl;

  return (
    <div className={`flex flex-wrap ${layout === "hero" ? "justify-center" : "justify-center"} gap-3`}>
      {state.status === "guest" ? (
        <>
          <Link href={guestLoginHref}>
            <Button size={size} className="group">
              Giriş Yap
              <ArrowRight size={16} className="ml-2 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </Link>
          {moduleKey && (
            <Link href={MARKETPLACE_MODULES[moduleKey].checkoutPath}>
              <Button variant="outline" size={size}>
                Satın Al
              </Button>
            </Link>
          )}
        </>
      ) : (
        <Link href={state.primaryHref}>
          <Button size={size} className="group">
            {state.primaryLabel}
            <ArrowRight size={16} className="ml-2 group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </Link>
      )}
      {secondaryUrl && secondaryText && (
        <Link href={secondaryUrl}>
          <Button variant="outline" size={size}>
            {secondaryText}
          </Button>
        </Link>
      )}
      {state.status === "ready" && !state.licensed && moduleKey && (
        <p className="w-full text-center text-xs text-ena-light/70 mt-1">
          İçeriği inceledikten sonra lisans satın alarak modüle erişebilirsiniz.
        </p>
      )}
    </div>
  );
}
