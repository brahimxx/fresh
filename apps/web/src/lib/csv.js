/**
 * CSV helpers (RFC 4180)
 *
 * Tiny, dependency-free helpers used by the streaming CSV export route
 * handlers under `/api/products/export.csv` and `/api/payments/export.csv`.
 *
 * Rules implemented (RFC 4180):
 *  - `null` and `undefined` serialise as the empty cell `''`.
 *  - Cells that contain `,`, `"`, `\n`, or `\r` are wrapped in double quotes;
 *    any internal `"` is doubled.
 *  - Rows are joined by `,` and terminated with `\r\n`.
 */

/**
 * Serialise a single value as an RFC 4180 CSV cell.
 * @param {unknown} v
 * @returns {string}
 */
export function csvCell(v) {
  if (v == null) return '';
  const s = String(v);
  return /[,"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

/**
 * Serialise an array of values as one CSV row, terminated with CRLF.
 * @param {ReadonlyArray<unknown>} values
 * @returns {string}
 */
export function csvRow(values) {
  return values.map(csvCell).join(',') + '\r\n';
}
