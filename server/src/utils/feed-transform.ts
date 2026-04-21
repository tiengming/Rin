import { listContentImageUrls } from "./image";

export function stripMarkdownImages(content: string) {
    return content.replace(/!\[.*?\]\((\S+?)(?:\s+"[^"]*")?\)/g, "").trim();
}

export function transformFeedItem(item: any, _admin = false) {
    const { content, hashtags, summary, ...other } = item;
    const images = listContentImageUrls(content);
    const avatar = images.length > 0 ? images[0] : undefined;

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
