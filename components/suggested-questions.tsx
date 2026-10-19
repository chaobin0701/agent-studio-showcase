"use client";
import { useState } from "react";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import { suggestionPage } from "@/lib/suggestions";
export function SuggestedQuestions({
  onSelect,
  disabled = false,
  demo = "robot-assistant",
}: {
  onSelect: (question: string) => void;
  disabled?: boolean;
  demo?: string;
}) {
  const [page, setPage] = useState(0);
  const questions = suggestionPage(page, demo);
  return (
    <section className="w-full max-w-[760px] text-left" aria-label="推荐问题">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#52627a]">试试这样问</p>
        <button
          type="button"
          disabled={disabled}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] font-medium text-[#60718a] hover:bg-[#f3f6fa] hover:text-primary disabled:opacity-40"
          onClick={() => setPage((value) => value + 1)}
        >
          <RefreshCw size={14} />
          换一组
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" aria-live="polite">
        {questions.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(item.question)}
            className="group flex min-h-[82px] items-start gap-2 rounded-xl border border-[#dce5f0] bg-white px-4 py-3.5 text-left text-[14px] leading-6 text-[#3e4d64] transition-colors hover:border-[#a9c9fa] hover:bg-[#f8fbff] hover:text-primary disabled:opacity-50"
          >
            <span className="flex-1">{item.question}</span>
            <ArrowUpRight
              size={15}
              className="mt-1 shrink-0 text-[#91a2b8] group-hover:text-primary"
            />
          </button>
        ))}
      </div>
    </section>
  );
}
