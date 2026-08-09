import { hexToRgba } from "@/lib/utils";

type BusinessBadgeProps = {
  business: { name: string; color: string } | null;
  className?: string;
};

export function BusinessBadge({ business, className }: BusinessBadgeProps) {
  if (!business) {
    return (
      <span
        className={`inline-flex items-center whitespace-nowrap rounded-full bg-badge-casa-bg px-2.5 py-0.5 text-xs font-medium text-badge-casa-text ${className ?? ""}`}
      >
        Pessoal/Casa
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${className ?? ""}`}
      style={{
        backgroundColor: hexToRgba(business.color, 0.12),
        color: business.color,
      }}
    >
      {business.name}
    </span>
  );
}
