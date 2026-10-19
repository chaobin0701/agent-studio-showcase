// Operator-only helper. Never imported by the site, build or tests.
export async function platformAdmin() {
  process.loadEnvFile(".env.local");
  const password = process.env.DEMO_ADMIN_PASSWORD;
  if (!password)
    throw new Error("Set DEMO_ADMIN_PASSWORD for this operator process.");
  const base = process.env.AGENT_STUDIO_BASE_URL ?? "http://127.0.0.1:3020/api";
  const response = await fetch(base + "/admin/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: process.env.DEMO_ADMIN_LOGIN ?? "chaobin",
      password,
    }),
  });
  if (!response.ok) throw new Error(`Admin login failed: ${response.status}`);
  const { accessToken } = await response.json();
  return async function api(path: string, method = "GET", body?: unknown) {
    const multipart = body instanceof FormData;
    const result = await fetch(base + "/admin" + path, {
      method,
      headers: {
        authorization: `Bearer ${accessToken}`,
        "X-Workspace-Id": process.env.DEMO_WORKSPACE_ID ?? "4",
        ...(!multipart ? { "content-type": "application/json" } : {}),
      },
      ...(body !== undefined
        ? { body: multipart ? body : JSON.stringify(body) }
        : {}),
      signal: AbortSignal.timeout(120000),
    });
    const payload = await result.json();
    if (!result.ok)
      throw new Error(
        `${method} ${path}: ${result.status}: ${payload.message ?? payload.error?.message ?? "request failed"}`,
      );
    return payload;
  };
}
