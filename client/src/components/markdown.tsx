import "katex/dist/katex.min.css";
import React, { useEffect, useMemo, useRef, useCallback, Suspense, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  base16AteliersulphurpoolLight,
  vscDarkPlus,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import gfm from "remark-gfm";
import remarkMermaid from "../remark/remarkMermaid";
import { remarkAlert } from "remark-github-blockquote-alert";
import remarkMath from "remark-math";
import type { SlideImage, Plugin } from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import "yet-another-react-lightbox/plugins/captions.css";
import { drawBlurhashToCanvas } from "../utils/blurhash";
import { useColorMode } from "../utils/darkModeUtils";
import { parseImageUrlMetadata } from "../utils/image-upload";
import { useImageLoadState } from "../utils/use-image-load-state";

const Lightbox = React.lazy(() => import("yet-another-react-lightbox"));

const countNewlinesBeforeNode = (text: string, offset: number) => {
  let newlinesBefore = 0;
  for (let i = offset - 1; i >= 0; i--) {
    if (text[i] === "\n") {
      newlinesBefore++;
    } else {
      break;
    }
  }
  return newlinesBefore;
};

const isMarkdownImageLinkAtEnd = (text: string) => {
  const trimmed = text.trim();
  const match = trimmed.match(/(.*)(!\[.*?\]\((.*?)\))$/s);
  if (match) {
    const [, beforeImage] = match;
    return beforeImage.trim() === "" || beforeImage.endsWith("\n");
  }
  return false;
};

function MarkdownImage({
  src,
  alt,
  show,
  rounded,
  scale,
}: {
  src?: string;
  alt?: string;
  show: (src: string) => void;
  rounded: boolean;
  scale: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const metadata = useMemo(() => parseImageUrlMetadata(src || ""), [src]);
  const { loaded: isLoaded, onLoad: handleLoad } = useImageLoadState(src);

  useEffect(() => {
    if (metadata.blurhash && canvasRef.current) {
      drawBlurhashToCanvas(canvasRef.current, metadata.blurhash);
    }
  }, [metadata.blurhash]);

  const aspectRatio = metadata.width && metadata.height
    ? metadata.width / metadata.height
    : 16 / 9;

  return (
    <div
      className="relative inline-block overflow-hidden transition-all duration-500 ease-in-out bg-neutral-100 dark:bg-neutral-800/50"
      style={{
        width: `calc(${scale} * 100%)`,
        aspectRatio: isLoaded ? "auto" : aspectRatio,
        borderRadius: rounded ? "16px" : "4px",
      }}
    >
      {!isLoaded && metadata.blurhash && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full scale-110 blur-2xl"
          width={32}
          height={32}
        />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={handleLoad}
        onClick={() => src && show(src)}
        className={`toc-content cursor-zoom-in w-full h-auto transition-all duration-500 hover:brightness-90 active:scale-[0.98] ${
          isLoaded ? "opacity-100" : "opacity-0 scale-105"
        }`}
      />
    </div>
  );
}

function LightboxComponent({ index, slides, close }: { index: number; slides: SlideImage[]; close: () => void }) {
  const [plugins, setPlugins] = useState<Plugin[]>([]);

  useEffect(() => {
    Promise.all([
      import("yet-another-react-lightbox/plugins/counter"),
      import("yet-another-react-lightbox/plugins/download"),
      import("yet-another-react-lightbox/plugins/zoom"),
      import("yet-another-react-lightbox/plugins/fullscreen"),
      import("yet-another-react-lightbox/plugins/thumbnails"),
      import("yet-another-react-lightbox/plugins/captions"),
    ]).then((modules) => {
      setPlugins(modules.map(m => m.default as Plugin));
    });
  }, []);

  if (plugins.length === 0) return null;

  return (
    <Lightbox
      plugins={plugins}
      index={index}
      slides={slides}
      open={true}
      close={close}
      captions={{ descriptionTextAlign: "center" }}
      thumbnails={{ position: "bottom", width: 120, height: 80, border: 0, gap: 10 }}
      animation={{ fade: 300, swipe: 500 }}
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

export function Markdown({ content }: { content: string }) {
  const [index, setIndex] = useState(-1);
  const slides = useRef<SlideImage[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const colorMode = useColorMode();

  const show = useCallback((src: string) => {
    if (!containerRef.current) return;

    const images = Array.from(containerRef.current.querySelectorAll("img.toc-content")) as HTMLImageElement[];
    const newSlides = images.map((img) => {
      const imgName = img.src.split("/").pop()?.split("?")[0] || "Image";
      return {
        src: img.src,
        title: img.alt || imgName,
        description: img.alt ? imgName : undefined,
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
        blockquote({ children, ...props }) {
          return (
            <blockquote
              className="border-l-4 border-theme/30 bg-theme/5 px-6 py-3 my-8 italic text-neutral-600 dark:text-neutral-400 rounded-r-2xl"
              {...props}
            >
              {children}
            </blockquote>
          );
        },
        h1: (props) => <h1 id={props.children?.toString()} style={headingStyle} {...props} className="text-3xl font-extrabold mt-16 mb-8 pb-3 border-b border-black/5 dark:border-white/5" />,
        h2: (props) => <h2 id={props.children?.toString()} style={headingStyle} {...props} className="text-2xl font-bold mt-12 mb-6" />,
        h3: (props) => <h3 id={props.children?.toString()} style={headingStyle} {...props} className="text-xl font-bold mt-10 mb-4" />,
        h4: (props) => <h4 id={props.children?.toString()} style={headingStyle} {...props} className="text-lg font-bold mt-8 mb-4" />,
        p: (props) => <p {...props} className="my-6 leading-8 text-neutral-800 dark:text-neutral-300" />,
        ul: (props) => <ul {...props} className="list-disc pl-6 my-6 space-y-3 marker:text-theme/40" />,
        ol: (props) => <ol {...props} className="list-decimal pl-6 my-6 space-y-3 marker:text-theme/40 font-medium" />,
        li: (props) => <li {...props} className="pl-2" />,
        a: (props) => <a {...props} className="text-theme hover:underline underline-offset-4 decoration-2 font-medium" />,
        hr: () => <hr className="my-12 border-black/5 dark:border-white/5" />,
        table: (props) => (
          <div className="overflow-x-auto my-10 rounded-2xl border border-black/5 dark:border-white/10 shadow-sm">
            <table className="min-w-full divide-y divide-black/5 dark:divide-white/10" {...props} />
          </div>
        ),
        th: (props) => <th {...props} className="px-6 py-4 bg-neutral-50 dark:bg-neutral-900/50 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider" />,
        td: (props) => <td {...props} className="px-6 py-4 whitespace-nowrap text-sm border-t border-black/5 dark:border-white/5" />,
      }}
    />
  ), [content, show, colorMode, headingStyle]);

  return (
    <div ref={containerRef} className="markdown-container">
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
