# How to Add Channels to the IPTV App

There are two ways to add channels: **adding a new playlist source** (a whole new language/category) or **adding a single custom channel manually**.

---

## Option 1 — Add a New Playlist Source

This is the most common case. You point the app at an M3U playlist URL and it loads all channels from it automatically.

### Step 1 — Open `pages/api/channels.js`

Find the `PLAYLISTS` object near the top of the file. It looks like this:

```js
export const PLAYLISTS = {
  all:    { label: '🌍 All Channels', group: 'global',   url: '...' },
  hindi:  { label: '🇮🇳 Hindi',       group: 'language', url: '...' },
  movies: { label: '🎥 Movies',       group: 'category', url: '...' },
  // ...
}
```

### Step 2 — Add your new entry

```js
export const PLAYLISTS = {
  // existing entries ...

  my_playlist: {
    label: '🆕 My New Channel Group',   // shown in the sidebar
    group: 'language',                  // 'language', 'category', or 'global'
    url:   'https://example.com/my-channels.m3u',
  },
}
```

**Rules:**
- The key (`my_playlist`) must be unique — no spaces, use underscores
- `group` controls which sidebar tab it appears under:
  - `'language'` → shows in the 🌐 Languages tab
  - `'category'` → shows in the 📂 Categories tab
  - `'global'`   → not shown in either tab (used for "All Channels")
- `url` must point to a valid `.m3u` or `.m3u8` playlist file

### Step 3 — Save and refresh

No restart needed in dev mode. Switch to your new playlist in the sidebar and it will load automatically.

---

## Option 2 — Add a Single Custom Channel

If you have one specific stream URL you want to add (e.g. a local broadcaster or a paid stream), add it to a custom static playlist file.

### Step 1 — Create `public/custom.m3u`

```m3u
#EXTM3U
#EXTINF:-1 tvg-id="MyChannel" tvg-name="My Channel" tvg-logo="https://example.com/logo.png" group-title="Custom",My Channel
https://example.com/stream/live.m3u8

#EXTINF:-1 tvg-id="AnotherChannel" tvg-name="Another Channel" group-title="Custom",Another Channel
https://example.com/stream2/live.m3u8
```

### Step 2 — Add it to `PLAYLISTS` in `pages/api/channels.js`

```js
custom: {
  label: '⭐ My Custom Channels',
  group: 'category',
  url:   '/custom.m3u',   // served from the public/ folder by Next.js
},
```

### Step 3 — Update the proxy if needed

If your stream requires special headers (e.g. a specific `Referer` or `Authorization`), edit `pages/api/proxy.js` and add them:

```js
const upstream = await fetch(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0',
    'Referer':    'https://your-stream-source.com',
    'Authorization': 'Bearer YOUR_TOKEN',   // add if required
  }
})
```

---

## M3U Format Reference

Each channel in an M3U file follows this format:

```
#EXTINF:-1 [attributes],Channel Name
https://stream-url.com/live.m3u8
```

Common attributes:

| Attribute | Description | Example |
|---|---|---|
| `tvg-id` | Unique channel ID | `tvg-id="CNN.us"` |
| `tvg-name` | Channel name | `tvg-name="CNN"` |
| `tvg-logo` | Logo image URL | `tvg-logo="https://..."` |
| `tvg-language` | Language | `tvg-language="English"` |
| `tvg-country` | Country code | `tvg-country="US"` |
| `group-title` | Category shown in filter | `group-title="News"` |

---

## Using iptv-org Playlists

The app is built on top of [iptv-org/iptv](https://github.com/iptv-org/iptv), which provides free public playlists. All URLs follow a predictable pattern:

| Filter type | URL pattern | Example |
|---|---|---|
| All channels | `/index.m3u` | `iptv-org.github.io/iptv/index.m3u` |
| By country | `/countries/{code}.m3u` | `.../countries/us.m3u` |
| By language | `/languages/{code}.m3u` | `.../languages/hin.m3u` |
| By category | `/categories/{name}.m3u` | `.../categories/sports.m3u` |
| By region | `/subdivisions/{code}.m3u` | `.../subdivisions/in-tn.m3u` |

Full list of available playlists: https://github.com/iptv-org/iptv/blob/master/PLAYLISTS.md

**Language codes** (ISO 639-2): `hin` Hindi · `tam` Tamil · `tel` Telugu · `mal` Malayalam · `kan` Kannada · `ben` Bengali · `mar` Marathi · `guj` Gujarati · `pan` Punjabi · `urd` Urdu · `asm` Assamese · `ori` Odia

**Country codes** (ISO 3166-1): `in` India · `us` USA · `gb` UK · `au` Australia · `ca` Canada

---

## Troubleshooting

**Channel appears in list but won't play**
The stream URL may be dead (common with iptv-org links). Try another channel in the same playlist.

**Stream needs a Referer header**
Some streams block requests without the correct `Referer`. Add it in `pages/api/proxy.js` inside the headers object.

**Channel loads but has no logo**
Add a `tvg-logo` attribute in your custom M3U file pointing to a publicly accessible image URL.

**Cache is stale after adding channels**
Restart `npm run dev` to clear the in-memory cache, or wait 6 hours for it to expire automatically.
