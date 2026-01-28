import React from 'react';

export default function Donut({ size = 120, finished = 0, dnf_mech = 0, dnf_other = 0, total = 0 }) {
  const r = size / 2 - 8;
  const cx = size / 2;
  const cy = size / 2;
  const C = 2 * Math.PI * r;
  const f = total > 0 ? finished / total : 0;
  const m = total > 0 ? dnf_mech / total : 0;
  const o = total > 0 ? dnf_other / total : 0;
  const segs = [
    { frac: f, color: '#22c55e' },
    { frac: m, color: '#f59e0b' },
    { frac: o, color: '#ef4444' },
  ];
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}> 
      <circle cx={cx} cy={cy} r={r} stroke="#233047" strokeWidth="10" fill="none" />
      {segs.map((s, idx) => {
        const len = s.frac * C;
        const el = (
          <circle key={idx} cx={cx} cy={cy} r={r} stroke={s.color} strokeWidth="10" fill="none"
            strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} style={{ transition: 'stroke-dasharray 0.3s ease' }} />
        );
        offset += len;
        return el;
      })}
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="14" fill="#e2e8f0">{total > 0 ? `${Math.round(f*100)}%` : '--'}</text>
    </svg>
  );
}


