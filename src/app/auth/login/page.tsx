import { Suspense } from "react";
import LoginForm from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <div className="animate-pulse space-y-4 text-center">
          <div className="mx-auto h-8 w-24 rounded bg-ena-gray" />
          <div className="h-4 w-48 rounded bg-ena-gray mx-auto" />
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
