import { extractImageWithMetadata } from "./image";

export function stripMarkdownImages(content: string) {
    return content.replace(/!\[.*?\]\((\S+?)(?:\s+"[^"]*")?\)/g, "").trim();
}

export function transformFeedItem(item: any, admin = false) {
    const { content, hashtags, summary, ...other } = item;
    const avatar = extractImageWithMetadata(content);

    let cleanSummary = summary;
    if (!cleanSummary || cleanSummary.length === 0) {
        const strippedContent = stripMarkdownImages(content);
        cleanSummary = strippedContent.length > 100
            ? strippedContent.slice(0, 100)
            : strippedContent;
    }

    return {
        ...other,
        summary: cleanSummary,
        hashtags: hashtags ? hashtags.map(({ hashtag }: any) => hashtag) : [],
        avatar,
    };
}
