import { z } from "zod";
import { toolDefinitions } from "@/lib/robot/tools";
export function GET() {
  return Response.json({
    openapi: "3.1.0",
    info: {
      title: "Demo Hub Robot Tools",
      version: "0.1.0",
      description:
        "公开模拟用户、2025 月度使用记录与固定天气样本。所有工具只读。",
    },
    servers: [{ url: process.env.SITE_ORIGIN ?? "http://127.0.0.1:3300" }],
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: { bearerAuth: { type: "http", scheme: "bearer" } },
    },
    paths: Object.fromEntries(
      Object.entries(toolDefinitions).map(([name, definition]) => [
        `/api/tools/${name}`,
        {
          get: {
            operationId: name,
            description: definition.description,
            parameters: Object.entries(
              z.toJSONSchema(definition.schema).properties ?? {},
            ).map(([key, schema]) => ({
              in: "query",
              name: key,
              required: true,
              schema,
            })),
            responses: {
              "200": { description: "工具结果" },
              "400": { description: "参数无效" },
              "401": { description: "凭证无效" },
            },
          },
        },
      ]),
    ),
  });
}
