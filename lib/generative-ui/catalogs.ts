import current from "./catalog.json";
import initial from "./catalogs/initial.json";
import { validTree } from "./definitions";
import type { UiBlock } from "./blocks";

/** Retain catalogs already used by historical conversations. */
const catalogs = new Map<string, { components: Record<string, unknown> }>([[initial.version, initial], [current.version, current]]);
export function supportedBlock(block: UiBlock): boolean {
  const catalog = catalogs.get(block.catalogVersion);
  if (block.protocolVersion !== 1 || block.adapter !== "assistant-ui" || !catalog || !validTree(block.tree)) return false;
  const visit = (value: unknown): boolean => {
    if (typeof value === "string" || value === undefined) return true;
    if (Array.isArray(value)) return value.every(visit);
    const node = value as Record<string, unknown>;
    return Object.hasOwn(catalog.components, node._type as string) && visit(node.children);
  };
  return visit(block.tree);
}
