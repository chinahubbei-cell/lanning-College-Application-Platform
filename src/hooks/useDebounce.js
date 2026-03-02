import { useState, useCallback } from 'react';

/**
 * useDebounce — 防抖 hook
 */
export default function useDebounce(delay = 300) {
    const [timer, setTimer] = useState(null);

    const debounce = useCallback(
        (fn) => {
            if (timer) clearTimeout(timer);
            const newTimer = setTimeout(fn, delay);
            setTimer(newTimer);
        },
        [timer, delay]
    );

    return debounce;
}
