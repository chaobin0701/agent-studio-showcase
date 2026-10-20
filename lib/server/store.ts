import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { HttpError } from "./security";
import { canonicalDemoSlug, relatedDemoSlugs } from "../catalog";

export type Thread = {
  id: string;
  owner: string;
  demo: string;
  persona: string;
  month: string;
  title: string;
  upstream_id: string | null;
  created_at: string;
  updated_at: string;
};
export type Pending = {
  request_id: string;
  thread_id: string;
  body: string;
  state: string;
  error: string | null;
};
let database: DatabaseSync;
export function db() {
  if (!database) {
    const directory = process.env.HUB_DATA_DIR ?? join(process.cwd(), ".data");
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    database = new DatabaseSync(join(directory, "hub.sqlite"));
    database.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS threads (id TEXT PRIMARY KEY, owner TEXT NOT NULL, demo TEXT NOT NULL, persona TEXT NOT NULL, month TEXT NOT NULL, title TEXT NOT NULL, upstream_id TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE INDEX IF NOT EXISTS threads_owner ON threads(owner,demo,updated_at);
      CREATE TABLE IF NOT EXISTS requests (request_id TEXT PRIMARY KEY, thread_id TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE, body TEXT NOT NULL, state TEXT NOT NULL, error TEXT);
    `);
  }
  return database;
}
export function threads(owner: string, demo: string) {
  const aliases = relatedDemoSlugs(demo);
  return db()
    .prepare(
      `SELECT * FROM threads WHERE owner=? AND demo IN (${aliases.map(() => "?").join(",")}) ORDER BY updated_at DESC,rowid DESC LIMIT 100`,
    )
    .all(owner, ...aliases) as Thread[];
}
export function thread(owner: string, id: string, demo?: string) {
  const row = db()
    .prepare("SELECT * FROM threads WHERE owner=? AND id=?")
    .get(owner, id) as Thread | undefined;
  if (!row || (demo && canonicalDemoSlug(row.demo) !== canonicalDemoSlug(demo)))
    throw new HttpError(404, "会话不存在");
  return row;
}
export function createThread(
  owner: string,
  demo: string,
  persona: string,
  month: string,
) {
  const id = randomUUID();
  db()
    .prepare(
      "INSERT INTO threads(id,owner,demo,persona,month,title) VALUES(?,?,?,?,?,?)",
    )
    .run(id, owner, demo, persona, month, "新对话");
  return thread(owner, id);
}
export function pending(id: string) {
  return db()
    .prepare(
      "SELECT * FROM requests WHERE thread_id=? AND state IN ('running','waiting','unknown') ORDER BY rowid DESC LIMIT 1",
    )
    .get(id) as Pending | undefined;
}
export function savedRequest(id: string) {
  return db().prepare("SELECT * FROM requests WHERE request_id=?").get(id) as
    Pending | undefined;
}
export function setUpstream(id: string, upstream: string) {
  db()
    .prepare(
      "UPDATE threads SET upstream_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
    )
    .run(upstream, id);
}
export function setTitle(id: string, title: string) {
  db()
    .prepare(
      "UPDATE threads SET title=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
    )
    .run(title.slice(0, 40), id);
}
export function beginRequest(id: string, requestId: string, body: string) {
  const old = db()
    .prepare("SELECT * FROM requests WHERE request_id=?")
    .get(requestId) as Pending | undefined;
  if (old) {
    if (old.thread_id !== id || old.body !== body)
      throw new HttpError(409, "请求标识已用于其他内容");
    return old;
  }
  if (pending(id))
    throw new HttpError(409, "上一条消息尚未确认完成，请先刷新会话状态");
  db()
    .prepare(
      "INSERT INTO requests(request_id,thread_id,body,state) VALUES(?,?,?,'running')",
    )
    .run(requestId, id, body);
  return null;
}
export function finishRequest(
  id: string,
  state: string,
  error: string | null = null,
) {
  db()
    .prepare("UPDATE requests SET state=?,error=? WHERE request_id=?")
    .run(state, error, id);
}
export function removeThread(id: string) {
  db().prepare("DELETE FROM threads WHERE id=?").run(id);
}
