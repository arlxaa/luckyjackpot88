import { useEffect, useRef } from 'react';

export type SpriteName = 'coin' | 'star' | 'tent' | 'ticket' | 'wheel' | 'cat';

const K = '#2b2118'; // ink outline

const SPRITES: Record<SpriteName, { rows: string[]; pal: Record<string, string> }> = {
  coin: {
    pal: { K, Y: '#f5b942', W: '#fff6e5', D: '#c77f2a' },
    rows: [
      '................',
      '................',
      '.....KKYYKK.....',
      '...KKWWYYYYKK...',
      '..KKWWYYYYYYKK..',
      '.KKWYYYYYYYYYKK.',
      '.KKYYYYYYYYYYKK.',
      '.KKYYYYYYYYYYKK.',
      '.KKYYYYYYYYDDKK.',
      '.KKYYYYYYYDDDKK.',
      '.KKYYYYYYDDDDKK.',
      '..KKYYYYDDDDKK..',
      '...KKYYDDDDKK...',
      '.....KKDDKK.....',
      '................',
      '................',
    ],
  },
  star: {
    pal: { K, B: '#ffe08a', D: '#e8a93d' },
    rows: [
      '................',
      '.......KK.......',
      '......KBBK......',
      '.....KBBBBK.....',
      '..KKBBBBBBBBKK..',
      '.KBBBBBBBBBBBBK.',
      '.KBBBBBDDDDDDBK.',
      '..KBBBBDDDDBBK..',
      '...KBBBBBBBBK...',
      '....KBBBBBBK....',
      '..KBBBKKKKBBBK..',
      '.KBBK......KBBK.',
      '.KK..........KK.',
      '................',
      '................',
      '................',
    ],
  },
  tent: {
    pal: { K, R: '#d94f4f', C: '#fff6e5', F: '#ffd166' },
    rows: [
      '.......KK.......',
      '.......KKFFF....',
      '.......KKFF.....',
      '.......KK.......',
      '.......RR.......',
      '......RRRR......',
      '.....RRRRRR.....',
      '....RRRRRRRR....',
      '...RRRRRRRRRR...',
      '...RCCRCCRCCR...',
      '..RRRRRRRRRRRR..',
      '..RCRCRCRCRCRC..',
      '.RRRRRRRRRRRRRR.',
      '.CCCCCCCCCCCCCC.',
      '..CC.CC..CC.CC..',
      '................',
    ],
  },
  ticket: {
    pal: { K, M: '#a9dcc0', B: '#ffe08a' },
    rows: [
      '................',
      '................',
      '................',
      '................',
      '.KKKKKKKKKKKKKK.',
      '.KMMMMMMMMMMMMK.',
      '.KMMBBMMBBMMBBK.',
      '.KMMMMMMMMMMMMK.',
      '.KMMMBBBBBBMMMK.',
      '.KMMMMMMMMMMMMK.',
      '.KKKKKKKKKKKKKK.',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
  },
  wheel: {
    pal: { K, R: '#d94f4f', C: '#fff6e5', B: '#ffd166' },
    rows: [
      '................',
      '................',
      '.....KKKKKK.....',
      '...KKRRRRRRKK...',
      '..KRRCCCCCCRRK..',
      '.KRCCRCCRCCRCCK.',
      '.KRCCCCCCCCCCRK.',
      '.KRCCBBBBBBCCRK.',
      '.KRCCBBBBBBCCRK.',
      '.KRCCCCCCCCCCRK.',
      '.KRCCCCCCCCCCRK.',
      '..KRCCCCCCCCRK..',
      '...KKRRRRRRKK...',
      '.....KKKKKK.....',
      '................',
      '................',
    ],
  },
  cat: {
    pal: { K, W: '#fffdf6', P: '#f2a3b3', L: '#f6cdd5' },
    rows: [
      '................',
      '................',
      '..KK........KK..',
      '..KWK......KWK..',
      '..KWWK....KWWK..',
      '...KWWWWWWWWK...',
      '..KWWWWWWWWWWK..',
      '..KWKWWKKWWKWK..',
      '..KWWWWWWWWWWK..',
      '..KWLLWPPWLLWK..',
      '...KWWWWWWWWK...',
      '...KWKWKKWKWK...',
      '....KKKKKKKK....',
      '................',
      '................',
      '................',
    ],
  },
};

// Renders a tiny pixel map onto a scaled canvas. Ragged rows are
// padded/clipped so a miscounted row can't crash or warp the sprite.
export function PixelArt({
  name,
  size = 64,
  label,
  shadow = true,
}: {
  name: SpriteName;
  size?: number;
  label: string;
  shadow?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const sprite = SPRITES[name];
    const h = sprite.rows.length;
    const w = Math.max(...sprite.rows.map((r) => r.length));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = size * dpr;
    canvas.height = Math.round((size * h) / w) * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);
    const cell = size / w;
    sprite.rows.forEach((row, y) => {
      for (let x = 0; x < w; x++) {
        const ch = row[x] ?? '.';
        if (ch === '.') continue;
        ctx.fillStyle = sprite.pal[ch] ?? '#ff00ff';
        ctx.fillRect(Math.round(x * cell), Math.round(y * cell), Math.ceil(cell), Math.ceil(cell));
      }
    });
  }, [name, size]);

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={label}
      style={{
        width: size,
        height: 'auto',
        imageRendering: 'pixelated',
        filter: shadow ? 'drop-shadow(0 3px 0 rgba(43,33,24,0.25))' : undefined,
      }}
    />
  );
}
