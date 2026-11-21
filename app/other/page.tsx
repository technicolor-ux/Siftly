'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Search, X, ArrowUpDown } from 'lucide-react'
import OtherCard from '@/components/other-card'
import type { BookmarkWithMedia, BookmarksResponse } from '@/lib/types'

const PAGE_SIZE = 24

export default function OtherPage() {
  const [bookmarks, setBookmarks] = useState<BookmarkWithMedia[]>([])
  const [total, setTotal] = useState(0)
  const [mediaBase, setMediaBase] = useState('')
  const [loading, setLoading] = useState(true) // first page of a new query
  const [loadingMore, setLoadingMore] = useState(false)
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest')
  const nextPage = useRef(1)
  const hasMore = useRef(true)
  const busy = useRef(false)
  const generation = useRef(0) // bumped on every new query so stale responses are dropped
  const sentinel = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadMore = useCallback(async () => {
    if (busy.current || !hasMore.current) return
    busy.current = true
    const gen = generation.current
    const page = nextPage.current
    if (page > 1) setLoadingMore(true)
    try {
      const params = new URLSearchParams({ source: 'other', sort, page: String(page), limit: String(PAGE_SIZE) })
      if (query) params.set('q', query)
      const res = await fetch(`/api/bookmarks?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data: BookmarksResponse = await res.json()
      if (gen !== generation.current) return
      setBookmarks((prev) => {
        const seen = new Set(prev.map((b) => b.id))
        return [...prev, ...data.bookmarks.filter((b) => !seen.has(b.id))]
      })
      setTotal(data.total)
      if (data.mediaBase) setMediaBase(data.mediaBase)
      nextPage.current = page + 1
      hasMore.current = page * PAGE_SIZE < data.total
    } catch (err) {
      console.error(err)
      hasMore.current = false
    } finally {
      if (gen === generation.current) {
        setLoading(false)
        setLoadingMore(false)
      }
      busy.current = false
    }
  }, [query, sort])

  // New query or sort: start over from the first page
  useEffect(() => {
    generation.current++
    nextPage.current = 1
    hasMore.current = true
    busy.current = false
    setBookmarks([])
    setTotal(0)
    setLoading(true)
    loadMore()
  }, [loadMore])

  // Load the next page when the bottom of the list nears the screen
  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && loadMore(), { rootMargin: '1200px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [loadMore])

  function onSearch(value: string) {
    setQ(value)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setQuery(value.trim()), 300)
  }

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
                onChange={(e) => setSort(e.target.value as 'newest' | 'oldest')}
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

        {/* Infinite scroll trigger */}
        <div ref={sentinel} className="h-px" />
        {loadingMore && <p className="text-center text-xs text-zinc-600 py-6">Loading more...</p>}
        {!loading && !loadingMore && bookmarks.length > 0 && bookmarks.length >= total && (
          <p className="text-center text-xs text-zinc-700 py-8">End of list</p>
        )}
      </div>
    </div>
  )
}
