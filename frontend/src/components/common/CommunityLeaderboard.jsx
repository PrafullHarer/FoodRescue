import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy, Award, Crown, Medal, Search, Flame,
  Building2, Store, Truck, Sparkles, ArrowRight,
  TrendingUp, CheckCircle2, HeartHandshake
} from 'lucide-react';

const getInitials = (name) => {
  if (!name) return 'CR';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getRoleConfig = (type) => {
  const t = (type || '').toLowerCase();
  if (t === 'provider') {
    return {
      label: 'Food Donor',
      badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
      avatarBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      icon: Store,
    };
  }
  if (t === 'ngo') {
    return {
      label: 'Shelter NGO',
      badgeClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30',
      avatarBg: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
      icon: Building2,
    };
  }
  return {
    label: 'Volunteer',
    badgeClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30',
    avatarBg: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
    icon: Truck,
  };
};

const formatImpact = (item) => {
  if (item.kg && item.kg > 0) {
    return {
      value: `${item.kg.toLocaleString()} kg`,
      label: 'Food Rescued',
    };
  }
  if (item.meals && item.meals > 0) {
    return {
      value: `${item.meals.toLocaleString()} meals`,
      label: 'Meals Provided',
    };
  }
  if (item.donations && item.donations > 0) {
    return {
      value: `${item.donations.toLocaleString()} listings`,
      label: 'Donations Posted',
    };
  }
  if (item.deliveries && item.deliveries > 0) {
    return {
      value: `${item.deliveries.toLocaleString()} runs`,
      label: 'Missions Completed',
    };
  }
  if (item.claimed && item.claimed > 0) {
    return {
      value: `${item.claimed.toLocaleString()} parcels`,
      label: 'Parcels Claimed',
    };
  }
  return {
    value: '0 meals',
    label: 'Community Champion',
  };
};

export default function CommunityLeaderboard({
  leaderboard = [],
  loading = false,
  showPodium = true,
  compact = false,
  limit = null,
  title = 'Community Champions Leaderboard',
  subtitle = 'Recognizing top contributors in surplus food rescue and hunger relief',
  actionLink = null,
}) {
  const [roleFilter, setRoleFilter] = useState('ALL'); // ALL, Provider, NGO, Volunteer
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return leaderboard.filter((item) => {
      const matchesRole =
        roleFilter === 'ALL' ||
        (item.type || item.role || '').toLowerCase() === roleFilter.toLowerCase();
      const matchesSearch =
        !search.trim() ||
        (item.name || item.full_name || '')
          .toLowerCase()
          .includes(search.toLowerCase().trim());
      return matchesRole && matchesSearch;
    });
  }, [leaderboard, roleFilter, search]);

  const displayedList = limit ? filtered.slice(0, limit) : filtered;

  // Top 3 Podium champions (from the overall list)
  const podiumTop3 = useMemo(() => {
    if (!showPodium || compact || leaderboard.length < 3) return null;
    return {
      first: leaderboard[0],
      second: leaderboard[1],
      third: leaderboard[2],
    };
  }, [showPodium, compact, leaderboard]);

  const renderRankBadge = (rank) => {
    if (rank === 1) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-neutral-950 shadow-md shadow-amber-500/25 border border-amber-300/60">
          <Crown className="w-3.5 h-3.5 fill-current" />
          #1
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-200 dark:bg-slate-700/80 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-600 shadow-xs">
          <Medal className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
          #2
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 shadow-xs">
          <Medal className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
          #3
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center font-mono font-bold text-xs text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-[#1a1a20] px-2 py-0.5 rounded-md border border-neutral-200 dark:border-neutral-800">
        #{rank}
      </span>
    );
  };

  const getRowHighlightClass = (rank) => {
    if (rank === 1) {
      return 'bg-gradient-to-r from-amber-500/10 via-amber-500/[0.03] to-transparent hover:from-amber-500/15 hover:via-amber-500/[0.06] border-l-4 border-l-amber-400 transition-colors';
    }
    if (rank === 2) {
      return 'bg-gradient-to-r from-slate-400/10 via-slate-400/[0.02] to-transparent hover:from-slate-400/15 hover:via-slate-400/[0.05] border-l-4 border-l-slate-400 transition-colors';
    }
    if (rank === 3) {
      return 'bg-gradient-to-r from-amber-700/10 via-amber-700/[0.02] to-transparent hover:from-amber-700/15 hover:via-amber-700/[0.05] border-l-4 border-l-amber-600 transition-colors';
    }
    return 'hover:bg-neutral-50 dark:hover:bg-[#18181b]/70 transition-colors';
  };

  return (
    <div className="space-y-6">
      {/* Podium Showcase (Top 3 Champions) */}
      {podiumTop3 && (
        <div className="bg-white dark:bg-[#121214] rounded-3xl border border-neutral-200 dark:border-[#232328] p-5 sm:p-7 shadow-xl overflow-hidden relative">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-amber-500/10 blur-3xl pointer-events-none rounded-full" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 relative">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30">
                  <Trophy className="w-4 h-4" />
                </span>
                <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white tracking-tight">
                  Top Champions Podium
                </h3>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Highest impact contributors leading the FoodRescue community
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-neutral-100 dark:bg-[#1c1c22] border border-neutral-200 dark:border-[#2e2e38] text-neutral-700 dark:text-neutral-300 self-start sm:self-auto">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Real-Time Standing</span>
            </div>
          </div>

          {/* Podium Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 items-end">
            {/* 2nd Place (Silver) */}
            <div className="order-2 sm:order-1 bg-gradient-to-b from-slate-100 via-white to-slate-50 dark:from-slate-900/30 dark:via-[#141418] dark:to-[#121214] rounded-2xl border border-slate-300 dark:border-slate-700/60 p-4 sm:p-5 flex flex-col items-center text-center shadow-md relative transition-transform hover:-translate-y-1">
              <span className="absolute -top-3 px-3 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-600 shadow-sm flex items-center gap-1">
                <Medal className="w-3 h-3 text-slate-500 dark:text-slate-300" /> 2nd Place
              </span>
              <div className="w-14 h-14 rounded-2xl bg-slate-200/70 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center text-lg font-black text-slate-700 dark:text-slate-200 shadow-inner mt-2 mb-3">
                {getInitials(podiumTop3.second?.name)}
              </div>
              <h4 className="font-bold text-sm text-neutral-900 dark:text-white truncate max-w-full">
                {podiumTop3.second?.name}
              </h4>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border mt-1.5 ${getRoleConfig(podiumTop3.second?.type).badgeClass}`}>
                {getRoleConfig(podiumTop3.second?.type).label}
              </span>
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/80 w-full">
                <div className="text-base font-extrabold font-mono text-neutral-900 dark:text-white">
                  {formatImpact(podiumTop3.second).value}
                </div>
                <span className="text-[10px] uppercase font-semibold text-neutral-500 dark:text-neutral-400 tracking-wider">
                  {formatImpact(podiumTop3.second).label}
                </span>
              </div>
            </div>

            {/* 1st Place (Gold Champion - Center & Elevated) */}
            <div className="order-1 sm:order-2 bg-gradient-to-b from-amber-500/15 via-amber-500/5 to-white dark:from-amber-500/20 dark:via-[#161512] dark:to-[#121214] rounded-2xl border-2 border-amber-400 dark:border-amber-500/60 p-5 sm:p-6 flex flex-col items-center text-center shadow-xl shadow-amber-500/10 relative transition-transform hover:-translate-y-1.5 sm:-translate-y-3">
              <span className="absolute -top-3.5 px-3.5 py-1 rounded-full text-xs font-black bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-neutral-950 shadow-md shadow-amber-500/30 flex items-center gap-1.5 border border-amber-300">
                <Crown className="w-3.5 h-3.5 fill-current" /> Champion #1
              </span>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 border-2 border-amber-300 text-neutral-950 flex items-center justify-center text-xl font-black shadow-lg shadow-amber-500/25 mt-2 mb-3">
                {getInitials(podiumTop3.first?.name)}
              </div>
              <h4 className="font-black text-base text-neutral-900 dark:text-white truncate max-w-full">
                {podiumTop3.first?.name}
              </h4>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border mt-1.5 ${getRoleConfig(podiumTop3.first?.type).badgeClass}`}>
                {getRoleConfig(podiumTop3.first?.type).label}
              </span>
              <div className="mt-3 pt-3 border-t border-amber-300/40 dark:border-amber-500/20 w-full">
                <div className="text-lg font-black font-mono text-amber-600 dark:text-amber-400">
                  {formatImpact(podiumTop3.first).value}
                </div>
                <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-300/80 tracking-wider flex items-center justify-center gap-1">
                  <Flame className="w-3 h-3 text-amber-500" />
                  {formatImpact(podiumTop3.first).label}
                </span>
              </div>
            </div>

            {/* 3rd Place (Bronze) */}
            <div className="order-3 sm:order-3 bg-gradient-to-b from-amber-50 via-white to-amber-50/50 dark:from-amber-950/20 dark:via-[#141416] dark:to-[#121214] rounded-2xl border border-amber-800/30 dark:border-amber-800/50 p-4 sm:p-5 flex flex-col items-center text-center shadow-md relative transition-transform hover:-translate-y-1">
              <span className="absolute -top-3 px-3 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 shadow-sm flex items-center gap-1">
                <Medal className="w-3 h-3 text-amber-700 dark:text-amber-400" /> 3rd Place
              </span>
              <div className="w-14 h-14 rounded-2xl bg-amber-100/80 dark:bg-amber-950/80 border-2 border-amber-300/60 dark:border-amber-800 flex items-center justify-center text-lg font-black text-amber-900 dark:text-amber-200 shadow-inner mt-2 mb-3">
                {getInitials(podiumTop3.third?.name)}
              </div>
              <h4 className="font-bold text-sm text-neutral-900 dark:text-white truncate max-w-full">
                {podiumTop3.third?.name}
              </h4>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border mt-1.5 ${getRoleConfig(podiumTop3.third?.type).badgeClass}`}>
                {getRoleConfig(podiumTop3.third?.type).label}
              </span>
              <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-900/40 w-full">
                <div className="text-base font-extrabold font-mono text-neutral-900 dark:text-white">
                  {formatImpact(podiumTop3.third).value}
                </div>
                <span className="text-[10px] uppercase font-semibold text-neutral-500 dark:text-neutral-400 tracking-wider">
                  {formatImpact(podiumTop3.third).label}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white dark:bg-[#121214] rounded-3xl border border-neutral-200 dark:border-[#232328] overflow-hidden shadow-xl transition-colors">
        {/* Table Header Controls */}
        <div className="p-5 sm:p-6 border-b border-neutral-200 dark:border-[#232328] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500 dark:text-amber-400 flex-shrink-0" />
              <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white tracking-tight">
                {title}
              </h3>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {subtitle}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Role Filter Tabs (Only in full mode) */}
            {!compact && (
              <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-[#18181b] border border-neutral-200 dark:border-[#282830] rounded-xl self-start sm:self-auto overflow-x-auto max-w-full">
                {[
                  { key: 'ALL', label: 'All Leaders' },
                  { key: 'Provider', label: 'Donors' },
                  { key: 'NGO', label: 'Shelters' },
                  { key: 'Volunteer', label: 'Couriers' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setRoleFilter(tab.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      roleFilter === tab.key
                        ? 'bg-neutral-900 text-white dark:bg-[#27272e] dark:text-white dark:border dark:border-[#383842] shadow-sm font-bold'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {/* Quick Search */}
            {!compact && (
              <div className="relative min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search contributor..."
                  className="input pl-8 py-1.5 text-xs h-9 bg-neutral-50 dark:bg-[#18181b]"
                />
              </div>
            )}

            {actionLink && (
              <Link
                to={actionLink.to}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-900 dark:text-white hover:underline underline-offset-4 ml-auto"
              >
                <span>{actionLink.label || 'View All'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-neutral-300 dark:border-white/20 border-t-neutral-900 dark:border-t-white rounded-full animate-spin" />
          </div>
        ) : displayedList.length === 0 ? (
          <div className="p-12 text-center text-neutral-500 dark:text-neutral-400">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30 stroke-1" />
            <p className="font-semibold text-sm">No leaderboard entries found</p>
            <p className="text-xs text-neutral-400 mt-1">
              {search ? 'Try clearing your search term.' : 'Completed rescue runs and food donations will be ranked here.'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card List (< md) */}
            <div className="divide-y divide-neutral-200 dark:divide-[#232328] md:hidden">
              {displayedList.map((item, index) => {
                const roleConfig = getRoleConfig(item.type || item.role);
                const impact = formatImpact(item);
                const rankNum = item.rank || index + 1;
                const highlight = getRowHighlightClass(rankNum);

                return (
                  <div
                    key={item.name + index}
                    className={`p-4 flex items-center justify-between gap-3 ${highlight}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex-shrink-0">
                        {renderRankBadge(rankNum)}
                      </div>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 border ${roleConfig.avatarBg}`}>
                        {getInitials(item.name || item.full_name)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-neutral-900 dark:text-white truncate">
                          {item.name || item.full_name}
                        </p>
                        <span className={`inline-block text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border mt-0.5 ${roleConfig.badgeClass}`}>
                          {roleConfig.label}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-xs font-black font-mono text-neutral-900 dark:text-white block">
                        {impact.value}
                      </span>
                      <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">
                        {impact.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table (>= md) */}
            <div className="hidden md:block table-responsive">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-[#0c0c0e] text-neutral-500 dark:text-neutral-400 uppercase text-[10px] font-bold tracking-wider border-b border-neutral-200 dark:border-[#232328]">
                    <th className="py-3.5 px-6 w-24">Rank</th>
                    <th className="py-3.5 px-6">Organization / Contributor</th>
                    <th className="py-3.5 px-6 w-44">Community Role</th>
                    <th className="py-3.5 px-6 text-right w-48">Total Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-[#232328] text-sm">
                  {displayedList.map((item, index) => {
                    const roleConfig = getRoleConfig(item.type || item.role);
                    const impact = formatImpact(item);
                    const rankNum = item.rank || index + 1;
                    const highlight = getRowHighlightClass(rankNum);
                    const RoleIcon = roleConfig.icon;

                    return (
                      <tr
                        key={item.name + index}
                        className={highlight}
                      >
                        {/* Rank Column */}
                        <td className="py-4 px-6">
                          {renderRankBadge(rankNum)}
                        </td>

                        {/* Organization / Contributor Column */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 border shadow-xs ${roleConfig.avatarBg}`}>
                              {getInitials(item.name || item.full_name)}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-sm text-neutral-900 dark:text-white block truncate">
                                {item.name || item.full_name}
                              </span>
                              <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                                Verified Community Member
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Role Column */}
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border uppercase tracking-wide ${roleConfig.badgeClass}`}>
                            <RoleIcon className="w-3 h-3" />
                            {roleConfig.label}
                          </span>
                        </td>

                        {/* Total Impact Column */}
                        <td className="py-4 px-6 text-right">
                          <div className="font-extrabold font-mono text-sm text-neutral-900 dark:text-white">
                            {impact.value}
                          </div>
                          <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 tracking-wider">
                            {impact.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
