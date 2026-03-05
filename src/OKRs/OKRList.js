import React from 'react';
import storage from '../services/storage';
import './OKR.css';

function OKRList() {
  const [okrs, setOkrs] = React.useState([]);
  const [title, setTitle] = React.useState('');
  const [krs, setKrs] = React.useState('');

  React.useEffect(() => {
    setOkrs(storage.getCollection('okrs'));
  }, []);

  const refresh = () => setOkrs(storage.getCollection('okrs'));

  const handleAdd = (e) => {
    e.preventDefault();
    if (!title) return;
    const krList = krs.split(',').map(s => ({ id: Date.now()+Math.random(), text: s.trim(), progress: 0 }));
    storage.addItem('okrs', { title, krs: krList, createdAt: new Date().toISOString(), progress: 0 });
    setTitle(''); setKrs('');
    refresh();
  };

  return (
    <div className="OKRList">
      <h3>OKRs</h3>
      <form className="OKRForm" onSubmit={handleAdd}>
        <input placeholder="Objective title" value={title} onChange={e=>setTitle(e.target.value)} />
        <input placeholder="Key Results (comma separated)" value={krs} onChange={e=>setKrs(e.target.value)} />
        <button type="submit">Add OKR</button>
      </form>

      <div className="OKRList-items">
        {okrs.map(o => (
          <div className="OKRItem" key={o.id}>
            <div className="OKRItem-title">{o.title}</div>
            <div className="OKRKrs">
              {o.krs && o.krs.map(kr => (
                <div className="OKRKr" key={kr.id}>{kr.text} <span className="OKRKr-progress">{kr.progress}%</span></div>
              ))}
            </div>
          </div>
        ))}
        {okrs.length === 0 && <div className="OKR-empty">No OKRs yet</div>}
      </div>
    </div>
  );
}

export default OKRList;