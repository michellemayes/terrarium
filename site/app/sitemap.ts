import type { MetadataRoute } from 'next'

const SITE_URL = 'https://terrarium-viewer.com'

const routes: {
  path: string
  priority: number
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
}[] = [
  { path: '', priority: 1.0, changeFrequency: 'monthly' },
  { path: '/docs', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/docs/getting-started', priority: 0.8, changeFrequency: 'monthly' },
  {
    path: '/docs/using-with-claude-code',
    priority: 0.8,
    changeFrequency: 'monthly',
  },
  { path: '/docs/troubleshooting', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/changelog', priority: 0.7, changeFrequency: 'weekly' },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  return routes.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }))
}
