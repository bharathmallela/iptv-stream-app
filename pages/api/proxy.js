// Disable Next.js body parsing — we're piping raw stream bytes
export const config = { api: { bodyParser: false, responseLimit: false } }

export default async function handler(req, res) {
  const { url } = req.query

  if (!url) return res.status(400).json({ error: 'Missing url param' })

  // Only allow http/https
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return res.status(403).json({ error: 'Invalid URL scheme' })
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': new URL(url).origin,
        'Origin': new URL(url).origin,
      },
      signal: AbortSignal.timeout(10000) // 10s timeout
    })

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Upstream returned ${upstream.status}` })
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream'

    // Set CORS + passthrough headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Content-Type', contentType)

    // If it's an m3u8 playlist, rewrite segment URLs to go through this proxy
    // This is critical — m3u8 files contain relative URLs that break without rewriting
    if (contentType.includes('mpegurl') || url.includes('.m3u8')) {
      const text = await upstream.text()
      const baseUrl = url.substring(0, url.lastIndexOf('/') + 1)

      const rewritten = text.split('\n').map(line => {
        line = line.trim()
        if (!line || line.startsWith('#')) return line

        // Make relative URLs absolute, then route through proxy
        const absoluteUrl = line.startsWith('http') ? line : baseUrl + line
        return `/api/proxy?url=${encodeURIComponent(absoluteUrl)}`
      }).join('\n')

      return res.send(rewritten)
    }

    // For video segments (.ts) and other binary data, pipe directly
    const reader = upstream.body.getReader()
    const pump = async () => {
      const { done, value } = await reader.read()
      if (done) { res.end(); return }
      res.write(value)
      await pump()
    }

    await pump()

  } catch (err) {
    console.error('Proxy error:', err.message)
    if (!res.headersSent) {
      res.status(502).json({ error: 'Stream unreachable', detail: err.message })
    }
  }
}
