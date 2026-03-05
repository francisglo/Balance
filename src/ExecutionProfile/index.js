import React from 'react';
import { getImpactScore, getGlobalMetrics } from '../services/metrics';
import './ExecutionProfile.css';

function formatMs(ms){
  if (!ms) return '-';
  const hrs = Math.round(ms/3600/1000);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.round(hrs/24);
  return `${days}d`;
}

export default function ExecutionProfile(){
  const [metrics, setMetrics] = React.useState(getGlobalMetrics());
  const [impact, setImpact] = React.useState(getImpactScore());

  React.useEffect(()=>{
    const id = setInterval(()=>{
      setMetrics(getGlobalMetrics());
      setImpact(getImpactScore());
    }, 1500);
    return ()=>clearInterval(id);
  },[]);

  return (
    <div className="ExecutionProfile card">
      <div className="Profile-header">
        <h3>Execution Profile</h3>
        <div className="Impact-score">{impact.score}</div>
      </div>

      <div className="Profile-grid">
        <div className="Profile-item">
          <div className="label">Completed</div>
          <div className="value">{metrics.completedCount}/{metrics.totalCount}</div>
        </div>
        <div className="Profile-item">
          <div className="label">Avg time</div>
          <div className="value">{formatMs(metrics.avgTimeMs)}</div>
        </div>
        <div className="Profile-item">
          <div className="label">Consistency</div>
          <div className="value">{metrics.consistency}%</div>
        </div>
        <div className="Profile-item">
          <div className="label">OKR Rate</div>
          <div className="value">{metrics.okrCompletionRate}%</div>
        </div>
      </div>

      <div className="Profile-details">
        <h4>Impact breakdown</h4>
        <div className="detail">OKR: {impact.details.okr}%</div>
        <div className="detail">Consistency: {impact.details.consistency}%</div>
        <div className="detail">Completion: {impact.details.completionRate}%</div>
        <div className="detail">SpeedScore: {impact.details.speedScore}%</div>
      </div>
    </div>
  );
}
