export const MOTION = {
  flip: 590,
  flipEase: 'cubic-bezier(.28,.09,.18,1)',
  snap: 380,
  snapEase: 'cubic-bezier(.18,1.55,.4,1)',
  exit: 260,
  exitEase: 'cubic-bezier(.25,.75,.4,1)',
  enter: 300,
  enterEase: 'cubic-bezier(.25,.75,.4,1)',
  reduced: 100,
  deadZone: 8,
  axisRatio: 1.1,
  distance: 85,
  velocity: 0.6,
  velocityDistance: 35,
  stampDistance: 90
} as const;
export type MotionPhase = 'idle' | 'flipping' | 'dragging' | 'snapping' | 'exiting' | 'waiting-next' | 'entering';
export function swipeVerdict(dx: number, width: number, velocity = 0) {
  const threshold = Math.max(35, Math.min(MOTION.distance, width * 0.25));
  if (
    Math.abs(dx) < threshold &&
    !(Math.abs(dx) >= MOTION.velocityDistance && Math.abs(velocity) >= MOTION.velocity && dx * velocity > 0)
  )
    return null;
  return dx > 0 ? ('known' as const) : ('unknown' as const);
}
export function dragPose(dx: number) {
  return `translateX(${dx}px) rotate(${Math.max(-19, Math.min(19, dx / 13))}deg) scale(${dx === 0 ? 1 : 1.016})`;
}
