import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const blogDir = path.join(__dirname, '..', 'src', 'pages', 'blog');
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
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseItems(xml) {
  const itemMatches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];

  return itemMatches.map((match) => {
    const item = match[1];
    const title = stripHtml((item.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || 'Untitled story');
    const description = stripHtml((item.match(/<description>([\s\S]*?)<\/description>/) || [])[1] || '');
    const link = (item.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || '';
    const source = (item.match(/<source[^>]*>([\s\S]*?)<\/source>/) || [])[1] || '';

    return {
      title,
      summary: description || title,
      link,
      source: stripHtml(source) || (link ? new URL(link).hostname : 'news source'),
    };
  });
}

async function fileExists(pathname) {
  try {
    await access(pathname);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const today = formatDateParts(new Date());
  const fileName = `daily-tech-brief-${today}.md`;
  const targetPath = path.join(blogDir, fileName);

  if (await fileExists(targetPath)) {
    console.log(`Brief already exists for ${today}, skipping.`);
    return;
  }

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
  const items = parseItems(xml).slice(0, 5);

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

  const summary = `The day’s stories point to continued momentum around AI deployment, infrastructure investment, and product adoption.`;
  const content = `---\ntitle: Daily Tech Brief\ndate: ${today}\n---\n\n**Date:** ${today}\n\n## Top Technology News\n${body}\n\n## Daily Brief Summary\n\n${summary}\n`;

  await mkdir(blogDir, { recursive: true });
  await writeFile(targetPath, content, 'utf8');
  console.log(`Created ${fileName}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
