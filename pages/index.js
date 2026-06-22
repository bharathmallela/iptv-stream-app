import { useEffect, useRef, useState, useCallback } from 'react'
import Head from 'next/head'

const TABS = [
  { id: 'language', label: '🌐 Languages' },
  { id: 'category', label: '📂 Categories' },
]

export default function Home() {
  const videoRef = useRef(null)
  const hlsRef   = useRef(null)
  const listRef  = useRef(null)

  const [channels,         setChannels]         = useState([])
  const [groups,           setGroups]           = useState([])
  const [playlistList,     setPlaylistList]     = useState({ global: [], language: [], category: [] })
  const [tab,              setTab]              = useState('language')
  const [selectedPlaylist, setSelectedPlaylist] = useState('india')
  const [search,           setSearch]           = useState('')
  const [selectedGroup,    setSelectedGroup]    = useState('')
  const [activeChannel,    setActiveChannel]    = useState(null)
  const [loading,          setLoading]          = useState(true)
  const [playerError,      setPlayerError]      = useState(null)
  const [playerStatus,     setPlayerStatus]     = useState('idle')
  const [page,             setPage]             = useState(1)
  const [totalPages,       setTotalPages]       = useState(1)
  const [total,            setTotal]            = useState(0)

  const fetchChannels = useCallback(async (pl, grp, q, pg) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        playlist: pl, page: pg, limit: 100,
        ...(q   ? { search: q }  : {}),
        ...(grp ? { group: grp } : {}),
      })
      const res  = await fetch(`/api/channels?${params}`)
      const data = await res.json()
      setChannels(data.channels    || [])
      setGroups(data.groups        || [])
      setTotalPages(data.pages     || 1)
      setTotal(data.total          || 0)
      if (data.playlistList) setPlaylistList(data.playlistList)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1)
      fetchChannels(selectedPlaylist, selectedGroup, search, 1)
    }, 300)
    return () => clearTimeout(t)
  }, [search, selectedGroup, selectedPlaylist, fetchChannels])

  useEffect(() => {
    fetchChannels(selectedPlaylist, selectedGroup, search, page)
    listRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [page]) // eslint-disable-line

  const selectPlaylist = (key) => {
    setSelectedPlaylist(key)
    setSelectedGroup('')
    setSearch('')
    setPage(1)
  }

  const playChannel = useCallback(async (channel) => {
    setActiveChannel(channel)
    setPlayerError(null)
    setPlayerStatus('loading')

    const video = videoRef.current
    if (!video) return

    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null }

    const proxiedUrl = `/api/proxy?url=${encodeURIComponent(channel.url)}`
    const Hls = (await import('hls.js')).default

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true })
      hlsRef.current = hls
      hls.loadSource(proxiedUrl)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setPlayerStatus('playing')
        video.play().catch(console.error)
      })
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) { setPlayerError('Stream unavailable'); setPlayerStatus('error') }
      })
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = proxiedUrl
      video.play().catch(console.error)
      setPlayerStatus('playing')
    } else {
      setPlayerError('HLS not supported in this browser')
      setPlayerStatus('error')
    }
  }, [])

  const currentTabPlaylists = playlistList[tab] || []

  return (
    <>
      <Head>
        <title>IPTV Player</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={s.app}>
        {/* ── Sidebar ── */}
        <div style={s.sidebar}>
          <div style={s.sidebarTop}>
            <h1 style={s.title}>📺 IPTV</h1>

            {/* Tabs: Languages | Categories */}
            <div style={s.tabs}>
              {TABS.map(t => (
                <button
                  key={t.id}
                  style={{ ...s.tab, ...(tab === t.id ? s.tabActive : {}) }}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <input
              style={s.input}
              type="text"
              placeholder="Search channels..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />

            {/* Category/group filter */}
            {groups.length > 0 && (
              <select
                style={s.select}
                value={selectedGroup}
                onChange={e => { setSelectedGroup(e.target.value); setPage(1) }}
              >
                <option value="">All sub-categories</option>
                {groups.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            )}

            <div style={s.stats}>
              {loading ? 'Loading…' : `${total} channels`}
            </div>
          </div>

          {/* Playlist picker (scrollable list of buttons) */}
          <div style={s.playlistPicker}>
            {currentTabPlaylists.map(p => (
              <button
                key={p.key}
                style={{
                  ...s.playlistBtn,
                  ...(selectedPlaylist === p.key ? s.playlistBtnActive : {})
                }}
                onClick={() => selectPlaylist(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Channel list */}
          <div style={s.channelList} ref={listRef}>
            {!loading && channels.length === 0 && (
              <p style={s.hint}>No channels found</p>
            )}
            {channels.map((ch, i) => (
              <div
                key={i}
                style={{
                  ...s.channelItem,
                  ...(activeChannel?.url === ch.url ? s.channelItemActive : {})
                }}
                onClick={() => playChannel(ch)}
              >
                {ch.logo
                  ? <img src={ch.logo} alt="" style={s.logo}
                         onError={e => { e.target.style.display = 'none' }} />
                  : <div style={s.logoPlaceholder}>📺</div>
                }
                <div style={s.chInfo}>
                  <span style={s.chName}>{ch.name}</span>
                  <span style={s.chMeta}>
                    {[ch.language, ch.country, ch.group].filter(Boolean).join(' · ')}
                  </span>
                </div>
              </div>
            ))}
            {loading && <div style={s.hint}>Loading…</div>}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={s.pagination}>
              <button style={s.pageBtn} disabled={page === 1}
                      onClick={() => setPage(p => p - 1)}>◀</button>
              <span style={s.pageInfo}>{page} / {totalPages}</span>
              <button style={s.pageBtn} disabled={page === totalPages}
                      onClick={() => setPage(p => p + 1)}>▶</button>
            </div>
          )}
        </div>

        {/* ── Player ── */}
        <div style={s.player}>
          {activeChannel ? (
            <>
              <div style={s.playerHeader}>
                <div style={s.nowPlaying}>
                  {playerStatus === 'loading' ? '⏳ Connecting…' : `▶ ${activeChannel.name}`}
                </div>
                <div style={s.tags}>
                  {[activeChannel.language, activeChannel.country, activeChannel.group]
                    .filter(Boolean)
                    .map((t, i) => <span key={i} style={s.tag}>{t}</span>)}
                </div>
              </div>
              <video ref={videoRef} style={s.video} controls autoPlay playsInline />
              {playerError && (
                <div style={s.errorBanner}>⚠️ {playerError} — try another channel</div>
              )}
            </>
          ) : (
            <div style={s.emptyPlayer}>
              <p style={{ fontSize: 52 }}>📺</p>
              <p style={{ color: '#555', marginTop: 12 }}>Select a channel to watch</p>
              <p style={{ color: '#444', fontSize: 13, marginTop: 4 }}>
                Browse by Language or Category
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

const s = {
  app: {
    display: 'flex', height: '100vh',
    background: '#0f1117', color: '#fff',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    overflow: 'hidden',
  },
  sidebar: {
    width: 280, minWidth: 280,
    display: 'flex', flexDirection: 'column',
    borderRight: '1px solid #1e2130',
    background: '#0b0d14', overflow: 'hidden',
  },
  sidebarTop: {
    padding: '12px 10px 8px',
    borderBottom: '1px solid #1e2130',
    display: 'flex', flexDirection: 'column', gap: 8,
    flexShrink: 0,
  },
  title: { margin: 0, fontSize: 17, fontWeight: 700 },
  tabs: { display: 'flex', gap: 4 },
  tab: {
    flex: 1, padding: '6px 4px', fontSize: 12, fontWeight: 500,
    background: '#13151f', border: '1px solid #2a2d3e',
    color: '#888', borderRadius: 6, cursor: 'pointer',
  },
  tabActive: {
    background: '#1e2a4a', color: '#60a5fa',
    borderColor: '#3b82f6',
  },
  input: {
    width: '100%', padding: '7px 10px',
    borderRadius: 7, border: '1px solid #2a2d3e',
    background: '#13151f', color: '#fff',
    fontSize: 13, outline: 'none', boxSizing: 'border-box',
  },
  select: {
    width: '100%', padding: '6px 10px',
    borderRadius: 7, border: '1px solid #2a2d3e',
    background: '#13151f', color: '#fff',
    fontSize: 12, outline: 'none', cursor: 'pointer',
  },
  stats: { fontSize: 11, color: '#444', textAlign: 'right' },

  // Playlist picker
  playlistPicker: {
    display: 'flex', flexDirection: 'column', gap: 2,
    padding: '6px 8px', overflowY: 'auto',
    maxHeight: 220, flexShrink: 0,
    borderBottom: '1px solid #1e2130',
  },
  playlistBtn: {
    textAlign: 'left', padding: '6px 10px', fontSize: 12,
    background: 'transparent', border: 'none',
    color: '#888', borderRadius: 6, cursor: 'pointer',
  },
  playlistBtnActive: {
    background: '#151c30', color: '#60a5fa', fontWeight: 600,
  },

  // Channel list
  channelList: { flex: 1, overflowY: 'auto', padding: '4px 0' },
  hint: { padding: '14px 12px', color: '#555', fontSize: 13, margin: 0 },
  channelItem: {
    display: 'flex', alignItems: 'center', gap: 9,
    padding: '6px 10px', cursor: 'pointer',
    margin: '1px 4px', borderRadius: 6,
  },
  channelItemActive: {
    background: '#151c30',
    borderLeft: '3px solid #3b82f6', paddingLeft: 7,
  },
  logo: {
    width: 36, height: 24, objectFit: 'contain',
    borderRadius: 3, flexShrink: 0, background: '#13151f',
  },
  logoPlaceholder: {
    width: 36, height: 24, fontSize: 14, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  chInfo: { display: 'flex', flexDirection: 'column', overflow: 'hidden', gap: 2 },
  chName: {
    fontSize: 13, fontWeight: 500,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  chMeta: {
    fontSize: 10, color: '#555',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },

  // Pagination
  pagination: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 10px', borderTop: '1px solid #1e2130', gap: 8, flexShrink: 0,
  },
  pageBtn: {
    background: '#13151f', border: '1px solid #2a2d3e',
    color: '#aaa', borderRadius: 6, padding: '5px 12px',
    fontSize: 12, cursor: 'pointer',
  },
  pageInfo: { fontSize: 12, color: '#555' },

  // Player
  player: {
    flex: 1, display: 'flex', flexDirection: 'column',
    background: '#000', overflow: 'hidden',
  },
  playerHeader: {
    padding: '10px 16px', background: '#0b0d14',
    borderBottom: '1px solid #1e2130',
    display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0,
  },
  nowPlaying: { fontSize: 14, fontWeight: 600 },
  tags: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  tag: {
    fontSize: 11, color: '#888', background: '#13151f',
    border: '1px solid #2a2d3e', padding: '2px 8px', borderRadius: 4,
  },
  video: {
    width: '100%', flex: 1, background: '#000', outline: 'none',
    maxHeight: 'calc(100vh - 70px)',
  },
  errorBanner: {
    background: '#1f0a0a', color: '#f87171',
    padding: '10px 16px', fontSize: 13,
    borderTop: '1px solid #3a1a1a', flexShrink: 0,
  },
  emptyPlayer: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
  },
}
