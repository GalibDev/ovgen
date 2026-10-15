import { habitTone } from '../../lib/theme';
import {
  Moon,
  BookOpen,
  Droplets,
  Dumbbell,
  Sprout,
  Heart,
  GraduationCap,
  Sun,
  Target,
  Coffee,
  Bed,
  type LucideIcon,
} from 'lucide-react';
export const icons: Record<string, LucideIcon> = {
  Moon,
  BookOpen,
  Droplets,
  Dumbbell,
  Sprout,
  Heart,
  GraduationCap,
  Sun,
  Target,
  Coffee,
  Bed,
};
export function HabitIcon({ name, color }: { name: string; color: string }) {
  const Icon = icons[name] || Sprout;
  return (
    <span
      className="habit-icon"
      style={{
        color: habitTone(color),
        background: `color-mix(in srgb, ${color} var(--habit-tint, 18%), white)`,
      }}
    >
      <Icon size={30} strokeWidth={1.8} />
    </span>
  );
}
