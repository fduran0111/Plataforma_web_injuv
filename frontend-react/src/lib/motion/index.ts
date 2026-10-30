export { MotionProvider } from "./MotionProvider";
export { isLowMotionDevice, prefersReducedMotion, useReducedMotion } from "./useReducedMotion";
// Lenis (./SmoothScroll) y GSAP (./gsap) no se reexportan a propósito: solo deben entrar en chunks diferidos.
