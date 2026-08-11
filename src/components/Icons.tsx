type Props = { size?: number }

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
})

export function IconMoon({ size = 18 }: Props) {
  return (
    <svg {...base(size)}>
      <path d="M20 14.5A8.2 8.2 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z" />
    </svg>
  )
}

export function IconSun({ size = 18 }: Props) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
    </svg>
  )
}

export function IconBack({ size = 18 }: Props) {
  return (
    <svg {...base(size)}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  )
}

export function IconClose({ size = 18 }: Props) {
  return (
    <svg {...base(size)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

export function IconSound({ size = 15 }: Props) {
  return (
    <svg {...base(size)}>
      <path d="M4 9v6h3.5L12 19V5L7.5 9H4Z" />
      <path d="M15.5 9.2a4 4 0 0 1 0 5.6" />
      <path d="M18 6.6a7.5 7.5 0 0 1 0 10.8" />
    </svg>
  )
}

export function IconSwap({ size = 17 }: Props) {
  return (
    <svg {...base(size)}>
      <path d="M4 8h13l-3-3M20 16H7l3 3" />
    </svg>
  )
}

export function IconFlip({ size = 16 }: Props) {
  return (
    <svg {...base(size)}>
      <rect x="3" y="5" width="12" height="15" rx="2.5" />
      <path d="M17 8h2.5A1.5 1.5 0 0 1 21 9.5V17a1.5 1.5 0 0 1-1.5 1.5H19" />
      <path d="M8 11.5h2M8 14h4" />
    </svg>
  )
}

export function IconShuffle({ size = 16 }: Props) {
  return (
    <svg {...base(size)}>
      <path d="M3 7h3.5l3 5m0 0 3 5H16m0 0-2-2m2 2-2 2" />
      <path d="M3 17h3.5l3-5" />
      <path d="M13 7h3m0 0-2-2m2 2-2 2" />
    </svg>
  )
}

export function IconTest({ size = 16 }: Props) {
  return (
    <svg {...base(size)}>
      <path d="M5 4h14v16l-7-3.5L5 20V4Z" />
    </svg>
  )
}

export function IconTrash({ size = 15 }: Props) {
  return (
    <svg {...base(size)}>
      <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
    </svg>
  )
}

export function IconPencil({ size = 15 }: Props) {
  return (
    <svg {...base(size)}>
      <path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
    </svg>
  )
}

export function IconDownload({ size = 15 }: Props) {
  return (
    <svg {...base(size)}>
      <path d="M12 4v11m0 0 4-4m-4 4-4-4M4 19h16" />
    </svg>
  )
}

export function IconUpload({ size = 15 }: Props) {
  return (
    <svg {...base(size)}>
      <path d="M12 20V9m0 0 4 4m-4-4-4 4M4 5h16" />
    </svg>
  )
}
