"use client";

// Adapted from Solid Free Hero, MIT, NextJSTemplates; Agent Studio presentation.
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const slides = [
  { id: "architecture", image: "/images/studio/architecture-ai-v2.png", alt: "Agent Studio 系统架构：管理后台、聊天接入端经 NestJS API 连接 Deep Agents 执行器、异步 Worker、模型服务、PostgreSQL 与 HTTP/MCP 外部服务。" },
  { id: "execution", image: "/images/studio/execution-ai.png", alt: "Agent Studio 对话链路：鉴权与发布快照、Deep Agents 决策、按需检索与调用工具，通过 SSE 返回答案、引用和公开过程。" },
  { id: "knowledge-pipeline", image: "/images/studio/knowledge-pipeline-ai.png", alt: "Agent Studio 知识链路：文档上传、Worker 解析分块、全文与 pgvector 向量索引，经全文、向量或混合检索及排名融合提供上下文。" },
] as const;

export default function Hero() {
  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion();
  const slide = slides[index];
  function select(direction: number) { setIndex((current) => (current + direction + slides.length) % slides.length); }
  return (
    <section className="studio-hero">
      <div className="site-container studio-hero-inner">
        <motion.div className="studio-hero-copy" initial={reduced ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : 0.55 }}>
          <p className="section-kicker mb-5">智能体开发与管理平台</p>
          <h1>Agent Studio<span>.</span></h1>
          <h2>把智能体的能力，<br />变成触手可及的体验。</h2>
          <p className="studio-hero-description">从提示词、知识库到工具调用，<br />在一个后台管理，在真实场景中体验。</p>
          <div className="studio-hero-actions">
            <Link href="/#demos" className="primary-button">开始体验 <ArrowRight size={16} /></Link>
            <Link href="/projects/agent-studio" className="secondary-button">了解平台 <ArrowRight size={16} /></Link>
          </div>
        </motion.div>
        <motion.div className="studio-showcase" initial={reduced ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : 0.6, delay: reduced ? 0 : 0.1 }}>
          <div className="studio-architecture-carousel" role="region" aria-roledescription="轮播"
            aria-label="Agent Studio 架构图，左右拖动或使用方向键切换" tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                event.preventDefault(); select(event.key === "ArrowRight" ? 1 : -1);
              }
            }}>
            <AnimatePresence initial={false} mode="wait">
              <motion.div key={slide.id} className="studio-architecture-slide"
                drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.15} dragSnapToOrigin
                onDragEnd={(_, info) => { if (Math.abs(info.offset.x) > 45) select(info.offset.x < 0 ? 1 : -1); }}
                initial={reduced ? false : { opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: reduced ? 0 : -18 }} transition={{ duration: reduced ? 0 : 0.18 }}
                role="group" aria-roledescription="幻灯片" aria-label={`第 ${index + 1} 张，共 ${slides.length} 张`}>
                <Image src={slide.image} alt={slide.alt} width={1448} height={1086} draggable={false}
                  sizes="(min-width: 1280px) 640px, (min-width: 768px) 54vw, 100vw"
                  loading="eager" className="studio-architecture-image" />
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
