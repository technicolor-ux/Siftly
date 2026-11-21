'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Search, X, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import OtherCard from '@/components/other-card'
import type { BookmarkWithMedia, BookmarksResponse } from '@/lib/types'

const PAGE_SIZE = 24

export default function OtherPage() {
  const [bookmarks, setBookmarks] = useState<BookmarkWithMedia[]>([])
  const [total, setTotal] = useState(0)
  const [mediaBase, setMediaBase] = useState('')
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest')
  const [page, setPage] = useState(1)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ source: 'other', sort, page: String(page), limit: String(PAGE_SIZE) })
      if (query) params.set('q', query)
      const res = await fetch(`/api/bookmarks?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data: BookmarksResponse = await res.json()
      setBookmarks(data.bookmarks)
      setTotal(data.total)
      if (data.mediaBase) setMediaBase(data.mediaBase)
    } catch (err) {
      console.error(err)
      setBookmarks([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [query, sort, page])

  useEffect(() => {
    load()
  }, [load])

  function onSearch(value: string) {
    setQ(value)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setQuery(value.trim())
      setPage(1)
    }, 300)
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-20 bg-zinc-950/90 backdrop-blur-lg border-b border-zinc-800/60">
        <div className="px-6 md:px-8 py-4">
          <div className="flex items-center gap-1 mb-3">
            <h1 className="px-3.5 py-1.5 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-100">Other</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
              <input
                type="text"
                placeholder="Search..."
                value={q}
                onChange={(e) => onSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 text-sm focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20 transition-all"
              />
              {q && (
                <button onClick={() => onSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300">
                  <X size={13} />
                </button>
              )}
            </div>
            <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-400 shrink-0 focus-within:border-indigo-500/60">
              <ArrowUpDown size={13} />
              <span className="hidden sm:inline text-zinc-500">Sort</span>
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as 'newest' | 'oldest')
                  setPage(1)
                }}
                aria-label="Sort by date posted"
                className="bg-transparent text-zinc-200 focus:outline-none cursor-pointer"
              >
                <option value="newest" className="bg-zinc-900">Date posted: newest</option>
                <option value="oldest" className="bg-zinc-900">Date posted: oldest</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 md:px-8 py-6 max-w-7xl mx-auto w-full">
        {!loading && (
          <p className="text-sm text-zinc-500 mb-5">
            {total > 0 ? (
              <>
                <span className="text-zinc-200 font-semibold">{total.toLocaleString()}</span> item{total !== 1 ? 's' : ''}
              </>
            ) : (
              'Nothing here yet'
            )}
          </p>
        )}

        {loading && (
          <div className="masonry-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="masonry-item">
                <div className="h-80 rounded-2xl bg-zinc-900 border border-zinc-800 animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {!loading && bookmarks.length > 0 && (
          <div className="masonry-grid">
            {bookmarks.map((b) => (
              <div key={b.id} className="masonry-item">
                <OtherCard bookmark={b} mediaBase={mediaBase} />
              </div>
            ))}
          </div>
        )}

        {!loading && pages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 disabled:opacity-30 hover:text-zinc-200"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-zinc-500 tabular-nums">
              {page} / {pages}
            </span>
            <button
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 disabled:opacity-30 hover:text-zinc-200"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
