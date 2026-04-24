import "katex/dist/katex.min.css";
import React, { useEffect, useMemo, useRef, useCallback, Suspense, useState, lazy } from "react";
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
import "yet-another-react-lightbox/plugins/counter.css";
import { drawBlurhashToCanvas } from "../utils/blurhash";
import { useColorMode } from "../utils/darkModeUtils";
import { parseImageUrlMetadata } from "../utils/image-upload";
import { useImageLoadState } from "../utils/use-image-load-state";

const Lightbox = lazy(() => import("yet-another-react-lightbox"));

function countNewlinesBeforeNode(content: string, offset: number) {
  let count = 0;
  for (let i = offset - 1; i >= 0; i--) {
    if (content[i] === "\n") {
      count++;
    } else if (content[i] !== " " && content[i] !== "\t") {
      break;
    }
  }
  return count;
}

function isMarkdownImageLinkAtEnd(content: string) {
  return /!\[.*\]\(.*\)$/.test(content.trim());
}

function MarkdownImage({ src, alt, show, rounded, scale, compact }: { src?: string; alt?: string; show: (src: string) => void; rounded: boolean; scale: string; compact?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const metadata = useMemo(() => parseImageUrlMetadata(src || ""), [src]);
  const { loaded: isLoaded, onLoad: handleLoad, onError, imageRef } = useImageLoadState(src);

  useEffect(() => {
    if (metadata.blurhash && canvasRef.current) {
      drawBlurhashToCanvas(canvasRef.current, metadata.blurhash);
    }
  }, [metadata.blurhash]);

  const aspectRatio = metadata.width && metadata.height
    ? metadata.width / metadata.height
    : 16 / 9;

  const isTall = aspectRatio < 1;
  const shouldCrop = compact && isTall;

  return (
    <div
      className="relative inline-block overflow-hidden transition-all duration-500 ease-in-out bg-neutral-100 dark:bg-neutral-800/50"
      style={{
        width: `calc(${scale} * 100%)`,
        maxWidth: metadata.width ? `${metadata.width}px` : "100%",
        aspectRatio: shouldCrop ? "3/4" : (isLoaded ? "auto" : aspectRatio),
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
        ref={imageRef} loading="lazy" onError={onError}
        onLoad={handleLoad}
        onClick={() => src && show(src)}
        className={`toc-content cursor-zoom-in w-full h-auto transition-all duration-500 hover:brightness-90 active:scale-[0.98] ${
          isLoaded ? "opacity-100" : "opacity-0 scale-105"
        } ${shouldCrop ? "h-full object-cover object-top" : ""}`}
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
      // 1. 调整字幕显示：增加一点内边距感
      captions={{ 
        descriptionTextAlign: "center", 
        descriptionMaxLines: 3,
      }}
      // 2. 缩略图间距增加到 20，让 Apple 风格的 Scale 动画有空间，不拥挤
      thumbnails={{ 
        position: "bottom", 
        width: 110,
        height: 74,
        border: 0, 
        gap: 24
      }}
      // 3. 动画曲线调优
      animation={{ fade: 400, swipe: 600, navigation: 400 }}
      render={{
        buttonPrev: isSingle ? () => null : undefined,
        buttonNext: isSingle ? () => null : undefined,
        // 4. 彻底杀掉默认的页脚背景
        slideFooter: () => null,
        // 5. 缩略图渲染逻辑保持现状（CSS 会接管背景和圆角）
        thumbnail: ({ slide }) => (
          <div className="w-full h-full flex items-center justify-center bg-neutral-200/50 dark:bg-neutral-800/50">
             <img src={slide.src} className="object-cover w-full h-full" alt="" />
          </div>
        ),
      }}
      zoom={{ maxZoomPixelRatio: 3, doubleTapDelay: 300 }}
      // 6. 交互灵魂：允许下拉/背景点击关闭
      controller={{ closeOnBackdropClick: true, closeOnPullDown: true }}
      // 7. 样式打通：必须设为 transparent 以启用 CSS 的 backdrop-filter
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
      // 扩展正则：识别常见的文件名格式或 URL 片段
      const isGenericName = img.alt && (
        /^[a-zA-Z0-9_\-.]+\.[a-zA-Z0-9]+$/.test(img.alt) || 
        img.alt === "image.png" || 
        img.alt === "image"
      );
  
      return {
        src: img.src,
        // 如果是文件名，设为 undefined 从而不渲染标题，保持极致留白
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
        iframe(props) {
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
        blockquote({ children, ...props }) {
          return (
            <blockquote {...props}>
              {children}
            </blockquote>
          );
        },
        h1: (props) => <h1 id={props.children?.toString()} style={headingStyle} {...props} />,
        h2: (props) => <h2 id={props.children?.toString()} style={headingStyle} {...props} />,
        h3: (props) => <h3 id={props.children?.toString()} style={headingStyle} {...props} />,
        h4: (props) => <h4 id={props.children?.toString()} style={headingStyle} {...props} />,
        p: (props) => <p {...props} />,
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
    >
      {content}
    </ReactMarkdown>
  ), [content, show, colorMode, headingStyle, compact]);

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
