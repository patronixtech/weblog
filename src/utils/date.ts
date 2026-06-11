export function getSortTime(dateInput: string | Date | undefined) {
  if (!dateInput) return 0;

  if (dateInput instanceof Date) {
    return Date.UTC(dateInput.getUTCFullYear(), dateInput.getUTCMonth(), dateInput.getUTCDate());
  }

  const [year, month, day] = String(dateInput).split('-').map(Number);
  if (!year || !month || !day) return 0;
  return Date.UTC(year, month - 1, day);
}

export function formatDate(dateInput: string | Date | undefined) {
  if (!dateInput) return '';

  if (dateInput instanceof Date) {
    return dateInput.toLocaleDateString('en', {
      timeZone: 'UTC',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  const [year, month, day] = String(dateInput).split('-').map(Number);
  if (!year || !month || !day) return '';

  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
