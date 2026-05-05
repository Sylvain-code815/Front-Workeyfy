import { useEffect, useRef, useState } from 'react';
import {
    motion,
    useScroll,
    useTransform,
    useMotionValueEvent,
    type MotionValue,
} from 'framer-motion';
import styles from './BackendCarousel.module.css';

export type BackendStep = {
    id: string;
    title: string;
    message: string;
};

const STEPS: BackendStep[] = [
    {
        id: 'architecture',
        title: 'Architectures Robustes',
        message:
            'API REST/GraphQL, Node.js — services modulaires conçus pour absorber la charge sans compromis.',
    },
    {
        id: 'security',
        title: 'Sécurité & Flux',
        message:
            'Authentification JWT, chiffrement bout-en-bout des données critiques, audit continu.',
    },
    {
        id: 'cloud',
        title: 'Cloud & Scalabilité',
        message:
            'Docker, AWS, monitoring temps réel — montée en charge automatique sans interruption.',
    },
];

type BackendCarouselProps = {
    onActiveStepChange?: (index: number) => void;
};

export default function BackendCarousel({
    onActiveStepChange,
}: BackendCarouselProps) {
    const wrapperRef = useRef<HTMLElement>(null);
    const [activeStep, setActiveStep] = useState<number>(0);

    const { scrollYProgress } = useScroll({
        target: wrapperRef,
        offset: ['start start', 'end end'],
    });

    useMotionValueEvent(scrollYProgress, 'change', (progress) => {
        const next = Math.min(
            STEPS.length - 1,
            Math.max(0, Math.floor(progress * STEPS.length))
        );
        setActiveStep((prev) => (prev === next ? prev : next));
    });

    useEffect(() => {
        onActiveStepChange?.(activeStep);
    }, [activeStep, onActiveStepChange]);

    return (
        <section ref={wrapperRef} className={styles.wrapper} aria-label="Backend & Infrastructure">
            <div className={styles.sticky}>
                <div className={styles.cards}>
                    {STEPS.map((step, i) => (
                        <BackendCard
                            key={step.id}
                            step={step}
                            index={i}
                            total={STEPS.length}
                            scrollYProgress={scrollYProgress}
                        />
                    ))}
                </div>

                <div className={styles.indicator} role="tablist" aria-label="Étape active">
                    {STEPS.map((step, i) => (
                        <span
                            key={step.id}
                            className={`${styles.indicatorDot}${
                                i === activeStep ? ' ' + styles.indicatorDotActive : ''
                            }`}
                            role="tab"
                            aria-selected={i === activeStep}
                            aria-label={step.title}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}

type BackendCardProps = {
    step: BackendStep;
    index: number;
    total: number;
    scrollYProgress: MotionValue<number>;
};

function BackendCard({ step, index, total, scrollYProgress }: BackendCardProps) {
    const start = index / total;
    const center = (index + 0.5) / total;
    const end = (index + 1) / total;
    const fade = 0.06;

    const opacity = useTransform(
        scrollYProgress,
        [start - fade, start, end, end + fade],
        index === 0
            ? [1, 1, 1, 0]
            : index === total - 1
              ? [0, 1, 1, 1]
              : [0, 1, 1, 0]
    );

    const y = useTransform(
        scrollYProgress,
        [start - fade, center, end + fade],
        [40, 0, -40]
    );

    return (
        <motion.article className={styles.card} style={{ opacity, y }}>
            <span className={styles.cardIndex}>
                Step {String(index + 1).padStart(2, '0')}
            </span>
            <h3 className={styles.cardTitle}>{step.title}</h3>
            <p className={styles.cardMessage}>{step.message}</p>
        </motion.article>
    );
}
