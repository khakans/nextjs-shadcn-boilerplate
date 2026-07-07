import { startJobsWorker } from "@/lib/jobs/worker";

startJobsWorker().catch((error) => {
  console.error("[jobs] Worker crashed", error);
  process.exit(1);
});
