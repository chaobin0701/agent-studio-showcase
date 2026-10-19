import { z } from "zod";
import { contosoToolDefinitions } from "@/lib/contoso/tools";
export function GET() {
  return Response.json({
    openapi: "3.1.0",
    info: { title: "Contoso Outdoor 模拟商品与购买记录", version: "1.0.0" },
    servers: [{ url: process.env.SITE_ORIGIN ?? "http://127.0.0.1:3300" }],
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: { bearerAuth: { type: "http", scheme: "bearer" } },
    },
    paths: Object.fromEntries(
      Object.entries(contosoToolDefinitions).map(([name, definition]) => {
        const schema = z.toJSONSchema(definition.schema);
        return [
          `/api/contoso/tools/${name}`,
          {
            get: {
              operationId: name,
              description: definition.description,
              parameters: Object.entries(schema.properties ?? {}).map(
                ([key, value]) => ({
                  in: "query",
                  name: key,
                  required: schema.required?.includes(key) ?? false,
                  schema: value,
                }),
              ),
              responses: {
                "200": { description: "只读模拟数据结果" },
                "400": { description: "参数无效" },
                "401": { description: "需要有效凭证" },
              },
            },
          },
        ];
      }),
    ),
  });
}
