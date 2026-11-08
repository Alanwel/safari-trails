import { describe, expect, it } from 'vitest';

import { splitStatements } from '../src/db/sql.js';

describe('splitStatements', () => {
  it('splits plain statements', () => {
    const result = splitStatements('select 1; select 2;');
    expect(result).toEqual(['select 1', 'select 2']);
  });

  it('ignores semicolons inside single quotes', () => {
    const result = splitStatements("insert into t values ('a;b'); select 1;");
    expect(result).toEqual(["insert into t values ('a;b')", 'select 1']);
  });

  it('handles doubled quotes inside strings', () => {
    const result = splitStatements("select 'it''s; fine'; select 2;");
    expect(result).toEqual(["select 'it''s; fine'", 'select 2']);
  });

  it('ignores semicolons inside double-quoted identifiers', () => {
    const result = splitStatements('select "we;ird" from t;');
    expect(result).toEqual(['select "we;ird" from t']);
  });

  it('keeps dollar-quoted function bodies intact', () => {
    const sql = `create function f() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$;`;
    const result = splitStatements(sql);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('new.updated_at = now();');
  });

  it('handles tagged dollar quotes', () => {
    const sql = `do $tag$ begin raise notice 'x;y'; end $tag$; select 1;`;
    const result = splitStatements(sql);
    expect(result).toHaveLength(2);
    expect(result[0]).toContain('$tag$');
  });

  it('strips line comments', () => {
    const result = splitStatements('-- a comment; with a semicolon\nselect 1;');
    expect(result).toEqual(['select 1']);
  });

  it('strips block comments', () => {
    const result = splitStatements('/* a; comment */ select 1;');
    expect(result).toEqual(['select 1']);
  });

  it('keeps a trailing statement without a semicolon', () => {
    expect(splitStatements('select 1; select 2')).toEqual(['select 1', 'select 2']);
  });

  it('returns nothing for an empty file', () => {
    expect(splitStatements('\n\n   \n')).toEqual([]);
  });
});
