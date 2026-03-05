// Skills & Competencies Tracking Service
const SKILLS_PREFIX = 'BALANCE_V1_skills';

const skillsService = {
  /**
   * Add a skill/competency from completed tasks
   * Called when a task moves to 'done'
   */
  extractSkillFromTask(task) {
    if (!task || !task.title) return null;

    // Auto-detect skills from task titles and OKRs
    const keywords = this.analyzeTaskKeywords(task.title);
    
    const skill = {
      id: `skill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: this.generateSkillName(task.title, keywords),
      category: this.inferCategory(task.okrId, keywords),
      level: 'novice', // novice, intermediate, expert
      xp: 10, // Experience points
      tasksCompleted: 1,
      firstObtainedAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      metadata: {
        source: 'task_completion',
        taskId: task.id,
        taskTitle: task.title,
        priority: task.priority,
      },
    };

    return skill;
  },

  /**
   * Register skill to user's portfolio
   */
  recordSkill(skill) {
    const skills = this.getSkills();
    
    // Check if skill already exists (case-insensitive)
    const existing = skills.find(s => 
      s.name.toLowerCase() === skill.name.toLowerCase()
    );

    if (existing) {
      // Increment: level up via XP
      existing.xp += skill.xp;
      existing.tasksCompleted += 1;
      existing.lastUsedAt = skill.lastUsedAt;
      
      // Level progression: every 50 XP = 1 level
      if (existing.xp >= 50 && existing.level === 'novice') {
        existing.level = 'intermediate';
        existing.xp = existing.xp - 50;
      } else if (existing.xp >= 100 && existing.level === 'intermediate') {
        existing.level = 'expert';
        existing.xp = existing.xp - 100;
      }
    } else {
      // New skill
      skills.push(skill);
    }

    localStorage.setItem(SKILLS_PREFIX, JSON.stringify(skills));
    return skills;
  },

  /**
   * Get all skills
   */
  getSkills() {
    const data = localStorage.getItem(SKILLS_PREFIX);
    return data ? JSON.parse(data) : [];
  },

  /**
   * Get skill portfolio summary
   */
  getPortfolio() {
    const skills = this.getSkills();
    const categories = {};

    skills.forEach(skill => {
      if (!categories[skill.category]) {
        categories[skill.category] = [];
      }
      categories[skill.category].push(skill);
    });

    return {
      totalSkills: skills.length,
      expertSkills: skills.filter(s => s.level === 'expert').length,
      intermediateSkills: skills.filter(s => s.level === 'intermediate').length,
      noviceSkills: skills.filter(s => s.level === 'novice').length,
      categories,
      skills: skills.sort((a, b) => b.xp - a.xp), // Sort by XP descending
    };
  },

  /**
   * Analyze keywords from task title
   */
  analyzeTaskKeywords(title) {
    const lowered = title.toLowerCase();
    const keywords = {
      technical: ['code', 'debug', 'refactor', 'design', 'architecture', 'sql', 'api', 'database'],
      communication: ['present', 'meeting', 'email', 'report', 'document', 'explain'],
      leadership: ['lead', 'manage', 'delegate', 'mentor', 'coach', 'review'],
      creative: ['design', 'create', 'art', 'ui', 'ux', 'video', 'content'],
      analysis: ['analyze', 'research', 'data', 'metric', 'report', 'evaluate'],
      learning: ['learn', 'study', 'course', 'training', 'workshop', 'certification'],
    };

    const found = {};
    Object.entries(keywords).forEach(([category, words]) => {
      words.forEach(word => {
        if (lowered.includes(word)) {
          found[category] = true;
        }
      });
    });

    return found;
  },

  /**
   * Generate skill name from task title
   */
  generateSkillName(title, keywords) {
    // Simple heuristic: extract nouns/main actions
    const words = title.split(/[\s\-_]+/).filter(w => w.length > 2);
    
    if (words.length === 0) return 'Task Completion';
    if (words.length === 1) return words[0].charAt(0).toUpperCase() + words[0].slice(1);
    
    // Take first 2-3 meaningful words
    const meaningful = words
      .filter(w => !['and', 'the', 'for', 'with', 'from'].includes(w.toLowerCase()))
      .slice(0, 2);
    
    return meaningful
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  },

  /**
   * Infer category from context
   */
  inferCategory(okrId, keywords) {
    // Priority order
    if (keywords.technical) return 'Technical';
    if (keywords.leadership) return 'Leadership';
    if (keywords.communication) return 'Communication';
    if (keywords.creative) return 'Creative';
    if (keywords.analysis) return 'Analysis';
    if (keywords.learning) return 'Learning';
    return 'General';
  },

  /**
   * Clear all skills (for testing)
   */
  clearSkills() {
    localStorage.removeItem(SKILLS_PREFIX);
  },
};

export default skillsService;
