import { randomUUID } from "node:crypto";

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import { handleSendPasswordResetEmailJob } from "./handlers/send-password-reset-email";
import { jobTypes, type JobType } from "./types";

type LockedJob = {
  id: string;
  type: string;
  payload: Prisma.JsonValue;
  attempts: number;
  maxAttempts: number;
};

const defaultPollIntervalMs = 2000;
const defaultLockTimeoutMs = 60_000;
const workerId = `${process.pid}-${randomUUID()}`;

export async function startJobsWorker() {
  const pollIntervalMs = getNumberEnv(
    "JOB_WORKER_POLL_INTERVAL_MS",
    defaultPollIntervalMs,
  );
  const lockTimeoutMs = getNumberEnv(
    "JOB_WORKER_LOCK_TIMEOUT_MS",
    defaultLockTimeoutMs,
  );

  console.info(
    `[jobs] Worker ${workerId} started. pollIntervalMs=${pollIntervalMs} lockTimeoutMs=${lockTimeoutMs}`,
  );

  while (true) {
    try {
      await releaseExpiredLocks(lockTimeoutMs);
      const job = await lockNextJob();

      if (!job) {
        await sleep(pollIntervalMs);
        continue;
      }

      await processJob(job);
    } catch (error) {
      console.error("[jobs] Worker loop error", error);
      await sleep(pollIntervalMs);
    }
  }
}

async function lockNextJob() {
  return prisma.$transaction(async (tx) => {
    const jobs = await tx.$queryRaw<LockedJob[]>`
      SELECT id, type, payload, attempts, "maxAttempts"
      FROM "Job"
      WHERE status = 'PENDING'
        AND "runAt" <= NOW()
      ORDER BY "runAt" ASC, "createdAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    `;
    const job = jobs[0];

    if (!job) {
      return null;
    }

    await tx.job.update({
      where: {
        id: job.id,
      },
      data: {
        status: "RUNNING",
        lockedAt: new Date(),
        lockedBy: workerId,
      },
    });

    return job;
  });
}

async function processJob(job: LockedJob) {
  try {
    await dispatchJob(job.type as JobType, job.payload);
    await prisma.job.update({
      where: {
        id: job.id,
      },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        lockedAt: null,
        lockedBy: null,
        lastError: null,
      },
    });
    console.info(`[jobs] Completed ${job.type} job ${job.id}.`);
  } catch (error) {
    const nextAttempts = job.attempts + 1;
    const lastError = getErrorMessage(error);
    const hasAttemptsLeft = nextAttempts < job.maxAttempts;

    await prisma.job.update({
      where: {
        id: job.id,
      },
      data: {
        status: hasAttemptsLeft ? "PENDING" : "FAILED",
        attempts: nextAttempts,
        runAt: hasAttemptsLeft ? getRetryRunAt(nextAttempts) : new Date(),
        failedAt: hasAttemptsLeft ? null : new Date(),
        lockedAt: null,
        lockedBy: null,
        lastError,
      },
    });

    if (hasAttemptsLeft) {
      console.warn(
        `[jobs] Retrying ${job.type} job ${job.id}. attempt=${nextAttempts}/${job.maxAttempts} error=${lastError}`,
      );
      return;
    }

    console.error(
      `[jobs] Failed ${job.type} job ${job.id}. attempts=${nextAttempts}/${job.maxAttempts} error=${lastError}`,
    );
  }
}

async function dispatchJob(type: JobType, payload: Prisma.JsonValue) {
  switch (type) {
    case jobTypes.sendPasswordResetEmail:
      await handleSendPasswordResetEmailJob(payload);
      return;
    default:
      throw new Error(`Unknown job type: ${type}`);
  }
}

async function releaseExpiredLocks(lockTimeoutMs: number) {
  const expiredBefore = new Date(Date.now() - lockTimeoutMs);

  await prisma.job.updateMany({
    where: {
      status: "RUNNING",
      lockedAt: {
        lt: expiredBefore,
      },
    },
    data: {
      status: "PENDING",
      lockedAt: null,
      lockedBy: null,
      runAt: new Date(),
    },
  });
}

function getRetryRunAt(attempts: number) {
  const delayMs = Math.min(10_000 * 2 ** Math.max(attempts - 1, 0), 5 * 60_000);

  return new Date(Date.now() + delayMs);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message.slice(0, 2000);
  }

  return String(error).slice(0, 2000);
}

function getNumberEnv(key: string, fallback: number) {
  const value = Number(process.env[key]);

  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
