import { Suspense } from "react";
import HiveLoginForm from "./login-form";

export default function HiveLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ena-dark flex items-center justify-center"><div className="animate-pulse text-ena-light">Yükleniyor...</div></div>}>
      <HiveLoginForm />
    </Suspense>
  );
}
