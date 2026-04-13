import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RATE_LIMIT_KEY, type RateLimitOptions } from "./rate-limit.decorator";

type Bucket = { count: number; resetAt: number };

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();
  private readonly defaults: RateLimitOptions = { max: 120, windowMs: 60_000 };

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      ip?: string;
      route?: { path?: string };
      path?: string;
      method?: string;
    }>();
    const opts =
      this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? this.defaults;

    const now = Date.now();
    const ip = req.ip ?? "unknown";
    const route = req.route?.path ?? req.path ?? "unknown";
    const method = req.method ?? "GET";
    const key = `${ip}:${method}:${route}`;

    const current = this.buckets.get(key);
    if (!current || now >= current.resetAt) {
      this.buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
      return true;
    }
    if (current.count >= opts.max) {
      throw new HttpException("Rate limit exceeded. Please retry later.", HttpStatus.TOO_MANY_REQUESTS);
    }
    current.count += 1;
    return true;
  }
}
