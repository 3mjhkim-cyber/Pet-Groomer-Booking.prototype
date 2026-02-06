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
const ready = registerRoutes(httpServer, app);

export default async function handler(req: any, res: any) {
  await ready;
  app(req, res);
}
