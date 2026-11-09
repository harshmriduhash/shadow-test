export function cursorArgs(cursor?: string): { cursor?: { id: string }; skip?: number } {
    return cursor ? { cursor: { id: cursor }, skip: 1 } : {};
}

export function cursorPage<T extends { id: string }>(records: T[], limit: number, totalCount: number) {
    const hasMore = records.length > limit;
    const items = records.slice(0, limit);
    return {
        items,
        totalCount,
        hasMore,
        nextCursor: hasMore ? items.at(-1)?.id || null : null
    };
}
