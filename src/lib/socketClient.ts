import { io, type Socket } from "socket.io-client";

type ServerEvents = {
  "social:like:toggled": (payload: {
    postId: string;
    actorUserId: string;
    ownerUserId: string;
    liked: boolean;
    totalLikes: number;
  }) => void;
  "social:comment:like:toggled": (payload: {
    postId: string;
    commentId: string;
    liked: boolean;
    totalLikes: number;
  }) => void;
  "conversation:comment:new": (payload: {
    postId: string;
    commentId: string;
    parentId: string | null;
    actorUserId: string;
    content: string;
    totalComments: number;
  }) => void;
  "post:updated": (payload: {
    postId: string;
    caption: string;
    tags: string[];
  }) => void;
};

type ClientEvents = {
  "room:user:join": (payload: { userId: string }) => void;
  "room:post:join": (payload: { postId: string }) => void;
};

declare global {
  // eslint-disable-next-line no-var
  var appSocket: Socket<ServerEvents, ClientEvents> | undefined;
}

export async function getSocketClient(): Promise<Socket<ServerEvents, ClientEvents>> {
  if (global.appSocket) return global.appSocket;
  await fetch("/api/socket");
  const socket = io({
    path: "/api/socket/io",
    transports: ["websocket", "polling"],
  });
  global.appSocket = socket;
  return socket;
}
