import { formatDateBR } from "@/lib/utils";
import { wheelOrder, wheelPosition, type Sabbat } from "@/lib/espiritual-shared";

/**
 * A roda, desenhada.
 *
 * Os oito pontos ficam igualmente espaçados na ordem do *ciclo* (Samhain no
 * topo, dando a volta), e não na do calendário: é assim que a roda é ensinada,
 * e é o desenho que faz Samhain e Beltane caírem um em frente ao outro.
 *
 * O ponteiro do "hoje" não é decorativo — ele é interpolado entre o sabbath que
 * passou e o que vem, então mostra de verdade em que ponto do ano ela está.
 * SVG puro, sem script: a página inteira continua sendo servidor.
 */

const CX = 220;
const CY = 170;
const RING = 112;
const LABEL = 136;

/** Ângulo do ponto `index` da roda, em graus, com 0 apontando para a direita. */
const angleOf = (index: number) => -90 + index * 45;

function point(angle: number, radius: number) {
  const rad = (angle * Math.PI) / 180;
  return [CX + radius * Math.cos(rad), CY + radius * Math.sin(rad)] as const;
}

/** Onde ancorar o texto para ele não passar por cima do ponto. */
function anchorFor(angle: number) {
  const x = Math.cos((angle * Math.PI) / 180);
  if (x > 0.3) return "start";
  if (x < -0.3) return "end";
  return "middle";
}

export function WheelChart({
  ahead,
  today,
}: {
  /** Uma volta inteira a partir de hoje — o primeiro item é o próximo sabbath. */
  ahead: Sabbat[];
  today: Date;
}) {
  const byKey = new Map(ahead.map((s) => [s.key, s]));
  const next = ahead[0];
  const { previous, fraction } = wheelPosition(today);

  const previousIndex = wheelOrder.indexOf(previous.key);
  const todayAngle = angleOf(previousIndex) + fraction * 45;
  const [todayX, todayY] = point(todayAngle, RING);
  const [innerX, innerY] = point(todayAngle, RING - 26);

  return (
    <svg
      viewBox="0 0 440 340"
      role="img"
      aria-label={`Roda do ano. O próximo sabbath é ${next.name}, em ${formatDateBR(next.date)}.`}
      className="w-full max-w-[440px]"
    >
      <circle
        cx={CX}
        cy={CY}
        r={RING}
        fill="none"
        strokeWidth={1.5}
        className="stroke-border"
      />

      {/* O trilho de hoje: um raio curto apontando para o ponto do ano. */}
      <line
        x1={innerX}
        y1={innerY}
        x2={todayX}
        y2={todayY}
        strokeWidth={1.5}
        className="stroke-accent"
      />
      <circle cx={todayX} cy={todayY} r={4} className="fill-accent" />

      {wheelOrder.map((key, index) => {
        const sabbat = byKey.get(key)!;
        const angle = angleOf(index);
        const [x, y] = point(angle, RING);
        const [lx, ly] = point(angle, LABEL);
        const isNext = key === next.key;
        const anchor = anchorFor(angle);

        return (
          <g key={key}>
            <circle
              cx={x}
              cy={y}
              r={isNext ? 8 : 5}
              className={isNext ? "fill-accent" : "fill-border"}
            />
            {/* Anel claro em volta do próximo, para ele ganhar do resto sem
                precisar de uma segunda cor. */}
            {isNext && (
              <circle
                cx={x}
                cy={y}
                r={13}
                fill="none"
                strokeWidth={1.5}
                className="stroke-accent opacity-40"
              />
            )}
            <text
              x={lx}
              y={ly}
              textAnchor={anchor}
              dominantBaseline="middle"
              className={
                isNext
                  ? "fill-accent text-[12px] font-semibold"
                  : "fill-text-secondary text-[12px]"
              }
            >
              {sabbat.name}
            </text>
            <text
              x={lx}
              y={ly + 14}
              textAnchor={anchor}
              dominantBaseline="middle"
              className="fill-text-secondary text-[10px] opacity-70"
            >
              {formatDateBR(sabbat.date).slice(0, 5)}
            </text>
          </g>
        );
      })}

      <text
        x={CX}
        y={CY - 8}
        textAnchor="middle"
        className="fill-text-secondary text-[11px]"
      >
        próximo
      </text>
      <text
        x={CX}
        y={CY + 14}
        textAnchor="middle"
        className="fill-text-primary text-[17px] font-semibold"
      >
        {next.name}
      </text>
    </svg>
  );
}
