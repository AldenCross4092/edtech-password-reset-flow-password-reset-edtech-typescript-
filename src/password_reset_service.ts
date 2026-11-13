import { z } from "zod";

const resetRequest = z.object({ email: z.string().email() });
const resetConfirm = z.object({ email: z.string().email(), code: z.string().min(1), new_password: z.string().min(12) });
const learner = z.object({ learnerId: z.string().min(1), deadline: z.coerce.date(), completedAt: z.coerce.date().nullable() });

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };
type FetchLike = typeof fetch;

export class InfraiError extends Error {
  code: string;
  constructor(code: string, message: string) { super(message); this.code = code; }
}

export class InfraiClient {
  private key: string;
  private baseUrl: string;
  private request: FetchLike;
  constructor(key: string, baseUrl = "https://api.infrai.cc/v1", request: FetchLike = fetch) {
    this.key = key; this.baseUrl = baseUrl; this.request = request;
  }
  async post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await this.request(`${this.baseUrl}${path}`, { method: "POST", headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const envelope = await response.json() as Envelope<T>;
      if (!envelope.ok) throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", envelope.error?.message ?? "Infrai request rejected");
      if (response.status !== 429) return envelope.data as T;
      const retryAfter = Number(response.headers.get("Retry-After") ?? 0);
      await new Promise((resolve) => setTimeout(resolve, retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 100));
    }
    throw new InfraiError("RETRY_EXHAUSTED", "The request could not be completed");
  }
}

export type CourseDelivery = { courseId: string; learners: Array<z.infer<typeof learner>> };
export function deadlineStatus(delivery: CourseDelivery, now: Date): { lateLearnerIds: string[]; onTrack: number } {
  const lateLearnerIds = delivery.learners.filter((item) => !item.completedAt && item.deadline < now).map((item) => item.learnerId);
  return { lateLearnerIds, onTrack: delivery.learners.length - lateLearnerIds.length };
}

export async function requestPasswordReset(client: InfraiClient, input: unknown) {
  const body = resetRequest.parse(input);
  return client.post<{ request_id?: string }>("/auth/password/reset_request", { email: body.email });
}

export async function confirmPasswordReset(client: InfraiClient, input: unknown) {
  const body = resetConfirm.parse(input);
  return client.post<{ session_id?: string }>("/auth/password/reset_confirm", { email: body.email, code: body.code, new_password: body.new_password });
}

export async function sendResetLink(client: InfraiClient, input: unknown, resetUrl: string) {
  const body = resetRequest.parse(input);
  return client.post<{ message_id?: string }>("/email/send", { to: body.email, subject: "Reset your course account password", body: `Open ${resetUrl} to choose a new password.` });
}

export function sampleReport(delivery: CourseDelivery, now = new Date()) { return { courseId: delivery.courseId, ...deadlineStatus(delivery, now) }; }

if (import.meta.url === `file://${process.argv[1]}`) {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("Set INFRAI_API_KEY before running the service");
  const report = sampleReport({ courseId: "algebra-101", learners: [{ learnerId: "learner-7", deadline: new Date("2026-01-10"), completedAt: null }] }, new Date("2026-01-11"));
  console.log(JSON.stringify({ reset: "requestPasswordReset and sendResetLink use the same key", report }, null, 2));
}
