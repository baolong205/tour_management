export function buildFormBody(data, fields) {
  return Object.fromEntries(fields.filter(field => {
    const value = data.get(field.name);
    return value !== null && (value !== '' || field.nullable || ['phone', 'description', 'comment', 'summary'].includes(field.name));
  }).map(field => {
    const value = data.get(field.name);
    return [field.name, value === '' && field.nullable ? null : field.type === 'number' ? Number(value) : field.type === 'json' ? JSON.parse(value) : field.type === 'boolean' ? value === 'true' : field.type === 'datetime-local' ? new Date(value).toISOString() : value];
  }));
}

export function localDateTimeInput(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
