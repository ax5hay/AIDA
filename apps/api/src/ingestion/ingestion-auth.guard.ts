import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";

@Injectable()
export class IngestionAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>();
    const configuredKey = process.env.INGESTION_API_KEY?.trim();

    // Preserve local/dev usability; require a key in production deployments.
    if (!configuredKey) {
      if ((process.env.NODE_ENV ?? "development") === "production") {
        throw new ServiceUnavailableException("INGESTION_API_KEY is required in production");
      }
      return true;
    }

    const provided = req.headers["x-ingestion-key"]?.trim();
    if (!provided || provided !== configuredKey) {
      throw new UnauthorizedException("Invalid ingestion key");
    }
    return true;
  }
}
