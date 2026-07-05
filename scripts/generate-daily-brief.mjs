import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const blogDir = path.join(__dirname, '..', 'src', 'pages', 'blog');
const runMarkerPath = path.join(blogDir, '.last-run.json');
const feedUrl = 'https://news.google.com/rss/search?q=artificial+intelligence&hl=en-US&gl=US&ceid=US:en';

function formatDateParts(date, timeZone = 'America/Chicago') {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function stripHtml(input = '') {
  return input
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fileExists(pathname) {
  try {
    await access(pathname);
    return true;
  } catch {
    return false;
  }
}

const NOISE_FRAGMENTS = [
  'SPDX-License-Identifier',
  'Copyright ',
  'All rights reserved',
  'github.com',
  'google.com',
  'googleapis.com',
  'gstatic.com',
  'schema.org',
  'xmlns:',
];

function looksLikeNoise(text = '') {
  const lower = text.toLowerCase();
  return NOISE_FRAGMENTS.some((fragment) => lower.includes(fragment.toLowerCase()));
}

async function fetchArticleSummary(url, timeoutMs = 8000) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PatronixBot/1.0)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      return '';
    }

    const html = await response.text();
    const text = stripHtml(html);

    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((segment) => {
        const len = segment.length;
        if (len < 60 || len > 500) {
          return false;
        }
        if (looksLikeNoise(segment)) {
          return false;
        }
        return true;
      });

    const unique = [...new Set(sentences)].slice(0, 4).join(' ').trim();
    return unique || '';
  } catch {
    return '';
  }
}

async function parseItems(xml) {
  const itemMatches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];

  return Promise.all(
    itemMatches.map(async (match) => {
      const item = match[1];
      const title = stripHtml((item.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || 'Untitled story');
      const description = stripHtml((item.match(/<description>([\s\S]*?)<\/description>/) || [])[1] || '');
      const link = (item.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || '';
      const source = stripHtml((item.match(/<source[^>]*>([\s\S]*?)<\/source>/) || [])[1] || '');

      const titleNorm = title.trim();
      const descClean = description.trim();
      const isPlaceholder = !descClean || descClean.toLowerCase() === titleNorm.toLowerCase();

      const fetchedText = (isPlaceholder && link) ? await fetchArticleSummary(link) : '';
      const summary = (fetchedText && fetchedText !== titleNorm) ? fetchedText : descClean || titleNorm;

      return {
        title: titleNorm,
        summary,
        link,
        source: stripHtml(source) || (link ? new URL(link).hostname : 'news source'),
      };
    }),
  );
}

async function main() {
  const today = formatDateParts(new Date());
  const fileName = `daily-tech-brief-${today}.md`;
  const targetPath = path.join(blogDir, fileName);

  if (await fileExists(targetPath)) {
    console.log(`Brief already exists for ${today}, updating run marker only.`);
  } else {
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PatronixBot/1.0)',
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
    });

    if (!response.ok) {
      throw new Error(`Feed request failed: ${response.status} ${response.statusText}`);
    }

    const xml = await response.text();
    const items = (await parseItems(xml)).slice(0, 5);

    const briefItems = items.length
      ? items
      : [
          {
            title: 'AI and tech leaders continue to drive product momentum',
            summary: 'The market is showing a steady shift from experimentation toward deployment and measurable business outcomes.',
            source: 'PatronixTech analysis',
          },
        ];

    const body = briefItems
      .map((item, index) => {
        const source = item.source || 'news source';
        return `\n${index + 1}. **${item.title}**  \n   ${item.summary}  \n   *Source: ${source}*`;
      })
      .join('');

    const summary = `The day's stories point to continued momentum around AI deployment, infrastructure investment, and product adoption.`;
    const content = `---\ntitle: Daily Tech Brief\ndate: ${today}\n---\n\n**Date:** ${today}\n\n## Top Technology News\n${body}\n\n## Daily Brief Summary\n\n${summary}\n`;

    await mkdir(blogDir, { recursive: true });
    await writeFile(targetPath, content, 'utf8');
    console.log(`Created ${fileName}`);
  }

  const marker = {
    updatedAt: new Date().toISOString(),
    timezone: 'America/Chicago',
    date: today,
    latestBrief: fileName,
  };

  await mkdir(blogDir, { recursive: true });
  await writeFile(runMarkerPath, `${JSON.stringify(marker, null, 2)}\n`, 'utf8');
  console.log(`Updated run marker ${path.basename(runMarkerPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
