import { useTranslation } from "react-i18next";
import { Markdown } from "./markdown";
import { timeago } from "../utils/timeago";
import { useState, useRef, useEffect } from "react";

interface Moment {
    id: number;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    user: {
        id: number;
        username: string;
        avatar: string;
    };
}

const MAX_HEIGHT = 500;

export function MomentItem({ 
    moment, 
    onDelete,
    onEdit,
    canManage
}: { 
    moment: Moment, 
    onDelete: (id: number) => void,
    onEdit: (moment: Moment) => void,
    canManage: boolean
}) {
    const { t } = useTranslation()
    const { createdAt, updatedAt } = moment;
    const [isExpanded, setIsExpanded] = useState(false);
    const [shouldFold, setShouldFold] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (contentRef.current) {
            const height = contentRef.current.scrollHeight;
            if (height > MAX_HEIGHT) {
                setShouldFold(true);
            }
        }
    }, [moment.content]);
    
    return (
        <div className="bg-w p-4 rounded-lg">
            <div className="flex justify-between">
                <div className="flex items-center space-x-3">
                    <img 
                        src={moment.user.avatar} 
                        alt={moment.user.username} 
                        className="w-8 h-8 rounded-full object-cover"
                    />
                    <div>
                        <p className="t-primary font-bold">
                            {moment.user.username}
                        </p>
                        <p className="space-x-2 t-secondary text-xs">
                            <span title={new Date(createdAt).toLocaleString()}> 
                                {createdAt === updatedAt ? timeago(createdAt) : t('feed_card.published', { time: timeago(createdAt) })}
                            </span> 
                            {createdAt !== updatedAt && 
                                <span title={new Date(updatedAt).toLocaleString()}> 
                                    {t('feed_card.updated', { time: timeago(updatedAt) })}
                                </span> 
                            } 
                        </p>
                    </div>
                </div>
                {canManage && (
                    <div>
                        <div className="flex gap-2">
                            <button
                                aria-label={t("edit")}
                                onClick={() => onEdit(moment)}
                                className="flex-1 flex flex-col items-end justify-center px-2 py bg-secondary bg-button rounded-full transition"
                            >
                                <i className="ri-edit-2-line dark:text-neutral-400" />
                            </button>
                            <button
                                aria-label={t("delete.title")}
                                onClick={() => onDelete(moment.id)}
                                className="flex-1 flex flex-col items-end justify-center px-2 py bg-secondary bg-button rounded-full transition"
                            >
                                <i className="ri-delete-bin-7-line text-red-500" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
            <div
                className={`relative overflow-hidden transition-all duration-500 ${!isExpanded && shouldFold ? 'max-h-[500px]' : 'max-h-none'}`}
            >
                <div ref={contentRef} className="text-black dark:text-white mt-2">
                    <Markdown content={moment.content} compact={!isExpanded && shouldFold} />
                </div>

                {!isExpanded && shouldFold && (
                    <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-white dark:from-[#1a1a1a] to-transparent flex items-end justify-center pb-2 pointer-events-none">
                        <button
                            onClick={() => setIsExpanded(true)}
                            className="pointer-events-auto bg-neutral-100 dark:bg-neutral-800 text-sm px-6 py-2 rounded-full shadow-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all font-medium t-primary"
                        >
                            {t('moments.expand') || '展开查看全部'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
