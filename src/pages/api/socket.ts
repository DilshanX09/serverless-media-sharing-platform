import type { NextApiRequest, NextApiResponse } from "next";
import { Server as HTTPServer } from "http";
import { getOrCreateIO } from "@/lib/socketServer";

type NextApiResponseWithSocket = NextApiResponse & {
  socket: NextApiResponse["socket"] & {
    server: HTTPServer;
  };
};

export default function handler(_req: NextApiRequest, res: NextApiResponseWithSocket): void {
  getOrCreateIO(res.socket.server);
  res.status(200).json({ ok: true });
}
