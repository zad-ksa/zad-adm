export function formatDurationArabic(startDateStr?: string | Date | null, endDateStr?: string | Date | null): string {
  if (!startDateStr || !endDateStr) return '';

  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';
  if (start > end) return ''; // Invalid date range

  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'نفس اليوم';
  if (diffDays === 1) return 'يوم واحد';
  if (diffDays === 2) return 'يومين';

  if (diffDays < 7) {
    return `${diffDays} أيام`;
  }

  if (diffDays === 7) return 'أسبوع واحد';
  if (diffDays === 14) return 'أسبوعين';

  const weeks = Math.floor(diffDays / 7);
  const remainingDays = diffDays % 7;

  if (diffDays < 30) {
    if (remainingDays === 0) {
      if (weeks === 2) return 'أسبوعين';
      if (weeks <= 10) return `${weeks} أسابيع`;
      return `${weeks} أسبوع`;
    } else {
      const weeksStr = weeks === 1 ? 'أسبوع' : weeks === 2 ? 'أسبوعين' : weeks <= 10 ? `${weeks} أسابيع` : `${weeks} أسبوع`;
      const daysStr = remainingDays === 1 ? 'يوم' : remainingDays === 2 ? 'يومين' : `${remainingDays} أيام`;
      return `${weeksStr} و ${daysStr}`;
    }
  }

  const months = Math.floor(diffDays / 30);
  const remainingDaysInMonth = diffDays % 30;

  let monthsStr = '';
  if (months === 1) monthsStr = 'شهر';
  else if (months === 2) monthsStr = 'شهرين';
  else if (months <= 10) monthsStr = `${months} أشهر`;
  else monthsStr = `${months} شهر`;

  if (remainingDaysInMonth === 0) {
    return monthsStr;
  }

  const remainingWeeks = Math.floor(remainingDaysInMonth / 7);
  const leftDays = remainingDaysInMonth % 7;

  if (remainingWeeks > 0) {
    const weeksStr = remainingWeeks === 1 ? 'أسبوع' : remainingWeeks === 2 ? 'أسبوعين' : `${remainingWeeks} أسابيع`;
    if (leftDays > 0) {
       const daysStr = leftDays === 1 ? 'يوم' : leftDays === 2 ? 'يومين' : `${leftDays} أيام`;
       return `${monthsStr} و ${weeksStr} و ${daysStr}`;
    }
    return `${monthsStr} و ${weeksStr}`;
  }

  const daysStr = remainingDaysInMonth === 1 ? 'يوم' : remainingDaysInMonth === 2 ? 'يومين' : `${remainingDaysInMonth} أيام`;
  return `${monthsStr} و ${daysStr}`;
}
