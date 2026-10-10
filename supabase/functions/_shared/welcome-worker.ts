import { sendPlanWelcome, type SendResult, type WelcomePlan } from "./resend.ts";

export interface WelcomeJob {
  id: string;
  recipient: string;
  first_name: string;
  plan: WelcomePlan;
  lease_token: string;
}

export interface WelcomeQueue {
  claim(): Promise<WelcomeJob | null>;
  finish(job: WelcomeJob, result: SendResult): Promise<boolean>;
}

export async function deliverWelcomeBatch(
  queue: WelcomeQueue,
  dependencies: Parameters<typeof sendPlanWelcome>[1],
  pause: () => Promise<void> = () => new Promise((resolve) => setTimeout(resolve, 600)),
) {
  const totals = { processed: 0, sent: 0, failed: 0 };
  for (let i = 0; i < 5; i++) {
    const job = await queue.claim();
    if (!job) break;
    const result = await sendPlanWelcome({
      to: job.recipient,
      firstName: job.first_name,
      plan: job.plan,
      idempotencyKey: `plan-welcome/${job.id}`,
    }, dependencies);
    // A lost acknowledgement must leave the lease recoverable, with the same key.
    if (!await queue.finish(job, result)) throw new Error("welcome_ack_failed");
    totals.processed++;
    if (result.ok) totals.sent++;
    else totals.failed++;
    if (!result.ok) break; // Avoid hammering a failing/misconfigured provider.
    await pause();
  }
  return totals;
}

export function workerAuthorized(authorization: string | null, serviceKey: string | undefined) {
  return Boolean(serviceKey) && authorization === `Bearer ${serviceKey}`;
}
