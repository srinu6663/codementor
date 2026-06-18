import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

/**
 * MarkdownRenderer — renders GitHub-flavoured Markdown with LaTeX math (KaTeX),
 * styled for the CodeSphere dark theme. Self-contained: every element is themed
 * inline so it does not depend on a global stylesheet or a typography plugin.
 *
 * Usage: <MarkdownRenderer content={problem.description} />
 */

const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-2xl font-semibold text-foreground mt-6 mb-3 first:mt-0 pb-2 border-b border-border">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-semibold text-foreground mt-6 mb-3 first:mt-0 pb-1.5 border-b border-border">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold text-foreground mt-5 mb-2 first:mt-0">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-sm font-semibold text-foreground mt-4 mb-2 first:mt-0">{children}</h4>
  ),
  h5: ({ children }) => (
    <h5 className="text-sm font-semibold text-muted-foreground mt-4 mb-2 first:mt-0">{children}</h5>
  ),
  h6: ({ children }) => (
    <h6 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4 mb-2 first:mt-0">
      {children}
    </h6>
  ),
  p: ({ children }) => (
    <p className="text-[15px] leading-[1.7] text-foreground my-3 first:mt-0 last:mb-0">{children}</p>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-link underline-offset-2 hover:underline transition-colors"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="italic text-foreground">{children}</em>,
  del: ({ children }) => <del className="text-muted-foreground line-through">{children}</del>,
  ul: ({ children }) => (
    <ul className="list-disc pl-6 my-3 space-y-1.5 text-[15px] leading-[1.7] text-foreground marker:text-muted-foreground">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-6 my-3 space-y-1.5 text-[15px] leading-[1.7] text-foreground marker:text-muted-foreground">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-1">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-border pl-4 my-4 text-muted-foreground italic [&>p]:text-muted-foreground">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-6 border-0 border-t border-border" />,
  code: ({ className, children, ...props }) => {
    // Block code carries a language-xxx className (set by react-markdown for fenced blocks);
    // everything else is treated as inline code.
    const isBlock = typeof className === 'string' && /language-/.test(className);
    if (isBlock) {
      return (
        <code
          className={`${className} font-["JetBrains_Mono",monospace] text-[13px] leading-[1.6] text-foreground`}
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code
        className="font-['JetBrains_Mono',monospace] text-[13.5px] bg-card border border-border text-foreground px-1.5 py-0.5 rounded"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="bg-background border border-border rounded-md p-4 my-4 overflow-x-auto text-[13px] leading-[1.6]">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto border border-border rounded-md">
      <table className="w-full border-collapse text-sm text-foreground">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-card">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="border-b border-border last:border-0">{children}</tr>,
  th: ({ children }) => (
    <th className="text-left font-semibold text-foreground px-3 py-2 border-r border-border last:border-r-0">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 align-top border-r border-border last:border-r-0 text-foreground">
      {children}
    </td>
  ),
  img: ({ src, alt }) => (
    <img
      src={typeof src === 'string' ? src : undefined}
      alt={alt}
      className="max-w-full h-auto my-4 rounded-md border border-border"
    />
  ),
};

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="markdown-body text-foreground break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {content || ''}
      </ReactMarkdown>
    </div>
  );
}

export default MarkdownRenderer;
