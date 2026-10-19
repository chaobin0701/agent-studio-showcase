"use client";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Bot, Tent } from "lucide-react";
import { demos, projectForDemo } from "@/lib/catalog";

export function DemoList({ items = demos }: {
  items?: readonly (typeof demos)[number][];
}) {
  const reduced = useReducedMotion();
  return (
    <div className="demo-list">
      {items.map((demo, index) => (
        <motion.article key={demo.slug} className="demo-card"
          initial={reduced ? false : { opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: reduced ? 0 : 0.35 }}>
          <div className="demo-card-top"><span>{String(index + 1).padStart(2, "0")} / LLM APPLICATION</span><span className="demo-card-icon" aria-hidden="true">{demo.icon === "bot" ? <Bot size={20} strokeWidth={1.8} /> : <Tent size={20} strokeWidth={1.8} />}</span></div>
          <div className="demo-card-image"><Image src={demo.icon === "bot" ? "/images/applications/robot-home-ai.png" : "/images/applications/outdoor-camp-ai.png"} alt={demo.icon === "bot" ? "居家场景中的扫地机器人" : "湖畔营地的帐篷与户外装备"} fill sizes="(min-width: 1100px) 370px, (min-width: 768px) 45vw, 100vw" /></div>
          <div className="demo-card-body">
            <h3>{demo.name}</h3>
            <p>{demo.detail}</p>
          </div>
          <p className="demo-card-capabilities">{demo.features.map((feature) => feature.name).join(" · ")}</p>
          <div className="demo-card-actions">
            <Link href={`/chat/${demo.slug}`} className="primary-button demo-chat-link">开始聊天 <ArrowRight size={15} /></Link>
            <Link href={`/projects/${projectForDemo(demo.slug)!.slug}`} className="demo-card-detail secondary-button"
              aria-label={`查看${demo.name}详情`}>查看详情 <ArrowRight size={14} /></Link>
          </div>
        </motion.article>
      ))}
    </div>
  );
}
