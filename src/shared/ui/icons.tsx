import type { SVGProps } from 'react';

/** Один набор штриховых иконок вместо смеси SVG, символов (× ⋯ ↑ ↓ ✓ ▲) и эмодзи (📎 💬 🖼 📄).
 *  Иконки декоративные: подпись даёт текст кнопки или aria-label. */
function Svg({ children, size = 16, ...rest }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function IconClose(props: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

export function IconMore(props: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Svg {...props}>
      <circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconArrowUp(props: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Svg {...props}>
      <path d="M12 19V5M5 12l7-7 7 7" />
    </Svg>
  );
}

export function IconArrowDown(props: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Svg {...props}>
      <path d="M12 5v14M5 12l7 7 7-7" />
    </Svg>
  );
}

export function IconCheck(props: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Svg {...props}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Svg>
  );
}

export function IconPaperclip(props: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Svg {...props}>
      <path d="M21 11.5l-8.5 8.5a5.5 5.5 0 0 1-7.8-7.8L13 4a3.5 3.5 0 0 1 5 5l-8.3 8.3a1.5 1.5 0 0 1-2.1-2.1L15 8" />
    </Svg>
  );
}

export function IconComment(props: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Svg {...props}>
      <path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 20 12Z" />
    </Svg>
  );
}

export function IconChevronUp(props: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Svg {...props}>
      <path d="M6 15l6-6 6 6" />
    </Svg>
  );
}

export function IconFile(props: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Svg {...props}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5" />
    </Svg>
  );
}

export function IconImage(props: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Svg {...props}>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="M20 15l-4.5-4.5L8 18" />
    </Svg>
  );
}
