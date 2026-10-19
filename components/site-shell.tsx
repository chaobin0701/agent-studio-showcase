import Link from "next/link";
import { ArrowUpRight, Github, Layers2 } from "lucide-react";
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="brand" aria-label="Agent Studio 首页">
      <span className="brand-icon">
        <Layers2 size={20} strokeWidth={1.8} />
      </span>
      {!compact && "Agent Studio"}
    </Link>
  );
}
export function SiteHeader() {
  return (
    <header className="site-container site-header">
      <Brand />
      <nav className="site-nav" aria-label="主导航">
        <Link className="desktop-only" href="/">首页</Link>
        <a href="https://github.com/chaobin0701/agent-studio" target="_blank" rel="noopener noreferrer" className="site-github-link" aria-label="查看 Agent Studio GitHub 仓库">
          <Github size={17} aria-hidden="true" /><span>GitHub</span>
        </a>
        <Link
          href="/chat"
          className="!text-primary flex items-center gap-1"
        >
          开始体验 <ArrowUpRight size={15} />
        </Link>
      </nav>
    </header>
  );
}
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-container flex flex-wrap items-center justify-between gap-4">
        <span>Agent Studio · 从能力，到可以亲手体验的应用。</span>
        <div className="flex gap-6">
          <Link className="footer-link" href="/projects">全部应用</Link>
          <Link className="footer-link" href="/platform">平台技术实现</Link>
          <Link className="footer-link" href="/credits">
            开源致谢
          </Link>
        </div>
      </div>
    </footer>
  );
}
export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </>
  );
}
