"use client";
import { useState } from "react";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import {
  categoriesForDemo,
  suggestionPage,
  type SuggestionCategory,
} from "@/lib/suggestions";
export function SuggestedQuestions({
  onSelect,
  disabled = false,
  demo = "robot-assistant",
}: {
  onSelect: (question: string) => void;
  disabled?: boolean;
  demo?: string;
}) {
  const [category, setCategory] = useState<SuggestionCategory>(
    () => categoriesForDemo(demo)[0].key,
  );
  const [page, setPage] = useState(0);
  const questions = suggestionPage(category, page, demo);
  return (
    <section className="w-full max-w-[760px] text-left" aria-label="推荐问题">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-[#788291]">试试这样问</p>
        <button
          type="button"
          disabled={disabled}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-[#8d98a8] hover:bg-[#f3f6fa] hover:text-primary disabled:opacity-40"
          onClick={() => setPage((value) => value + 1)}
        >
          <RefreshCw size={12} />
          换一组
        </button>
      </div>
      <div role="tablist" aria-label="推荐问题分类" className="mb-3 flex gap-1">
        {categoriesForDemo(demo).map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={category === item.key}
            disabled={disabled}
            className={`rounded-full px-3 py-1.5 text-[10px] transition-colors disabled:opacity-40 ${category === item.key ? "bg-[#eaf2ff] text-primary" : "text-[#929baa] hover:bg-[#f5f7fa]"}`}
            onClick={() => {
              setCategory(item.key);
              setPage(0);
            }}
          >
            {item.name}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" aria-live="polite">
        {questions.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(item.question)}
            className="group flex min-h-[64px] items-start gap-2 rounded-xl border border-[#e9edf3] bg-white px-3.5 py-3 text-left text-[11px] leading-5 text-[#778393] transition-colors hover:border-[#bed3f5] hover:bg-[#f8fbff] hover:text-primary disabled:opacity-40"
          >
            <span className="flex-1">{item.question}</span>
            <ArrowUpRight
              size={12}
              className="mt-1 shrink-0 opacity-40 group-hover:opacity-100"
            />
          </button>
        ))}
      </div>
    </section>
  );
}
