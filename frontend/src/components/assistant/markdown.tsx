"use client";

import { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { SECTION_IDS } from "@/lib/agent/actions";
import type { SectionId } from "@/lib/api/types";
import { scrollToSection } from "@/lib/scroll";

/**
 * Assistant answers as GitHub-flavoured markdown. Raw HTML is never rendered (react-markdown
 * ignores it without rehype-raw), unsafe URL schemes are stripped by its default urlTransform,
 * external links open in a new tab, and in-page anchors (#portfolio…) scroll smoothly.
 */
const components: Components = {
  a: ({ href = "", children }) => {
    const section = href.startsWith("#") ? href.slice(1) : null;
    if (section && (SECTION_IDS as readonly string[]).includes(section)) {
      return (
        <a
          href={href}
          onClick={(event) => {
            event.preventDefault();
            void scrollToSection(section as SectionId);
          }}
        >
          {children}
        </a>
      );
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  },
  // Tables from the model can be wide: scroll them inside the bubble, never the page.
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table>{children}</table>
    </div>
  ),
  img: () => null,
};

export const Markdown = memo(function Markdown({ children }: { children: string }) {
  return (
    <div className="copilot-prose" dir="auto">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
});
