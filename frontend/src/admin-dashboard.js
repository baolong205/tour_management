export function revenueMonths(items, year) {
  return Array.from({ length: 12 }, (_, index) => {
    const period = `${year}-${String(index + 1).padStart(2, '0')}`;
    return (items || []).filter(row => row.period === period).reduce((sum, row) => sum + Number(row.received || 0), 0);
  });
}

export function popularTours(bookings) {
  const groups = new Map();
  for (const booking of bookings) {
    if (['CANCELLED', 'REJECTED', 'EXPIRED'].includes(booking.status)) continue;
    const key = booking.tourId || booking.tourName;
    if (!key) continue;
    const item = groups.get(key) || { id: key, name: booking.tourName, count: 0, total: 0 };
    item.count++;
    item.total += Number(booking.total || 0);
    groups.set(key, item);
  }
  return [...groups.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'vi')).slice(0, 5);
}
