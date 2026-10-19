import { SiteShell } from "@/components/site-shell";
const sources = [
  [
    "Contoso Chat",
    "https://github.com/Azure-Samples/contoso-chat",
    "MIT",
    "户外商品目录、20 份说明书、虚构客户购买记录与提示词场景参考",
  ],
  [
    "Zola",
    "https://github.com/ibelick/zola",
    "Apache-2.0",
    "聊天组件、输入框、消息、Markdown、滚动与交互原语",
  ],
  [
    "Solid Free",
    "https://github.com/NextJSTemplates/solid-nextjs",
    "MIT",
    "官网 Hero、SectionHeader 与装饰素材",
  ],
  [
    "LangChain ReAct Agent",
    "https://github.com/lhh737/LangChain-ReAct-Agent",
    "MIT",
    "扫地机器人案例参考与公开模拟使用记录",
  ],
];
export default function Page() {
  return (
    <SiteShell>
      <section className="site-section site-container min-h-[70vh]">
        <p className="section-kicker mb-5">开源致谢</p>
        <h1 className="section-title">站在好作品的肩上。</h1>
        <p className="mt-5 text-sm text-waterloo">
          谢谢这些开源项目，让展示与体验可以从一个更好的起点开始。
        </p>
        <div className="mt-10 divide-y divide-stroke">
          {sources.map(([name, url, license, usage]) => (
            <div key={name} className="py-7">
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="text-xl font-semibold text-primary"
              >
                {name} ↗
              </a>
              <p className="mt-3 text-sm text-waterloo">{usage}</p>
              <p className="mt-2 text-xs text-[#949ba9]">
                {license} · 源码仓库内保留完整许可与修改说明。
              </p>
            </div>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
