import { env } from '../config/env.js';

function sleep(durationMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function stripTags(value) {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function searchDuckDuckGoFallback({ query, location, limit = 5, fetchImpl = fetch }) {
  await sleep(1000 + Math.random() * 2000);

  const searchQuery = [query, location, 'jobs'].filter(Boolean).join(' ');
  const fallbackUrl = new URL(env.duckDuckGoHtmlUrl);
  fallbackUrl.searchParams.set('q', searchQuery);
  const response = await fetchImpl(fallbackUrl, {
    headers: {
      Accept: 'text/html',
      'User-Agent': 'Aptico/1.0'
    }
  });

  if (!response.ok) {
    throw new Error(`DuckDuckGo fallback failed with status ${response.status}`);
  }

  const html = await response.text();
  const matches = [...html.matchAll(/<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];

  return matches.slice(0, limit).map((match, index) => {
    const title = stripTags(decodeHtml(match[2])) || 'DuckDuckGo result';
    const url = decodeHtml(match[1]);

    return {
      id: `ddgs-${index}-${Buffer.from(url).toString('base64').slice(0, 12)}`,
      title,
      company: 'Discovered via DuckDuckGo',
      location: location || 'Unknown',
      jobType: 'Unknown',
      stipend: null,
      description: 'Fallback search result discovered through DuckDuckGo.',
      source: 'DuckDuckGo',
      sourceKey: 'duckduckgo',
      url,
      postedAt: null
    };
  });
}
