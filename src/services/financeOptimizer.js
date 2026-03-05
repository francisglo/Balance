const PRESETS = {
  custom: { needs: 0.5, wants: 0.3, savings: 0.2 },
  '50-30-20': { needs: 0.5, wants: 0.3, savings: 0.2 },
  '60-20-20': { needs: 0.6, wants: 0.2, savings: 0.2 },
  '70-20-10': { needs: 0.7, wants: 0.2, savings: 0.1 },
};

const KEYWORDS = {
  needs: ['renta', 'alquiler', 'hipoteca', 'luz', 'agua', 'gas', 'internet', 'transporte', 'comida', 'salud', 'seguro', 'educacion'],
  wants: ['ocio', 'entretenimiento', 'viaje', 'restaurante', 'suscripcion', 'hobby', 'ropa', 'regalo'],
  savings: ['ahorro', 'inversion', 'inversión', 'fondo', 'emergencia'],
};

function inferBucket(name) {
  const lower = (name || '').toLowerCase();
  if (KEYWORDS.savings.some(k => lower.includes(k))) return 'savings';
  if (KEYWORDS.needs.some(k => lower.includes(k))) return 'needs';
  if (KEYWORDS.wants.some(k => lower.includes(k))) return 'wants';
  return 'wants';
}

export function optimizeBudget({ income, fixedCosts, categories, savingsTarget, mode = 'custom' }) {
  const safeIncome = Number(income) || 0;
  const fixed = fixedCosts.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const available = safeIncome - fixed;

  if (available < 0) {
    return {
      error: 'Los costos fijos superan el ingreso mensual.',
      income: safeIncome,
      fixed,
      available,
      savings: 0,
      remaining: 0,
      allocations: [],
    };
  }

  const preset = PRESETS[mode] || PRESETS.custom;
  const targetSavings = Math.max(0, Number(savingsTarget) || 0);
  const savingsFromPreset = Math.round(available * preset.savings * 100) / 100;
  const savings = Math.min(Math.max(targetSavings, savingsFromPreset), available);
  const remaining = Math.max(0, available - savings);

  const normalized = categories.map(c => ({
    ...c,
    weight: Number(c.weight) || 0,
    bucket: inferBucket(c.name),
  }));

  const bucketWeights = normalized.reduce((acc, c) => {
    acc[c.bucket] = (acc[c.bucket] || 0) + (c.weight || 0);
    return acc;
  }, {});

  const usePreset = mode !== 'custom';
  const needsAndWantsTotal = preset.needs + preset.wants || 1;
  const needsBudget = usePreset ? remaining * (preset.needs / needsAndWantsTotal) : remaining;
  const wantsBudget = usePreset ? remaining * (preset.wants / needsAndWantsTotal) : 0;

  const allocations = normalized.map(c => {
    if (!usePreset) {
      const totalWeight = normalized.reduce((sum, i) => sum + (i.weight || 0), 0) || normalized.length;
      return {
        name: c.name,
        weight: c.weight,
        bucket: c.bucket,
        amount: totalWeight > 0 ? (remaining * (c.weight || 1)) / totalWeight : 0,
      };
    }

    if (c.bucket === 'savings') {
      const total = bucketWeights.savings || 1;
      return {
        name: c.name,
        weight: c.weight,
        bucket: c.bucket,
        amount: savings * (c.weight || 1) / total,
      };
    }

    if (c.bucket === 'needs') {
      const total = bucketWeights.needs || 1;
      return {
        name: c.name,
        weight: c.weight,
        bucket: c.bucket,
        amount: needsBudget * (c.weight || 1) / total,
      };
    }

    const total = bucketWeights.wants || 1;
    return {
      name: c.name,
      weight: c.weight,
      bucket: c.bucket,
      amount: wantsBudget * (c.weight || 1) / total,
    };
  });

  return {
    error: null,
    income: safeIncome,
    fixed,
    available,
    savings,
    remaining,
    allocations,
    buckets: {
      needs: needsBudget,
      wants: wantsBudget,
      savings,
    },
    mode,
  };
}
