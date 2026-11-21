import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '@/app/generated/prisma/client'
import path from 'path'

// Use DATABASE_URL from env, fallback to default dev path
const dbUrl = process.env.DATABASE_URL ?? `file:${path.join(process.cwd(), 'prisma', 'dev.db')}`

const globalForPrisma = globalThis as unknown as { prismaRaw: PrismaClient }

/** Unfiltered client. Only the Other tab's API should use this. */
export const prismaRaw =
  globalForPrisma.prismaRaw ??
  new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: dbUrl }),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prismaRaw = prismaRaw

/* eslint-disable @typescript-eslint/no-explicit-any */
// Tweets in the "Other" collection (source = 'other') are hidden everywhere
// (browse, search, stats, categorizing, export, mindmap, image analysis) by
// filtering every list/count/aggregate on Bookmark and MediaItem here.
const hideOtherBookmarks = ({ args, query }: any) => {
  args.where = { AND: [args.where ?? {}, { source: { not: 'other' } }] }
  return query(args)
}
const hideOtherMedia = ({ args, query }: any) => {
  args.where = { AND: [args.where ?? {}, { bookmark: { source: { not: 'other' } } }] }
  return query(args)
}

export const prisma = prismaRaw.$extends({
  query: {
    bookmark: {
      findMany: hideOtherBookmarks,
      findFirst: hideOtherBookmarks,
      count: hideOtherBookmarks,
      aggregate: hideOtherBookmarks,
      groupBy: hideOtherBookmarks,
    },
    mediaItem: {
      findMany: hideOtherMedia,
      findFirst: hideOtherMedia,
      count: hideOtherMedia,
      aggregate: hideOtherMedia,
      groupBy: hideOtherMedia,
    },
  },
})

export default prisma
