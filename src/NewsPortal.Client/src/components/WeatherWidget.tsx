import { useState } from 'react'
import {
  Sun, Moon, CloudSun, CloudMoon, Cloud, Cloudy,
  CloudRain, CloudDrizzle, CloudLightning, CloudSnow, CloudFog,
  Thermometer, Droplets, Wind, MapPin, LocateFixed, type LucideIcon,
} from 'lucide-react'
import type { WeatherData, WeatherSource } from '../hooks/useWeather'

interface WeatherWidgetProps {
  data: WeatherData | null
  loading: boolean
  source: WeatherSource
  onSetCity: (city: string) => void
  onUseLocation: () => void
  variant?: 'card' | 'compact'
}

// WWO weather-code → lucide outline glyph (day/night aware for clear & partly-cloudy).
function weatherGlyph(code: number, isDay: boolean): LucideIcon {
  if (code === 113) return isDay ? Sun : Moon
  if (code === 116) return isDay ? CloudSun : CloudMoon
  if (code === 119) return Cloud
  if (code === 122) return Cloudy
  if ([143, 248, 260].includes(code)) return CloudFog
  if ([176, 263, 266, 281, 284, 311, 314, 317].includes(code)) return CloudDrizzle
  if ([182, 185, 293, 296, 299, 302, 305, 308, 353, 356, 359].includes(code)) return CloudRain
  if ([200, 386, 389, 392, 395].includes(code)) return CloudLightning
  if ([179, 227, 230, 320, 323, 326, 329, 332, 335, 338, 350, 362, 365, 368, 371, 374, 377].includes(code)) return CloudSnow
  return isDay ? CloudSun : CloudMoon
}

const WeatherWidget = ({ data, loading, source, onSetCity, onUseLocation, variant = 'card' }: WeatherWidgetProps) => {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')

  const submitCity = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = editValue.trim()
    if (trimmed) onSetCity(trimmed)
    setEditing(false)
  }

  const startEdit = () => {
    setEditValue(data?.city ?? '')
    setEditing(true)
  }

  // ---- Loading skeleton --------------------------------------------------
  if (loading && !data) {
    if (variant === 'compact') {
      return (
        <div className="flex items-center gap-2.5 rounded-xl border border-glass-border bg-white/[0.03] px-3 py-2 animate-pulse">
          <div className="h-6 w-6 rounded-full bg-white/10" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-20 rounded bg-white/10" />
            <div className="h-2.5 w-28 rounded bg-white/10" />
          </div>
        </div>
      )
    }
    return (
      <div className="rounded-xl border border-glass-border bg-white/[0.03] p-3.5 animate-pulse">
        <div className="mb-3 h-3 w-20 rounded bg-white/10" />
        <div className="mb-2 h-8 w-16 rounded bg-white/10" />
        <div className="h-2.5 w-24 rounded bg-white/10" />
      </div>
    )
  }

  if (!data) return null

  const Glyph = weatherGlyph(data.code, data.isDay)
  const cityLabel = data.region && data.region !== data.city ? `${data.city}, ${data.region}` : data.city

  // ---- Compact (mobile) --------------------------------------------------
  if (variant === 'compact') {
    if (editing) {
      return (
        <form onSubmit={submitCity} className="flex items-center gap-2 rounded-xl border border-accent/30 bg-white/[0.03] px-3 py-2">
          <MapPin className="h-4 w-4 shrink-0 text-accent" strokeWidth={1.75} />
          <input
            type="text"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            placeholder="শহরের নাম"
            autoFocus
            onBlur={submitCity}
            className="min-w-0 flex-1 bg-transparent text-xs text-white placeholder:text-secondary/60 focus:outline-none"
          />
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); onUseLocation(); setEditing(false) }}
            title="আমার অবস্থান"
            className="shrink-0 text-secondary hover:text-accent"
          >
            <LocateFixed className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </form>
      )
    }
    return (
      <button
        onClick={startEdit}
        className="flex w-full items-center gap-2.5 rounded-xl border border-glass-border bg-white/[0.03] px-3 py-2 text-left transition-colors hover:border-accent/30"
      >
        <Glyph className="h-6 w-6 shrink-0 text-accent" strokeWidth={1.5} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <span className="font-serif text-lg font-bold leading-none text-white">{data.tempC}°</span>
            <span className="truncate text-[11px] font-medium text-white/85">{cityLabel}</span>
          </div>
          <p className="truncate text-[10px] text-secondary">
            {data.description} · অনুভূত {data.feelsLikeC}° · আর্দ্রতা {data.humidity}%
          </p>
        </div>
        <MapPin className="h-3.5 w-3.5 shrink-0 text-secondary/50" strokeWidth={1.75} />
      </button>
    )
  }

  // ---- Card (desktop) ----------------------------------------------------
  return (
    <div className="rounded-xl border border-glass-border bg-white/[0.03] p-3.5">
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={1.75} />
          {editing ? (
            <form onSubmit={submitCity} className="min-w-0">
              <input
                type="text"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                placeholder="শহরের নাম"
                autoFocus
                onBlur={submitCity}
                className="w-full bg-transparent text-[11px] font-semibold text-white placeholder:text-secondary/60 focus:outline-none"
              />
            </form>
          ) : (
            <button
              onClick={startEdit}
              title="শহর পরিবর্তন করুন"
              className="truncate text-[11px] font-semibold text-white/90 transition-colors hover:text-accent"
            >
              {cityLabel}
            </button>
          )}
        </div>
        {source === 'manual' && (
          <button
            onClick={onUseLocation}
            title="আমার অবস্থান ব্যবহার করুন"
            className="shrink-0 text-secondary transition-colors hover:text-accent"
          >
            <LocateFixed className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        )}
      </div>

      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-baseline gap-0.5">
          <span className="font-serif text-3xl font-bold text-white">{data.tempC}</span>
          <span className="text-sm text-secondary">°C</span>
        </div>
        <Glyph className="h-9 w-9 text-accent" strokeWidth={1.5} />
      </div>

      <p className="mb-2.5 text-[11px] leading-snug text-secondary">{data.description}</p>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-secondary/80">
        <span className="inline-flex items-center gap-1">
          <Thermometer className="h-3 w-3" strokeWidth={1.75} /> অনুভূত {data.feelsLikeC}°
        </span>
        <span className="inline-flex items-center gap-1">
          <Droplets className="h-3 w-3" strokeWidth={1.75} /> {data.humidity}%
        </span>
        <span className="inline-flex items-center gap-1">
          <Wind className="h-3 w-3" strokeWidth={1.75} /> {data.windKmph} km/h
        </span>
      </div>
    </div>
  )
}

export default WeatherWidget
