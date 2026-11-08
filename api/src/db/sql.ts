/**
 * Split a SQL file into individual statements.
 *
 * Why this exists: some drivers (PGlite's `exec`, for one) split on every
 * semicolon they can see, including the ones inside a dollar-quoted function
 * body:
 *
 *   create function f() returns trigger as $$ begin ...; end; $$;
 *                       ^ this semicolon breaks it
 *
 * A split on that semicolon sends half a function body to the server as if
 * it were a statement, and Postgres replies "syntax error at or near ...".
 *
 * This splitter understands the four things that can hide a semicolon:
 *   - 'single quoted' strings      (with '' escapes)
 *   - "double quoted" identifiers  (with "" escapes)
 *   - $tag$ ... $tag$ dollar quotes (with any tag)
 *   - -- line comments and /* block comments
 */

export function splitStatements(sql: string): string[] {
  const statements: string[] = [];

  let current = '';
  let index = 0;

  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;
  let inBlockComment = false;
  let dollarTag: string | null = null;

  const len = sql.length;

  while (index < len) {
    const char = sql[index];
    const next = sql[index + 1];

    // ---- dollar-quoted block: $tag$ ... $tag$ -------------------------
    if (dollarTag) {
      if (sql.startsWith(dollarTag, index)) {
        current += dollarTag;
        index += dollarTag.length;
        dollarTag = null;
        continue;
      }
      current += char;
      index += 1;
      continue;
    }

    // ---- line comment --------------------------------------------------
    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false;
        current += char;
      }
      index += 1;
      continue;
    }

    // ---- block comment -------------------------------------------------
    if (inBlockComment) {
      if (char === '*' && next === '/') {
        inBlockComment = false;
        index += 2;
        continue;
      }
      // Comment text is discarded — a `;` inside it must not split anything.
      index += 1;
      continue;
    }

    // ---- single-quoted string ------------------------------------------
    if (inSingle) {
      current += char;
      if (char === "'") {
        if (next === "'") {
          current += next;
          index += 2;
          continue;
        }
        inSingle = false;
      }
      index += 1;
      continue;
    }

    // ---- double-quoted identifier ---------------------------------------
    if (inDouble) {
      current += char;
      if (char === '"') {
        if (next === '"') {
          current += next;
          index += 2;
          continue;
        }
        inDouble = false;
      }
      index += 1;
      continue;
    }

    // ---- normal state ---------------------------------------------------
    if (char === '-' && next === '-') {
      inLineComment = true;
      index += 2;
      continue;
    }

    if (char === '/' && next === '*') {
      inBlockComment = true;
      index += 2;
      continue;
    }

    if (char === "'") {
      inSingle = true;
      current += char;
      index += 1;
      continue;
    }

    if (char === '"') {
      inDouble = true;
      current += char;
      index += 1;
      continue;
    }

    // A dollar quote is `$tag$` where tag is optional and word-like.
    if (char === '$') {
      const match = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(index));
      if (match) {
        dollarTag = match[0];
        current += dollarTag;
        index += dollarTag.length;
        continue;
      }
    }

    if (char === ';') {
      const trimmed = current.trim();
      if (trimmed) statements.push(trimmed);
      current = '';
      index += 1;
      continue;
    }

    current += char;
    index += 1;
  }

  const tail = current.trim();
  if (tail) statements.push(tail);

  return statements;
}
