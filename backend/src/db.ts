import { PrismaClient } from "@prisma/client";
import { Redis } from "ioredis";
import { env } from "./env.js";

export const prisma = new PrismaClient();
export const redis = new Redis(env.REDIS_URL);
