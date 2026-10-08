import { useEffect, useRef, useState } from 'react';

export type RobotReaction = { id: number; kind: 'progress' | 'complete' };

export function ChecklistRobot({ src, complete, reaction }: { src: string; complete: boolean; reaction: RobotReaction | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useRef(reaction?.id ?? 0);
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState<RobotReaction | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let intersecting = false;
    const update = () => setVisible(intersecting && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      intersecting = entry?.isIntersecting ?? false;
      update();
    });
    observer.observe(element);
    document.addEventListener('visibilitychange', update);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  useEffect(() => {
    if (!reaction || reaction.id === seen.current) return;
    seen.current = reaction.id;
    if (visible && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) setActive(reaction);
  }, [reaction, visible]);

  useEffect(() => {
    if (!visible) setActive(null);
  }, [visible]);

  return (
    <div ref={ref} className="checklist-robot relative mx-auto flex w-40 max-w-full flex-col items-center sm:w-full" data-visible={visible}>
      <div className="checklist-robot-frame relative aspect-[3/4] w-full max-w-72">
        <div className="checklist-robot-idle relative h-full w-full">
          <div key={active?.id ?? 'idle'} data-reaction={active?.kind} className="checklist-robot-reaction relative h-full w-full"
            onAnimationEnd={event => { if (event.target === event.currentTarget) setActive(null); }}>
            <div className="checklist-robot-glow pointer-events-none absolute inset-x-[15%] inset-y-[20%] rounded-full bg-primary/15 blur-xl" aria-hidden="true" />
            <div className="robot-floor" aria-hidden="true" />
            <img src={src} alt="TradeNova robot" draggable={false} className="relative h-full w-full select-none object-contain mix-blend-lighten" />
          </div>
        </div>
      </div>
      <p className={`relative mt-2 h-4 text-xs font-semibold text-primary ${complete ? '' : 'invisible'}`}>✓ Checklist Complete</p>
    </div>
  );
}