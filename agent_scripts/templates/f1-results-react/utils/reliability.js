export function classifyStatus(statusRaw) {
  const s = String(statusRaw || '').toLowerCase();
  if (!s) return 'other';
  if (s.includes('finished') || /\+\d+\s*lap/i.test(s)) return 'finished';
  const mechKeys = [
    'engine', 'power unit', 'gearbox', 'hydraulic', 'electrical', 'brake', 'suspension', 'mechanical', 'drivetrain', 'overheating', 'clutch', 'exhaust', 'turbo'
  ];
  if (mechKeys.some(k => s.includes(k))) return 'dnf_mech';
  return 'dnf_other';
}

export function aggregateDriverReliability(seasonRoundsByYear, year, code, classify = classifyStatus) {
  const season = (seasonRoundsByYear && seasonRoundsByYear[year]) ? seasonRoundsByYear[year] : {};
  let finished = 0, dnf_mech = 0, dnf_other = 0, total = 0;
  Object.values(season).forEach((round) => {
    (round?.results || []).forEach((res) => {
      const c = res.driverCode || res.driverName;
      if (c === code) {
        total += 1;
        const cls = classify(res.status);
        if (cls === 'finished') finished += 1; else if (cls === 'dnf_mech') dnf_mech += 1; else dnf_other += 1;
      }
    });
  });
  return { finished, dnf_mech, dnf_other, total };
}


