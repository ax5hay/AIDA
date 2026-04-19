import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import compression from "compression";
import { json, urlencoded } from "express";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  app.use(json({ limit: "5mb" }));
  app.use(urlencoded({ extended: true, limit: "5mb" }));
  app.use(compression({ level: 6, threshold: 1024 }));
  app.setGlobalPrefix("v1");
  app.enableCors({
    origin: process.env.PARITY_WEB_ORIGIN ?? "http://localhost:3001",
    credentials: true,
  });
  const port = Number(process.env.PARITY_API_PORT ?? 4010);
  await app.listen(port, "0.0.0.0");
  // eslint-disable-next-line no-console
  console.log(`Parity API listening on http://0.0.0.0:${port}/v1`);
}

bootstrap();
