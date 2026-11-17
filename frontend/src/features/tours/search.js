export function cleanTourFilter(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}
