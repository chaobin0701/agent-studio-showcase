"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function Hero() {
  const reduced = useReducedMotion();

  return <section className="studio-hero studio-hero-image-led">
    <div className="site-container studio-hero-inner">
      <motion.div className="studio-hero-copy"
        initial={reduced ? false : { opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0 : 0.55 }}>
        <p className="section-kicker mb-5">开源 · 通用 Agent 构建与运行平台</p>
        <h1>Agent Studio<span>.</span></h1>
        <h2>让 Agent 从配置走到运行。</h2>
        <p className="studio-hero-description">统一管理模型、Prompt、Skill、知识库与工具。发布固定版本，经 Deep Agents 执行，并留下可追踪的结果。</p>
        <div className="studio-hero-actions">
          <Link href="/#demos" className="primary-button">体验应用 <ArrowRight size={16} /></Link>
          <Link href="/#highlights" className="secondary-button">了解平台 <ArrowRight size={16} /></Link>
        </div>
      </motion.div>
      <motion.div className="studio-hero-media"
        initial={reduced ? false : { opacity: 0, x: 22 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: reduced ? 0 : 0.65, delay: 0.12 }}>
        <picture>
          <source media="(max-width: 767px)" srcSet="/images/studio/studio-workspace-mobile-ai.png" />
          <Image src="/images/studio/studio-workspace-ai.png" alt="Agent 工作台示意：请求经过 Agent，连接知识、工具和模型后输出结果" width={1584} height={992} sizes="(min-width: 1200px) 660px, (min-width: 768px) 52vw, 100vw" priority />
        </picture>
      </motion.div>
    </div>
  </section>;
}
