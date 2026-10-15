import {
  DndContext,
  TouchSensor,
  MouseSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Habit, Progress } from '../../types';
import { usePreferences } from '../../stores/preferences';
import { HabitCard } from './habit-card';
function SortableHabit({
  habit,
  progress,
  date,
}: {
  habit: Habit;
  progress?: Progress;
  date: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: habit.id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 30 : undefined,
        position: 'relative',
      }}
      className={isDragging ? 'sortable-habit dragging' : 'sortable-habit'}
      {...attributes}
      aria-label={`Reorder ${habit.name}`}
      {...listeners}
      onContextMenu={(e) => e.preventDefault()}
    >
      <HabitCard habit={habit} progress={progress} date={date} />
    </div>
  );
}
export function SortableHabitList({
  habits,
  progress,
  date,
}: {
  habits: Habit[];
  progress: Progress[];
  date: string;
}) {
  const { habitOrder, setHabitOrder } = usePreferences();
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 350, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  function reorder({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const visible = habits.map((h) => h.id);
    const reordered = arrayMove(
      visible,
      visible.indexOf(String(active.id)),
      visible.indexOf(String(over.id)),
    );
    const all = [...habitOrder, ...visible.filter((id) => !habitOrder.includes(id))];
    let i = 0;
    setHabitOrder(all.map((id) => (visible.includes(id) ? reordered[i++] : id)));
  }
  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={reorder}>
        <SortableContext items={habits.map((h) => h.id)} strategy={verticalListSortingStrategy}>
          <div className="habit-list">
            {habits.map((h) => (
              <SortableHabit
                key={h.id}
                habit={h}
                progress={progress.find((p) => p.habitId === h.id && p.date === date)}
                date={date}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </>
  );
}
