import React from "react";

const Icon = ({ children }: { children: React.ReactNode }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const icons: Record<string, React.ReactNode> = {
  home: (
    <Icon>
      <path d="M2.5 6.5L8 2l5.5 4.5V13a1 1 0 0 1-1 1h-3V10H6.5v4h-3a1 1 0 0 1-1-1V6.5z" />
    </Icon>
  ),
  package: (
    <Icon>
      <path d="M2 4.5L8 2l6 2.5V11.5L8 14l-6-2.5z" />
      <path d="M2 4.5L8 7l6-2.5" />
      <path d="M8 7v7" />
    </Icon>
  ),
  building: (
    <Icon>
      <path d="M3 14V3a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v11" />
      <path d="M2 14h12" />
      <path d="M6 5h1M6 8h1M9 5h1M9 8h1" />
      <path d="M7 14v-3h2v3" />
    </Icon>
  ),
  settings: (
    <Icon>
      <circle cx="8" cy="8" r="2" />
      <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M3.1 12.9l1.4-1.4M11.5 4.5l1.4-1.4" />
    </Icon>
  ),
  box: (
    <Icon>
      <path d="M2 4.5L8 2l6 2.5V11.5L8 14l-6-2.5z" />
      <path d="M2 4.5L8 7l6-2.5" />
      <path d="M8 7v7" />
    </Icon>
  ),
};

export function resolveIcon(name: string | undefined): React.ReactNode {
  if (!name) return undefined;
  return icons[name];
}
