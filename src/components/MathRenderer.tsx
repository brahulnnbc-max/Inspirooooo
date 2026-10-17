import React, { useMemo } from 'react';
import katex from 'katex';

interface MathRendererProps {
  content: string;
  className?: string;
  block?: boolean;
}

export const MathRenderer: React.FC<MathRendererProps> = ({
  content = '',
  className = '',
  block = false,
}) => {
  const renderedHtml = useMemo(() => {
    if (!content) return '';

    try {
      // If the content is purely a math block without delimiters
      if (block && !content.includes('$')) {
        return katex.renderToString(content, {
          displayMode: true,
          throwOnError: false,
        });
      }

      // Replace $$...$$ first (display math), then $...$ (inline math)
      let parsed = content;

      // Match block math: $$...$$
      parsed = parsed.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
        try {
          return katex.renderToString(math.trim(), {
            displayMode: true,
            throwOnError: false,
          });
        } catch {
          return `<span class="text-rose-500">[Math: ${math}]</span>`;
        }
      });

      // Match inline math: $...$ (ensure not preceded by backslash)
      parsed = parsed.replace(/(?<!\\)\$([^\$]+?)\$/g, (_, math) => {
        try {
          return katex.renderToString(math.trim(), {
            displayMode: false,
            throwOnError: false,
          });
        } catch {
          return `<span class="text-rose-500">[Math: ${math}]</span>`;
        }
      });

      // Match standalone un-delimited LaTeX expressions if any remain (e.g. \frac{1}{2}, \sqrt{3}, \alpha, \vec{v})
      parsed = parsed.replace(/\\(frac|sqrt|vec|int|sum|alpha|beta|gamma|delta|theta|lambda|mu|pi|sigma|omega|Delta|Omega|times|div|pm|approx|neq|leq|geq|infty|rightarrow|leftarrow)(?:\{[^{}]*\}|\[[^\[\]]*\]|[a-zA-Z0-9\^_\+\-\*\/= ])+/g, (matched) => {
        try {
          return katex.renderToString(matched.trim(), {
            displayMode: false,
            throwOnError: false,
          });
        } catch {
          return matched;
        }
      });

      // Format linebreaks
      parsed = parsed.replace(/\n/g, '<br/>');

      return parsed;
    } catch (e) {
      console.error('KaTeX rendering error:', e);
      return content;
    }
  }, [content, block]);

  return (
    <div
      className={`math-content leading-relaxed text-slate-800 dark:text-slate-100 ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
};
