import * as dotenv from "dotenv";
dotenv.config();

import express from "express";
import { createServer } from "http";
import { registerRoutes } from "../server/routes";

const app = express();

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: false }));

const httpServer = createServer(app);

let routesReady: Promise<any> | null = null;

function ensureRoutes() {
  if (!routesReady) {
    routesReady = registerRoutes(httpServer, app).then(() => {
      // Express error handler — always return JSON
      app.use((err: any, _req: any, res: any, _next: any) => {
        console.error("Server error:", err);
        res.status(err.status || 500).json({
          message: err.message || "Internal Server Error",
        });
      });
    });
  }
  return routesReady;
}

export default async function handler(req: any, res: any) {
  try {
    await ensureRoutes();
    app(req, res);
  } catch (err: any) {
    console.error("Handler init error:", err);
    res.status(500).json({ message: "서버 초기화 오류가 발생했습니다." });
  }
}
