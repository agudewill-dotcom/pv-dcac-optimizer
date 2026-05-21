/**
 * pdfExport.ts — Generate a professional PDF report of optimization results
 *
 * Uses jspdf v4 + jspdf-autotable v5
 * White background, professional print-ready layout
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import type { ProjectConfig, PowerConfig, PriceConfig, BessConfig, GridConfig, CombinedScenarioResult } from '../types';
import { getSubstationRecommendation, calculateCableRoute, calculateSubstationEconomics } from './gridConnection';
import type { Orientation } from '../types';

interface ExportOptions {
  project: ProjectConfig;
  power: PowerConfig;
  orientation: Orientation;
  price: PriceConfig;
  bess: BessConfig;
  grid: GridConfig;
  scenarios: CombinedScenarioResult[];
  selectedRatio: number;
}

// ─── Color palette (white background, professional print) ────────────────────
const C = {
  black:    [20, 20, 20],
  dark:     [40, 40, 50],
  body:     [60, 60, 70],
  muted:    [120, 120, 130],
  light:    [180, 180, 190],
  border:   [210, 210, 215],
  bgLight:  [245, 246, 248],
  white:    [255, 255, 255],
  accent:   [5, 120, 85],     // deep teal-green for headings
  accentLt: [230, 245, 240],  // light teal background
  warn:     [180, 90, 20],    // orange for warnings
  pos:      [15, 130, 75],    // green for positive values
  neg:      [190, 60, 40],    // red for negative values
};

export function exportResultsPDF(opts: ExportOptions) {
  const { project, power, orientation, price, bess, grid, scenarios, selectedRatio } = opts;
  const combinedSelected = scenarios.find(s => s.dcAcRatio === selectedRatio) || scenarios[0];
  if (!combinedSelected) return;
  const selected = combinedSelected.p50;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const M = 15;
  const W = pageW - 2 * M;
  let y = M;

  const now = new Date();
  const dateStr = now.toLocaleDateString('de-DE', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const fmt = (v: number, d = 2) => v.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmtK = (v: number) => Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(2)} M\u20AC` : `${(v / 1e3).toFixed(0)} k\u20AC`;
  const fmtK2 = (v: number) => Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)} M\u20AC` : `${v} k\u20AC`;

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const text = (str: string, x: number, yy: number, size = 10, color = C.body, style = 'normal', maxW?: number) => {
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.setFont('helvetica', style);
    if (maxW) doc.text(str, x, yy, { maxWidth: maxW });
    else doc.text(str, x, yy);
  };

  const newPage = () => {
    doc.addPage();
    y = M;
  };

  const section = (title: string) => {
    if (y > 265) newPage();
    y += 3;
    doc.setFillColor(C.accentLt[0], C.accentLt[1], C.accentLt[2]);
    doc.rect(M, y - 3, W, 7, 'F');
    // Left accent bar
    doc.setFillColor(C.accent[0], C.accent[1], C.accent[2]);
    doc.rect(M, y - 3, 2, 7, 'F');
    text(title, M + 5, y + 2, 9, C.accent, 'bold');
    y += 10;
  };

  const kpi = (label: string, value: string, x: number, w: number) => {
    doc.setFillColor(C.bgLight[0], C.bgLight[1], C.bgLight[2]);
    doc.rect(x, y, w, 11, 'F');
    doc.setDrawColor(C.border[0], C.border[1], C.border[2]);
    doc.rect(x, y, w, 11, 'S');
    text(label, x + 2, y + 4, 6, C.muted);
    text(value, x + 2, y + 9, 8, C.dark, 'bold');
  };

  const kpiW = (W - 6) / 4;
  const kpi3W = (W - 4) / 3;

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 1 — Project Summary & Optimization Table
  // ═══════════════════════════════════════════════════════════════════════════

  // Header bar
  doc.setFillColor(C.accent[0], C.accent[1], C.accent[2]);
  doc.rect(M, y, W, 14, 'F');
  text('DC/AC Ratio Optimizer', M + 4, y + 6, 14, C.white, 'bold');
  text('Utility-Scale PV \u2014 Pre-Feasibility Analysis Report', M + 4, y + 11, 7, [180, 230, 210]);
  text(dateStr, pageW - M - 25, y + 6, 8, [200, 240, 220]);
  y += 18;

  // ─── PROJECT SUMMARY ────────────────────────────────────────────────────
  section('PROJECT SUMMARY');

  kpi('Project Name', project.name || 'Unnamed', M, kpiW);
  kpi('Country', project.country, M + kpiW + 2, kpiW);
  kpi('Lifetime', `${project.lifetimeYears} years`, M + 2 * (kpiW + 2), kpiW);
  kpi('Degradation', `${(project.degradationRate * 100).toFixed(2)}%/a`, M + 3 * (kpiW + 2), kpiW);
  y += 13;

  kpi('DC Capacity', `${power.dcCapacityMWp} MWp`, M, kpiW);
  kpi('AC Capacity', `${power.acCapacityMWac} MWac`, M + kpiW + 2, kpiW);
  kpi('DC/AC Ratio', `${selectedRatio.toFixed(2)}x`, M + 2 * (kpiW + 2), kpiW);
  kpi('Orientation', orientation.charAt(0).toUpperCase() + orientation.slice(1).replace('-', ' '), M + 3 * (kpiW + 2), kpiW);
  y += 13;

  const revLabel = price.revenueMode === 'market' ? 'Market Price' : price.revenueMode === 'tariff' ? 'Fixed Tariff' : 'Comparison';
  kpi('Revenue Mode', revLabel, M, kpiW * 2 + 2);
  kpi('Price Source', price.priceSource === 'csv' ? 'User CSV' : 'SMARD.de 2024', M + 2 * (kpiW + 2), kpiW);
  kpi('BESS', bess.duration !== 'none' ? `${bess.duration} BESS` : 'None', M + 3 * (kpiW + 2), kpiW);
  y += 14;

  // ─── SELECTED SCENARIO KPIs ─────────────────────────────────────────────
  section(`SELECTED SCENARIO \u2014 DC/AC = ${selectedRatio.toFixed(2)}x`);

  kpi('Annual Gen. (Yr1)', `${fmt(selected.annualGeneratedMWh, 0)} MWh`, M, kpiW);
  kpi('Annual Injected', `${fmt(selected.annualInjectedMWh, 0)} MWh`, M + kpiW + 2, kpiW);
  kpi('Clipping', `${selected.clippingPercent.toFixed(2)}%`, M + 2 * (kpiW + 2), kpiW);
  kpi('FLH AC', `${fmt(selected.fullLoadHoursAC, 0)} h`, M + 3 * (kpiW + 2), kpiW);
  y += 13;

  kpi('Lifetime Generated', `${fmt(selected.lifetimeGeneratedMWh, 0)} MWh`, M, kpiW);
  kpi('Lifetime Injected', `${fmt(selected.lifetimeInjectedMWh, 0)} MWh`, M + kpiW + 2, kpiW);
  kpi('Rev. Market (LT)', fmtK(selected.lifetimeRevenueMarket), M + 2 * (kpiW + 2), kpiW);
  kpi('Rev. Tariff (LT)', fmtK(selected.lifetimeRevenueTariff), M + 3 * (kpiW + 2), kpiW);
  y += 13;

  kpi('Cap. Factor AC', `${(selected.capacityFactorAC * 100).toFixed(2)}%`, M, kpiW);
  kpi('Spec. Yield', `${fmt(selected.annualInjectedMWh / power.dcCapacityMWp, 0)} kWh/kWp`, M + kpiW + 2, kpiW);
  kpi('EUR/MWp (Market)', fmtK(selected.revenuePerMWpMarket), M + 2 * (kpiW + 2), kpiW);
  kpi('Capture Price', `${fmt(selected.capturePriceMarket, 1)} EUR/MWh`, M + 3 * (kpiW + 2), kpiW);
  y += 14;

  // ─── OPTIMIZATION TABLE ─────────────────────────────────────────────────
  section('DC/AC RATIO COMPARISON');
  const showMarket = price.revenueMode !== 'tariff';
  const showTariff = price.revenueMode !== 'market';

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [['DC/AC', 'DC MWp', 'Gen GWh', 'Inj GWh', 'Clip %', 'Rev Market', 'Rev Tariff', 'EUR/MWp', 'Status']],
    body: scenarios.map(s => {
      const res = s.p50;
      return [
        `${s.dcAcRatio.toFixed(2)}×`,
        s.dcMWp.toFixed(1),
        res.annualGeneratedMWh > 0 ? (res.annualGeneratedMWh / 1000).toFixed(2) : '—',
        res.annualInjectedMWh > 0 ? (res.annualInjectedMWh / 1000).toFixed(2) : '—',
        `${res.clippingPercent.toFixed(1)} %`,
        showMarket ? fmtK2(res.lifetimeRevenueMarket) : '—',
        showTariff ? fmtK2(res.lifetimeRevenueTariff) : '—',
        showMarket ? fmtK(res.revenuePerMWpMarket) : '—',
        res.isOptimalTechnical ? 'Tech' : (res.isOptimalMarginal ? 'Bal' : (res.isOptimalEconomic ? 'Econ' : (s.isRobustOptimum ? 'Robust' : '—'))),
      ];
    }),
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      textColor: C.dark as [number, number, number],
      fillColor: C.white as [number, number, number],
      lineColor: C.border as [number, number, number],
      lineWidth: 0.2,
      font: 'helvetica',
    },
    headStyles: {
      fillColor: C.accent as [number, number, number],
      textColor: C.white as [number, number, number],
      fontStyle: 'bold',
      fontSize: 7,
    },
    alternateRowStyles: {
      fillColor: C.bgLight as [number, number, number],
    },
    didParseCell: (data) => {
      if (data.section === 'body' && scenarios[data.row.index]?.dcAcRatio === selectedRatio) {
        data.cell.styles.fillColor = C.accentLt as [number, number, number];
        data.cell.styles.textColor = C.accent as [number, number, number];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const afterTable1 = (doc as any).lastAutoTable?.finalY ?? y + 50;
  y = afterTable1 + 5;

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 2 — Grid Connection & Economics
  // ═══════════════════════════════════════════════════════════════════════════
  newPage();

  section('GRID CONNECTION ASSESSMENT');

  const sub = getSubstationRecommendation(power.acCapacityMWac);
  const cable = calculateCableRoute(power.acCapacityMWac);

  kpi('Substation Type', sub.label, M, kpi3W);
  kpi('Voltage Level', sub.voltageLabelKV, M + kpi3W + 2, kpi3W);
  kpi('Lead Time', sub.typicalLeadTime, M + 2 * (kpi3W + 2), kpi3W);
  y += 13;

  kpi('Max Cable Route', `${cable.effectiveMaxKm.toFixed(1)} km`, M, kpi3W);
  kpi('Cable Type', cable.cableType, M + kpi3W + 2, kpi3W);
  kpi('Operating Current', `${cable.currentA} A`, M + 2 * (kpi3W + 2), kpi3W);
  y += 14;

  // MV vs HV economics
  const econ = calculateSubstationEconomics(
    power.dcCapacityMWp,
    power.acCapacityMWac,
    selected.lifetimeClippedMWh,
    selected.lifetimeRevenueMarket / 1e6,
    selected.lifetimeInjectedMWh,
    selected.clippingPercent,
    grid
  );

  if (econ.recommendation !== 'same_level') {
    section('MV vs. HV SUBSTATION ECONOMICS');

    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [['Parameter', 'Option A: HV (DC/AC=1.0)', 'Option B: MV (current)']],
      body: [
        ['AC Capacity', `${econ.hvAcCapacityMWac} MWac`, `${econ.mvAcCapacityMWac} MWac`],
        ['Connection Level', econ.hvSubstation.voltageLabelKV, econ.mvSubstation.voltageLabelKV],
        ['Substation Type', econ.hvSubstation.label, econ.mvSubstation.label],
        ['', '', ''],
        ['EVU Connection / Substation', fmtK2(econ.hvCostKEur.substationKEur), fmtK2(econ.mvCostKEur.substationKEur)],
        ['Permitting & Studies', fmtK2(econ.hvCostKEur.permittingKEur), fmtK2(econ.mvCostKEur.permittingKEur)],
        ['Total Infrastructure', fmtK2(econ.hvCostKEur.totalKEur), fmtK2(econ.mvCostKEur.totalKEur)],
        ['', '', ''],
        ['Clipping Loss', '0%', `${econ.clippingPercent.toFixed(2)}%`],
        ['Lead Time', econ.hvSubstation.typicalLeadTime, econ.mvSubstation.typicalLeadTime],
        ['', '', ''],
        ['Infrastructure Saving (MV)', '', fmtK2(econ.infrastructureSavingKEur)],
        ['Clipping Revenue Loss', '', fmtK2(econ.lifetimeClippingRevenueLossKEur)],
        ['NET ADVANTAGE (MV)', '', `${econ.netAdvantageKEur > 0 ? '+' : ''}${fmtK2(econ.netAdvantageKEur)}`],
      ],
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        textColor: C.dark as [number, number, number],
        fillColor: C.white as [number, number, number],
        lineColor: C.border as [number, number, number],
        lineWidth: 0.2,
        font: 'helvetica',
      },
      headStyles: {
        fillColor: C.accent as [number, number, number],
        textColor: C.white as [number, number, number],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: C.bgLight as [number, number, number],
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.row.index >= 11) {
          data.cell.styles.fontStyle = 'bold';
        }
        if (data.section === 'body' && data.row.index === 13) {
          data.cell.styles.textColor = (econ.netAdvantageKEur > 0 ? C.pos : C.neg) as [number, number, number];
          data.cell.styles.fontSize = 9;
        }
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const afterTable2 = (doc as any).lastAutoTable?.finalY ?? y + 60;
    y = afterTable2 + 4;

    text(`Recommendation: ${econ.recommendationText}`, M, y, 8, C.body, 'italic', W);
    y += 14;
  }

  // ─── DISCLAIMER ─────────────────────────────────────────────────────────
  if (y > 240) newPage();
  y += 3;
  doc.setDrawColor(C.border[0], C.border[1], C.border[2]);
  doc.line(M, y, M + W, y);
  y += 5;
  text('DISCLAIMER', M, y, 7, C.muted, 'bold');
  y += 4;
  text(
    'This report provides a comparative pre-feasibility calculation. It does not replace a bankable yield assessment, ' +
    'detailed PVSyst simulation, grid connection study, or final investment model. Market price data from SMARD.de (2024, CC BY 4.0). ' +
    'All data sources should be verified against project-specific conditions before investment decisions.',
    M, y, 7, C.muted, 'normal', W,
  );
  y += 14;
  text(`Source: Bundesnetzagentur | SMARD.de \u2014 CC BY 4.0  |  Generated: ${now.toISOString()}`, M, y, 6, C.light);

  // ─── SAVE ───────────────────────────────────────────────────────────────
  const safeName = (project.name || 'PV_Project').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${safeName}_DCAC_Report_${now.toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
