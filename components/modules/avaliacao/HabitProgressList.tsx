type HabitStat = { name: string; done: number; total: number };

export function HabitProgressList({ items }: { items: HabitStat[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-text-secondary">Nenhum hábito cadastrado.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => {
        const percent =
          item.total === 0 ? 0 : Math.round((item.done / item.total) * 100);
        return (
          <li key={item.name} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-primary">{item.name}</span>
              <span className="text-text-secondary">
                {item.done}/{item.total}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
