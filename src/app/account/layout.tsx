import { AccountCenterProvider } from "@/components/account/AccountCenterProvider";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <AccountCenterProvider>{children}</AccountCenterProvider>;
}
