import { useEffect, useRef } from "react";

export function useInfiniteScroll(
    onReachEnd: () => void,
    enabled: boolean,
    resetKey: string | null = null
) {
    const sentinelRef = useRef<HTMLDivElement>(null);
    const callbackRef = useRef(onReachEnd);

    useEffect(() => {
        callbackRef.current = onReachEnd;
    }, [onReachEnd]);

    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!enabled || !sentinel) return;

        const observer = new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting)) callbackRef.current();
        }, { rootMargin: "200px" });
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [enabled, resetKey]);

    return sentinelRef;
}
