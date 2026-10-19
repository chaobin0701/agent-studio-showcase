import { redirect } from "next/navigation";

// Keep existing bookmarks usable while consolidating the visitor entry points.
export default function Page() {
  redirect("/#demos");
}
