import { useState, useEffect } from 'react';
import { getMetrics } from '../lib/metrics.js';

export function PomodoroAchievements() {
  const [achievements, setAchievements] = useState([]);
  const [userLevel, setUserLevel] = useState(1);
  const [experiencePoints, setExperiencePoints] = useState(0);
  const [nextLevelXP, setNextLevelXP] = useState(100);
  const [newlyUnlocked, setNewlyUnlocked] = useState([]);

  const ACHIEVEMENT_DEFINITIONS = [
    // Beginner achievements
    {
      id: 'first_pomodoro',
      title: 'Primer Paso',
      description: 'Completa tu primer pomodoro',
      icon: '🌱',
      rarity: 'common',
      xpReward: 50,
      category: 'milestones',
      requirement: { type: 'total_pomodoros', value: 1 }
    },
    {
      id: 'early_bird',
      title: 'Madrugador',
      description: 'Completa un pomodoro antes de las 8 AM',
      icon: '🌅',
      rarity: 'common',
      xpReward: 75,
      category: 'habits',
      requirement: { type: 'early_morning', value: 1 }
    },
    {
      id: 'night_owl',
      title: 'Búho Nocturno',
      description: 'Completa un pomodoro después de las 10 PM',
      icon: '🦉',
      rarity: 'common',
      xpReward: 75,
      category: 'habits',
      requirement: { type: 'late_night', value: 1 }
    },
    
    // Progress achievements
    {
      id: 'getting_started',
      title: 'En Marcha',
      description: 'Completa 5 pomodoros',
      icon: '🚀',
      rarity: 'common',
      xpReward: 100,
      category: 'milestones',
      requirement: { type: 'total_pomodoros', value: 5 }
    },
    {
      id: 'focused_mind',
      title: 'Mente Enfocada',
      description: 'Completa 25 pomodoros',
      icon: '🧠',
      rarity: 'uncommon',
      xpReward: 250,
      category: 'milestones',
      requirement: { type: 'total_pomodoros', value: 25 }
    },
    {
      id: 'productivity_ninja',
      title: 'Ninja de Productividad',
      description: 'Completa 100 pomodoros',
      icon: '🥷',
      rarity: 'rare',
      xpReward: 500,
      category: 'milestones',
      requirement: { type: 'total_pomodoros', value: 100 }
    },
    {
      id: 'pomodoro_master',
      title: 'Maestro Pomodoro',
      description: 'Completa 500 pomodoros',
      icon: '🏆',
      rarity: 'legendary',
      xpReward: 1000,
      category: 'milestones',
      requirement: { type: 'total_pomodoros', value: 500 }
    },
    
    // Streak achievements
    {
      id: 'consistent_starter',
      title: 'Inicio Consistente',
      description: 'Mantén una racha de 3 días',
      icon: '🔥',
      rarity: 'common',
      xpReward: 150,
      category: 'streaks',
      requirement: { type: 'streak', value: 3 }
    },
    {
      id: 'habit_builder',
      title: 'Constructor de Hábitos',
      description: 'Mantén una racha de 7 días',
      icon: '⚡',
      rarity: 'uncommon',
      xpReward: 300,
      category: 'streaks',
      requirement: { type: 'streak', value: 7 }
    },
    {
      id: 'unstoppable_force',
      title: 'Fuerza Imparable',
      description: 'Mantén una racha de 30 días',
      icon: '🌟',
      rarity: 'rare',
      xpReward: 750,
      category: 'streaks',
      requirement: { type: 'streak', value: 30 }
    },
    {
      id: 'legend_status',
      title: 'Estado Legendario',
      description: 'Mantén una racha de 100 días',
      icon: '👑',
      rarity: 'legendary',
      xpReward: 2000,
      category: 'streaks',
      requirement: { type: 'streak', value: 100 }
    },
    
    // Daily achievements
    {
      id: 'productive_day',
      title: 'Día Productivo',
      description: 'Completa 4 pomodoros en un día',
      icon: '💪',
      rarity: 'common',
      xpReward: 100,
      category: 'daily',
      requirement: { type: 'daily_pomodoros', value: 4 }
    },
    {
      id: 'power_session',
      title: 'Sesión Poderosa',
      description: 'Completa 8 pomodoros en un día',
      icon: '⚡',
      rarity: 'uncommon',
      xpReward: 200,
      category: 'daily',
      requirement: { type: 'daily_pomodoros', value: 8 }
    },
    {
      id: 'marathon_mindset',
      title: 'Mentalidad Maratón',
      description: 'Completa 12 pomodoros en un día',
      icon: '🏃‍♂️',
      rarity: 'rare',
      xpReward: 400,
      category: 'daily',
      requirement: { type: 'daily_pomodoros', value: 12 }
    },
    
    // Focus quality achievements
    {
      id: 'focused_session',
      title: 'Sesión Enfocada',
      description: 'Mantén un focus score de 80+ por una semana',
      icon: '🎯',
      rarity: 'uncommon',
      xpReward: 250,
      category: 'quality',
      requirement: { type: 'weekly_focus_score', value: 80 }
    },
    {
      id: 'laser_focus',
      title: 'Enfoque Láser',
      description: 'Mantén un focus score de 95+ por una semana',
      icon: '🔍',
      rarity: 'rare',
      xpReward: 500,
      category: 'quality',
      requirement: { type: 'weekly_focus_score', value: 95 }
    },
    
    // Special achievements
    {
      id: 'weekend_warrior',
      title: 'Guerrero de Fin de Semana',
      description: 'Completa pomodoros en sábado y domingo',
      icon: '⚔️',
      rarity: 'uncommon',
      xpReward: 200,
      category: 'special',
      requirement: { type: 'weekend_sessions', value: 1 }
    },
    {
      id: 'perfect_week',
      title: 'Semana Perfecta',
      description: 'Completa al menos 1 pomodoro cada día de la semana',
      icon: '✨',
      rarity: 'rare',
      xpReward: 400,
      category: 'special',
      requirement: { type: 'perfect_week', value: 1 }
    },
    {
      id: 'speed_demon',
      title: 'Demonio de Velocidad',
      description: 'Completa 5 pomodoros sin pausas largas',
      icon: '💨',
      rarity: 'uncommon',
      xpReward: 300,
      category: 'special',
      requirement: { type: 'speed_session', value: 5 }
    }
  ];

  useEffect(() => {
    checkAchievements();
    calculateLevel();
  }, []);

  const checkAchievements = () => {
    const metrics = getMetrics();
    const pomodoroHistory = JSON.parse(localStorage.getItem('pomodoroHistory') || '[]');
    const unlockedAchievements = JSON.parse(localStorage.getItem('unlockedAchievements') || '[]');
    const newUnlocks = [];

    ACHIEVEMENT_DEFINITIONS.forEach(achievement => {
      if (unlockedAchievements.includes(achievement.id)) {
        return; // Already unlocked
      }

      const isUnlocked = checkAchievementRequirement(achievement.requirement, metrics, pomodoroHistory);
      
      if (isUnlocked) {
        unlockedAchievements.push(achievement.id);
        newUnlocks.push(achievement);
        
        // Award XP
        const currentXP = parseInt(localStorage.getItem('experiencePoints') || '0');
        localStorage.setItem('experiencePoints', (currentXP + achievement.xpReward).toString());
      }
    });

    if (newUnlocks.length > 0) {
      localStorage.setItem('unlockedAchievements', JSON.stringify(unlockedAchievements));
      setNewlyUnlocked(newUnlocks);
      
      // Show celebration animation
      setTimeout(() => setNewlyUnlocked([]), 5000);
    }

    // Prepare achievements for display
    const achievementsWithStatus = ACHIEVEMENT_DEFINITIONS.map(achievement => ({
      ...achievement,
      unlocked: unlockedAchievements.includes(achievement.id),
      progress: calculateAchievementProgress(achievement.requirement, metrics, pomodoroHistory)
    }));

    setAchievements(achievementsWithStatus);
  };

  const checkAchievementRequirement = (requirement, metrics, history) => {
    switch (requirement.type) {
      case 'total_pomodoros':
        return (metrics.totalPomodoros || 0) >= requirement.value;
      
      case 'streak': {
        const currentStreak = calculateCurrentStreak(history);
        return currentStreak >= requirement.value;
      }
      
      case 'daily_pomodoros': {
        const today = new Date().toDateString();
        const todayPomodoros = history.filter(p => 
          new Date(p.date).toDateString() === today
        ).length;
        return todayPomodoros >= requirement.value;
      }
      
      case 'weekly_focus_score':
        return (metrics.focusQualityIndex || 0) * 10 >= requirement.value;
      
      case 'early_morning':
        return history.some(p => new Date(p.date).getHours() < 8);
      
      case 'late_night':
        return history.some(p => new Date(p.date).getHours() >= 22);
      
      case 'weekend_sessions': {
        const weekendSessions = history.filter(p => {
          const day = new Date(p.date).getDay();
          return day === 0 || day === 6; // Sunday or Saturday
        });
        return weekendSessions.length >= requirement.value;
      }
      
      case 'perfect_week': {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thisWeek = history.filter(p => new Date(p.date) > weekAgo);
        
        const daysWithPomodoros = new Set(
          thisWeek.map(p => new Date(p.date).toDateString())
        );
        
        return daysWithPomodoros.size >= 7;
      }
      
      case 'speed_session': {
        // Check for sessions without long breaks
        const recentSessions = history.slice(-requirement.value);
        if (recentSessions.length < requirement.value) return false;
        
        // Check if sessions were completed within reasonable time windows
        for (let i = 1; i < recentSessions.length; i++) {
          const timeDiff = new Date(recentSessions[i].date) - new Date(recentSessions[i-1].date);
          if (timeDiff > 45 * 60 * 1000) return false; // More than 45 minutes apart
        }
        return true;
      }
      
      default:
        return false;
    }
  };

  const calculateAchievementProgress = (requirement, metrics, history) => {
    switch (requirement.type) {
      case 'total_pomodoros':
        return Math.min(100, ((metrics.totalPomodoros || 0) / requirement.value) * 100);
      
      case 'streak': {
        const currentStreak = calculateCurrentStreak(history);
        return Math.min(100, (currentStreak / requirement.value) * 100);
      }
      
      case 'daily_pomodoros': {
        const today = new Date().toDateString();
        const todayPomodoros = history.filter(p => 
          new Date(p.date).toDateString() === today
        ).length;
        return Math.min(100, (todayPomodoros / requirement.value) * 100);
      }
      
      case 'weekly_focus_score': {
        const currentScore = (metrics.focusQualityIndex || 0) * 10;
        return Math.min(100, (currentScore / requirement.value) * 100);
      }
      
      default:
        return 0;
    }
  };

  const calculateCurrentStreak = (history) => {
    if (history.length === 0) return 0;
    
    let streak = 0;
    const today = new Date().toDateString();
    let checkDate = new Date();
    
    while (true) {
      const dateStr = checkDate.toDateString();
      const hasPomodoro = history.some(p => new Date(p.date).toDateString() === dateStr);
      
      if (hasPomodoro) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        if (dateStr === today && new Date().getHours() < 12) {
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        }
        break;
      }
    }
    
    return streak;
  };

  const calculateLevel = () => {
    const xp = parseInt(localStorage.getItem('experiencePoints') || '0');
    setExperiencePoints(xp);
    
    // Level calculation: each level requires more XP
    let level = 1;
    let totalXPRequired = 0;
    let nextLevelXPRequired = 100;
    
    while (xp >= totalXPRequired + nextLevelXPRequired) {
      totalXPRequired += nextLevelXPRequired;
      level++;
      nextLevelXPRequired = Math.floor(100 * Math.pow(1.5, level - 1));
    }
    
    setUserLevel(level);
    setNextLevelXP(totalXPRequired + nextLevelXPRequired);
  };

  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'common': return 'border-gray-300 bg-gray-50';
      case 'uncommon': return 'border-green-300 bg-green-50';
      case 'rare': return 'border-blue-300 bg-blue-50';
      case 'legendary': return 'border-purple-300 bg-purple-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const getRarityTextColor = (rarity) => {
    switch (rarity) {
      case 'common': return 'text-gray-700';
      case 'uncommon': return 'text-green-700';
      case 'rare': return 'text-blue-700';
      case 'legendary': return 'text-purple-700';
      default: return 'text-gray-700';
    }
  };

  const getXPToNextLevel = () => {
    return nextLevelXP - experiencePoints;
  };

  const getLevelProgress = () => {
    const currentLevelXP = experiencePoints - (level => {
      let total = 0;
      for (let i = 1; i < level; i++) {
        total += Math.floor(100 * Math.pow(1.5, i - 1));
      }
      return total;
    })(userLevel);
    
    const levelXPRequired = Math.floor(100 * Math.pow(1.5, userLevel - 1));
    return (currentLevelXP / levelXPRequired) * 100;
  };

  const categoryNames = {
    milestones: 'Hitos',
    streaks: 'Rachas',
    daily: 'Diarios',
    quality: 'Calidad',
    habits: 'Hábitos',
    special: 'Especiales'
  };

  const groupedAchievements = achievements.reduce((groups, achievement) => {
    const category = achievement.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(achievement);
    return groups;
  }, {});

  return (
    <div className="space-y-6">
      {/* Level and XP Display */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 rounded-xl shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold">Nivel {userLevel}</h3>
            <p className="text-purple-100">Maestro de la Productividad</p>
          </div>
          <div className="text-right">
            <div className="text-3xl mb-2">🏆</div>
            <div className="text-sm text-purple-100">{experiencePoints} XP</div>
          </div>
        </div>
        
        {/* XP Progress Bar */}
        <div className="w-full bg-purple-400 rounded-full h-3 mb-2">
          <div 
            className="bg-white rounded-full h-3 transition-all duration-500"
            style={{ width: `${getLevelProgress()}%` }}
          ></div>
        </div>
        <div className="text-sm text-purple-100 text-center">
          {getXPToNextLevel()} XP para el siguiente nivel
        </div>
      </div>

      {/* Newly Unlocked Achievements */}
      {newlyUnlocked.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white p-6 rounded-xl shadow-lg animate-pulse">
          <div className="text-center">
            <div className="text-4xl mb-2">🎉</div>
            <h3 className="text-xl font-bold mb-2">¡Nuevo Logro Desbloqueado!</h3>
            {newlyUnlocked.map(achievement => (
              <div key={achievement.id} className="flex items-center justify-center gap-2 mb-2">
                <span className="text-2xl">{achievement.icon}</span>
                <span className="font-semibold">{achievement.title}</span>
                <span className="text-sm">+{achievement.xpReward} XP</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Achievement Categories */}
      {Object.entries(groupedAchievements).map(([category, categoryAchievements]) => (
        <div key={category} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">
            {categoryNames[category] || category}
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryAchievements.map(achievement => (
              <div
                key={achievement.id}
                className={`p-4 rounded-lg border-2 transition-all ${
                  achievement.unlocked 
                    ? getRarityColor(achievement.rarity) + ' shadow-md' 
                    : 'border-gray-200 bg-gray-50 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className={`text-2xl ${achievement.unlocked ? '' : 'grayscale'}`}>
                    {achievement.icon}
                  </span>
                  <div className="flex-1">
                    <h5 className={`font-semibold ${
                      achievement.unlocked ? getRarityTextColor(achievement.rarity) : 'text-gray-500'
                    }`}>
                      {achievement.title}
                    </h5>
                    <p className="text-xs text-gray-600 capitalize">
                      {achievement.rarity} • +{achievement.xpReward} XP
                    </p>
                  </div>
                  {achievement.unlocked && (
                    <div className="text-green-500">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                
                <p className="text-sm text-gray-600 mb-3">
                  {achievement.description}
                </p>
                
                {!achievement.unlocked && achievement.progress > 0 && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 rounded-full h-2 transition-all duration-300"
                      style={{ width: `${achievement.progress}%` }}
                    ></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Achievement Summary */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">📈 Resumen de Logros</h4>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {achievements.filter(a => a.unlocked).length}
            </div>
            <div className="text-sm text-gray-600">Desbloqueados</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {achievements.length - achievements.filter(a => a.unlocked).length}
            </div>
            <div className="text-sm text-gray-600">Por desbloquear</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {experiencePoints}
            </div>
            <div className="text-sm text-gray-600">XP Total</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {Math.round((achievements.filter(a => a.unlocked).length / achievements.length) * 100)}%
            </div>
            <div className="text-sm text-gray-600">Completado</div>
          </div>
        </div>
      </div>
    </div>
  );
}