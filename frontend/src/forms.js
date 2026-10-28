export function buildFormBody(data, fields) {
  return Object.fromEntries(fields.filter(field => {
    const value = data.get(field.name);
    return value !== null && (value !== '' || ['phone', 'description', 'comment', 'summary'].includes(field.name));
  }).map(field => {
    const value = data.get(field.name);
    return [field.name, field.type === 'number' ? Number(value) : field.type === 'json' ? JSON.parse(value) : field.type === 'boolean' ? value === 'true' : value];
  }));
}