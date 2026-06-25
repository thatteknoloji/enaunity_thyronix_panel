import { createJob, type CreateJobInput } from "./job-service";
import { triggerWorker } from "./job-worker";

export async function enqueueJob(input: CreateJobInput) {
  const job = await createJob(input);
  triggerWorker();
  return job;
}
