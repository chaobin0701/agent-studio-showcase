import { canonicalDemoSlug } from "../catalog";

export function demoConnection(slug = "robot-assistant") {
  if (canonicalDemoSlug(slug) === "contoso-outdoor") {
    return {
      agentId: process.env.AGENT_STUDIO_CONTOSO_AGENT_ID,
      apiKey: process.env.AGENT_STUDIO_CONTOSO_API_KEY,
    };
  }
  return {
    agentId: process.env.AGENT_STUDIO_AGENT_ID ?? "5",
    apiKey: process.env.AGENT_STUDIO_API_KEY,
  };
}
