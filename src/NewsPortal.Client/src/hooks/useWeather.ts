import { useCallback, useEffect, useRef, useState } from 'react'

// ----------------------------------------------------------------------------
// useWeather — resolves the visitor's weather and keeps it fresh.
// On load we NEVER prompt for location. Resolution order:
//   1. Manual override (user typed a city) — persisted, wins until cleared.
//   2. IP-based — wttr.in auto-detects the request IP (approximate city), no
//      permission prompt. This is the silent default.
// Precise GPS (navigator.geolocation, which DOES prompt) is only requested when
// the user explicitly taps "use my location" → useMyLocation(); on denial it
// silently falls back to IP. Data comes from wttr.in's free `?format=j1`
// endpoint (no API key); its `nearest_area` block gives the city/region/country.
// ----------------------------------------------------------------------------

export interface WeatherData {
  tempC: number
  feelsLikeC: number
  humidity: number
  description: string
  code: number
  windKmph: number
  windDir: string
  isDay: boolean
  city: string
  region: string
  country: string
}

export type WeatherSource = 'gps' | 'ip' | 'manual'

interface WeatherState {
  weather: WeatherData | null
  loading: boolean
  source: WeatherSource
  /** Switch to a specific city and remember the choice. */
  setManualCity: (city: string) => void
  /** Forget the manual city and re-detect from the device location / IP. */
  useMyLocation: () => void
}

const CACHE_KEY = 'newsportal_weather_v2'
const MODE_KEY = 'weather_mode'   // 'auto' | 'manual'
const CITY_KEY = 'weather_city'   // last manual city
const CACHE_TTL = 30 * 60 * 1000  // 30 minutes
const GEO_TIMEOUT = 8000

function isCoords(query: string): boolean {
  return /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(query)
}

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('geolocation unsupported'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: GEO_TIMEOUT,
      maximumAge: CACHE_TTL,
      enableHighAccuracy: false,
    })
  })
}

async function fetchWttr(query: string): Promise<WeatherData> {
  // Coordinates must keep their literal comma; city names get URL-encoded.
  const path = isCoords(query) ? query : encodeURIComponent(query)
  const res = await fetch(`https://wttr.in/${path}?format=j1`)
  if (res.ok === false) throw new Error(`weather fetch failed (${res.status})`)

  const json = await res.json()
  const current = json.current_condition?.[0]
  if (!current) throw new Error('no current condition')
  const area = json.nearest_area?.[0]

  return {
    tempC: parseInt(current.temp_C, 10),
    feelsLikeC: parseInt(current.FeelsLikeC, 10),
    humidity: parseInt(current.humidity, 10),
    description: (current.weatherDesc?.[0]?.value || '').trim() || '—',
    code: parseInt(current.weatherCode, 10),
    windKmph: parseInt(current.windspeedKmph, 10),
    windDir: current.winddir16Point || '',
    isDay: isDaytime(), // device-clock based (see note on isDaytime)
    city: area?.areaName?.[0]?.value?.trim() || (isCoords(query) ? '' : query) || 'আপনার অবস্থান',
    region: area?.region?.[0]?.value?.trim() || '',
    country: area?.country?.[0]?.value?.trim() || '',
  }
}

function readCache(): { data: WeatherData; source: WeatherSource } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Date.now() - parsed.timestamp < CACHE_TTL && parsed.data) {
      return { data: parsed.data, source: parsed.source }
    }
  } catch { /* ignore */ }
  return null
}

function writeCache(data: WeatherData, source: WeatherSource) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, source, timestamp: Date.now() }))
  } catch { /* ignore */ }
}

export function useWeather(): WeatherState {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState<WeatherSource>(
    () => (localStorage.getItem(MODE_KEY) === 'manual' ? 'manual' : 'ip')
  )
  // Bumping this re-runs detection (used by the manual/reset actions).
  const [reloadKey, setReloadKey] = useState(0)
  const ignoreCache = useRef(false)

  useEffect(() => {
    let cancelled = false

    const resolve = async () => {
      setLoading(true)

      if (ignoreCache.current === false) {
        const cached = readCache()
        if (cached) {
          if (cancelled === false) {
            setWeather({ ...cached.data, isDay: isDaytime() })
            setSource(cached.source)
            setLoading(false)
          }
          return
        }
      }
      ignoreCache.current = false

      const mode = localStorage.getItem(MODE_KEY)
      const savedCity = localStorage.getItem(CITY_KEY)

      // 1. Manual override.
      if (mode === 'manual' && savedCity) {
        try {
          const data = await fetchWttr(savedCity)
          if (cancelled) return
          finish(data, 'manual')
          return
        } catch { /* fall through to IP */ }
      }

      // 2. IP-based default (empty query → wttr.in geolocates the request IP).
      // No browser prompt here — precise GPS is opt-in via useMyLocation().
      try {
        const data = await fetchWttr('')
        if (cancelled) return
        finish(data, 'ip')
      } catch {
        if (cancelled === false) setLoading(false)
      }
    }

    const finish = (data: WeatherData, src: WeatherSource) => {
      const withDay = { ...data, isDay: isDaytime() }
      setWeather(withDay)
      setSource(src)
      setLoading(false)
      writeCache(withDay, src)
    }

    resolve()
    return () => { cancelled = true }
  }, [reloadKey])

  const setManualCity = useCallback((city: string) => {
    const trimmed = city.trim()
    if (!trimmed) return
    localStorage.setItem(MODE_KEY, 'manual')
    localStorage.setItem(CITY_KEY, trimmed)
    localStorage.removeItem(CACHE_KEY)
    ignoreCache.current = true
    setReloadKey(k => k + 1)
  }, [])

  // Explicit, user-initiated precise location. This is the ONLY place that calls
  // navigator.geolocation, so the browser permission prompt only appears on a
  // deliberate tap. On denial/failure we silently fall back to IP-based.
  const useMyLocation = useCallback(async () => {
    setLoading(true)
    try {
      const pos = await getPosition()
      const query = `${pos.coords.latitude.toFixed(3)},${pos.coords.longitude.toFixed(3)}`
      const data = await fetchWttr(query)
      localStorage.setItem(MODE_KEY, 'auto')
      localStorage.removeItem(CITY_KEY)
      const withDay = { ...data, isDay: isDaytime() }
      writeCache(withDay, 'gps')
      setWeather(withDay)
      setSource('gps')
      setLoading(false)
    } catch {
      // Denied / unavailable → drop any manual city and re-resolve via IP.
      localStorage.setItem(MODE_KEY, 'auto')
      localStorage.removeItem(CITY_KEY)
      localStorage.removeItem(CACHE_KEY)
      ignoreCache.current = true
      setReloadKey(k => k + 1) // the effect re-resolves (IP) and manages loading
    }
  }, [])

  return { weather, loading, source, setManualCity, useMyLocation }
}

/** wttr.in's day/night flag is unreliable across locales; use the device clock. */
function isDaytime(): boolean {
  const h = new Date().getHours()
  return h >= 6 && h < 18
}
