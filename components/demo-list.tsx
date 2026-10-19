"use client";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Bot, ChartNoAxesCombined, Sun, Tent, BookOpen, ShoppingBag } from "lucide-react";
import { demos, projectForDemo } from "@/lib/catalog";

const icons = { knowledge: Bot, report: ChartNoAxesCombined, weather: Sun, shopping: Tent, manuals: BookOpen, orders: ShoppingBag };

export function DemoList({ items = demos, compact = false }: {
  items?: readonly (typeof demos)[number][];
  compact?: boolean;
}) {
  const reduced = useReducedMotion();
  return (
    <div className={compact ? "demo-list compact" : "demo-list"}>
      {items.map((demo) => (
        <motion.article key={demo.slug} className="demo-card"
          initial={reduced ? false : { opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: reduced ? 0 : 0.35 }}>
          <div className="demo-card-heading">
            <div>
              <h3>{demo.name}</h3>
              {compact && <p className="demo-compact-description">{demo.features.map((feature) => feature.name).join(" · ")}</p>}
            </div>
            <div className="demo-card-actions">
              <Link href={`/chat/${demo.slug}`} className="primary-button demo-chat-link">开始聊天 <ArrowRight size={15} /></Link>
              <Link href={`/projects/${projectForDemo(demo.slug)!.slug}`} className="demo-card-detail secondary-button"
                aria-label={`查看${demo.name}详情`}>查看详情 <ArrowRight size={14} /></Link>
            </div>
          </div>
          {!compact && <div className="demo-card-features">
            {demo.features.map((feature) => {
              const Icon = icons[feature.key];
              return <div key={feature.key}>
                <Icon size={21} strokeWidth={1.6} className="text-primary" aria-hidden="true" />
                <h4>{feature.name}</h4>
                <p>{feature.description}</p>
              </div>;
            })}
          </div>}
        </motion.article>
      ))}
    </div>
  );
}
