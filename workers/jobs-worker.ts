import { startJobsWorker } from "@/lib/jobs/worker";
import { logger } from "@/lib/logger";

startJobsWorker().catch((error) => {
  logger.error("[jobs] Worker crashed", error);
  process.exit(1);
});
