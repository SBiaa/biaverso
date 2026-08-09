type BlockStat = { block: string; label: string; count: number };

export function BiggestBlocksSummary({ stats }: { stats: BlockStat[] }) {
  if (stats.length === 0) {
    return (
      <p className="text-sm text-text-secondary">
        Nenhuma trava registrada nas últimas semanas.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {stats.map((stat) => (
        <li
          key={stat.block}
          className="flex items-center justify-between text-sm"
        >
          <span className="text-text-primary">{stat.label}</span>
          <span className="font-medium text-text-secondary">{stat.count}x</span>
        </li>
      ))}
    </ul>
  );
}
