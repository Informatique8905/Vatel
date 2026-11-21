const PATHS = {
  logo: (<><circle cx="12" cy="13" r="7" /><circle cx="12" cy="13" r="3.5" /></>),
  user: (<><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>),
  bell: <path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0" />,
  eye: (<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>),
  eyeOff: (<><path d="M2 12s3.5-7 10-7c2 0 3.8.8 5.3 1.8M22 12s-3.5 7-10 7c-2 0-3.8-.8-5.3-1.8M4 6c2.8-2 5.3-3 8-3m0 14c-1.5 0-3-.4-4.3-1M9.9 9.9a3 3 0 0 0 4.2 4.2" /><path d="m3 3 18 18" /></>),
  plus: <path d="M12 5v14M5 12h14" />,
  qr: (<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><path d="M14 14h3v3h-3zM21 14v.01M14 21h.01M17 21h4v-4" /></>),
  calendar: (<><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></>),
  shield: (<><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z" /><path d="m9 12 2 2 4-4" /></>),
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  wallet: (<><rect x="3" y="6" width="18" height="14" rx="3" /><path d="M3 10h18M16 15h2" /></>),
  chevronLeft: <path d="m15 6-6 6 6 6" />,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  alert: (<><path d="M12 4 3 19h18z" /><path d="M12 10v4M12 16.5v.01" /></>),
  family: (<><circle cx="9" cy="8" r="3.5" /><circle cx="17" cy="9.5" r="2.5" /><path d="M2.5 20c1-3.5 3.5-5.5 6.5-5.5s5.5 2 6.5 5.5M15 14.6c2.6-.4 5 1.3 6 4.4" /></>),
  bowl: <path d="M3 11h18a9 9 0 0 1-18 0zM8 7c0-1.5 1-2 1-3.5M12 7c0-1.5 1-2 1-3.5M16 7c0-1.5 1-2 1-3.5" />,
  dashboard: (<><rect x="3" y="3" width="7" height="9" rx="2" /><rect x="14" y="3" width="7" height="5" rx="2" /><rect x="14" y="12" width="7" height="9" rx="2" /><rect x="3" y="16" width="7" height="5" rx="2" /></>),
  list: <path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  pot: <path d="M4 10h16v7a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4zM2 10h20M9 6c0-1.2.8-1.6.8-2.8M14 6c0-1.2.8-1.6.8-2.8" />,
  flag: <path d="M5 21V4M5 4h11l-2 4 2 4H5" />,
  camera: (<><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>),
  printer: <path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z" />,
  check: <path d="m5 12 5 5 9-10" />,
  copy: (<><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></>),
};

export default function Icon({ name, size, sw, className = '', style }) {
  const s = { ...style };
  if (size) { s.width = size; s.height = size; }
  if (sw) s.strokeWidth = sw;
  return (
    <svg className={`i ${className}`} viewBox="0 0 24 24" style={s} aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}
