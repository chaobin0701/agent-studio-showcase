"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Bot, Tent, X } from "lucide-react";
import { Brand } from "@/components/site-shell";
import { demos } from "@/lib/catalog";

export function ChatEntrance() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const firstChoiceRef = useRef<HTMLAnchorElement>(null);

  function openChoices() {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    firstChoiceRef.current?.focus();
  }

  useEffect(() => {
    openChoices();
  }, []);

  return <div className="chat-entry-shell">
    <header className="chat-entry-header">
      <Brand />
      <Link href="/" className="chat-entry-back"><ArrowLeft size={15} />返回首页</Link>
    </header>
    <main className="chat-entry-main">
      <div className="chat-entry-welcome">
        <span className="chat-entry-mark"><Bot size={25} strokeWidth={1.6} /></span>
        <p className="section-kicker">AGENT STUDIO · APPLICATIONS</p>
        <h1>从一个应用，开始对话。</h1>
        <p>选择想体验的助手，直接进入聊天。</p>
        <button type="button" className="primary-button" onClick={openChoices}>
          选择应用 <ArrowRight size={16} />
        </button>
      </div>
    </main>
    <dialog ref={dialogRef} className="experience-dialog chat-entry-dialog" aria-labelledby="chat-entry-title" aria-describedby="chat-entry-description">
      <div className="chat-entry-dialog-heading">
        <div><p className="section-kicker">开始体验</p><h2 id="chat-entry-title">选择一个应用</h2></div>
        <button type="button" className="icon-button" aria-label="关闭应用选择" onClick={() => dialogRef.current?.close()}><X size={18} /></button>
      </div>
      <p id="chat-entry-description" className="chat-entry-dialog-description">点击任意应用即可开始聊天。</p>
      <div className="chat-entry-options">
        {demos.map((demo, index) => <Link key={demo.slug} ref={index === 0 ? firstChoiceRef : undefined} href={`/chat/${demo.slug}`} className="chat-entry-option">
          <span className="chat-entry-option-icon">{demo.icon === "bot" ? <Bot size={22} /> : <Tent size={22} />}</span>
          <span><strong>{demo.name}</strong><small>{demo.features.map((feature) => feature.name).join(" · ")}</small></span>
          <ArrowRight size={17} className="chat-entry-option-arrow" aria-hidden="true" />
        </Link>)}
      </div>
    </dialog>
  </div>;
}
