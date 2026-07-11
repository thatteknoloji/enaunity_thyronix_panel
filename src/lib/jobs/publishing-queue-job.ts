import { runPublishingQueue } from "@/lib/publishing-center/publishing-service";

/** Saatlik yayın kuyruğu işleyicisi — zamanlanmış ve otomatik onaylı içerikleri yayınlar */
export async function runPublishingQueueJob() {
  return runPublishingQueue();
}
