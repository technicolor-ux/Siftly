import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

interface IngestMedia {
  type: string
  url: string
  thumbnailUrl?: string | null
  localPath?: string | null
}

interface IngestItem {
  tweetId: string
  text: string
  authorHandle: string
  authorName: string
  tweetCreatedAt?: string | null
  rawJson?: unknown
  media: IngestMedia[]
}

/**
 * POST /api/other/ingest — JSON array of tweets with already-downloaded media.
 * New tweets are stored with source "other". A tweet that already exists under another
 * source (e.g. also liked) only gains the local media rows, so it appears in both places.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let items: IngestItem[]
  try {
    const body = await request.json()
    items = Array.isArray(body) ? body : body.items
    if (!Array.isArray(items)) throw new Error('expected array')
  } catch {
    return NextResponse.json({ error: 'Body must be a JSON array of items' }, { status: 400 })
  }

  let created = 0
  let updated = 0
  let skipped = 0

  for (const item of items) {
    if (!item?.tweetId || !Array.isArray(item.media)) {
      skipped++
      continue
    }
    try {
      let bookmark = await prisma.bookmark.findUnique({
        where: { tweetId: item.tweetId },
        include: { mediaItems: { select: { localPath: true, url: true } } },
      })

      if (!bookmark) {
        const row = await prisma.bookmark.create({
          data: {
            tweetId: item.tweetId,
            text: item.text ?? '',
            authorHandle: item.authorHandle ?? '',
            authorName: item.authorName ?? '',
            tweetCreatedAt: item.tweetCreatedAt ? new Date(item.tweetCreatedAt) : null,
            rawJson: JSON.stringify(item.rawJson ?? {}),
            source: 'other',
            // Marks as processed so AI enrichment never picks these up
            enrichedAt: new Date(),
          },
        })
        bookmark = { ...row, mediaItems: [] }
        created++
      } else {
        updated++
      }

      const have = new Set(bookmark.mediaItems.map((m) => m.localPath ?? m.url))
      const fresh = item.media.filter((m) => !have.has(m.localPath ?? m.url))
      if (fresh.length) {
        await prisma.mediaItem.createMany({
          data: fresh.map((m) => ({
            bookmarkId: bookmark!.id,
            type: m.type,
            url: m.url,
            thumbnailUrl: m.thumbnailUrl ?? null,
            localPath: m.localPath ?? null,
          })),
        })
      }
    } catch (err) {
      console.error(`Other ingest failed for ${item.tweetId}:`, err)
      skipped++
    }
  }

  return NextResponse.json({ created, updated, skipped })
}
