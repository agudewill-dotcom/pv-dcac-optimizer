import fs from 'fs';

let content = fs.readFileSync('src/data/costCatalog.ts', 'utf-8');

// Update CostItem interface
const interfaceTarget = `export interface CostItem {
  id: string;
  category: string;
  subcategory: string;
  label: string;
  unit: string;
  defaultValue: number;
  source: string;
  editable: boolean;
  includeByDefault: boolean;
  notes?: string;
}`;

const interfaceReplacement = `export interface CostItem {
  id: string;
  category: string;
  subcategory: string;
  label: string;
  unit: string;
  defaultValue: number;
  source: string;
  editable: boolean;
  includeByDefault: boolean;
  notes?: string;

  // Transformer/Inverter Combination Fields
  ratedCapacityKVA?: number;
  ratedCapacityMWac?: number;
  maxInverterCount?: number;
  compatibleInverterProduct?: string;
  includesInverterCost?: boolean;
  includesTransformerCost?: boolean;
  includesMVStationCost?: boolean;
}`;

content = content.replace(interfaceTarget, interfaceReplacement);

// Add Combos and Cables
const newCombosAndCables = `
  {
    id: "combo_none",
    category: "InverterCombo",
    subcategory: "Combo",
    label: "None / separate inverter",
    unit: "piece",
    defaultValue: 0,
    source: "System",
    editable: false,
    includeByDefault: true,
    ratedCapacityKVA: 0,
    includesInverterCost: false,
    includesTransformerCost: false,
    includesMVStationCost: false
  },
  {
    id: "combo_sma_mvps_4400_s2",
    category: "InverterCombo",
    subcategory: "Combo",
    label: "SMA MVPS 4400-S2",
    unit: "piece",
    defaultValue: 270294.65,
    source: "Default Catalog",
    editable: true,
    includeByDefault: true,
    ratedCapacityKVA: 4400,
    includesInverterCost: true,
    includesTransformerCost: true,
    includesMVStationCost: true
  },
  {
    id: "combo_huawei_jupiter_3000k_h1",
    category: "InverterCombo",
    subcategory: "Combo",
    label: "Huawei Jupiter 3000K-H1",
    unit: "piece",
    defaultValue: 174347.80,
    source: "Default Catalog",
    editable: true,
    includeByDefault: true,
    ratedCapacityKVA: 3300,
    maxInverterCount: 11,
    compatibleInverterProduct: "huawei_330ktl",
    includesInverterCost: false,
    includesTransformerCost: true,
    includesMVStationCost: true
  },
  {
    id: "combo_huawei_jupiter_6000k_h1",
    category: "InverterCombo",
    subcategory: "Combo",
    label: "Huawei Jupiter 6000K-H1",
    unit: "piece",
    defaultValue: 178149,
    source: "Default Catalog",
    editable: true,
    includeByDefault: true,
    ratedCapacityKVA: 6600,
    maxInverterCount: 22,
    compatibleInverterProduct: "huawei_330ktl",
    includesInverterCost: false,
    includesTransformerCost: true,
    includesMVStationCost: true
  },
  {
    id: "combo_huawei_jupiter_9000k_h1",
    category: "InverterCombo",
    subcategory: "Combo",
    label: "Huawei Jupiter 9000K-H1",
    unit: "piece",
    defaultValue: 216849,
    source: "Default Catalog",
    editable: true,
    includeByDefault: true,
    ratedCapacityKVA: 9000,
    maxInverterCount: 30,
    compatibleInverterProduct: "huawei_330ktl",
    includesInverterCost: false,
    includesTransformerCost: true,
    includesMVStationCost: true
  },
  {
    id: "combo_custom",
    category: "InverterCombo",
    subcategory: "Combo",
    label: "Custom Transformer-Inverter Combo",
    unit: "piece",
    defaultValue: 0,
    source: "User Input",
    editable: true,
    includeByDefault: true,
    includesInverterCost: true,
    includesTransformerCost: true,
    includesMVStationCost: true
  },
  {
    id: "mv_cable_na2xs(f)2y_3x1x120mm²_rm/25_12/20_kv",
    category: "MV",
    subcategory: "Cable",
    label: "NA2XS(F)2Y 3x1x120mm² RM/25 12/20 kV",
    unit: "€/m",
    defaultValue: 30.36,
    source: "Catalog",
    editable: true,
    includeByDefault: true
  },
  {
    id: "mv_cable_na2xs(f)2y_3x1x150mm²_rm/25_12/20_kv",
    category: "MV",
    subcategory: "Cable",
    label: "NA2XS(F)2Y 3x1x150mm² RM/25 12/20 kV",
    unit: "€/m",
    defaultValue: 34.16,
    source: "Catalog",
    editable: true,
    includeByDefault: true
  },
  {
    id: "mv_cable_na2xs(f)2y_3x1x240mm²_rm/25_18/30_kv",
    category: "MV",
    subcategory: "Cable",
    label: "NA2XS(F)2Y 3x1x240mm² RM/25 18/30 kV",
    unit: "€/m",
    defaultValue: 38.12,
    source: "Catalog",
    editable: true,
    includeByDefault: true
  },
  {
    id: "mv_cable_na2xs(f)2y_3x1x300mm²_rm/25_18/30_kv",
    category: "MV",
    subcategory: "Cable",
    label: "NA2XS(F)2Y 3x1x300mm² RM/25 18/30 kV",
    unit: "€/m",
    defaultValue: 43.16,
    source: "Catalog",
    editable: true,
    includeByDefault: true
  },
  {
    id: "mv_cable_na2xs(f)2y_3x1x400mm²_rm/25_18/30_kv",
    category: "MV",
    subcategory: "Cable",
    label: "NA2XS(F)2Y 3x1x400mm² RM/25 18/30 kV",
    unit: "€/m",
    defaultValue: 53.97,
    source: "Catalog",
    editable: true,
    includeByDefault: true
  },
  {
    id: "mv_cable_na2xs(f)2y_3x1x500mm²_rm/25_18/30_kv",
    category: "MV",
    subcategory: "Cable",
    label: "NA2XS(F)2Y 3x1x500mm² RM/25 18/30 kV",
    unit: "€/m",
    defaultValue: 60.73,
    source: "Catalog",
    editable: true,
    includeByDefault: true
  },
  {
    id: "mv_cable_na2xs(f)2y_3x1x630mm²_rm/25_18/30_kv",
    category: "MV",
    subcategory: "Cable",
    label: "NA2XS(F)2Y 3x1x630mm² RM/25 18/30 kV",
    unit: "€/m",
    defaultValue: 74.06,
    source: "Catalog",
    editable: true,
    includeByDefault: true
  },
  {
    id: "mv_cable_na2xs(f)2y_3x1x800mm²_rm/35_12/20_kv",
    category: "MV",
    subcategory: "Cable",
    label: "NA2XS(F)2Y 3x1x800mm² RM/35 12/20 kV",
    unit: "€/m",
    defaultValue: 105.39,
    source: "Catalog",
    editable: true,
    includeByDefault: true
  },
  {
    id: "mv_cable_na2xs(f)2y_3x1x800mm²_rm/35_18/30_kv",
    category: "MV",
    subcategory: "Cable",
    label: "NA2XS(F)2Y 3x1x800mm² RM/35 18/30 kV",
    unit: "€/m",
    defaultValue: 117.25,
    source: "Catalog",
    editable: true,
    includeByDefault: true
  },`;

content = content.replace('export const DEFAULT_COST_CATALOG: CostItem[] = [', 'export const DEFAULT_COST_CATALOG: CostItem[] = [' + newCombosAndCables);

// Change HV 20 MW Umspannwerk to manual input
content = content.replace('"id": "hv_substation_umspannwerk_20_mw",', '"id": "hv_substation_umspannwerk_20_mw_manual",');
content = content.replace('"label": "Umspannwerk 20 MW",', '"label": "HV substation 20 MW / manual input required",');
// It already has defaultValue: 0, which is fine since we renamed the ID and label. We can add a note:
content = content.replace(/(?<=hv_substation_umspannwerk_20_mw_manual[\s\S]*?)"notes": ""/, '"notes": "MANUAL_REQUIRED"');

fs.writeFileSync('src/data/costCatalog.ts', content);
