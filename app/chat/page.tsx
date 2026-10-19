import type { Metadata } from "next";
import { ChatEntrance } from "@/components/chat-entrance";

export const metadata: Metadata = { title: "选择聊天应用" };

export default function Page() {
  return <ChatEntrance />;
}
