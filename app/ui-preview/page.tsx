import type { Metadata } from "next";
import { GenerativeUiPreview } from "@/components/generative-ui-preview";
export const metadata: Metadata = { title: "生成式 UI 组件预览", robots: { index: false } };
export default function Page() { return <GenerativeUiPreview />; }
