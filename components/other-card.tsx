'use client'

import { useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX, ExternalLink, HardDriveDownload } from 'lucide-react'
import type { BookmarkWithMedia } from '@/lib/types'

interface OtherCardProps {
  bookmark: BookmarkWithMedia
  mediaBase: string
}

function cleanText(text: string): string {
  return text
    .replace(/https?:\/\/t\.co\/\w+/g, '')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .trim()
}

function LocalVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [muted, setMuted] = useState(true)
  const [ratio, setRatio] = useState<number | null>(null)
  const [failed, setFailed] = useState(false)

  // Play only while on screen so a page of videos never loads or plays at once
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) el.play().catch(() => {})
        else el.pause()
      },
      { threshold: 0.5 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  if (failed) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 aspect-video bg-zinc-950 text-zinc-600 text-xs">
        <HardDriveDownload size={18} />
        Drive offline
      </div>
    )
  }

  return (
    <div className="relative bg-black" style={{ aspectRatio: ratio ?? 9 / 16, maxHeight: '75vh' }}>
      <video
        ref={ref}
        src={src}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        onLoadedMetadata={(e) => {
          const v = e.currentTarget
          if (v.videoWidth && v.videoHeight) setRatio(v.videoWidth / v.videoHeight)
        }}
        onError={() => setFailed(true)}
        onClick={(e) => (e.currentTarget.paused ? e.currentTarget.play() : e.currentTarget.pause())}
        className="w-full h-full object-contain cursor-pointer"
      />
      <button
        onClick={() => setMuted((m) => !m)}
        aria-label={muted ? 'Unmute' : 'Mute'}
        className="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/60 text-zinc-200 hover:bg-black/80 transition-colors"
      >
        {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
      </button>
    </div>
  )
}

export default function OtherCard({ bookmark, mediaBase }: OtherCardProps) {
  const videos = bookmark.mediaItems.filter((m) => m.localPath).slice(0, 3)
  const photo = videos.length === 0 ? bookmark.mediaItems.find((m) => m.type === 'photo') : null
  const text = cleanText(bookmark.text)
  const tweetUrl = `https://x.com/${bookmark.authorHandle}/status/${bookmark.tweetId}`
  const onlyText = videos.length === 0 && !photo

  return (
    <article className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      {videos.map((v) => (
        <LocalVideo key={v.id} src={`${mediaBase}/${v.localPath!.split('/').map(encodeURIComponent).join('/')}`} />
      ))}
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/media?url=${encodeURIComponent(photo.url)}`} alt="" loading="lazy" className="w-full" />
      )}
      <div className="p-3.5">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <a href={tweetUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-500 hover:text-zinc-300 truncate">
            @{bookmark.authorHandle}
          </a>
          <a href={tweetUrl} target="_blank" rel="noopener noreferrer" aria-label="Open on X" className="text-zinc-600 hover:text-zinc-300">
            <ExternalLink size={12} />
          </a>
        </div>
        {text && (
          <p className={`text-sm text-zinc-300 whitespace-pre-wrap break-words ${onlyText ? '' : 'line-clamp-3'}`}>{text}</p>
        )}
      </div>
    </article>
  )
}
