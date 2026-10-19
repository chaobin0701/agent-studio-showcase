import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function fail(error: unknown) {
  if (error instanceof HttpError)
    return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof SyntaxError)
    return Response.json({ error: "请求格式错误" }, { status: 400 });
  console.error(
    "Request failed:",
    error instanceof Error ? error.name : "unknown",
  );
  return Response.json(
    { error: "请求暂时无法完成，请稍后重试。" },
    { status: 500 },
  );
}
export function equal(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
function signature(id: string) {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)
    throw new Error("SESSION_SECRET_missing");
  return createHmac("sha256", process.env.SESSION_SECRET)
    .update(id)
    .digest("hex");
}
export function verifyVisitor(value: string | undefined) {
  if (!value) return null;
  const [id, sig, extra] = value.split(".");
  return !extra &&
    /^[a-f0-9-]{36}$/.test(id ?? "") &&
    equal(sig ?? "", signature(id))
    ? id
    : null;
}
export async function visitor() {
  const jar = await cookies();
  const existing = verifyVisitor(jar.get("hub_visitor")?.value);
  if (existing) return existing;
  const id = randomUUID();
  jar.set("hub_visitor", `${id}.${signature(id)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.SITE_ORIGIN?.startsWith("https:"),
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return id;
}
export function sameOrigin(request: Request) {
  const allowed = process.env.SITE_ORIGIN ?? "http://127.0.0.1:3300";
  if (request.headers.get("origin") !== allowed)
    throw new HttpError(403, "请求来源不允许");
}
export function authorizeTool(
  request: Request,
  token = process.env.TOOL_API_TOKEN,
) {
  if (
    !token ||
    !equal(request.headers.get("authorization") ?? "", `Bearer ${token}`)
  )
    throw new HttpError(401, "工具服务需要有效凭证");
  const origin = request.headers.get("origin");
  if (origin && origin !== process.env.SITE_ORIGIN)
    throw new HttpError(403, "请求来源不允许");
}
