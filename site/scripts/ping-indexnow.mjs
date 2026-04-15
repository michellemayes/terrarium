#!/usr/bin/env node
// Submit URLs to the IndexNow API so Bing, Yandex, and Seznam can re-crawl
// updated content immediately. Run this manually after a release, or wire it
// into a Vercel deploy hook.
//
// Usage:
//   node scripts/ping-indexnow.mjs                        # pings the homepage
//   node scripts/ping-indexnow.mjs / /docs /changelog     # pings specific paths
//
// The key file is at site/public/<KEY>.txt and must match KEY below.

const HOST = 'terrarium-viewer.com'
const KEY = '93fca922665f9a6a53b1b1fbd3be573f'
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`
const ENDPOINT = 'https://api.indexnow.org/IndexNow'

const argv = process.argv.slice(2)
const paths = argv.length > 0 ? argv : ['/']
const urlList = paths.map((p) => {
  const path = p.startsWith('/') ? p : `/${p}`
  return `https://${HOST}${path}`
})

const body = {
  host: HOST,
  key: KEY,
  keyLocation: KEY_LOCATION,
  urlList,
}

const res = await fetch(ENDPOINT, {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body),
})

if (res.ok || res.status === 202) {
  console.log(`[indexnow] Submitted ${urlList.length} URL(s):`)
  for (const u of urlList) console.log(`  ${u}`)
  console.log(`[indexnow] Response: ${res.status} ${res.statusText}`)
} else {
  const text = await res.text()
  console.error(
    `[indexnow] Failed: ${res.status} ${res.statusText}\n${text}`,
  )
  process.exit(1)
}
