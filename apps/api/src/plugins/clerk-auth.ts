import fp from "fastify-plugin";
import { clerkPlugin, getAuth } from "@clerk/fastify";
import { prisma } from "@subletto/db";
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import type { User } from "@subletto/db";

// Augment Fastify request with typed user
declare module "fastify" {
  interface FastifyRequest {
    dbUser: User | null;
  }
}

const clerkAuthPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.register(clerkPlugin, {
    publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  fastify.decorateRequest("dbUser", null);

  // authenticate: verifies JWT and loads user from DB
  fastify.decorate(
    "authenticate",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = getAuth(request);
      if (!userId) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      const user = await prisma.user.findUnique({ where: { clerkId: userId } });
      if (!user) {
        return reply.code(401).send({ error: "User not found — complete sign-up first" });
      }

      request.dbUser = user;
    },
  );

  // requireAdmin: extends authenticate, then checks ADMIN role
  fastify.decorate(
    "requireAdmin",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = getAuth(request);
      if (!userId) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      const user = await prisma.user.findUnique({ where: { clerkId: userId } });
      if (!user) {
        return reply.code(401).send({ error: "User not found" });
      }
      if (user.role !== "ADMIN") {
        return reply.code(403).send({ error: "Forbidden — admin only" });
      }

      request.dbUser = user;
    },
  );
};

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireAdmin: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export default fp(clerkAuthPlugin);
