// Per-playlist in-memory cache
const cacheMap = {}
const CACHE_TTL = 1000 * 60 * 60 * 6 // 6 hours

const BASE = 'https://iptv-org.github.io/iptv'

export const PLAYLISTS = {
  // ── Global ──────────────────────────────────────────────────────────
  all:          { label: '🌍 All Channels',  group: 'global',    url: `${BASE}/index.m3u` },

  // ── India by country / subdivision ──────────────────────────────────
  india:        { label: '🇮🇳 India (All)',  group: 'language',  url: `${BASE}/countries/in.m3u` },
  tamil_nadu:   { label: '🏛 Tamil Nadu',    group: 'language',  url: `${BASE}/subdivisions/in-tn.m3u` },

  // ── Indian regional languages ────────────────────────────────────────
  hindi:        { label: '🇮🇳 Hindi',        group: 'language',  url: `${BASE}/languages/hin.m3u` },
  tamil:        { label: '🇮🇳 Tamil',        group: 'language',  url: `${BASE}/languages/tam.m3u` },
  telugu:       { label: '🇮🇳 Telugu',       group: 'language',  url: `${BASE}/languages/tel.m3u` },
  malayalam:    { label: '🇮🇳 Malayalam',    group: 'language',  url: `${BASE}/languages/mal.m3u` },
  kannada:      { label: '🇮🇳 Kannada',      group: 'language',  url: `${BASE}/languages/kan.m3u` },
  bengali:      { label: '🇮🇳 Bengali',      group: 'language',  url: `${BASE}/languages/ben.m3u` },
  marathi:      { label: '🇮🇳 Marathi',      group: 'language',  url: `${BASE}/languages/mar.m3u` },
  gujarati:     { label: '🇮🇳 Gujarati',     group: 'language',  url: `${BASE}/languages/guj.m3u` },
  punjabi:      { label: '🇮🇳 Punjabi',      group: 'language',  url: `${BASE}/languages/pan.m3u` },
  urdu:         { label: '🇮🇳 Urdu',         group: 'language',  url: `${BASE}/languages/urd.m3u` },
  assamese:     { label: '🇮🇳 Assamese',     group: 'language',  url: `${BASE}/languages/asm.m3u` },
  odia:         { label: '🇮🇳 Odia',         group: 'language',  url: `${BASE}/languages/ori.m3u` },

  // ── Categories ───────────────────────────────────────────────────────
  auto:         { label: '🚗 Auto',          group: 'category',  url: `${BASE}/categories/auto.m3u` },
  animation:    { label: '🎨 Animation',     group: 'category',  url: `${BASE}/categories/animation.m3u` },
  business:     { label: '💼 Business',      group: 'category',  url: `${BASE}/categories/business.m3u` },
  classic:      { label: '📺 Classic',       group: 'category',  url: `${BASE}/categories/classic.m3u` },
  comedy:       { label: '😂 Comedy',        group: 'category',  url: `${BASE}/categories/comedy.m3u` },
  cooking:      { label: '🍳 Cooking',       group: 'category',  url: `${BASE}/categories/cooking.m3u` },
  culture:      { label: '🎭 Culture',       group: 'category',  url: `${BASE}/categories/culture.m3u` },
  documentary:  { label: '🎬 Documentary',   group: 'category',  url: `${BASE}/categories/documentary.m3u` },
  education:    { label: '📚 Education',     group: 'category',  url: `${BASE}/categories/education.m3u` },
  entertainment:{ label: '🎉 Entertainment', group: 'category',  url: `${BASE}/categories/entertainment.m3u` },
  family:       { label: '👨‍👩‍👧 Family',       group: 'category',  url: `${BASE}/categories/family.m3u` },
  general:      { label: '📡 General',       group: 'category',  url: `${BASE}/categories/general.m3u` },
  interactive:  { label: '🖱 Interactive',   group: 'category',  url: `${BASE}/categories/interactive.m3u` },
  kids:         { label: '🧒 Kids',          group: 'category',  url: `${BASE}/categories/kids.m3u` },
  legislative:  { label: '🏛 Legislative',   group: 'category',  url: `${BASE}/categories/legislative.m3u` },
  lifestyle:    { label: '✨ Lifestyle',      group: 'category',  url: `${BASE}/categories/lifestyle.m3u` },
  movies:       { label: '🎥 Movies',        group: 'category',  url: `${BASE}/categories/movies.m3u` },
  music:        { label: '🎵 Music',         group: 'category',  url: `${BASE}/categories/music.m3u` },
  news:         { label: '📰 News',          group: 'category',  url: `${BASE}/categories/news.m3u` },
  outdoor:      { label: '🏕 Outdoor',       group: 'category',  url: `${BASE}/categories/outdoor.m3u` },
  public_tv:    { label: '📢 Public',        group: 'category',  url: `${BASE}/categories/public.m3u` },
  relax:        { label: '🌿 Relax',         group: 'category',  url: `${BASE}/categories/relax.m3u` },
  religious:    { label: '🙏 Religious',     group: 'category',  url: `${BASE}/categories/religious.m3u` },
  series:       { label: '🎞 Series',        group: 'category',  url: `${BASE}/categories/series.m3u` },
  science:      { label: '🔬 Science',       group: 'category',  url: `${BASE}/categories/science.m3u` },
  shop:         { label: '🛍 Shop',          group: 'category',  url: `${BASE}/categories/shop.m3u` },
  sports:       { label: '⚽ Sports',        group: 'category',  url: `${BASE}/categories/sports.m3u` },
  travel:       { label: '✈️ Travel',        group: 'category',  url: `${BASE}/categories/travel.m3u` },
  weather:      { label: '🌤 Weather',       group: 'category',  url: `${BASE}/categories/weather.m3u` },
}

function parseM3U(text) {
  const lines = text.split('\n')
  const channels = []
  let current = {}

  for (const line of lines) {
    const l = line.trim()

    if (l.startsWith('#EXTINF')) {
      current = {}
      const nameMatch    = l.match(/,(.+)$/)
      const logoMatch    = l.match(/tvg-logo="([^"]*)"/)
      const groupMatch   = l.match(/group-title="([^"]*)"/)
      const idMatch      = l.match(/tvg-id="([^"]*)"/)
      const countryMatch = l.match(/tvg-country="([^"]*)"/)
      const langMatch    = l.match(/tvg-language="([^"]*)"/)

      if (nameMatch)    current.name     = nameMatch[1].trim()
      if (logoMatch)    current.logo     = logoMatch[1]
      if (groupMatch)   current.group    = groupMatch[1]
      if (idMatch)      current.id       = idMatch[1]
      if (countryMatch) current.country  = countryMatch[1]
      if (langMatch)    current.language = langMatch[1]

    } else if (l.startsWith('http') && current.name) {
      current.url = l
      channels.push({ ...current })
      current = {}
    }
  }

  return channels
}

async function getChannels(playlistKey) {
  const playlist = PLAYLISTS[playlistKey] || PLAYLISTS.india
  const now = Date.now()
  const cached = cacheMap[playlistKey]

  if (cached && now - cached.time < CACHE_TTL) return cached.channels

  const response = await fetch(playlist.url, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  })
  if (!response.ok) throw new Error(`Failed to fetch playlist: ${response.status}`)

  const text = await response.text()
  const channels = parseM3U(text)
  cacheMap[playlistKey] = { channels, time: now }
  console.log(`[cache] loaded ${channels.length} channels for "${playlistKey}"`)

  return channels
}

export default async function handler(req, res) {
  const {
    playlist = 'india',
    search   = '',
    group    = '',
    page     = '1',
    limit    = '100',
  } = req.query

  try {
    let channels = await getChannels(playlist)

    if (search) {
      const q = search.toLowerCase()
      channels = channels.filter(c => c.name?.toLowerCase().includes(q))
    }

    if (group) {
      channels = channels.filter(c =>
        c.group?.toLowerCase() === group.toLowerCase()
      )
    }

    const allChannels = cacheMap[playlist]?.channels || channels
    const groups = [...new Set(allChannels.map(c => c.group).filter(Boolean))].sort()

    const pageNum   = Math.max(1, parseInt(page))
    const limitNum  = Math.min(200, Math.max(1, parseInt(limit)))
    const start     = (pageNum - 1) * limitNum
    const paginated = channels.slice(start, start + limitNum)

    // Build grouped playlist list for the UI
    const playlistList = {
      global:   [],
      language: [],
      category: [],
    }
    for (const [key, val] of Object.entries(PLAYLISTS)) {
      playlistList[val.group]?.push({ key, label: val.label })
    }

    res.setHeader('Cache-Control', 'public, s-maxage=3600')
    res.json({
      playlist,
      total:    channels.length,
      page:     pageNum,
      pages:    Math.ceil(channels.length / limitNum),
      channels: paginated,
      groups,
      playlistList,
    })

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
}
