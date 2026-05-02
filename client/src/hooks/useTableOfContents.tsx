import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

export interface TableOfContent {
    index: number
    text: string
    marginLeft: number
    element: HTMLElement
}

const getHeaderScrollOffset = () => {
    const rawValue = getComputedStyle(document.documentElement)
        .getPropertyValue('--header-scroll-offset')
        .trim()
    const offset = Number.parseFloat(rawValue)
    return Number.isFinite(offset) ? offset : 0
}

const useTableOfContents = (selector: string) => {
    const [tableOfContents, setTableOfContents] = useState<TableOfContent[]>([])
    const [activeIndex, setActiveIndex] = useState(0)
    const { t } = useTranslation()
    const io = useRef<IntersectionObserver | null>(null);
    const [ref, setRef] = useState("-1")
    const lastRef = useRef("")

    useEffect(() => {
        if (lastRef.current === ref) return
        const content = document.querySelector(selector)
        if (!content) return

        const headers = content.querySelectorAll<HTMLElement>(
            'h1, h2, h3, h4, h5, h6'
        )

        const tocData = Array.from(headers).map<TableOfContent>((header, i) => ({
            index: i,
            text: header.textContent || '',
            marginLeft: (Number(header.tagName.charAt(1)) - 1) * 10,
            element: header,
        }))
        setTableOfContents(tocData)

        if (io.current) io.current.disconnect()

        io.current = new IntersectionObserver(
            (entries) => {
                const visibleHeaders = entries
                    .filter(entry => entry.isIntersecting)
                    .map(entry => entry.target as HTMLElement);

                if (visibleHeaders.length > 0) {
                    const firstVisible = visibleHeaders[0];
                    const idx = Number(firstVisible.dataset.id);
                    if (!isNaN(idx)) {
                        setActiveIndex(idx);
                    }
                } else {
                    // If no headers are visible, find the one closest to the top of viewport
                    const allEntries = entries.map(entry => ({
                        target: entry.target as HTMLElement,
                        top: entry.boundingClientRect.top
                    }));

                    const aboveViewport = allEntries.filter(e => e.top < 0);
                    if (aboveViewport.length > 0) {
                        const closest = aboveViewport.reduce((prev, curr) =>
                            Math.abs(curr.top) < Math.abs(prev.top) ? curr : prev
                        );
                        const idx = Number(closest.target.dataset.id);
                        if (!isNaN(idx)) {
                            setActiveIndex(idx);
                        }
                    }
                }
            },
            { rootMargin: "-10% 0px -80% 0px", threshold: 0 }
        )

        headers.forEach((header, i) => {
            header.setAttribute('data-id', i.toString())
            io.current!.observe(header)
        })

        lastRef.current = ref
        return () => {
            if (io.current) io.current.disconnect()
        }
    }, [ref, selector])

    const cleanup = (newId: string) => {
        if (lastRef.current === newId) return
        setRef(newId)
        if (io.current) io.current.disconnect()
    }

    return {
        TOC: () => (<div className='rounded-2xl bg-w py-4 px-4 t-primary'>
            <h2 className="text-lg font-bold mb-4">{t("index.title")}</h2>
            <ul className="max-h-[calc(100vh-10.25rem)] overflow-auto space-y-2" style={{ scrollbarWidth: "none" }}>
                {tableOfContents.length === 0 && <li>{t("index.empty.title")}</li>}
                {tableOfContents.map((item) => (
                    <li
                        key={`toc$${item.index}`}
                        className={`cursor-pointer transition-all duration-200 hover:opacity-70 ${activeIndex === item.index ? "text-blue-500 font-semibold scale-105 origin-left" : "text-neutral-500"}`}
                        style={{ marginLeft: item.marginLeft }}
                        onClick={() => {
                            const top = item.element.getBoundingClientRect().top + window.scrollY - getHeaderScrollOffset()
                            window.scrollTo({
                                top: Math.max(top, 0),
                                behavior: 'smooth'
                            })
                        }}
                    >
                        {item.text}
                    </li>
                ))}
            </ul>
        </div>), cleanup
    }
}

export default useTableOfContents
