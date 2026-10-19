export type AgentEvent = { event: string; data: Record<string, unknown> };
export function sseParser(onEvent: (event: AgentEvent) => void) {
  let buffer = "";
  const decoder = new TextDecoder();
  function dispatch(block: string) {
    let event = "message";
    const data: string[] = [];
    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
    }
    if (data.length) onEvent({ event, data: JSON.parse(data.join("\n")) });
  }
  function drain() {
    let match: RegExpExecArray | null;
    while ((match = /\r?\n\r?\n/.exec(buffer))) {
      dispatch(buffer.slice(0, match.index));
      buffer = buffer.slice(match.index + match[0].length);
    }
  }
  return {
    push(chunk: Uint8Array) {
      buffer += decoder.decode(chunk, { stream: true });
      drain();
      if (buffer.length > 4 * 1024 * 1024) throw new Error("event_too_large");
    },
    end() {
      buffer += decoder.decode();
      drain();
      if (buffer.trim()) dispatch(buffer);
      buffer = "";
    },
  };
}
