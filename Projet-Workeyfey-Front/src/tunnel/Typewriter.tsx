import { useEffect, useRef, useState, type JSX } from 'react';
import { gsap } from 'gsap';
import './tunnel.css';

type TypewriterProps = {
    text: string;
    delay?: number;
    speedSecPerChar?: number;
    cursor?: boolean;
    cursorColor?: 'cyan' | 'magenta';
    className?: string;
    as?: keyof JSX.IntrinsicElements;
    play?: boolean;
};

export default function Typewriter({
    text,
    delay = 0,
    speedSecPerChar = 0.025,
    cursor = true,
    cursorColor = 'cyan',
    className,
    as = 'span',
    play = true,
}: TypewriterProps) {
    const [shown, setShown] = useState('');
    const [done, setDone] = useState(false);
    const stateRef = useRef({ p: 0 });

    useEffect(() => {
        setShown('');
        setDone(false);
        stateRef.current.p = 0;
        if (!play) return;
        const tween = gsap.to(stateRef.current, {
            p: text.length,
            duration: Math.max(0.05, text.length * speedSecPerChar),
            delay,
            ease: 'none',
            onUpdate: () => {
                const i = Math.floor(stateRef.current.p);
                setShown(text.slice(0, i));
            },
            onComplete: () => {
                setShown(text);
                setDone(true);
            },
        });
        return () => {
            tween.kill();
        };
    }, [text, delay, speedSecPerChar, play]);

    const Tag = as as any;

    return (
        <Tag className={`Typewriter ${className ?? ''}`.trim()}>
            {shown}
            {cursor && !done && (
                <span
                    className={`Typewriter-cursor${
                        cursorColor === 'magenta'
                            ? ' Typewriter-cursor--magenta'
                            : ''
                    }`}
                    aria-hidden="true"
                >
                    _
                </span>
            )}
        </Tag>
    );
}
