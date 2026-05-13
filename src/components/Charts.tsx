import React, { useMemo } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import type { ScenarioResult, Orientation } from '../types';
import { getDailyPreviewProfile } from '../engine/generationProfiles';

ChartJS.register(
  CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Title, Tooltip, Legend, Filler,
);

const CHART_OPTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#94a3b8', font: { size: 10 } } },
  },
  scales: {
    x: { ticks: { color: '#64748b', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.03)' } },
    y: { ticks: { color: '#64748b', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
  },
};

// ─── Daily Profile by Orientation ────────────────────────────────────────────
export const ProfileChart: React.FC<{ orientation: Orientation }> = ({ orientation }) => {
  const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);
  const profiles = useMemo(() => ({
    south: getDailyPreviewProfile('south'),
    east_west: getDailyPreviewProfile('east_west'),
    south_east: getDailyPreviewProfile('south_east'),
    south_west: getDailyPreviewProfile('south_west'),
  }), []);

  const data = {
    labels: hours,
    datasets: [
      {
        label: 'South', data: profiles.south,
        borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)',
        borderWidth: orientation === 'south' ? 2.5 : 1, fill: orientation === 'south',
        tension: 0.4, pointRadius: 0,
      },
      {
        label: 'East-West', data: profiles.east_west,
        borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)',
        borderWidth: orientation === 'east_west' ? 2.5 : 1, fill: orientation === 'east_west',
        tension: 0.4, pointRadius: 0,
      },
      {
        label: 'South-East', data: profiles.south_east,
        borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)',
        borderWidth: orientation === 'south_east' ? 2.5 : 1, fill: orientation === 'south_east',
        tension: 0.4, pointRadius: 0,
      },
      {
        label: 'South-West', data: profiles.south_west,
        borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.1)',
        borderWidth: orientation === 'south_west' ? 2.5 : 1, fill: orientation === 'south_west',
        tension: 0.4, pointRadius: 0,
      },
    ],
  };

  return (
    <div className="glass-card p-4">
      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
        Daily Generation Profile (Midsummer)
      </h4>
      <div className="h-48">
        <Line data={data} options={{ ...CHART_OPTS, plugins: { ...CHART_OPTS.plugins, title: { display: false } } }} />
      </div>
    </div>
  );
};

// ─── Clipping vs DC/AC Ratio ─────────────────────────────────────────────────
export const ClippingChart: React.FC<{ scenarios: ScenarioResult[] }> = ({ scenarios }) => {
  if (scenarios.length < 2) return null;

  const data = {
    labels: scenarios.map(s => `${s.dcAcRatio}×`),
    datasets: [
      {
        label: 'Clipping %',
        data: scenarios.map(s => s.clippingPercent),
        backgroundColor: scenarios.map(s =>
          s.clippingPercent > 5 ? 'rgba(245,158,11,0.6)' : 'rgba(16,185,129,0.4)'
        ),
        borderColor: scenarios.map(s =>
          s.clippingPercent > 5 ? '#f59e0b' : '#10b981'
        ),
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  return (
    <div className="glass-card p-4">
      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Clipping % by DC/AC Ratio</h4>
      <div className="h-48">
        <Bar data={data} options={CHART_OPTS} />
      </div>
    </div>
  );
};

// ─── Revenue vs DC/AC Ratio ──────────────────────────────────────────────────
export const RevenueChart: React.FC<{ scenarios: ScenarioResult[]; showMarket: boolean; showTariff: boolean }> = ({
  scenarios, showMarket, showTariff,
}) => {
  if (scenarios.length < 2) return null;

  const datasets = [];
  if (showMarket) {
    datasets.push({
      label: 'Market Revenue (M€)',
      data: scenarios.map(s => s.lifetimeRevenueMarket / 1e6),
      borderColor: '#10b981',
      backgroundColor: 'rgba(16,185,129,0.15)',
      fill: true, tension: 0.3, pointRadius: 3, pointBackgroundColor: '#10b981',
    });
  }
  if (showTariff) {
    datasets.push({
      label: 'Tariff Revenue (M€)',
      data: scenarios.map(s => s.lifetimeRevenueTariff / 1e6),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59,130,246,0.15)',
      fill: true, tension: 0.3, pointRadius: 3, pointBackgroundColor: '#3b82f6',
    });
  }

  const data = { labels: scenarios.map(s => `${s.dcAcRatio}×`), datasets };

  return (
    <div className="glass-card p-4">
      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Lifetime Revenue by DC/AC Ratio</h4>
      <div className="h-48">
        <Line data={data} options={CHART_OPTS} />
      </div>
    </div>
  );
};

// ─── Generated vs Injected (24h profile for selected scenario) ───────────────
export const GenerationChart: React.FC<{ scenario: ScenarioResult | null }> = ({ scenario }) => {
  if (!scenario?.hourlyGenerated || !scenario?.hourlyInjected) return null;

  // Average to 24h shape for display
  const avgGen = new Array(24).fill(0);
  const avgInj = new Array(24).fill(0);
  const counts = new Array(24).fill(0);

  for (let h = 0; h < Math.min(scenario.hourlyGenerated.length, 8760); h++) {
    const hod = h % 24;
    avgGen[hod] += scenario.hourlyGenerated[h];
    avgInj[hod] += scenario.hourlyInjected[h];
    counts[hod]++;
  }

  const genData = avgGen.map((v, i) => counts[i] > 0 ? v / counts[i] : 0);
  const injData = avgInj.map((v, i) => counts[i] > 0 ? v / counts[i] : 0);

  const data = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [
      {
        label: 'DC Generated (MW avg)',
        data: genData,
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245,158,11,0.15)',
        fill: true, tension: 0.4, pointRadius: 0,
      },
      {
        label: 'AC Injected (MW avg)',
        data: injData,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16,185,129,0.3)',
        fill: true, tension: 0.4, pointRadius: 0,
      },
    ],
  };

  return (
    <div className="glass-card p-4">
      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
        Generated vs Injected Power (Annual Avg by Hour)
      </h4>
      <div className="h-48">
        <Line data={data} options={CHART_OPTS} />
      </div>
    </div>
  );
};
