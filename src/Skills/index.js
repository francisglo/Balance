import React from 'react';
import skillsService from '../services/skills';
import './Skills.css';

function SkillBadge({ skill }) {
  const levelColors = {
    novice: '#6bcf7f',
    intermediate: '#ffd93d',
    expert: '#ff6b6b',
  };

  const levelLabels = {
    novice: 'Novato',
    intermediate: 'Intermedio',
    expert: 'Experto',
  };

  return (
    <div className="SkillBadge" title={skill.name}>
      <div className="SkillBadge-name">{skill.name}</div>
      <div className="SkillBadge-meta">
        <span className="SkillBadge-level" style={{ backgroundColor: levelColors[skill.level] }}>
          {levelLabels[skill.level]}
        </span>
        <span className="SkillBadge-xp">{skill.xp} XP</span>
      </div>
      <div className="SkillBadge-tasks">
        {skill.tasksCompleted} {skill.tasksCompleted === 1 ? 'tarea' : 'tareas'}
      </div>
    </div>
  );
}

export default function SkillsPortfolio() {
  const [portfolio, setPortfolio] = React.useState(null);
  const [selectedCategory, setSelectedCategory] = React.useState('all');

  React.useEffect(() => {
    const refresh = () => {
      const data = skillsService.getPortfolio();
      setPortfolio(data);
    };

    refresh();
    const id = setInterval(refresh, 1500);
    const onStorage = () => refresh();
    window.addEventListener('storage', onStorage);

    return () => {
      clearInterval(id);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  if (!portfolio) {
    return (
      <div className="SkillsPortfolio">
        <p>Cargando portfolio...</p>
      </div>
    );
  }

  const categories = Object.keys(portfolio.categories || {});
  const displaySkills = selectedCategory === 'all' 
    ? portfolio.skills 
    : portfolio.categories[selectedCategory] || [];

  return (
    <div className="SkillsPortfolio">
      <h2 className="SkillsPortfolio-title">🏆 Portfolio de Competencias</h2>

      {/* Summary Stats */}
      <div className="SkillsPortfolio-stats">
        <div className="SkillStat">
          <span className="SkillStat-label">Total</span>
          <span className="SkillStat-value">{portfolio.totalSkills}</span>
        </div>
        <div className="SkillStat">
          <span className="SkillStat-label">Experto</span>
          <span className="SkillStat-value" style={{ color: '#ff6b6b' }}>
            {portfolio.expertSkills}
          </span>
        </div>
        <div className="SkillStat">
          <span className="SkillStat-label">Intermedio</span>
          <span className="SkillStat-value" style={{ color: '#ffd93d' }}>
            {portfolio.intermediateSkills}
          </span>
        </div>
        <div className="SkillStat">
          <span className="SkillStat-label">Novato</span>
          <span className="SkillStat-value" style={{ color: '#6bcf7f' }}>
            {portfolio.noviceSkills}
          </span>
        </div>
      </div>

      {/* Category Filter */}
      <div className="SkillsPortfolio-filters">
        <button
          className={`SkillFilter ${selectedCategory === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('all')}
        >
          Todas ({portfolio.totalSkills})
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            className={`SkillFilter ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat} ({portfolio.categories[cat].length})
          </button>
        ))}
      </div>

      {/* Skills Grid */}
      {displaySkills.length > 0 ? (
        <div className="SkillsPortfolio-grid">
          {displaySkills.map(skill => (
            <SkillBadge key={skill.id} skill={skill} />
          ))}
        </div>
      ) : (
        <div className="SkillsPortfolio-empty">
          <p>Completa tareas para construir tu portfolio de competencias.</p>
        </div>
      )}
    </div>
  );
}
