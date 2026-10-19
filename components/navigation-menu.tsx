"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Bot, Check, ChevronDown, Tent, X } from "lucide-react";
import { demos, projects, type DemoSlug } from "@/lib/catalog";

function NavigationMenu({ label, children, disabled = false, className = "", openOnHover = false }: {
  label: ReactNode;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
  openOnHover?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return (
    <div ref={root} className={`navigation-menu ${className}`}
      onPointerEnter={(event) => {
        if (openOnHover && !disabled && event.pointerType === "mouse") setOpen(true);
      }}
      onPointerLeave={(event) => {
        if (openOnHover && event.pointerType === "mouse" && !root.current?.contains(document.activeElement)) setOpen(false);
      }}
      onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null) &&
        (!openOnHover || !event.currentTarget.matches(":hover"))) setOpen(false);
    }}>
      <button ref={trigger} type="button" className="navigation-trigger" disabled={disabled}
        aria-expanded={open && !disabled} aria-controls={id} onClick={(event) => {
          const mouseClick = event.detail > 0 && (event.nativeEvent as PointerEvent).pointerType === "mouse";
          setOpen(openOnHover && mouseClick ? true : !open);
        }}>
        {label}<ChevronDown size={14} className={open ? "rotate-180" : ""} aria-hidden="true" />
      </button>
      {open && !disabled && <div id={id} className="navigation-popover" onClick={(event) => {
        if ((event.target as HTMLElement).closest("a")) setOpen(false);
      }}>{children}</div>}
    </div>
  );
}

export function ProjectNavigation() {
  return (
    <NavigationMenu label="应用" className="project-navigation" openOnHover>
      <p className="navigation-caption">探索应用</p>
      {projects.map((project) => (
        <Link key={project.slug} href={`/projects/${project.slug}`} className="navigation-option">
          <span className="navigation-option-icon">{project.slug === "robot-lab" ? <Bot size={18} /> : <Tent size={18} />}</span>
          <span><strong>{project.name}</strong><small>{project.label}</small></span>
        </Link>
      ))}
      <Link href="/projects" className="navigation-overview">查看全部项目 <span aria-hidden="true">→</span></Link>
    </NavigationMenu>
  );
}

export function DemoSwitcher({ current, disabled }: { current: DemoSlug; disabled: boolean }) {
  const demo = demos.find((item) => item.slug === current)!;
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    else if (!open && dialog.current?.open) dialog.current.close();
  }, [open]);
  return (
    <>
      <button type="button" className="chat-experience-trigger" disabled={disabled}
        aria-label={`切换体验：${demo.name}`} aria-haspopup="dialog" aria-expanded={open}
        aria-controls={id} onClick={() => setOpen(true)}>
        <span className="truncate">{demo.name}</span>
        <ChevronDown size={17} aria-hidden="true" />
      </button>
      <dialog ref={dialog} id={id} className="experience-dialog" aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`} onCancel={() => setOpen(false)} onClose={() => setOpen(false)}
        onClick={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          if (event.target === event.currentTarget &&
            (event.clientX < bounds.left || event.clientX > bounds.right ||
              event.clientY < bounds.top || event.clientY > bounds.bottom)) setOpen(false);
        }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={`${id}-title`} className="text-xl font-semibold tracking-tight">切换体验</h2>
            <p id={`${id}-description`} className="mt-2 text-xs leading-6 text-waterloo">选择一个助手，继续探索。各自保留对话与草稿。</p>
          </div>
          <button type="button" className="icon-button -mr-1 -mt-1" aria-label="关闭体验切换"
            onClick={() => setOpen(false)}><X size={18} /></button>
        </div>
        <div className="mt-5 space-y-2">
          {demos.map((item) => {
            const content = <>
              <span className="navigation-option-icon">{item.icon === "bot" ? <Bot size={21} /> : <Tent size={21} />}</span>
              <span className="min-w-0 flex-1 text-left"><strong>{item.name}</strong><small>{item.features.map((feature) => feature.name).join(" · ")}</small></span>
              {item.slug === current && <Check size={18} className="shrink-0 text-primary" aria-label="当前体验" />}
            </>;
            return item.slug === current ? (
              <button key={item.slug} type="button" className="navigation-option experience-option" aria-current="true"
                onClick={() => setOpen(false)}>{content}</button>
            ) : (
              <Link key={item.slug} href={`/chat/${item.slug}`} className="navigation-option experience-option"
                onClick={() => setOpen(false)}>{content}</Link>
            );
          })}
        </div>
      </dialog>
    </>
  );
}
