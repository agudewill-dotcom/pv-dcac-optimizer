import React, { useMemo } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import type { CombinedScenarioResult, Orientation, ProductionCase } from '../types';
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
      { label: 'South', data: profiles.south, borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', borderWidth: orientation === 'south' ? 2.5 : 1, fill: orientation === 'south', tension: 0.4, pointRadius: 0 },
      { label: 'East-West', data: profiles.east_west, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', borderWidth: orientation === 'east_west' ? 2.5 : 1, fill: orientation === 'east_west', tension: 0.4, pointRadius: 0 },
      { label: 'South-East', data: profiles.south_east, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', borderWidth: orientation === 'south_east' ? 2.5 : 1, fill: orientation === 'south_east', tension: 0.4, pointRadius: 0 },
      { label: 'South-West', data: profiles.south_west, borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.1)', borderWidth: orientation === 'south_west' ? 2.5 : 1, fill: orientation === 'south_west', tension: 0.4, pointRadius: 0 },
    ],
  };

  return (
    <div className="glass-card p-4">
      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Daily Generation Profile (Midsummer)</h4>
      <div className="h-48"><Line data={data} options={{ ...CHART_OPTS, plugins: { ...CHART_OPTS.plugins, title: { display: false } } }} /></div>
    </div>
  );
};

export const ClippingChart: React.FC<{ scenarios: CombinedScenarioResult[], productionCase: ProductionCase }> = ({ scenarios, productionCase }) => {
  if (scenarios.length < 2) return null;

  const labels = scenarios.map(s => `${s.dcAcRatio}×`);
  const datasets = [];

  if (productionCase === 'p50' || productionCase === 'compare') {
    datasets.push({
      label: 'P50 Clipping %',
      data: scenarios.map(s => s.p50.clippingPercent),
      backgroundColor: 'rgba(16,185,129,0.4)',
      borderColor: '#10b981',
      borderWidth: 1, borderRadius: 4,
    });
  }
  if (productionCase === 'p90' || productionCase === 'compare') {
    datasets.push({
      label: 'P90 Clipping %',
      data: scenarios.map(s => s.p90.clippingPercent),
      backgroundColor: 'rgba(245,158,11,0.4)',
      borderColor: '#f59e0b',
      borderWidth: 1, borderRadius: 4,
    });
  }

  const data = { labels, datasets };

  return (
    <div className="glass-card p-4">
      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Clipping % by DC/AC Ratio</h4>
      <div className="h-48"><Bar data={data} options={CHART_OPTS} /></div>
    </div>
  );
};

export const RevenueChart: React.FC<{ scenarios: CombinedScenarioResult[]; showMarket: boolean; showTariff: boolean, productionCase: ProductionCase }> = ({ scenarios, showMarket, productionCase }) => {
  if (scenarios.length < 2) return null;

  const datasets = [];
  if (showMarket) {
    if (productionCase === 'p50' || productionCase === 'compare') {
      datasets.push({ label: 'P50 Market Rev (M€)', data: scenarios.map(s => s.p50.lifetimeRevenueMarket / 1e6), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.15)', fill: true, tension: 0.3, pointRadius: 3, pointBackgroundColor: '#10b981' });
    }
    if (productionCase === 'p90' || productionCase === 'compare') {
      datasets.push({ label: 'P90 Market Rev (M€)', data: scenarios.map(s => s.p90.lifetimeRevenueMarket / 1e6), borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.15)', fill: true, tension: 0.3, pointRadius: 3, pointBackgroundColor: '#f59e0b' });
    }
  }

  const data = { labels: scenarios.map(s => `${s.dcAcRatio}×`), datasets };

  return (
    <div className="glass-card p-4">
      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Lifetime Revenue by DC/AC Ratio</h4>
      <div className="h-48"><Line data={data} options={CHART_OPTS} /></div>
    </div>
  );
};

export const GenerationChart: React.FC<{ scenario: CombinedScenarioResult | null, productionCase: ProductionCase }> = ({ scenario, productionCase }) => {
  if (!scenario) return null;
  const res = productionCase === 'p90' ? scenario.p90 : scenario.p50;
  if (!res.hourlyGenerated || !res.hourlyInjected) return null;
  
  const midsummerStart = 4344;

  const generated = res.hourlyGenerated.slice(midsummerStart, midsummerStart + 24);
  const injected = res.hourlyInjected.slice(midsummerStart, midsummerStart + 24);

  const data = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [
      { label: 'Generated (MW)', data: generated, borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', fill: true, tension: 0.4, pointRadius: 0 },
      { label: 'Injected (MW)', data: injected, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.2)', fill: true, tension: 0.4, pointRadius: 0, borderDash: [5, 5] },
    ],
  };

  return (
    <div className="glass-card p-4">
      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Injected vs Generated (Selected Ratio)</h4>
      <div className="h-48"><Line data={data} options={CHART_OPTS} /></div>
    </div>
  );
};

export const MarginalRevenueChart: React.FC<{ scenarios: CombinedScenarioResult[], productionCase: ProductionCase }> = ({ scenarios, productionCase }) => {
  if (scenarios.length < 2) return null;

  const labels = scenarios.map(s => `${s.dcAcRatio}×`).slice(1);
  const datasets = [];

  if (productionCase === 'p50' || productionCase === 'compare') {
    datasets.push({
      label: 'P50 Marginal Rev (€/MWp)',
      data: scenarios.map(s => s.p50.marginalRevenuePerMWpMarket).slice(1),
      backgroundColor: 'rgba(59,130,246,0.6)',
      borderColor: '#3b82f6',
      borderWidth: 1, borderRadius: 4,
    });
  }
  
  if (productionCase === 'p90' || productionCase === 'compare') {
    datasets.push({
      label: 'P90 Marginal Rev (€/MWp)',
      data: scenarios.map(s => s.p90.marginalRevenuePerMWpMarket).slice(1),
      backgroundColor: 'rgba(139,92,246,0.6)',
      borderColor: '#8b5cf6',
      borderWidth: 1, borderRadius: 4,
    });
  }

  const data = { labels, datasets };

  return (
    <div className="glass-card p-4">
      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Marginal Market Revenue</h4>
      <div className="h-48"><Bar data={data} options={CHART_OPTS} /></div>
    </div>
  );
};

export const CumulativeCashflowChart: React.FC<{ scenario: CombinedScenarioResult | null, productionCase: ProductionCase }> = ({ scenario, productionCase }) => {
  const res = productionCase === 'p90' ? scenario?.p90 : scenario?.p50;
  if (!res || !res.annualCashflows || res.annualCashflows.length === 0 || !res.totalCapex) return null;

  let cumCF = -res.totalCapex;
  const dataPoints = [cumCF];
  
  for (let i = 0; i < res.annualCashflows.length; i++) {
    cumCF += res.annualCashflows[i];
    dataPoints.push(cumCF / 1e6); // M€
  }
  dataPoints[0] = dataPoints[0] / 1e6;

  const data = {
    labels: Array.from({ length: dataPoints.length }, (_, i) => `Yr ${i}`),
    datasets: [
      {
        label: `${productionCase.toUpperCase()} Cumulative CF (M€)`,
        data: dataPoints,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16,185,129,0.1)',
        fill: true, tension: 0.1, pointRadius: 2,
        segment: {
          borderColor: (ctx: any) => ctx.p1.parsed.y < 0 ? '#ef4444' : '#10b981',
          backgroundColor: (ctx: any) => ctx.p1.parsed.y < 0 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
        }
      },
    ],
  };

  return (
    <div className="glass-card p-4">
      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Project Lifetime Cash Flow (M€)</h4>
      <div className="h-48"><Line data={data} options={CHART_OPTS} /></div>
    </div>
  );
};
