/** Preserve the frozen baseline while using JSON defaults accepted by MySQL 8 and TiDB 8. */
export function compatibleBaselineSql(sql: string): string {
  return sql.replaceAll("json NOT NULL DEFAULT ('[]')", 'json NOT NULL DEFAULT (JSON_ARRAY())');
}