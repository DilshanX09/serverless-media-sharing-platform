import { Server as HTTPServer } from "http";
import { Server as IOServer, Socket } from "socket.io";
import { prisma } from "@/lib/prisma";

type ServerToClientEvents = {
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
  "social:follow:notification": (payload: {
    actorUserId: string;
    targetUserId: string;
    isFollowing: boolean;
  }) => void;
  "conversation:comment:new": (payload: {
    postId: string;
    commentId: string;
    parentId: string | null;
    actorUserId: string;
    content: string;
    totalComments: number;
  }) => void;
  "profile:stats:sync": (payload: {
    userId: string;
    followers: number;
    following: number;
    posts: number;
  }) => void;
  "post:updated": (payload: {
    postId: string;
    caption: string;
    tags: string[];
  }) => void;
};

type ClientToServerEvents = {
  "room:user:join": (payload: { userId: string }) => void;
  "room:post:join": (payload: { postId: string }) => void;
};

type InterServerEvents = Record<string, never>;
type SocketData = { userId?: string };

export type AppIO = IOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

declare global {
  // eslint-disable-next-line no-var
  var ioServer: AppIO | undefined;
}

function onConnection(socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>): void {
  socket.on("room:user:join", ({ userId }) => {
    socket.data.userId = userId;
    socket.join(`user:${userId}`);
  });

  socket.on("room:post:join", ({ postId }) => {
    socket.join(`post:${postId}`);
  });
}

export function getOrCreateIO(server: HTTPServer): AppIO {
  if (global.ioServer) {
    return global.ioServer;
  }

  const io = new IOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(server, {
    path: "/api/socket/io",
    cors: { origin: "*" },
  });

  io.on("connection", onConnection);
  global.ioServer = io;
  return io;
}

export function getIO(): AppIO | null {
  return global.ioServer ?? null;
}

export function emitLikeToggled(payload: {
  postId: string;
  actorUserId: string;
  ownerUserId: string;
  liked: boolean;
  totalLikes: number;
}): void {
  const io = getIO();
  if (!io) {
    return;
  }
  io.to(`post:${payload.postId}`).emit("social:like:toggled", payload);
  io.to(`user:${payload.ownerUserId}`).emit("social:like:toggled", payload);
}

export function emitCommentLikeToggled(payload: {
  postId: string;
  commentId: string;
  liked: boolean;
  totalLikes: number;
  actorUserId: string;
}): void {
  const io = getIO();
  if (!io) {
    return;
  }
  io.to(`post:${payload.postId}`).emit("social:comment:like:toggled", payload);
}

export function emitFollowNotification(payload: {
  actorUserId: string;
  targetUserId: string;
  isFollowing: boolean;
}): void {
  const io = getIO();
  if (!io) {
    return;
  }
  io.to(`user:${payload.targetUserId}`).emit("social:follow:notification", payload);
}

export function emitCommentCreated(payload: {
  postId: string;
  commentId: string;
  parentId: string | null;
  actorUserId: string;
  content: string;
  totalComments: number;
}): void {
  const io = getIO();
  if (!io) {
    return;
  }
  io.to(`post:${payload.postId}`).emit("conversation:comment:new", payload);
}

export function emitPostUpdated(payload: {
  postId: string;
  caption: string;
  tags: string[];
}): void {
  const io = getIO();
  if (!io) {
    return;
  }
  io.to(`post:${payload.postId}`).emit("post:updated", payload);
}

export async function emitProfileStats(userId: string): Promise<void> {
  const io = getIO();
  if (!io) {
    return;
  }

  const [followers, following, posts] = await Promise.all([
    prisma.follow.count({ where: { followingId: userId } }),
    prisma.follow.count({ where: { followerId: userId } }),
    prisma.post.count({ where: { authorId: userId } }),
  ]);

  io.to(`user:${userId}`).emit("profile:stats:sync", {
    userId,
    followers,
    following,
    posts,
  });
}
