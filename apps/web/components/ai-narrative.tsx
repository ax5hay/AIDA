"use client";

import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@aida/ui";

const mdComponents = {
  p: ({ children }: { children?: ReactNode }) => (
    <p className="mb-2 last:mb-0 leading-relaxed text-zinc-300">{children}</p>
  ),
  ul: ({ children }: { children?: ReactNode }) => (
    <ul className="mb-3 list-disc space-y-1.5 pl-5 text-zinc-300">{children}</ul>
  ),
  ol: ({ children }: { children?: ReactNode }) => (
    <ol className="mb-3 list-decimal space-y-1.5 pl-5 text-zinc-300">{children}</ol>
  ),
  li: ({ children }: { children?: ReactNode }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }: { children?: ReactNode }) => (
    <strong className="font-semibold text-zinc-100">{children}</strong>
  ),
  em: ({ children }: { children?: ReactNode }) => (
    <em className="italic text-zinc-200">{children}</em>
  ),
  h1: ({ children }: { children?: ReactNode }) => (
    <h3 className="mb-2 mt-4 text-base font-semibold text-zinc-100 first:mt-0">{children}</h3>
  ),
  h2: ({ children }: { children?: ReactNode }) => (
    <h3 className="mb-2 mt-4 text-base font-semibold text-zinc-100 first:mt-0">{children}</h3>
  ),
  h3: ({ children }: { children?: ReactNode }) => (
    <h4 className="mb-1.5 mt-3 text-sm font-semibold text-zinc-200 first:mt-0">{children}</h4>
  ),
  pre: ({ children }: { children?: ReactNode }) => (
    <pre className="my-2 overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-[12px] leading-relaxed text-zinc-300">
      {children}
    </pre>
  ),
  code: ({ children, className }: { children?: ReactNode; className?: string }) => {
    if (!className) {
      return (
        <code className="rounded bg-white/[0.08] px-1 py-0.5 font-mono text-[12px] text-cyan-200/90">{children}</code>
      );
    }
    return <code className={className}>{children}</code>;
  },
  blockquote: ({ children }: { children?: ReactNode }) => (
    <blockquote className="my-2 border-l-2 border-zinc-600 pl-3 text-zinc-400">{children}</blockquote>
  ),
  a: ({ href, children }: { href?: string; children?: ReactNode }) => (
    <a href={href} className="text-cyan-400/90 underline hover:text-cyan-300" target="_blank" rel="noreferrer noopener">
      {children}
    </a>
  ),
  hr: () => <hr className="my-4 border-white/10" />,
};

type Props = {
  text: string;
  className?: string;
};

/** Renders model output as Markdown so emphasis and lists display instead of raw markup in a monospace block. */
export function AiNarrative({ text, className }: Props) {
  return (
    <div className={cn("text-sm", className)}>
      <ReactMarkdown components={mdComponents}>{text}</ReactMarkdown>
    </div>
  );
}
