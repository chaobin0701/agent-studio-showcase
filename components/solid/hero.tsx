"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { PointerEvent } from "react";

function tiltTowardPointer(event: PointerEvent<HTMLDivElement>) {
  if (event.pointerType !== "mouse") return;
  const surface = event.currentTarget;
  const bounds = (surface.parentElement ?? surface).getBoundingClientRect();
  const x = (event.clientX - bounds.left) / bounds.width - 0.5;
  const y = (event.clientY - bounds.top) / bounds.height - 0.5;
  surface.style.setProperty("--tilt-x", `${(-y * 7).toFixed(2)}deg`);
  surface.style.setProperty("--tilt-y", `${(x * 10).toFixed(2)}deg`);
}

function resetTilt(event: PointerEvent<HTMLDivElement>) {
  const surface = event.currentTarget;
  surface.style.removeProperty("--tilt-x");
  surface.style.removeProperty("--tilt-y");
}

export default function Hero() {
  const reduced = useReducedMotion();

  return <section className="studio-hero studio-hero-image-led">
    <div className="site-container studio-hero-inner">
      <motion.div className="studio-hero-copy"
        initial={reduced ? false : { opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0 : 0.55 }}>
        <h1>Agent Studio<span>.</span></h1>
        <h2>基于 LangChain 的通用 Agent 构建平台。</h2>
        <p className="studio-hero-description">以 Deep Agents / LangGraph 为执行核心，统一管理模型、Prompt、Skill、知识库与工具；发布后可通过聊天或 API 运行，并追踪每次执行。</p>
        <div className="studio-hero-actions">
          <Link href="/#demos" className="primary-button">体验应用 <ArrowRight size={16} /></Link>
        </div>
      </motion.div>
      <motion.div className="studio-hero-media-motion"
        initial={reduced ? false : { opacity: 0, x: 22 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: reduced ? 0 : 0.65, delay: 0.12 }}>
        <div className="studio-hero-media" onPointerMove={tiltTowardPointer} onPointerLeave={resetTilt}><picture>
            <source media="(max-width: 767px)" srcSet="/images/studio/studio-workspace-mobile-ai.png" />
            <Image src="/images/studio/studio-workspace-ai.png" alt="Agent Studio 管理后台示意：请求经过 Agent，连接知识、工具和模型后输出结果" width={1584} height={992} sizes="(min-width: 1200px) 660px, (min-width: 768px) 52vw, 100vw" priority />
          </picture></div>
      </motion.div>
    </div>
  </section>;
}
