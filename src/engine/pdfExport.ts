/**
 * pdfExport.ts — Generate a professional PDF report of optimization results
 *
 * Uses jspdf + jspdf-autotable to create a boardroom-ready document with:
 * - Project summary
 * - KPI dashboard
 * - Optimization comparison table
 * - Grid connection assessment
 * - Methodology notes
 */

import jsPDF from 'jspdf';
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

const BRAND_GREEN = [16, 185, 129] as const;
const DARK_BG = [15, 23, 42] as const;
const MEDIUM_BG = [30, 41, 59] as const;
const LIGHT_TEXT = [248, 250, 252] as const;
const MUTED_TEXT = [148, 163, 184] as const;

export function exportResultsPDF(opts: ExportOptions) {
  const { project, power, orientation, price, bess, scenarios, selectedRatio } = opts;
  const selected = scenarios.find(s => s.dcAcRatio === selectedRatio) || scenarios[0];
  if (!selected) return;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentW = pageW - 2 * margin;
  let y = margin;

  // ─── Helper functions ────────────────────────────────────────────────────
  const addText = (text: string, x: number, yPos: number, opts?: { size?: number; color?: readonly number[]; style?: string; maxWidth?: number }) => {
    doc.setFontSize(opts?.size || 10);
    doc.setTextColor(...(opts?.color || LIGHT_TEXT) as [number, number, number]);
    if (opts?.style) doc.setFont('helvetica', opts.style);
    else doc.setFont('helvetica', 'normal');
    if (opts?.maxWidth) {
      doc.text(text, x, yPos, { maxWidth: opts.maxWidth });
    } else {
      doc.text(text, x, yPos);
    }
  };

  const addSection = (title: string) => {
    if (y > 260) { doc.addPage(); y = margin; }
    y += 4;
    doc.setFillColor(...MEDIUM_BG);
    doc.roundedRect(margin, y - 4, contentW, 8, 1, 1, 'F');
    addText(title, margin + 3, y + 1, { size: 10, style: 'bold', color: BRAND_GREEN });
    y += 10;
  };

  const addKPI = (label: string, value: string, x: number, w: number) => {
    doc.setFillColor(30, 41, 59);
    doc.roundedRect(x, y, w, 12, 1, 1, 'F');
    addText(label, x + 2, y + 4, { size: 6, color: MUTED_TEXT, style: 'normal' });
    addText(value, x + 2, y + 9, { size: 9, style: 'bold' });
  };

  const fmt = (v: number, d: number = 2) => v.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmtK = (v: number) => v >= 1e6 ? `${(v / 1e6).toFixed(2)} M€` : `${(v / 1e3).toFixed(0)} k€`;

  // ─── Page background ─────────────────────────────────────────────────────
  const drawBg = () => {
    doc.setFillColor(...DARK_BG);
    doc.rect(0, 0, pageW, doc.internal.pageSize.getHeight(), 'F');
  };
  drawBg();

  // ─── HEADER ──────────────────────────────────────────────────────────────
  doc.setFillColor(...BRAND_GREEN);
  doc.roundedRect(margin, y, 3, 14, 1, 1, 'F');
  addText('DC/AC Ratio Optimizer', margin + 6, y + 5, { size: 16, style: 'bold' });
  addText('Utility-Scale PV — Pre-Feasibility Analysis Report', margin + 6, y + 11, { size: 8, color: MUTED_TEXT });

  // Date
  const now = new Date();
  addText(now.toLocaleDateString('de-DE', { year: 'numeric', month: '2-digit', day: '2-digit' }), pageW - margin, y + 5, { size: 8, color: MUTED_TEXT });
  doc.text('', pageW - margin, y + 5); // right-align hack
  y += 18;

  // ─── PROJECT SUMMARY ─────────────────────────────────────────────────────
  addSection('PROJECT SUMMARY');

  const kpiW = (contentW - 6) / 4;
  addKPI('Project Name', project.name || 'Unnamed', margin, kpiW);
  addKPI('Country', project.country, margin + kpiW + 2, kpiW);
  addKPI('Lifetime', `${project.lifetimeYears} years`, margin + 2 * (kpiW + 2), kpiW);
  addKPI('Degradation', `${(project.degradationRate * 100).toFixed(2)}%/a`, margin + 3 * (kpiW + 2), kpiW);
  y += 15;

  addKPI('DC Capacity', `${power.dcCapacityMWp} MWp`, margin, kpiW);
  addKPI('AC Capacity', `${power.acCapacityMWac} MWac`, margin + kpiW + 2, kpiW);
  addKPI('DC/AC Ratio', `${selectedRatio.toFixed(2)}×`, margin + 2 * (kpiW + 2), kpiW);
  addKPI('Orientation', orientation.charAt(0).toUpperCase() + orientation.slice(1).replace('-', ' '), margin + 3 * (kpiW + 2), kpiW);
  y += 15;

  // Revenue mode
  const revLabel = price.revenueMode === 'market' ? 'Market Price' : price.revenueMode === 'tariff' ? 'Fixed Tariff' : 'Comparison (Market + Tariff)';
  addKPI('Revenue Mode', revLabel, margin, kpiW * 2 + 2);
  addKPI('Price Source', price.priceSource === 'csv' ? 'User CSV' : 'SMARD.de 2024', margin + 2 * (kpiW + 2), kpiW);
  addKPI('BESS', bess.duration !== 'none' ? `${bess.duration} BESS` : 'None', margin + 3 * (kpiW + 2), kpiW);
  y += 16;

  // ─── SELECTED SCENARIO KPIs ──────────────────────────────────────────────
  addSection(`SELECTED SCENARIO (DC/AC = ${selectedRatio.toFixed(2)}×)`);

  addKPI('Annual Gen. (Yr1)', `${fmt(selected.annualGeneratedMWh, 0)} MWh`, margin, kpiW);
  addKPI('Annual Injected', `${fmt(selected.annualInjectedMWh, 0)} MWh`, margin + kpiW + 2, kpiW);
  addKPI('Clipping', `${selected.clippingPercent.toFixed(2)}%`, margin + 2 * (kpiW + 2), kpiW);
  addKPI('FLH AC', `${fmt(selected.fullLoadHoursAC, 0)} h`, margin + 3 * (kpiW + 2), kpiW);
  y += 15;

  addKPI('Lifetime Generated', `${fmt(selected.lifetimeGeneratedMWh, 0)} MWh`, margin, kpiW);
  addKPI('Lifetime Injected', `${fmt(selected.lifetimeInjectedMWh, 0)} MWh`, margin + kpiW + 2, kpiW);
  addKPI('Rev. Market', fmtK(selected.lifetimeRevenueMarket), margin + 2 * (kpiW + 2), kpiW);
  addKPI('Rev. Tariff', fmtK(selected.lifetimeRevenueTariff), margin + 3 * (kpiW + 2), kpiW);
  y += 15;

  addKPI('Cap. Factor AC', `${(selected.capacityFactorAC * 100).toFixed(2)}%`, margin, kpiW);
  addKPI('Specific Yield', `${fmt(selected.annualInjectedMWh / power.dcCapacityMWp, 0)} kWh/kWp`, margin + kpiW + 2, kpiW);
  addKPI('€/MWp (Market)', fmtK(selected.revenuePerMWpMarket), margin + 2 * (kpiW + 2), kpiW);
  addKPI('Weighted Price', `${fmt(selected.marketValueWeightedPrice, 1)} €/MWh`, margin + 3 * (kpiW + 2), kpiW);
  y += 16;

  // ─── OPTIMIZATION TABLE ──────────────────────────────────────────────────
  addSection('DC/AC RATIO COMPARISON');

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['DC/AC', 'DC MWp', 'AC MWac', 'Gen. GWh', 'Inj. GWh', 'Clip %', 'Rev. Market', 'Rev. Tariff', '€/MWp', 'Status']],
    body: scenarios.map(s => [
      `${s.dcAcRatio.toFixed(2)}×`,
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
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      textColor: [...LIGHT_TEXT] as [number, number, number],
      fillColor: [...DARK_BG] as [number, number, number],
      lineColor: [51, 65, 85],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [...MEDIUM_BG] as [number, number, number],
      textColor: [...BRAND_GREEN] as [number, number, number],
      fontStyle: 'bold',
      fontSize: 7,
    },
    alternateRowStyles: {
      fillColor: [20, 30, 48] as [number, number, number],
    },
    didParseCell: (data) => {
      // Highlight selected row
      if (data.section === 'body' && scenarios[data.row.index]?.dcAcRatio === selectedRatio) {
        data.cell.styles.fillColor = [16, 50, 60] as [number, number, number];
        data.cell.styles.textColor = [16, 185, 129];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable?.finalY + 5 || y + 60;

  // ─── GRID CONNECTION (page 2) ────────────────────────────────────────────
  doc.addPage();
  drawBg();
  y = margin;

  addSection('GRID CONNECTION ASSESSMENT');

  const sub = getSubstationRecommendation(power.acCapacityMWac);
  const cable = calculateCableRoute(power.acCapacityMWac);

  const kpiW2 = (contentW - 4) / 3;
  addKPI('Substation Type', sub.label, margin, kpiW2);
  addKPI('Voltage Level', sub.voltageLabelKV, margin + kpiW2 + 2, kpiW2);
  addKPI('Lead Time', sub.typicalLeadTime, margin + 2 * (kpiW2 + 2), kpiW2);
  y += 15;

  addKPI('Max Cable Route', `${cable.effectiveMaxKm.toFixed(1)} km`, margin, kpiW2);
  addKPI('Cable Type', cable.cableType, margin + kpiW2 + 2, kpiW2);
  addKPI('Operating Current', `${cable.currentA} A`, margin + 2 * (kpiW2 + 2), kpiW2);
  y += 16;

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
    addSection('MV vs. HV SUBSTATION ECONOMICS');

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Parameter', 'Option A: HV (DC/AC=1.0)', 'Option B: MV (current)']],
      body: [
        ['AC Capacity', `${econ.hvAcCapacityMWac} MWac`, `${econ.mvAcCapacityMWac} MWac`],
        ['Connection Level', econ.hvSubstation.voltageLabelKV, econ.mvSubstation.voltageLabelKV],
        ['Substation Type', econ.hvSubstation.label, econ.mvSubstation.label],
        ['Substation Cost', `${fmtK2(econ.hvCostKEur.substationKEur)}`, `${fmtK2(econ.mvCostKEur.substationKEur)}`],
        ['Permitting & Studies', `${fmtK2(econ.hvCostKEur.permittingKEur)}`, `${fmtK2(econ.mvCostKEur.permittingKEur)}`],
        ['Total Infrastructure', `${fmtK2(econ.hvCostKEur.totalKEur)}`, `${fmtK2(econ.mvCostKEur.totalKEur)}`],
        ['Clipping Loss', '0%', `${econ.clippingPercent.toFixed(2)}%`],
        ['Lead Time', econ.hvSubstation.typicalLeadTime, econ.mvSubstation.typicalLeadTime],
        ['', '', ''],
        ['Infrastructure Saving (MV)', '', `${fmtK2(econ.infrastructureSavingKEur)}`],
        ['Clipping Revenue Loss', '', `${fmtK2(econ.lifetimeClippingRevenueLossKEur)}`],
        ['NET ADVANTAGE (MV)', '', `${econ.netAdvantageKEur > 0 ? '+' : ''}${fmtK2(econ.netAdvantageKEur)}`],
      ],
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        textColor: [...LIGHT_TEXT] as [number, number, number],
        fillColor: [...DARK_BG] as [number, number, number],
        lineColor: [51, 65, 85],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [...MEDIUM_BG] as [number, number, number],
        textColor: [...BRAND_GREEN] as [number, number, number],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [20, 30, 48] as [number, number, number],
      },
      didParseCell: (data) => {
        // Bold the summary rows
        if (data.section === 'body' && data.row.index >= 9) {
          data.cell.styles.fontStyle = 'bold';
          if (data.row.index === 11) {
            data.cell.styles.textColor = econ.netAdvantageKEur > 0 ? [16, 185, 129] : [251, 146, 60];
          }
        }
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable?.finalY + 5 || y + 60;

    addText(`Recommendation: ${econ.recommendationText}`, margin, y, { size: 8, color: MUTED_TEXT, maxWidth: contentW });
    y += 12;
  }

  // ─── DISCLAIMER ──────────────────────────────────────────────────────────
  if (y > 240) { doc.addPage(); drawBg(); y = margin; }
  addSection('DISCLAIMER');
  addText(
    'This report provides a comparative pre-feasibility calculation. It does not replace a bankable yield assessment, ' +
    'detailed PVSyst simulation, grid connection study, or final investment model. Market price data from SMARD.de (2024). ' +
    'All data sources should be verified against project-specific conditions before investment decisions.',
    margin, y, { size: 7, color: MUTED_TEXT, maxWidth: contentW }
  );
  y += 12;
  addText('Source: Bundesnetzagentur | SMARD.de — CC BY 4.0', margin, y, { size: 6, color: MUTED_TEXT });
  addText(`Generated: ${now.toISOString()}`, margin, y + 4, { size: 6, color: MUTED_TEXT });

  // ─── SAVE ────────────────────────────────────────────────────────────────
  const filename = `${(project.name || 'PV_Project').replace(/\s+/g, '_')}_DCAC_Report_${now.toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

function fmtK2(v: number): string {
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)} M€`;
  return `${v} k€`;
}
