import { SetMetadata } from "@nestjs/common";

export const RATE_LIMIT_KEY = "rate_limit";

export type RateLimitOptions = {
  max: number;
  windowMs: number;
};

export const RateLimit = (max: number, windowMs: number) =>
  SetMetadata(RATE_LIMIT_KEY, { max, windowMs } satisfies RateLimitOptions);
