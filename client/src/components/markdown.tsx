import { useCallback, useEffect, useMemo, useRef, useState, Suspense, lazy } from "react";
import ReactMarkdown from "react-markdown";
import gfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus, base16AteliersulphurpoolLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useColorMode } from "../utils/darkModeUtils";
import { remarkMermaid } from "../remark/remarkMermaid";
import remarkAlert from "remark-github-blockquote-alert";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import "yet-another-react-lightbox/plugins/captions.css";
import "yet-another-react-lightbox/plugins/counter.css";

const Lightbox = lazy(() => import("yet-another-react-lightbox"));

interface SlideImage {
  src: string;
  title?: string;
  description?: string;
}

type Plugin = any;

function countNewlinesBeforeNode(content: string, offset: number): number {
  let count = 0;
  for (let i = offset - 1; i >= 0; i--) {
    if (content[i] === "\n") {
      count++;
    } else if (content[i] !== " " && content[i] !== "\t" && content[i] !== "\r") {
      break;
    }
  }
  return count;
}

function isMarkdownImageLinkAtEnd(content: string): boolean {
  const trimmed = content.trimEnd();
  return trimmed.endsWith(")");
}

function MarkdownImage({
  src,
  alt,
  show,
  rounded,
  scale,
  compact,
}: {
  src?: string;
  alt?: string;
  show: (src: string) => void;
  rounded: boolean;
  scale: string;
  compact?: boolean;
}) {
  const shouldCrop = compact && !rounded;

  return (
    <div
      className="relative inline-block overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] cursor-zoom-in"
      style={{
        width: `calc(${scale} * 100%)`,
        borderRadius: rounded ? "1.5rem" : "0",
        boxShadow: rounded ? "0 20px 40px -10px rgba(0,0,0,0.1)" : "none",
        aspectRatio: shouldCrop ? "16 / 9" : "auto",
      }}
      onClick={() => src && show(src)}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={`toc-content max-w-full h-auto mx-auto ${shouldCrop ? "h-full object-cover object-top" : ""}`}
      />
      {shouldCrop && (
        <span className="absolute bottom-2 right-2 bg-black/40 text-white text-[10px] px-1.5 py-0.5 rounded-lg backdrop-blur-md pointer-events-none">
          长图
        </span>
      )}
    </div>
  );
}

function LightboxComponent({ index, slides, close }: { index: number; slides: SlideImage[]; close: () => void }) {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const isSingle = slides.length === 1;
  useEffect(() => {
    const loaders = [
      import("yet-another-react-lightbox/plugins/download"),
      import("yet-another-react-lightbox/plugins/zoom"),
      import("yet-another-react-lightbox/plugins/fullscreen"),
      import("yet-another-react-lightbox/plugins/captions"),
    ];

    if (!isSingle) {
      loaders.push(import("yet-another-react-lightbox/plugins/counter"));
      loaders.push(import("yet-another-react-lightbox/plugins/thumbnails"));
    }

    Promise.all(loaders).then((modules) => {
      setPlugins(modules.map(m => m.default as Plugin));
    });
  }, [isSingle]);

  if (plugins.length === 0) return null;

  return (
    <Lightbox
      plugins={plugins}
      index={index}
      slides={slides}
      open={true}
      close={close}
      captions={{
        descriptionTextAlign: "center",
        descriptionMaxLines: 3,
      }}
      thumbnails={{
        position: "bottom",
        width: 110,
        height: 74,
        border: 0,
        gap: 24
      }}
      animation={{ fade: 400, swipe: 600, navigation: 400 }}
      render={{
        buttonPrev: isSingle ? () => null : undefined,
        buttonNext: isSingle ? () => null : undefined,
        slideFooter: () => null,
        thumbnail: ({ slide }) => (
          <div className="w-full h-full flex items-center justify-center bg-neutral-200/50 dark:bg-neutral-800/50">
             <img src={slide.src} className="object-cover w-full h-full" alt="" />
          </div>
        ),
      }}
      zoom={{ maxZoomPixelRatio: 3, doubleTapDelay: 300 }}
      controller={{ closeOnBackdropClick: true, closeOnPullDown: true }}
      styles={{
        root: { backgroundColor: "transparent" },
        container: { backgroundColor: "transparent" },
        toolbar: { backgroundColor: "transparent" },
        thumbnailsContainer: { backgroundColor: "transparent" },
        thumbnail: { backgroundColor: "transparent" },
      }}
    />
  );
}

function CodeBlock({ children, language, style, codeStyle }: { children: string; language: string; style: { [key: string]: React.CSSProperties }; codeStyle: React.CSSProperties }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group my-6">
      <SyntaxHighlighter
        PreTag="div"
        className="rounded-2xl !bg-neutral-50 dark:!bg-neutral-900/50 border border-black/5 dark:border-white/5 !p-4"
        language={language}
        style={style}
        wrapLongLines={true}
        codeTagProps={{ style: codeStyle }}
      >
        {children.replace(/\n$/, "")}
      </SyntaxHighlighter>
      <button
        className="absolute top-4 right-4 px-3 py-1.5 bg-white/80 dark:bg-black/50 backdrop-blur-md rounded-xl text-xs font-semibold border border-black/5 dark:border-white/10 opacity-0 group-hover:opacity-100 transition-all hover:scale-105 active:scale-95 shadow-sm"
        onClick={() => {
          navigator.clipboard.writeText(children);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

export function Markdown({ content, compact }: { content: string; compact?: boolean }) {
  const [index, setIndex] = useState(-1);
  const slides = useRef<SlideImage[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const colorMode = useColorMode();

  const show = useCallback((src: string) => {
    if (!containerRef.current) return;

    const images = Array.from(containerRef.current.querySelectorAll("img.toc-content")) as HTMLImageElement[];
    const newSlides = images.map((img) => {
      const isGenericName = img.alt && (
        /^[a-zA-Z0-9_\-.]+\.[a-zA-Z0-9]+$/.test(img.alt) ||
        img.alt === "image.png" ||
        img.alt === "image"
      );

      return {
        src: img.src,
        title: isGenericName ? undefined : (img.alt || undefined),
        description: undefined,
      };
    });

    slides.current = newSlides;
    const foundIndex = images.findIndex((img) => img.src === src);
    setIndex(foundIndex);
  }, []);

  useEffect(() => {
    slides.current = [];
  }, [content]);

  const headingStyle = useMemo(() => ({ scrollMarginTop: "var(--header-scroll-offset, 7rem)" }), []);

  const Content = useMemo(() => (
    <ReactMarkdown
      remarkPlugins={[gfm, remarkMath, remarkMermaid, remarkAlert]}
      rehypePlugins={[rehypeKatex, rehypeRaw]}
      components={{
        img({ node, src, ...props }) {
          const offset = node!.position!.start.offset!;
          const previousContent = content.slice(0, offset);
          const newlinesBefore = countNewlinesBeforeNode(previousContent, offset);

          const Image = ({ rounded, scale }: { rounded: boolean; scale: string }) => (
            <MarkdownImage
              src={src}
              alt={props.alt}
              show={show}
              rounded={rounded}
              scale={scale}
              compact={compact}
            />
          );

          if (newlinesBefore >= 1 || isMarkdownImageLinkAtEnd(previousContent + "![" + (props.alt || "") + "](" + src + ")")) {
            return (
              <span className="block w-full text-center my-6">
                <Image scale="0.85" rounded={true} />
              </span>
            );
          } else {
            return (
              <span className="inline-block align-middle mx-1">
                <Image scale="0.5" rounded={false} />
              </span>
            );
          }
        },
        iframe({ node, ...props }) {
            return (
                <div className="w-full aspect-video rounded-2xl overflow-hidden my-6 border border-black/5 dark:border-white/5 shadow-sm">
                    <iframe {...props} className="w-full h-full" />
                </div>
            )
        },
        code(props) {
          const { children, className, node, ...rest } = props;
          const match = /language-(\w+)/.exec(className || "");
          const curContent = content.slice(node?.position?.start.offset || 0);
          const isCodeBlock = curContent.trimStart().startsWith("```");

          const codeStyle = {
            fontFamily: 'ui-monospace, "SFMono-Regular", "SF Mono", Consolas, monospace',
            fontSize: isCodeBlock ? "14px" : "13px",
          };

          const language = match ? match[1] : "";

          if (isCodeBlock) {
            return (
              <CodeBlock
                language={language}
                style={colorMode === "dark" ? vscDarkPlus : base16AteliersulphurpoolLight}
                codeStyle={codeStyle}
              >
                {String(children)}
              </CodeBlock>
            );
          }
          return (
            <code
              {...rest}
              className={`bg-neutral-100 dark:bg-neutral-800/80 px-1.5 py-0.5 rounded-md text-[0.9em] text-theme font-medium ${className || ""}`}
              style={codeStyle}
            >
              {children}
            </code>
          );
        },
        blockquote({ node, children, ...props }) {
          return (
            <blockquote {...props}>
              {children}
            </blockquote>
          );
        },
        h1: ({ node, ...props }) => <h1 id={props.children?.toString()} style={headingStyle} {...props} />,
        h2: ({ node, ...props }) => <h2 id={props.children?.toString()} style={headingStyle} {...props} />,
        h3: ({ node, ...props }) => <h3 id={props.children?.toString()} style={headingStyle} {...props} />,
        h4: ({ node, ...props }) => <h4 id={props.children?.toString()} style={headingStyle} {...props} />,
        p: ({ node, ...props }) => <p {...props} />,
        ul: ({ node, ...props }) => <ul {...props} />,
        ol: ({ node, ...props }) => <ol {...props} />,
        li: ({ node, ...props }) => <li {...props} />,
        a: ({ node, ...props }) => <a {...props} />,
        hr: ({ node, ...props }) => <hr {...props} />,
        table: ({ node, ...props }) => <table {...props} />,
        th: ({ node, ...props }) => <th {...props} />,
        td: ({ node, ...props }) => <td {...props} />,
      }}
    >
      {content}
    </ReactMarkdown>
  ), [content, show, colorMode, headingStyle, compact]);

  return (
    <div ref={containerRef} className="markdown-container prose prose-zinc dark:prose-invert max-w-none prose-apple">
      {Content}
      {index >= 0 && (
        <Suspense fallback={null}>
          <LightboxComponent
            index={index}
            slides={slides.current}
            close={() => setIndex(-1)}
          />
        </Suspense>
      )}
    </div>
  );
}
