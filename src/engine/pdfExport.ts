/**
 * pdfExport.ts — Generate a professional PDF report of optimization results
 *
 * Uses jspdf v4 + jspdf-autotable v5
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ScenarioResult } from '../types';
import type { ProjectConfig, PowerConfig, PriceConfig, BessConfig } from '../types';
import { getSubstationRecommendation, calculateCableRoute, calculateSubstationEconomics } from './gridConnection';
import type { Orientation } from '../types';

interface ExportOptions {
  project: ProjectConfig;
  power: PowerConfig;
  orientation: Orientation;
  price: PriceConfig;
  bess: BessConfig;
  scenarios: ScenarioResult[];
  selectedRatio: number;
}

export function exportResultsPDF(opts: ExportOptions) {
  const { project, power, orientation, price, bess, scenarios, selectedRatio } = opts;
  const selected = scenarios.find(s => s.dcAcRatio === selectedRatio) || scenarios[0];
  if (!selected) return;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 15; // margin
  const W = pageW - 2 * M; // content width
  let y = M;

  const now = new Date();
  const dateStr = now.toLocaleDateString('de-DE', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const fmt = (v: number, d = 2) => v.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmtK = (v: number) => Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(2)} M€` : `${(v / 1e3).toFixed(0)} k€`;
  const fmtK2 = (v: number) => Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)} M€` : `${v} k€`;

  // ─── Background ──────────────────────────────────────────────────────────
  const drawBg = () => {
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageW, pageH, 'F');
  };
  drawBg();

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const text = (str: string, x: number, yy: number, size = 10, color = [248, 250, 252], style = 'normal', maxW?: number) => {
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.setFont('helvetica', style);
    if (maxW) doc.text(str, x, yy, { maxWidth: maxW });
    else doc.text(str, x, yy);
  };

  const section = (title: string) => {
    if (y > 265) { doc.addPage(); drawBg(); y = M; }
    y += 3;
    doc.setFillColor(30, 41, 59);
    doc.rect(M, y - 3, W, 7, 'F');
    text(title, M + 3, y + 2, 9, [16, 185, 129], 'bold');
    y += 10;
  };

  const kpi = (label: string, value: string, x: number, w: number) => {
    doc.setFillColor(30, 41, 59);
    doc.rect(x, y, w, 11, 'F');
    doc.setDrawColor(51, 65, 85);
    doc.rect(x, y, w, 11, 'S');
    text(label, x + 2, y + 4, 6, [148, 163, 184]);
    text(value, x + 2, y + 9, 8, [248, 250, 252], 'bold');
  };

  const kpiW = (W - 6) / 4;
  const kpi3W = (W - 4) / 3;

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 1 — Project Summary & Optimization Table
  // ═══════════════════════════════════════════════════════════════════════════

  // Header
  doc.setFillColor(16, 185, 129);
  doc.rect(M, y, 3, 12, 'F');
  text('DC/AC Ratio Optimizer', M + 6, y + 5, 15, [248, 250, 252], 'bold');
  text('Utility-Scale PV — Pre-Feasibility Analysis Report', M + 6, y + 10, 7, [148, 163, 184]);
  text(dateStr, pageW - M - 25, y + 5, 8, [148, 163, 184]);
  y += 16;

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
  section(`SELECTED SCENARIO — DC/AC = ${selectedRatio.toFixed(2)}x`);

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
  kpi('Wtd. Price', `${fmt(selected.marketValueWeightedPrice, 1)} EUR/MWh`, M + 3 * (kpiW + 2), kpiW);
  y += 14;

  // ─── OPTIMIZATION TABLE ─────────────────────────────────────────────────
  section('DC/AC RATIO COMPARISON');

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [['DC/AC', 'DC MWp', 'AC MWac', 'Gen GWh', 'Inj GWh', 'Clip %', 'Rev Market', 'Rev Tariff', 'EUR/MWp', 'Status']],
    body: scenarios.map(s => [
      `${s.dcAcRatio.toFixed(2)}x`,
      fmt(s.dcMWp, 1),
      fmt(s.acMWac, 1),
      fmt(s.annualGeneratedMWh / 1000, 2),
      fmt(s.annualInjectedMWh / 1000, 2),
      `${s.clippingPercent.toFixed(2)}%`,
      fmtK(s.lifetimeRevenueMarket),
      fmtK(s.lifetimeRevenueTariff),
      fmtK(s.revenuePerMWpMarket),
      s.isOptimalTechnical ? 'Tech' : s.isOptimalMarginal ? 'Balanced' : s.isOptimalEconomic ? 'Econ' : '',
    ]),
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      textColor: [220, 220, 230],
      fillColor: [15, 23, 42],
      lineColor: [51, 65, 85],
      lineWidth: 0.2,
      font: 'helvetica',
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [16, 185, 129],
      fontStyle: 'bold',
      fontSize: 7,
    },
    alternateRowStyles: {
      fillColor: [20, 30, 48],
    },
    didParseCell: (data) => {
      if (data.section === 'body' && scenarios[data.row.index]?.dcAcRatio === selectedRatio) {
        data.cell.styles.fillColor = [16, 50, 60];
        data.cell.styles.textColor = [16, 185, 129];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  // Get Y after table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const afterTable1 = (doc as any).lastAutoTable?.finalY ?? y + 50;
  y = afterTable1 + 5;

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 2 — Grid Connection & Economics
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage();
  drawBg();
  y = M;

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
        ['Substation Cost', fmtK2(econ.hvCostKEur.substationKEur), fmtK2(econ.mvCostKEur.substationKEur)],
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
        textColor: [220, 220, 230],
        fillColor: [15, 23, 42],
        lineColor: [51, 65, 85],
        lineWidth: 0.2,
        font: 'helvetica',
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [16, 185, 129],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [20, 30, 48],
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.row.index >= 11) {
          data.cell.styles.fontStyle = 'bold';
        }
        if (data.section === 'body' && data.row.index === 13) {
          data.cell.styles.textColor = econ.netAdvantageKEur > 0 ? [16, 185, 129] : [251, 146, 60];
          data.cell.styles.fontSize = 9;
        }
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const afterTable2 = (doc as any).lastAutoTable?.finalY ?? y + 60;
    y = afterTable2 + 4;

    text(`Recommendation: ${econ.recommendationText}`, M, y, 8, [148, 163, 184], 'normal', W);
    y += 14;
  }

  // ─── DISCLAIMER ─────────────────────────────────────────────────────────
  if (y > 240) { doc.addPage(); drawBg(); y = M; }
  section('DISCLAIMER');
  text(
    'This report provides a comparative pre-feasibility calculation. It does not replace a bankable yield assessment, ' +
    'detailed PVSyst simulation, grid connection study, or final investment model. Market price data from SMARD.de (2024, CC BY 4.0). ' +
    'All data sources should be verified against project-specific conditions before investment decisions.',
    M, y, 7, [148, 163, 184], 'normal', W,
  );
  y += 14;
  text(`Source: Bundesnetzagentur | SMARD.de — CC BY 4.0  |  Generated: ${now.toISOString()}`, M, y, 6, [100, 116, 139]);

  // ─── SAVE ───────────────────────────────────────────────────────────────
  const safeName = (project.name || 'PV_Project').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${safeName}_DCAC_Report_${now.toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
