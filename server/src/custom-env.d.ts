import type { QueueTask } from "./queue";

declare global {
  interface Env {
    TASK_QUEUE?: Queue<QueueTask>;
    R2_BUCKET?: R2Bucket;
    GOOGLE_VERIFICATION?: string;
    MICROSOFT_VERIFICATION?: string;
    GOOGLE_ANALYTICS_ID?: string;
    MICROSOFT_CLARITY_ID?: string;
  }
}

export {};
