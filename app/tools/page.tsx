import { redirect } from "next/navigation";

// Domain HTTP/MCP endpoints remain independent of the removed visitor page.
export default function Page() {
  redirect("/projects");
}
