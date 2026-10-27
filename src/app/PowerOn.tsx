import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export function PowerOn({ ready, onReveal, onComplete }: { ready: boolean; onReveal: () => void; onComplete: () => void }) {
  const beam = useRef<HTMLDivElement>(null);
  const [finishingCharge, setFinishingCharge] = useState(false);

  useLayoutEffect(() => {
    if (!ready || !beam.current) return;
    // Continue from the visible loading frame before replacing its animation.
    beam.current.style.setProperty('--power-beam-start', getComputedStyle(beam.current, '::before').transform);
    setFinishingCharge(true);
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const completeIfReduced = () => { if (reducedMotion.matches) onComplete(); };
    completeIfReduced();
    reducedMotion.addEventListener('change', completeIfReduced);
    return () => reducedMotion.removeEventListener('change', completeIfReduced);
  }, [ready, onComplete]);

  return <div className={`screen-power-on ${finishingCharge ? 'screen-power-on-ready' : ''}`}>
    <div className="screen-shutter screen-shutter-top" onAnimationStart={event => {
      if (event.animationName === 'power-shutter-open') onReveal();
    }} onAnimationEnd={event => {
      if (event.animationName === 'power-shutter-open') onComplete();
    }} />
    <div className="screen-shutter screen-shutter-bottom" />
    <div className="screen-power-beam" ref={beam} aria-hidden="true" />
    <div className="screen-power-caption" role="status">
      <span className="screen-power-mark">IN<span>·HAUS</span></span>
      <span>{ready ? 'Sua operação, conectada.' : 'Ligando sua visão do campo…'}</span>
    </div>
    <button className="screen-power-skip" type="button" onClick={onComplete}>Pular animação <span aria-hidden="true">↗</span></button>
  </div>;
}
