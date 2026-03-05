import React from 'react';
import '../Lab/Lab.css';

const PRESET = { needs: 0.5, wants: 0.3, savings: 0.2 };
const BUCKET_KEYWORDS = {
  needs: ['renta', 'alquiler', 'hipoteca', 'luz', 'agua', 'gas', 'internet', 'transporte', 'comida', 'salud', 'seguro', 'educacion'],
  wants: ['ocio', 'entretenimiento', 'viaje', 'restaurante', 'suscripcion', 'hobby', 'ropa', 'regalo'],
  savings: ['ahorro', 'inversion', 'inversión', 'fondo', 'emergencia'],
};

function inferBucket(name) {
  const lower = (name || '').toLowerCase();
  if (BUCKET_KEYWORDS.savings.some(k => lower.includes(k))) return 'savings';
  if (BUCKET_KEYWORDS.needs.some(k => lower.includes(k))) return 'needs';
  if (BUCKET_KEYWORDS.wants.some(k => lower.includes(k))) return 'wants';
  return 'wants';
}

function getFinanceState() {
  const raw = localStorage.getItem('BALANCE_V1_finance');
  if (!raw) return { transactions: [], categories: [] };
  try {
    return JSON.parse(raw);
  } catch {
    return { transactions: [], categories: [] };
  }
}

export default function FinanceLab() {
  const [finance, setFinance] = React.useState(getFinanceState());
  const [impactDrop, setImpactDrop] = React.useState(20);

  React.useEffect(() => {
    const refresh = () => setFinance(getFinanceState());
    refresh();
    const id = setInterval(refresh, 1500);
    const onStorage = () => refresh();
    window.addEventListener('storage', onStorage);
    return () => {
      clearInterval(id);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const expenses = finance.transactions.filter(t => t.type === 'Gasto');
  const totalExpense = expenses.reduce((sum, t) => sum + Number(t.amount || 0), 0) || 1;
  const totalIncome = finance.transactions.filter(t => t.type === 'Ingreso').reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const bucketTotals = expenses.reduce((acc, t) => {
    const bucket = inferBucket(t.category);
    acc[bucket] = (acc[bucket] || 0) + Number(t.amount || 0);
    return acc;
  }, { needs: 0, wants: 0, savings: 0 });

  const drift = {
    needs: Math.round(((bucketTotals.needs / totalExpense) - PRESET.needs) * 100),
    wants: Math.round(((bucketTotals.wants / totalExpense) - PRESET.wants) * 100),
    savings: Math.round(((bucketTotals.savings / totalExpense) - PRESET.savings) * 100),
  };

  const dropIncome = totalIncome * (impactDrop / 100);
  const newBalance = (totalIncome - dropIncome) - (totalExpense || 0);

  return (
    <div className="Lab-root Lab-embedded">
      <h2>🧪 Laboratorio Financiero</h2>
      <div className="Lab-grid">
        <div className="Lab-card">
          <h3>Radar de Deriva</h3>
          <div className="Lab-metricRow"><span>Necesidades</span><strong>{drift.needs}%</strong></div>
          <div className="Lab-metricRow"><span>Deseos</span><strong>{drift.wants}%</strong></div>
          <div className="Lab-metricRow"><span>Ahorro</span><strong>{drift.savings}%</strong></div>
          <small>Comparado con 50/30/20</small>
        </div>

        <div className="Lab-card">
          <h3>Simulador de Crisis</h3>
          <label>Caída de ingresos: {impactDrop}%</label>
          <input
            className="Lab-range"
            type="range"
            min="0"
            max="60"
            value={impactDrop}
            onChange={e => setImpactDrop(Number(e.target.value))}
          />
          <div className="Lab-metricRow"><span>Ingresos</span><strong>${totalIncome.toFixed(2)}</strong></div>
          <div className="Lab-metricRow"><span>Balance simulado</span><strong>${newBalance.toFixed(2)}</strong></div>
        </div>

        <div className="Lab-card">
          <h3>Presión de Gastos</h3>
          <div className="Lab-metricRow"><span>Gasto total</span><strong>${totalExpense.toFixed(2)}</strong></div>
          <div className="Lab-metricRow"><span>Ingresos</span><strong>${totalIncome.toFixed(2)}</strong></div>
          <small>{totalIncome > 0 ? `${Math.round((totalExpense / totalIncome) * 100)}%` : '0%'} del ingreso</small>
        </div>
      </div>
    </div>
  );
}
