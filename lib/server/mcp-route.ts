import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
type Definitions = Record<
  string,
  { description: string; schema: z.ZodObject<any> }
>;
import { authorizeTool, fail, HttpError } from "@/lib/server/security";
export async function serveMcp(
  request: Request,
  definitions: Definitions,
  execute: (name: string, input: unknown) => unknown,
  name: string,
  token: string | undefined,
) {
  try {
    authorizeTool(request, token ?? "");
    if (
      request.headers.get("host") !==
      new URL(process.env.SITE_ORIGIN ?? "http://127.0.0.1:3300").host
    )
      throw new HttpError(403, "服务主机不允许");
    const server = new McpServer({
      name,
      version: "0.1.0",
    });
    for (const name of Object.keys(definitions)) {
      const definition = definitions[name];
      server.registerTool(
        name,
        {
          description: definition.description,
          inputSchema: definition.schema,
          annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false,
          },
        },
        async (input: Record<string, unknown>) => {
          const result = execute(name, input);
          return {
            content: [{ type: "text" as const, text: JSON.stringify(result) }],
          };
        },
      );
    }
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
      maxRequestBodySize: 65536,
    });
    await server.connect(transport);
    const response = await transport.handleRequest(request);
    if (!response.body) {
      await server.close();
      return response;
    }
    const reader = response.body.getReader();
    return new Response(
      new ReadableStream({
        async pull(controller) {
          try {
            const part = await reader.read();
            if (part.done) {
              controller.close();
              await server.close();
            } else controller.enqueue(part.value);
          } catch (error) {
            controller.error(error);
            await server.close();
          }
        },
        async cancel() {
          await reader.cancel();
          await server.close();
        },
      }),
      { status: response.status, headers: response.headers },
    );
  } catch (error) {
    return fail(error);
  }
}
