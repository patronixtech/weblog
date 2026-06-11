export function getExcerpt(markdown: string | undefined, fallback = 'A concise roundup of the day’s most relevant technology and AI stories.') {
  if (!markdown) return fallback;

  const cleaned = String(markdown)
    .replace(/^---[\s\S]*?---/m, '')
    .replace(/[#>*_`\-]/g, ' ')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  const paragraph = cleaned
    .split(/\n\n+/)
    .map((segment) => segment.trim())
    .find(Boolean);

  if (!paragraph) return fallback;

  return paragraph.length > 140 ? `${paragraph.slice(0, 137)}...` : paragraph;
}
