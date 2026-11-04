// Ícones desenhados no traço do app do Instagram (linha 2px, cantos
// arredondados), para o mockup não ficar com cara de painel administrativo.

type IconProps = { size?: number; className?: string };

function Svg({
  size = 24,
  className,
  children,
  fill = "none",
}: IconProps & { children: React.ReactNode; fill?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function BackIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M15 5 8 12l7 7" />
    </Svg>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15Z" />
      <path d="M10 21h4" />
    </Svg>
  );
}

export function MoreIcon(props: IconProps) {
  return (
    <Svg {...props} fill="currentColor">
      <circle cx="5" cy="12" r="1.2" stroke="none" />
      <circle cx="12" cy="12" r="1.2" stroke="none" />
      <circle cx="19" cy="12" r="1.2" stroke="none" />
    </Svg>
  );
}

export function AddPersonIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="10" cy="8" r="4" />
      <path d="M3 20c0-3.5 3-6 7-6s7 2.5 7 6" />
      <path d="M19 8v6M16 11h6" />
    </Svg>
  );
}

export function LinkIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </Svg>
  );
}

export function GridIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="18" height="18" rx="1" />
      <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
    </Svg>
  );
}

export function ReelsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <path d="M3 8.5h18M8 3l3 5.5M14 3l3 5.5" />
      <path d="m10 12 5 3-5 3Z" />
    </Svg>
  );
}

export function TaggedIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-4l-3 3Z" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M7.5 18c.8-1.8 2.5-3 4.5-3s3.7 1.2 4.5 3" />
    </Svg>
  );
}

/** Carrossel: dois quadrados sobrepostos, preenchidos, como no canto do grid. */
export function CarouselBadge(props: IconProps) {
  return (
    <svg width={props.size ?? 20} height={props.size ?? 20} viewBox="0 0 24 24" className={props.className} aria-hidden>
      <path
        fill="currentColor"
        d="M8 3h11a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-1V8a3 3 0 0 0-3-3H6V5a2 2 0 0 1 2-2Z"
      />
      <rect x="3" y="7" width="13" height="14" rx="2" fill="currentColor" />
    </svg>
  );
}

/** Reels: claquete preenchida com o "play" vazado. */
export function ReelsBadge(props: IconProps) {
  return (
    <svg width={props.size ?? 20} height={props.size ?? 20} viewBox="0 0 24 24" className={props.className} aria-hidden>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5ZM3 7.5h18V9H3ZM8.2 2.6l1.3-.6 3 5.5h-1.6Zm6 0 1.3-.6 3 5.5h-1.6ZM10 11.5v6.5l5.5-3.25Z"
      />
    </svg>
  );
}

/** Fixado: o alfinete que o app põe no canto dos posts fixados. */
export function PinBadge(props: IconProps) {
  return (
    <svg width={props.size ?? 20} height={props.size ?? 20} viewBox="0 0 24 24" className={props.className} aria-hidden>
      <path
        fill="currentColor"
        d="M15.5 2.5 21.5 8.5l-1.4 1.4-1.1-.4-3.6 3.6.4 3.6-1.5 1.5-3.6-3.6L5.5 19.8l-1.3-1.3 5.2-5.2-3.6-3.6 1.5-1.5 3.6.4L14.5 5l-.4-1.1Z"
      />
    </svg>
  );
}
