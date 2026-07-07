import { redirect } from "next/navigation";

/** Eski demo sayfası — Hızlı Başlangıç'a yönlendirilir. */
export default function DemoScriptPage() {
  redirect("/thyronix/getting-started");
}
