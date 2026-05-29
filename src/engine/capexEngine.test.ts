import { describe, it, expect } from 'vitest';
import { calculateDetailedCapex } from './capexEngine';
import { DEFAULT_COST_CATALOG } from '../data/costCatalog';
import type { DetailedCapexConfig } from '../types';

describe('capexEngine', () => {
  const baseConfig: DetailedCapexConfig = {
    enabled: true,
    contingencyPercent: 5,
    ukMethod: 'catalog',
    selectedUKItemId: 'lv_mounting_standard_uk__öko_pv',
    manualUKKwp: 0,
    manualUKTotal: 0,
    isAgriPV: false,
    isRootProtection: false,
    windLoadZone: 1,

    selectedModuleId: 'lv_module_sf_ja_455_72166m_dg_hc',
    manualModuleWp: 0,
    manualModulePrice: 0,
    manualModuleQuantity: 0,

    includeLVCable: true,
    lvCableMethod: 'catalog',
    selectedLVCableId: 'lv_cable_cu_nyy_j_1x16mm²_erdungskabel',
    lvCableLengthM: 100,
    lvCableRuns: 1,
    manualLVCableM: 0,
    manualLVCableTotal: 0,
    lvRouteLengthM: 100,
    lvShareOpenTrench: 100,
    lvShareCableTray: 0,
    lvShareAsphalt: 0,
    lvSharePressDrilling: 0,
    lvShareHDD: 0,

    useSimplifiedMontage: true,
    montageTotalKwp: 50,
    montageDCShare: 80,
    montageACShare: 20,
    manualDCAssemblyTotal: 0,
    manualACAssemblyTotal: 0,

    includeCompensatory: false,
    compensatoryMethod: 'manual_total',
    compensatoryTotal: 0,
    includeOrdnance: false,
    ordnanceMethod: 'manual_total',
    ordnanceTotal: 0,
    includeFireProtection: false,
    fireProtectionTotal: 0,
    fenceLengthM: 1000,
    fenceCostPerM: 20,
    manualFenceTotal: 0,
    roadLengthM: 500,
    roadCostPerM: 50,
    manualRoadTotal: 0,

    gridConcept: 'transfer_station',
    includeMVRoute: true,
    includeUGS: true,
    includeTrafo: true,
    useKombistation: 'no',
    includeHVSubstation: false,
    includeFeedInCell: false,
    mvRouteLengthM: 1000,
    mvCombinedStationThresholdM: 200,
    mvSharePrivateRoad: 0,
    mvSharePublicRoad: 100,
    mvShareOpenTrench: 100,
    mvShareAsphalt: 0,
    mvSharePressDrilling: 0,
    mvShareHDD: 0,
    mvEasementCost: 0,
    mvPlanningCost: 0,
    mvManualRouteComplexityFactor: 1.0,
    privateLandCostPerM: 10,
    selectedMVCableId: 'mv_cable_na2xs(f)2y_3x1x120mm²_rm/25_12/20_kv',
    mvCableRuns: 1,
    selectedTrafoId: 'mv_transformer_transformare_trafo_3,150_kva_vs',
    selectedTrafoInverterComboId: 'combo_none',
    selectedUGSId: 'mv_station_ügs_bis_5_mw',
    selectedKombiId: 'mv_kombi_transformare_kombi_trafo_630_kva_üs',
    selectedHVSubstationId: 'hv_substation_einspeisezelle_e.dis',
    manualInverterOverride: false,
    selectedBessSystemId: '',
    selectedBessInverterId: '',
    bessInstallationCost: 0,
    selectedCertId: 'cert_certificate_anlagenzertifikat_typ_b,_small_certificate',
    certComponentB: 0,
    certComponentC: 0,

    opexMethod: 'per_mwp',
    opexPerMWpYear: 12000,
    opexPercentCapex: 1.5,
    manualOpexTotal: 0,
    discountRate: 0.06,
  };

  it('calculates standard MV Grid concept without Kombi or Combo', () => {
    const config = { ...baseConfig };
    
    // Using simple numbers to test logic
    const res = calculateDetailedCapex(config, DEFAULT_COST_CATALOG, 10, 10, 10, 500000, 2);
    
    expect(res.inverterCapex).toBe(500000); // Should be passed through
    
    const trafo = DEFAULT_COST_CATALOG.find(i => i.id === config.selectedTrafoId);
    expect(trafo).toBeDefined();
    expect(res.transformerCapex).toBe(trafo?.defaultValue);
    
    const ugs = DEFAULT_COST_CATALOG.find(i => i.id === config.selectedUGSId);
    expect(res.ugsKombiCapex).toBe(ugs?.defaultValue);
  });

  it('uses Kombistation logic (replaces Trafo)', () => {
    const config: DetailedCapexConfig = { ...baseConfig, useKombistation: 'yes' };
    
    const res = calculateDetailedCapex(config, DEFAULT_COST_CATALOG, 10, 10, 10, 500000, 2);
    
    expect(res.transformerCapex).toBe(0); // Kombi replaces separate trafo
    
    const kombi = DEFAULT_COST_CATALOG.find(i => i.id === config.selectedKombiId);
    expect(res.ugsKombiCapex).toBe(kombi?.defaultValue);
  });

  it('uses Inverter/Transformer combo logic (SMA MVPS) which includes inverter, trafo and mv station', () => {
    const config = { ...baseConfig, selectedTrafoInverterComboId: 'combo_sma_mvps_4400_s2' };
    
    const res = calculateDetailedCapex(config, DEFAULT_COST_CATALOG, 10, 10, 10, 500000, 2);
    
    expect(res.inverterIncludedInCombo).toBe(true);
    expect(res.inverterCapex).toBe(0); // Erased by combo
    
    const combo = DEFAULT_COST_CATALOG.find(i => i.id === 'combo_sma_mvps_4400_s2');
    expect(res.transformerCapex).toBe(combo?.defaultValue); // Replaces trafo Capex
    expect(res.ugsKombiCapex).toBe(0); // Combo includes MV station
  });
  
  it('uses Huawei Jupiter combo logic which includes trafo and mv station but NOT inverter', () => {
    const config = { ...baseConfig, selectedTrafoInverterComboId: 'combo_huawei_jupiter_6000k_h1' };
    
    const res = calculateDetailedCapex(config, DEFAULT_COST_CATALOG, 10, 10, 10, 500000, 2);
    
    expect(res.inverterIncludedInCombo).toBe(false);
    expect(res.inverterCapex).toBe(500000); // Preserved
    
    const combo = DEFAULT_COST_CATALOG.find(i => i.id === 'combo_huawei_jupiter_6000k_h1');
    expect(res.transformerCapex).toBe(combo?.defaultValue);
    expect(res.ugsKombiCapex).toBe(0); // Huawei Jupiter includes MV station
  });
});
