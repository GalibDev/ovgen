export const habitTone = (color: string) =>
  `color-mix(in srgb, ${color}, var(--habit-shade, white) var(--habit-shift, 0%))`;
