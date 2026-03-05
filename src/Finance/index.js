import React from 'react';
import { Link } from 'react-router-dom';
import { optimizeBudget } from '../services/financeOptimizer';
import FinanceLab from '../Lab/FinanceLab';
import './Finance.css';

const STORAGE_KEY = 'BALANCE_V1_finance';

const defaultState = {
  accounts: [
    { id: 'acc_main', name: 'Cuenta Principal', currency: 'USD', balance: 0 },
  ],
  categories: ['Ingresos', 'Gastos', 'Ahorro', 'Inversión'],
  transactions: [],
};

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : defaultState;
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export default function Finance() {
  const [state, setState] = React.useState(loadState);
  const [newTx, setNewTx] = React.useState({
    type: 'Gasto',
    amount: '',
    category: 'Gastos',
    accountId: 'acc_main',
    description: '',
    currency: 'USD',
  });
  const [newCategory, setNewCategory] = React.useState('');
  const [optimizerInputs, setOptimizerInputs] = React.useState({
    income: '',
    savingsTarget: '',
    fixedCostsText: '',
  });
  const [optimizerMode, setOptimizerMode] = React.useState('custom');
  const [weights, setWeights] = React.useState({});
  const [plan, setPlan] = React.useState(null);

  React.useEffect(() => {
    saveState(state);
  }, [state]);

  const totalIncome = state.transactions
    .filter(t => t.type === 'Ingreso')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalExpense = state.transactions
    .filter(t => t.type === 'Gasto')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const expenseCategories = React.useMemo(
    () => state.categories.filter(c => c !== 'Ingresos'),
    [state.categories]
  );

  React.useEffect(() => {
    setWeights(prev => {
      const next = { ...prev };
      expenseCategories.forEach(cat => {
        if (next[cat] === undefined) next[cat] = 1;
      });
      return next;
    });
  }, [expenseCategories]);

  const parseFixedCosts = (text) => {
    return text
      .split(/[\n,]+/)
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const parts = line.split(/[:=]/);
        if (parts.length >= 2) {
          return { name: parts[0].trim(), amount: Number(parts[1]) || 0 };
        }
        return { name: 'Costo', amount: Number(line) || 0 };
      });
  };

  const handleOptimize = (e) => {
    e.preventDefault();
    const fixedCosts = parseFixedCosts(optimizerInputs.fixedCostsText);
    const categories = expenseCategories.map(cat => ({
      name: cat,
      weight: Number(weights[cat]) || 0,
    }));
    const result = optimizeBudget({
      income: optimizerInputs.income,
      savingsTarget: optimizerInputs.savingsTarget,
      fixedCosts,
      categories,
      mode: optimizerMode,
    });
    setPlan({ result, fixedCosts });
  };

  const handleAddTransaction = (e) => {
    e.preventDefault();
    if (!newTx.amount) return;
    const tx = {
      id: `tx_${Date.now()}`,
      ...newTx,
      amount: Number(newTx.amount),
      createdAt: new Date().toISOString(),
    };
    setState(prev => ({
      ...prev,
      transactions: [tx, ...prev.transactions],
    }));
    setNewTx({ ...newTx, amount: '', description: '' });
  };

  const handleAddCategory = () => {
    if (!newCategory.trim()) return;
    if (state.categories.includes(newCategory.trim())) return;
    setState(prev => ({
      ...prev,
      categories: [...prev.categories, newCategory.trim()],
    }));
    setNewCategory('');
  };

  return (
    <div className="Finance-root">
      <div className="Finance-header">
        <h2>💰 Ecosistema Financiero</h2>
        <p>Control de gastos, ingresos, categorías y cuentas.</p>
        <div className="Finance-nav">
          <Link to="/" className="btn" style={{ textDecoration: 'none' }}>← Volver</Link>
        </div>
      </div>

      <div className="Finance-summary">
        <div className="Finance-card">
          <h4>Ingresos</h4>
          <span className="Finance-value positive">${totalIncome.toFixed(2)}</span>
        </div>
        <div className="Finance-card">
          <h4>Gastos</h4>
          <span className="Finance-value negative">${totalExpense.toFixed(2)}</span>
        </div>
        <div className="Finance-card">
          <h4>Balance</h4>
          <span className="Finance-value">${(totalIncome - totalExpense).toFixed(2)}</span>
        </div>
      </div>

      <div className="Finance-grid">
        <div className="Finance-panel">
          <h3>Registrar transacción</h3>
          <form onSubmit={handleAddTransaction} className="Finance-form">
            <select value={newTx.type} onChange={e => setNewTx({ ...newTx, type: e.target.value })}>
              <option value="Ingreso">Ingreso</option>
              <option value="Gasto">Gasto</option>
            </select>
            <input
              type="number"
              placeholder="Monto"
              value={newTx.amount}
              onChange={e => setNewTx({ ...newTx, amount: e.target.value })}
            />
            <select value={newTx.category} onChange={e => setNewTx({ ...newTx, category: e.target.value })}>
              {state.categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <select value={newTx.accountId} onChange={e => setNewTx({ ...newTx, accountId: e.target.value })}>
              {state.accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Descripción"
              value={newTx.description}
              onChange={e => setNewTx({ ...newTx, description: e.target.value })}
            />
            <button type="submit" className="btn">Añadir</button>
          </form>
        </div>

        <div className="Finance-panel">
          <h3>Categorías</h3>
          <div className="Finance-categories">
            {state.categories.map(cat => (
              <span key={cat} className="Finance-category">{cat}</span>
            ))}
          </div>
          <div className="Finance-addCategory">
            <input
              type="text"
              placeholder="Nueva categoría"
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
            />
            <button className="btn" onClick={handleAddCategory}>Agregar</button>
          </div>
        </div>
      </div>

      <div className="Finance-panel Finance-optimizer">
        <h3>Asistente de Optimización</h3>
        <form className="Finance-form" onSubmit={handleOptimize}>
          <select value={optimizerMode} onChange={e => setOptimizerMode(e.target.value)}>
            <option value="custom">Personalizado (pesos)</option>
            <option value="50-30-20">Regla 50/30/20</option>
            <option value="60-20-20">Regla 60/20/20</option>
            <option value="70-20-10">Regla 70/20/10</option>
          </select>
          <input
            type="number"
            placeholder="Ingreso mensual"
            value={optimizerInputs.income}
            onChange={e => setOptimizerInputs({ ...optimizerInputs, income: e.target.value })}
          />
          <input
            type="number"
            placeholder="Meta de ahorro"
            value={optimizerInputs.savingsTarget}
            onChange={e => setOptimizerInputs({ ...optimizerInputs, savingsTarget: e.target.value })}
          />
          <textarea
            className="Finance-textarea"
            placeholder="Costos fijos (ej: Renta: 500, Luz: 80)"
            value={optimizerInputs.fixedCostsText}
            onChange={e => setOptimizerInputs({ ...optimizerInputs, fixedCostsText: e.target.value })}
          />

          <div className="Finance-weights">
            <div className="Finance-weightsTitle">Pesos por categoría</div>
            {expenseCategories.map(cat => (
              <div key={cat} className="Finance-weightRow">
                <span>{cat}</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={weights[cat] ?? 1}
                  onChange={e => setWeights({ ...weights, [cat]: e.target.value })}
                />
              </div>
            ))}
          </div>

          <button type="submit" className="btn">Calcular plan</button>
        </form>

        {plan?.result && (
          <div className="Finance-plan">
            {plan.result.error ? (
              <div className="Finance-warning">{plan.result.error}</div>
            ) : (
              <>
                <div className="Finance-planSummary">
                  <div><strong>Ingreso:</strong> ${plan.result.income.toFixed(2)}</div>
                  <div><strong>Costos fijos:</strong> ${plan.result.fixed.toFixed(2)}</div>
                  <div><strong>Ahorro:</strong> ${plan.result.savings.toFixed(2)}</div>
                  <div><strong>Disponible:</strong> ${plan.result.remaining.toFixed(2)}</div>
                </div>
                {plan.result.mode !== 'custom' && (
                  <div className="Finance-planBuckets">
                    <div><strong>Necesidades:</strong> ${plan.result.buckets.needs.toFixed(2)}</div>
                    <div><strong>Deseos:</strong> ${plan.result.buckets.wants.toFixed(2)}</div>
                    <div><strong>Ahorro:</strong> ${plan.result.buckets.savings.toFixed(2)}</div>
                  </div>
                )}
                <div className="Finance-planAllocations">
                  {plan.result.allocations.map(a => (
                    <div key={a.name} className="Finance-allocation">
                      <span>{a.name}</span>
                      <strong>${a.amount.toFixed(2)}</strong>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="Finance-panel">
        <h3>Transacciones recientes</h3>
        <div className="Finance-transactions">
          {state.transactions.length === 0 ? (
            <div className="Finance-empty">No hay transacciones todavía.</div>
          ) : (
            state.transactions.slice(0, 8).map(tx => (
              <div key={tx.id} className="Finance-transaction">
                <div>
                  <strong>{tx.description || tx.category}</strong>
                  <div className="Finance-transactionMeta">
                    {tx.type} • {new Date(tx.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className={tx.type === 'Ingreso' ? 'Finance-amount positive' : 'Finance-amount negative'}>
                  {tx.type === 'Ingreso' ? '+' : '-'}${tx.amount.toFixed(2)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <FinanceLab />
    </div>
  );
}
