import { AccountCenterProvider } from "@/components/account/AccountCenterProvider";
import { LegalReacceptanceGate } from "@/components/legal/LegalReacceptanceGate";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <AccountCenterProvider>
      <LegalReacceptanceGate scope="account">{children}</LegalReacceptanceGate>
    </AccountCenterProvider>
  );
}
