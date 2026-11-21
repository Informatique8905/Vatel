import { useMemo } from 'react';

const N = 25;

// QR code factice de maquette (motif pseudo-aléatoire déterministe), pas un vrai QR code.
function buildCells(initialSeed) {
  let seed = initialSeed;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const finder = (r, c) => {
    const hits = [[0, 0], [0, N - 7], [N - 7, 0]];
    for (const [fr, fc] of hits) {
      if (r >= fr && r < fr + 7 && c >= fc && c < fc + 7) {
        const y = r - fr, x = c - fc;
        const ring = Math.min(y, x, 6 - y, 6 - x);
        return ring === 0 || ring >= 2 ? 1 : 0;
      }
      if (r >= fr - 1 && r <= fr + 7 && c >= fc - 1 && c <= fc + 7) return 0;
    }
    return null;
  };
  const cells = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const f = finder(r, c);
      cells.push(f === null ? (r === 6 || c === 6 ? (r + c) % 2 === 0 : rnd() > 0.52) : f === 1);
    }
  }
  return cells;
}

export default function FakeQr({ seed = 4821 }) {
  const cells = useMemo(() => buildCells(seed), [seed]);
  return (
    <div className="grid grid-cols-[repeat(25,minmax(0,1fr))] w-[220px] h-[220px]" role="img" aria-label="QR code du ticket">
      {cells.map((on, i) => <span key={i} className={on ? 'bg-ink' : 'bg-white'} />)}
    </div>
  );
}
