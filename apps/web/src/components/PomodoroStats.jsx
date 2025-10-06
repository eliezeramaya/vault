import { useState, useEffect, useRef } from 'react';
import { getMetrics } from '../lib/metrics.js';

export function PomodoroStats() {
  const [stats, setStats] = useState(null);
  const [viewMode, setViewMode] = useState('week'); // week, month, all
  const progressChartRef = useRef(null);
  const weeklyChartRef = useRef(null);

  useEffect(() => {
    const updateStats = () => {
      const metrics = getMetrics();
      const pomodoroHistory = JSON.parse(localStorage.getItem('pomodoroHistory') || '[]');
      
      // Calculate comprehensive stats
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const weeklyPomodoros = pomodoroHistory.filter(p => new Date(p.date) > weekAgo);
      const monthlyPomodoros = pomodoroHistory.filter(p => new Date(p.date) > monthAgo);

      // Weekly data for chart
      const weeklyData = Array.from({length: 7}, (_, i) => {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dayPomodoros = pomodoroHistory.filter(p => {
          const pDate = new Date(p.date);
          return pDate.toDateString() === date.toDateString();
        }).length;
        return {
          day: date.toLocaleDateString('es', { weekday: 'short' }),
          pomodoros: dayPomodoros,
          date: date.toDateString()
        };
      }).reverse();

      // Calculate streaks
      const currentStreak = calculateCurrentStreak(pomodoroHistory);
      const longestStreak = calculateLongestStreak(pomodoroHistory);

      // Calculate productivity insights
      const avgDaily = weeklyPomodoros.length / 7;
      const productivityTrend = calculateTrend(weeklyData);
      const focusScore = Math.min(100, Math.round((metrics.focusQualityIndex || 0) * 10));

      setStats({
        total: metrics.totalPomodoros || 0,
        weekly: weeklyPomodoros.length,
        monthly: monthlyPomodoros.length,
        totalFocusTime: Math.round((metrics.totalFocusTime || 0) / 60), // in hours
        avgDaily: Math.round(avgDaily * 10) / 10,
        currentStreak,
        longestStreak,
        focusScore,
        productivityTrend,
        weeklyData,
        lastWeekComparison: calculateWeekComparison(pomodoroHistory),
        bestDay: findBestDay(pomodoroHistory),
        todayPomodoros: weeklyData[6]?.pomodoros || 0
      });
    };

    updateStats();
    const interval = setInterval(updateStats, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (stats && progressChartRef.current) {
      drawProgressChart();
    }
  }, [stats]);

  useEffect(() => {
    if (stats && weeklyChartRef.current) {
      drawWeeklyChart();
    }
  }, [stats, viewMode]);

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
        // Allow today to be empty if it's still early
        if (dateStr === today && new Date().getHours() < 12) {
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        }
        break;
      }
    }
    
    return streak;
  };

  const calculateLongestStreak = (history) => {
    if (history.length === 0) return 0;
    
    const dates = [...new Set(history.map(p => new Date(p.date).toDateString()))].sort();
    let maxStreak = 0;
    let currentStreak = 1;
    
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const diffDays = (curr - prev) / (1000 * 60 * 60 * 24);
      
      if (diffDays === 1) {
        currentStreak++;
      } else {
        maxStreak = Math.max(maxStreak, currentStreak);
        currentStreak = 1;
      }
    }
    
    return Math.max(maxStreak, currentStreak);
  };

  const calculateTrend = (weeklyData) => {
    if (weeklyData.length < 2) return 'stable';
    
    const recent = weeklyData.slice(-3).reduce((sum, day) => sum + day.pomodoros, 0);
    const earlier = weeklyData.slice(0, 3).reduce((sum, day) => sum + day.pomodoros, 0);
    
    if (recent > earlier * 1.2) return 'up';
    if (recent < earlier * 0.8) return 'down';
    return 'stable';
  };

  const calculateWeekComparison = (history) => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    const thisWeek = history.filter(p => new Date(p.date) > weekAgo).length;
    const lastWeek = history.filter(p => {
      const date = new Date(p.date);
      return date > twoWeeksAgo && date <= weekAgo;
    }).length;
    
    const change = thisWeek - lastWeek;
    const percentage = lastWeek > 0 ? Math.round((change / lastWeek) * 100) : 0;
    
    return { change, percentage, direction: change > 0 ? 'up' : change < 0 ? 'down' : 'same' };
  };

  const findBestDay = (history) => {
    const dayCount = {};
    history.forEach(p => {
      const day = new Date(p.date).toLocaleDateString('es', { weekday: 'long' });
      dayCount[day] = (dayCount[day] || 0) + 1;
    });
    
    const bestDay = Object.keys(dayCount).reduce((a, b) => 
      dayCount[a] > dayCount[b] ? a : b, 'lunes');
    
    return { name: bestDay, count: dayCount[bestDay] || 0 };
  };

  const drawProgressChart = () => {
    const canvas = progressChartRef.current;
    if (!canvas || !stats) return;
    
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw focus score circle
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 20;
    
    // Background circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 12;
    ctx.stroke();
    
    // Progress circle
    const progressAngle = (stats.focusScore / 100) * 2 * Math.PI - Math.PI / 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, -Math.PI / 2, progressAngle);
    
    // Gradient for progress
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#f59e0b');
    gradient.addColorStop(0.5, '#ef4444');
    gradient.addColorStop(1, '#dc2626');
    
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.stroke();
    
    // Center text
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 28px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(`${stats.focusScore}%`, centerX, centerY - 5);
    
    ctx.fillStyle = '#6b7280';
    ctx.font = '14px system-ui';
    ctx.fillText('Focus Score', centerX, centerY + 20);
  };

  const drawWeeklyChart = () => {
    const canvas = weeklyChartRef.current;
    if (!canvas || !stats) return;
    
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    const data = stats.weeklyData;
    const maxPomodoros = Math.max(...data.map(d => d.pomodoros), 1);
    const barWidth = (width - 40) / data.length;
    const chartHeight = height - 60;
    
    // Draw bars
    data.forEach((day, index) => {
      const barHeight = (day.pomodoros / maxPomodoros) * chartHeight;
      const x = 20 + index * barWidth + barWidth * 0.2;
      const y = height - 40 - barHeight;
      const barWidthActual = barWidth * 0.6;
      
      // Bar gradient
      const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
      gradient.addColorStop(0, '#f59e0b');
      gradient.addColorStop(1, '#d97706');
      
      // Draw bar
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidthActual, barHeight);
      
      // Day label
      ctx.fillStyle = '#6b7280';
      ctx.font = '12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(day.day, x + barWidthActual / 2, height - 10);
      
      // Value label
      if (day.pomodoros > 0) {
        ctx.fillStyle = '#1f2937';
        ctx.font = 'bold 12px system-ui';
        ctx.fillText(day.pomodoros, x + barWidthActual / 2, y - 5);
      }
    });
    
    // Y-axis labels
    for (let i = 0; i <= maxPomodoros; i++) {
      const y = height - 40 - (i / maxPomodoros) * chartHeight;
      ctx.fillStyle = '#9ca3af';
      ctx.font = '10px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText(i, 15, y + 3);
      
      // Grid lines
      if (i > 0) {
        ctx.strokeStyle = '#f3f4f6';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(20, y);
        ctx.lineTo(width - 10, y);
        ctx.stroke();
      }
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      default: return '➡️';
    }
  };

  const getTrendColor = (trend) => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando estadísticas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with view controls */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">📊 Estadísticas de Productividad</h3>
        <div className="flex gap-2">
          {['week', 'month', 'all'].map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 text-sm rounded-md transition-all ${
                viewMode === mode 
                  ? 'bg-red-100 text-red-700 font-medium' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {mode === 'week' ? 'Semana' : mode === 'month' ? 'Mes' : 'Todo'}
            </button>
          ))}
        </div>
      </div>

      {/* Key metrics cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl border border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🍅</span>
            <span className="text-sm font-medium text-red-700">Hoy</span>
          </div>
          <div className="text-2xl font-bold text-red-900">{stats.todayPomodoros}</div>
          <div className="text-xs text-red-600">pomodoros</div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🔥</span>
            <span className="text-sm font-medium text-orange-700">Racha</span>
          </div>
          <div className="text-2xl font-bold text-orange-900">{stats.currentStreak}</div>
          <div className="text-xs text-orange-600">días consecutivos</div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">⏱️</span>
            <span className="text-sm font-medium text-green-700">Total</span>
          </div>
          <div className="text-2xl font-bold text-green-900">{stats.totalFocusTime}h</div>
          <div className="text-xs text-green-600">enfocado</div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">📈</span>
            <span className="text-sm font-medium text-blue-700">Promedio</span>
          </div>
          <div className="text-2xl font-bold text-blue-900">{stats.avgDaily}</div>
          <div className="text-xs text-blue-600">por día</div>
        </div>
      </div>

      {/* Focus Score Circle */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h4 className="font-semibold text-gray-900 mb-4 text-center">🎯 Puntuación de Enfoque</h4>
        <div className="flex justify-center">
          <canvas
            ref={progressChartRef}
            width={200}
            height={200}
            className="max-w-full"
          />
        </div>
        <div className="text-center mt-4">
          <div className="text-sm text-gray-600">
            {stats.focusScore >= 80 ? '¡Excelente concentración! 🌟' :
             stats.focusScore >= 60 ? 'Buen nivel de enfoque 👍' :
             stats.focusScore >= 40 ? 'Puedes mejorar 💪' :
             'Necesitas más práctica 📚'}
          </div>
        </div>
      </div>

      {/* Weekly Chart */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h4 className="font-semibold text-gray-900 mb-4">📅 Actividad de la Semana</h4>
        <canvas
          ref={weeklyChartRef}
          width={400}
          height={250}
          className="w-full max-w-full"
        />
      </div>

      {/* Insights and comparisons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h4 className="font-semibold text-gray-900 mb-4">📊 Tendencias</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Productividad</span>
              <div className={`flex items-center gap-1 ${getTrendColor(stats.productivityTrend)}`}>
                <span>{getTrendIcon(stats.productivityTrend)}</span>
                <span className="text-sm font-medium">
                  {stats.productivityTrend === 'up' ? 'Subiendo' :
                   stats.productivityTrend === 'down' ? 'Bajando' : 'Estable'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">vs. Semana pasada</span>
              <div className={`flex items-center gap-1 ${
                stats.lastWeekComparison.direction === 'up' ? 'text-green-600' :
                stats.lastWeekComparison.direction === 'down' ? 'text-red-600' : 'text-gray-600'
              }`}>
                <span>
                  {stats.lastWeekComparison.direction === 'up' ? '⬆️' :
                   stats.lastWeekComparison.direction === 'down' ? '⬇️' : '➡️'}
                </span>
                <span className="text-sm font-medium">
                  {stats.lastWeekComparison.change > 0 ? '+' : ''}{stats.lastWeekComparison.change}
                  {stats.lastWeekComparison.percentage !== 0 && ` (${stats.lastWeekComparison.percentage}%)`}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h4 className="font-semibold text-gray-900 mb-4">🏆 Récords Personales</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Racha más larga</span>
              <span className="text-lg font-bold text-orange-600">
                {stats.longestStreak} días 🔥
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Mejor día</span>
              <span className="text-sm font-medium text-blue-600">
                {stats.bestDay.name} ({stats.bestDay.count} 🍅)
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total completados</span>
              <span className="text-lg font-bold text-green-600">
                {stats.total} 🍅
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Motivational message */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-200">
        <div className="text-center">
          <div className="text-2xl mb-2">
            {stats.currentStreak >= 7 ? '🌟' :
             stats.currentStreak >= 3 ? '🔥' :
             stats.todayPomodoros >= 4 ? '💪' : '🌱'}
          </div>
          <div className="text-lg font-semibold text-purple-900 mb-1">
            {stats.currentStreak >= 7 ? '¡Increíble racha! Eres imparable' :
             stats.currentStreak >= 3 ? '¡Excelente consistencia! Sigue así' :
             stats.todayPomodoros >= 4 ? '¡Gran día de productividad!' :
             '¡Cada pomodoro cuenta! Sigue construyendo el hábito'}
          </div>
          <div className="text-sm text-purple-700">
            {stats.currentStreak === 0 ? 'Comienza tu racha hoy mismo' :
             `Tu próximo objetivo: ${stats.currentStreak + 1} días seguidos`}
          </div>
        </div>
      </div>
    </div>
  );
}