import "server-only";

import { prisma } from "@/lib/prisma";

import type { JobPayload, JobType } from "./types";

type EnqueueJobOptions = {
  maxAttempts?: number;
  runAt?: Date;
};

export async function enqueueJob<T extends JobType>(
  type: T,
  payload: JobPayload<T>,
  options: EnqueueJobOptions = {},
) {
  return prisma.job.create({
    data: {
      type,
      payload,
      maxAttempts: options.maxAttempts ?? 5,
      runAt: options.runAt ?? new Date(),
    },
    select: {
      id: true,
    },
  });
}
