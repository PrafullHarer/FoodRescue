import { useEffect, useState } from 'react';
import api from '../../api/client';
import {
  Leaf, Award, TrendingUp, Users, HeartHandshake,
  ArrowUpRight, Flame, Scale, RefreshCw
} from 'lucide-react';
import CommunityLeaderboard from '../../components/common/CommunityLeaderboard';

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState({
    meals_saved: 0,
    kg_rescued: 0,
    co2_prevented_kg: 0,
    active_volunteers: 0,
    donations_completed: 0,
  });
  const [leaderboard, setLeaderboard] = useState([]);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('all');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const [impactRes, trendsRes, leaderRes] = await Promise.allSettled([
          api.get('/analytics/impact', { params: { range: timeRange } }),
          api.get('/analytics/trends', { params: { range: timeRange } }),
          api.get('/analytics/leaderboard', { params: { range: timeRange } }),
        ]);

        if (impactRes.status === 'fulfilled' && impactRes.value.data?.data) {
          setMetrics(impactRes.value.data.data);
        }
        if (trendsRes.status === 'fulfilled' && trendsRes.value.data?.data) {
          setTrends(trendsRes.value.data.data);
        }
        if (leaderRes.status === 'fulfilled' && leaderRes.value.data?.data) {
          setLeaderboard(leaderRes.value.data.data);
        }
      } catch (err) {
        console.error('Failed to load analytics', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [timeRange]);

  const displayTrends = trends;
  const displayLeaderboard = leaderboard;
  const maxKg = Math.max(...displayTrends.map(t => t.kg || 0), 1);

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#232328] pb-5 sm:pb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Impact & Analytics</h1>
          <p className="text-neutral-400 text-xs sm:text-sm mt-1">
            Real-time environmental and humanitarian metrics from our PostgreSQL database.
          </p>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
          {loading && (
            <div className="flex items-center gap-1.5 text-xs text-neutral-400">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
              <span>Updating...</span>
            </div>
          )}
          <div className="flex bg-[#121214] p-1 rounded-xl border border-[#232328] ml-auto sm:ml-0">
            {['month', 'year', 'all'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                  timeRange === range
                    ? 'bg-white text-black font-bold shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {range === 'all' ? 'All Time' : `This ${range}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Hero Impact Cards (2-column on mobile, 4-column on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        <div className="stat-card p-3.5 sm:p-5">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-neutral-400">Meals Served</p>
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white mt-1 sm:mt-2 tracking-tight">
                {(metrics.meals_saved || 0).toLocaleString()}
              </h3>
            </div>
            <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-[#1c1c20] border border-[#27272e] text-white flex items-center justify-center flex-shrink-0">
              <HeartHandshake className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <p className="text-[10px] sm:text-xs text-neutral-400 font-medium flex items-center gap-1 mt-1 truncate">
            <ArrowUpRight className="w-3 h-3 text-white flex-shrink-0" /> Nourishing local shelters
          </p>
        </div>

        <div className="stat-card p-3.5 sm:p-5">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-neutral-400">Food Rescued</p>
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white mt-1 sm:mt-2 tracking-tight">
                {(metrics.kg_rescued || 0).toLocaleString()} <span className="text-xs sm:text-sm font-medium text-neutral-400">kg</span>
              </h3>
            </div>
            <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-[#1c1c20] border border-[#27272e] text-white flex items-center justify-center flex-shrink-0">
              <Leaf className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <p className="text-[10px] sm:text-xs text-neutral-400 font-medium flex items-center gap-1 mt-1 truncate">
            <Scale className="w-3 h-3 text-white flex-shrink-0" /> Diverted from landfills
          </p>
        </div>

        <div className="stat-card p-3.5 sm:p-5">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-neutral-400">CO₂ Avoided</p>
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white mt-1 sm:mt-2 tracking-tight">
                {(metrics.co2_prevented_kg || 0).toLocaleString()} <span className="text-xs sm:text-sm font-medium text-neutral-400">kg</span>
              </h3>
            </div>
            <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-[#1c1c20] border border-[#27272e] text-white flex items-center justify-center flex-shrink-0">
              <Flame className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <p className="text-[10px] sm:text-xs text-neutral-400 font-medium flex items-center gap-1 mt-1 truncate">
            <TrendingUp className="w-3 h-3 text-white flex-shrink-0" /> Direct climate positive
          </p>
        </div>

        <div className="stat-card p-3.5 sm:p-5">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-neutral-400">Completed</p>
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white mt-1 sm:mt-2 tracking-tight">
                {(metrics.donations_completed || 0).toLocaleString()}
              </h3>
            </div>
            <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-[#1c1c20] border border-[#27272e] text-white flex items-center justify-center flex-shrink-0">
              <Award className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <p className="text-[10px] sm:text-xs text-neutral-400 font-medium flex items-center gap-1 mt-1 truncate">
            <Users className="w-3 h-3 text-white flex-shrink-0" /> Across partners
          </p>
        </div>
      </div>

      {/* Monthly Trends Chart */}
      <div className="bg-[#121214] p-4 sm:p-6 rounded-2xl border border-[#232328]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 sm:mb-6">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">Food Rescue Volume Trends</h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              {timeRange === 'month'
                ? 'Day-wise breakdown of rescued surplus weight'
                : 'Monthly breakdown of rescued surplus weight'}
            </p>
          </div>
          <span className="badge badge-neutral uppercase text-[10px] font-bold self-start sm:self-auto">
            {timeRange === 'month' ? 'Daily View' : 'Monthly View'}
          </span>
        </div>

        {displayTrends.length > 0 ? (
          <div className="overflow-x-auto pb-2 -mx-4 sm:mx-0 px-4 sm:px-0">
            <div className="h-60 sm:h-64 min-w-[360px] sm:min-w-full flex items-end gap-3 sm:gap-6 pt-8 pb-4 border-b border-[#232328] px-2 sm:px-4">
              {displayTrends.map((item, idx) => {
                const heightPercent = Math.max(12, Math.round(((item.kg || item.meals || 0) / maxKg) * 100));
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end min-w-[36px]">
                    <div className="text-[11px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.kg ? `${item.kg}kg` : `${item.meals}m`}
                    </div>
                    <div className="w-full bg-[#1c1c20] rounded-t-xl overflow-hidden h-full flex items-end">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full bg-white rounded-t-xl group-hover:bg-neutral-200 transition-all duration-500"
                      ></div>
                    </div>
                    <span className="text-[11px] font-medium text-neutral-400 truncate max-w-[48px] text-center">{item.month}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center text-neutral-400 text-sm border-b border-[#232328]">
            No donation trend records found for selected period.
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <CommunityLeaderboard
        leaderboard={displayLeaderboard}
        loading={loading}
        showPodium={true}
      />
    </div>
  );
}
