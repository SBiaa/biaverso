import Link from "next/link";
import { Compass } from "lucide-react";
import { Card } from "@/components/ui";
import { getPillarIcon } from "@/lib/vision-visuals";

type HighlightGoal = { title: string; progress: number } | null;

type PillarHighlight = {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  inProgressCount: number;
  highlightGoal: HighlightGoal;
};

export function PillarHighlightCard({ pillar }: { pillar: PillarHighlight | null }) {
  if (!pillar) {
    return (
      <Card className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Compass size={16} className="text-text-secondary" />
          Central de Visão
        </div>
        <p className="text-sm text-text-secondary">
          Nenhum objetivo em andamento ainda.
        </p>
        <Link href="/visao" className="text-xs font-medium text-accent">
          Ir para a Central de Visão
        </Link>
      </Card>
    );
  }

  const Icon = getPillarIcon(pillar.icon);

  return (
    <Link href={`/visao/${pillar.id}`}>
      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: `${pillar.color}1F`, color: pillar.color }}
            >
              {/* eslint-disable-next-line react-hooks/static-components -- icon is looked up per pillar, not created dynamically */}
              <Icon size={16} />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">{pillar.name}</p>
              <p className="text-xs text-text-secondary">
                {pillar.inProgressCount} objetivo(s) em andamento
              </p>
            </div>
          </div>
        </div>

        {pillar.highlightGoal && (
          <div className="flex flex-col gap-1">
            <p className="text-sm text-text-primary">{pillar.highlightGoal.title}</p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, Math.max(0, pillar.highlightGoal.progress))}%`,
                  backgroundColor: pillar.color,
                }}
              />
            </div>
          </div>
        )}
      </Card>
    </Link>
  );
}
