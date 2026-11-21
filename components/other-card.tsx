'use client'

import { useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX, ExternalLink, HardDriveDownload, Play, Pause, RotateCcw, RotateCw, Maximize, Minimize } from 'lucide-react'
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

function fmt(t: number): string {
  if (!isFinite(t) || t < 0) t = 0
  const m = Math.floor(t / 60)
  const sec = Math.floor(t % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function requestFs(wrap: HTMLElement, video: HTMLVideoElement | null) {
  const w = wrap as any
  if (w.requestFullscreen) w.requestFullscreen().catch(() => {})
  else if (w.webkitRequestFullscreen) w.webkitRequestFullscreen()
  else if (video && (video as any).webkitEnterFullscreen) (video as any).webkitEnterFullscreen() // iPhone
}

function exitFs() {
  const d = document as any
  if (d.exitFullscreen) d.exitFullscreen().catch(() => {})
  else if (d.webkitExitFullscreen) d.webkitExitFullscreen()
}

function currentFsElement(): Element | null {
  const d = document as any
  return d.fullscreenElement ?? d.webkitFullscreenElement ?? null
}

function LocalVideo({ src }: { src: string }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const ref = useRef<HTMLVideoElement>(null)
  const [muted, setMuted] = useState(true)
  const [ratio, setRatio] = useState<number | null>(null)
  const [failed, setFailed] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [near, setNear] = useState(false) // within ~1.5 screens: video data is loaded
  const [visible, setVisible] = useState(false) // mostly on screen: video plays
  const [isFs, setIsFs] = useState(false)

  // Two observers: "near" loads the video, "visible" plays it. Far away, the video is
  // unloaded entirely so a long list never holds hundreds of videos in memory.
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const nearIo = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: '150% 0px' })
    const visIo = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.5 })
    nearIo.observe(el)
    visIo.observe(el)
    return () => {
      nearIo.disconnect()
      visIo.disconnect()
    }
  }, [])

  useEffect(() => {
    const v = ref.current
    if (!v) return
    const url = `${src}#t=0.1`
    if (near) {
      if (v.getAttribute('src') !== url) v.src = url
    } else if (v.getAttribute('src')) {
      v.pause()
      v.removeAttribute('src')
      v.load() // releases the decoded media
      setPlaying(false)
      setTime(0)
    }
  }, [near, src])

  useEffect(() => {
    const v = ref.current
    if (!v || !near) return
    if (visible || isFs) v.play().catch(() => {})
    else v.pause()
  }, [visible, near, isFs])

  useEffect(() => {
    const onChange = () => setIsFs(currentFsElement() === wrapRef.current)
    document.addEventListener('fullscreenchange', onChange)
    document.addEventListener('webkitfullscreenchange', onChange)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      document.removeEventListener('webkitfullscreenchange', onChange)
    }
  }, [])

  const toggle = () => {
    const v = ref.current
    if (!v) return
    if (v.paused) v.play().catch(() => {})
    else v.pause()
  }
  const skip = (delta: number) => {
    const v = ref.current
    if (!v) return
    v.currentTime = Math.min(Math.max(v.currentTime + delta, 0), v.duration || 0)
  }
  const toggleFs = () => {
    if (isFs) exitFs()
    else if (wrapRef.current) requestFs(wrapRef.current, ref.current)
  }

  if (failed) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 min-h-40 bg-zinc-950 text-zinc-600 text-xs">
        <HardDriveDownload size={18} />
        Drive offline
      </div>
    )
  }

  const btn = 'p-1.5 rounded-full text-zinc-100 hover:bg-white/15 transition-colors'

  return (
    <div
      ref={wrapRef}
      className="group relative flex-1 bg-black min-h-40"
      style={isFs ? undefined : { aspectRatio: ratio ?? 9 / 16, maxHeight: '75vh' }}
    >
      <video
        ref={ref}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        onLoadedMetadata={(e) => {
          const v = e.currentTarget
          setDuration(v.duration)
          if (v.videoWidth && v.videoHeight) setRatio(v.videoWidth / v.videoHeight)
          if (visible) v.play().catch(() => {})
        }}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={(e) => {
          // an unloaded video (no src) also fires nothing here; only real load failures count
          if (e.currentTarget.getAttribute('src')) setFailed(true)
        }}
        onClick={toggle}
        onDoubleClick={toggleFs}
        className="absolute inset-0 w-full h-full object-contain cursor-pointer"
      />
      <div
        className={`absolute inset-x-0 bottom-0 px-2.5 pt-8 pb-2 bg-gradient-to-t from-black/80 to-transparent transition-opacity ${
          playing ? 'opacity-0 group-hover:opacity-100 focus-within:opacity-100' : 'opacity-100'
        } [@media(hover:none)]:opacity-100`}
      >
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.05}
          value={Math.min(time, duration || 0)}
          onChange={(e) => {
            const v = ref.current
            if (v) v.currentTime = Number(e.target.value)
          }}
          aria-label="Seek"
          className="block w-full h-1 cursor-pointer accent-indigo-400"
        />
        <div className="mt-1.5 flex items-center gap-0.5">
          <button onClick={() => skip(-10)} aria-label="Back 10 seconds" className={btn}>
            <RotateCcw size={15} />
          </button>
          <button onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} className={btn}>
            {playing ? <Pause size={17} /> : <Play size={17} />}
          </button>
          <button onClick={() => skip(10)} aria-label="Forward 10 seconds" className={btn}>
            <RotateCw size={15} />
          </button>
          <span className="ml-1.5 text-[11px] tabular-nums text-zinc-300">
            {fmt(time)} / {fmt(duration)}
          </span>
          <button
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? 'Unmute' : 'Mute'}
            className={`${btn} ml-auto`}
          >
            {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
          <button onClick={toggleFs} aria-label={isFs ? 'Exit full screen' : 'Full screen'} className={btn}>
            {isFs ? <Minimize size={15} /> : <Maximize size={15} />}
          </button>
        </div>
      </div>
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
    <article className="flex flex-1 flex-col bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      {videos.length > 0 && (
        <div className="flex flex-1 flex-col">
          {videos.map((v) => (
            <LocalVideo key={v.id} src={`${mediaBase}/${v.localPath!.split('/').map(encodeURIComponent).join('/')}`} />
          ))}
        </div>
      )}
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
