import React from 'react';
import { evaluateAlerts } from '../services/metrics';
import './Alerts.css';

export default function Alerts(){
  const [alerts, setAlerts] = React.useState(evaluateAlerts());
  React.useEffect(()=>{
    const id = setInterval(()=> setAlerts(evaluateAlerts()), 1500);
    return ()=>clearInterval(id);
  },[]);

  if (!alerts || alerts.length===0) return <div className="Alerts card muted">No alerts</div>;

  return (
    <div className="Alerts card">
      <h4>Alerts</h4>
      <ul>
        {alerts.map((a, idx)=> (
          <li key={idx} className={`alert-item alert-${a.severity}`}>
            <div className="alert-title">{a.title}</div>
            <div className="alert-type">{a.type}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
