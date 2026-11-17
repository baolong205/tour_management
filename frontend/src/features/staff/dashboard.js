export function vietnamToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function bookingChart(items, year) {
  const months = Array(12).fill(0);
  const statuses = {};
  for (const item of items) {
    statuses[item.status] = (statuses[item.status] || 0) + 1;
    const created = String(item.createdAt || '').slice(0, 10);
    if (created.startsWith(`${year}-`)) {
      const month = Number(created.slice(5, 7));
      if (month >= 1 && month <= 12) months[month - 1]++;
    }
  }
  return { months, statuses };
}

export function bookingLink(id) {
  return `#/staff?tab=bookings&booking=${encodeURIComponent(id)}`;
}