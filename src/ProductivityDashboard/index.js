import React from 'react';
import storage from '../services/storage';
import './ProductivityDashboard.css';

function SimpleBarChart({ label, values, colors }) {
  const maxValue = Math.max(...values);
  return (
    <div className="SimpleChart SimpleChart--bar">
      <div className="SimpleChart-title">{label}</div>
      <div className="SimpleChart-bars">
        {values.map((val, i) => (
          <div key={i} className="SimpleChart-barContainer">
            <div className="SimpleChart-bar" style={{
              height: maxValue > 0 ? `${(val / maxValue) * 100}%` : '0%',
              backgroundColor: colors[i]
            }} title={val} />
            <span className="SimpleChart-value">{val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SimplePieChart({ label, values, colors }) {
  const total = values.reduce((a, b) => a + b, 0);
  const segments = values.map((v, i) => ({
    color: colors[i],
    percent: total > 0 ? (v / total) * 100 : 0,
    value: v,
  }));
  
  let rotation = 0;
  const paths = segments.map((seg, i) => {
    const startRotation = rotation;
    rotation += (seg.percent / 100) * 360;
    return { startRotation, rotation, ...seg };
  });

  return (
    <div className="SimpleChart SimpleChart--pie">
      <div className="SimpleChart-title">{label}</div>
      <svg viewBox="0 0 100 100" className="SimpleChart-svg">
        <circle cx="50" cy="50" r="40" fill="rgba(255,255,255,0.03)" />
        {paths.map((path, i) => {
          const largeArc = path.rotation - path.startRotation > 180 ? 1 : 0;
          const startRad = (path.startRotation * Math.PI) / 180;
          const endRad = (path.rotation * Math.PI) / 180;
          const x1 = 50 + 40 * Math.cos(startRad);
          const y1 = 50 + 40 * Math.sin(startRad);
          const x2 = 50 + 40 * Math.cos(endRad);
          const y2 = 50 + 40 * Math.sin(endRad);
          const d = `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`;
          return (
            <path key={i} d={d} fill={path.color} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
          );
        })}
      </svg>
      <div className="SimpleChart-legend">
        {paths.map((path, i) => (
          <span key={i} className="SimpleChart-legendItem">
            <span className="SimpleChart-dot" style={{backgroundColor: path.color}}></span>
            {path.value}
          </span>
        ))}
      </div>
    </div>
  );
}

function SimpleDonutChart({ label, values, colors }) {
  return (
    <div className="SimpleChart SimpleChart--donut">
      <SimplePieChart label={label} values={values} colors={colors} />
      <div className="SimpleChart-donutHole" />
    </div>
  );
}

function SimpleStackedBar({ label, values, colors }) {
  const total = values.reduce((a, b) => a + b, 0) || 1;
  return (
    <div className="SimpleChart SimpleChart--stacked">
      <div className="SimpleChart-title">{label}</div>
      <div className="SimpleChart-stackedBar">
        {values.map((v, i) => (
          <div
            key={i}
            className="SimpleChart-stackedSegment"
            style={{
              width: `${(v / total) * 100}%`,
              backgroundColor: colors[i],
            }}
            title={v}
          />
        ))}
      </div>
    </div>
  );
}

function SimpleLineChart({ label, values, color }) {
  const max = Math.max(...values, 1);
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1 || 1)) * 100;
    const y = 100 - (v / max) * 80 - 10;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="SimpleChart SimpleChart--line">
      <div className="SimpleChart-title">{label}</div>
      <svg viewBox="0 0 100 100" className="SimpleChart-svg">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={points}
        />
      </svg>
    </div>
  );
}

function ProductivityDashboard() {
  const [chartType, setChartType] = React.useState('bar');
  const [activitySeries, setActivitySeries] = React.useState([]);
  const [metrics, setMetrics] = React.useState({
    totalTasks: 0,
    todoCount: 0,
    progressCount: 0,
    reviewCount: 0,
    doneCount: 0,
    completionRate: 0,
    score: 0,
    activityToday: 0,
  });

  const computeMetrics = React.useCallback(() => {
    const allTasks = storage.getCollection('tasks') || [];
    const activity = storage.getCollection('activity') || [];

    // Calcular métricas
    const done = allTasks.filter(t => t.status === 'done').length;
    const review = allTasks.filter(t => t.status === 'review').length;
    const inprogress = allTasks.filter(t => t.status === 'inprogress').length;
    const todo = allTasks.filter(t => (t.status || 'todo') === 'todo').length;
    const total = allTasks.length;

    // Score basado en transiciones
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    let score = 0;
    let activityCount = 0;

    activity.forEach(log => {
      if (!log.timestamp) return;
      const logDate = new Date(log.timestamp);
      logDate.setHours(0, 0, 0, 0);

      if (logDate.getTime() === todayStart.getTime()) {
        activityCount++;
        if (log.type === 'task.created') score += 5;
        if (log.type === 'task.moved' && log.to === 'inprogress') score += 5;
        if (log.type === 'task.moved' && log.to === 'review') score += 15;
        if (log.type === 'task.moved' && log.to === 'done') score += 30;
        if (log.type === 'note.converted') score += 10;
      }
    });

    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

    // Serie de actividad últimos 7 días
    const series = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const count = activity.filter(log => {
        if (!log.timestamp) return false;
        const logDate = new Date(log.timestamp);
        logDate.setHours(0, 0, 0, 0);
        return logDate.getTime() === d.getTime();
      }).length;
      series.push(count);
    }
    setActivitySeries(series);

    setMetrics({
      totalTasks: total,
      todoCount: todo,
      progressCount: inprogress,
      reviewCount: review,
      doneCount: done,
      completionRate,
      score,
      activityToday: activityCount,
    });
  }, []);

  React.useEffect(() => {
    computeMetrics();
    const id = setInterval(computeMetrics, 1000);
    const onStorage = () => computeMetrics();
    window.addEventListener('storage', onStorage);
    return () => {
      clearInterval(id);
      window.removeEventListener('storage', onStorage);
    };
  }, [computeMetrics]);

  const getScoreColor = (score) => {
    if (score >= 100) return '#00d1ff';
    if (score >= 75) return '#6bcf7f';
    if (score >= 50) return '#ffd93d';
    if (score >= 25) return '#ff9a76';
    return '#ff6b6b';
  };

  const flowValues = [metrics.todoCount, metrics.progressCount, metrics.reviewCount, metrics.doneCount];
  const flowColors = ['#6bcf7f', '#ffd93d', '#00d1ff', '#ff6b6b'];
  const flowLabels = ['TODO', 'Progress', 'Review', 'Done'];

  return (
    <div className="ProductivityDashboard">
      <h2 className="ProductivityDashboard-title">📊 Dashboard de Desempeño</h2>

      <div className="ProductivityDashboard-container">
        {/* Score Principal */}
        <div className="MetricCard MetricCard--primary">
          <div className="MetricCard-header">
            <h3>Puntuación de Hoy</h3>
            <div className="MetricCard-scoreCircle" style={{ borderColor: getScoreColor(metrics.score) }}>
              <span className="MetricCard-scoreValue">{metrics.score}</span>
            </div>
          </div>
          <p className="MetricCard-description">Ganas puntos al mover tareas en el flujo</p>
          <div className="ProductivityDashboard-scoreGuide">
            <small>TODO→Progress: +5 | Progress→Review: +15 | Review→Done: +30</small>
          </div>
        </div>

        {/* Tasa de Completación */}
        <div className="MetricCard MetricCard--secondary">
          <div className="MetricCard-header">
            <h3>Completación</h3>
            <span className="MetricCard-percentage">{metrics.completionRate}%</span>
          </div>
          <div className="ProgressBar">
            <div 
              className="ProgressBar-fill" 
              style={{ 
                width: `${metrics.completionRate}%`,
                backgroundColor: metrics.completionRate >= 75 ? '#6bcf7f' : metrics.completionRate >= 50 ? '#ffd93d' : '#ff6b6b'
              }}
            />
          </div>
          <p className="MetricCard-description">
            {metrics.doneCount} de {metrics.totalTasks} tareas completadas
          </p>
        </div>

        {/* Actividad del Día */}
        <div className="MetricCard MetricCard--activity">
          <div className="MetricCard-icon">⚡</div>
          <div className="MetricCard-content">
            <h3>Actividad Hoy</h3>
            <p className="MetricCard-value">{metrics.activityToday} acciones</p>
            <p className="MetricCard-description">
              {metrics.activityToday > 0 ? '¡Día productivo!' : 'Sin actividad aún'}
            </p>
          </div>
        </div>
      </div>

      {/* Gráficas */}
      <div className="ProductivityDashboard-charts">
        <div className="ProductivityDashboard-chartsHeader">
          <h3>Estado del Flujo</h3>
          <div className="ProductivityDashboard-chartControls">
            <label>Tipo de gráfica:</label>
            <select value={chartType} onChange={e => setChartType(e.target.value)} className="ProductivityDashboard-chartSelect">
              <option value="bar">Barras</option>
              <option value="pie">Pastel</option>
              <option value="donut">Dona</option>
              <option value="stacked">Apilada</option>
              <option value="trend">Tendencia</option>
            </select>
          </div>
        </div>

        <div className="ProductivityDashboard-chartsGrid">
          {chartType === 'bar' && (
            <SimpleBarChart label="Tareas por Estado" values={flowValues} colors={flowColors} />
          )}
          {chartType === 'pie' && (
            <SimplePieChart label="Distribución del Flujo" values={flowValues} colors={flowColors} />
          )}
          {chartType === 'donut' && (
            <SimpleDonutChart label="Distribución del Flujo" values={flowValues} colors={flowColors} />
          )}
          {chartType === 'stacked' && (
            <SimpleStackedBar label="Flujo Apilado" values={flowValues} colors={flowColors} />
          )}
          {chartType === 'trend' && (
            <SimpleLineChart label="Actividad (7 días)" values={activitySeries} color="#00d1ff" />
          )}
        </div>

        <div className="ProductivityDashboard-flowStats">
          {flowLabels.map((label, i) => (
            <div key={i} className="FlowStage">
              <div className="FlowStage-count" style={{ color: flowColors[i] }}>
                {flowValues[i]}
              </div>
              <div className="FlowStage-label">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export { ProductivityDashboard };
