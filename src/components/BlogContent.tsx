import React from 'react';

interface BlogContentProps {
  content: string;
}

/**
 * Renders blog content with markdown-like formatting
 * Supports: ## headings, **bold**, paragraphs
 */
const BlogContent: React.FC<BlogContentProps> = ({ content }) => {
  if (!content) return null;

  // Split content into lines and process
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentParagraph: string[] = [];
  let key = 0;

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const text = currentParagraph.join(' ').trim();
      if (text) {
        elements.push(
          <p key={key++} className="text-foreground mb-6">
            {renderTextWithBold(text)}
          </p>
        );
      }
      currentParagraph = [];
    }
  };

  const renderTextWithBold = (text: string): React.ReactNode => {
    // Handle **bold** text
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i}>{part}</strong>;
      }
      return part;
    });
  };

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Empty line - flush paragraph
    if (!trimmedLine) {
      flushParagraph();
      continue;
    }

    // H2 heading
    if (trimmedLine.startsWith('## ')) {
      flushParagraph();
      const headingText = trimmedLine.slice(3);
      elements.push(
        <h2
          key={key++}
          className="text-2xl font-serif mt-8 mb-4 text-foreground"
        >
          {headingText}
        </h2>
      );
      continue;
    }

    // H3 heading
    if (trimmedLine.startsWith('### ')) {
      flushParagraph();
      const headingText = trimmedLine.slice(4);
      elements.push(
        <h3
          key={key++}
          className="text-xl font-serif mt-6 mb-3 text-foreground"
        >
          {headingText}
        </h3>
      );
      continue;
    }

    // Regular text - add to current paragraph
    currentParagraph.push(trimmedLine);
  }

  // Flush remaining paragraph
  flushParagraph();

  return (
    <div className="prose prose-stone dark:prose-invert lg:prose-lg max-w-none">
      {elements}
    </div>
  );
};

export default BlogContent;
