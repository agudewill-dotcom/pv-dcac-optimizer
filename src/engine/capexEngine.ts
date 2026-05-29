import type { DetailedCapexConfig, DetailedCapexBreakdown } from '../types';
import type { CostItem } from '../data/costCatalog';

export function calculateDetailedCapex(
  config: DetailedCapexConfig,
  catalog: CostItem[],
  dcMWp: number,
  _acMWacTarget: number,
  _installedInverterAcMWac: number,
  inverterCapex: number,
  _numberOfInverters: number
): DetailedCapexBreakdown {
  
  const getItem = (id: string) => catalog.find(item => item.id === id);
  const getVal = (id: string) => getItem(id)?.defaultValue || 0;

  // A1. UK
  let ukCapex = 0;
  if (config.ukMethod === 'catalog') {
    let selectedId = config.selectedUKItemId;
    if (config.isAgriPV && selectedId === 'lv_mounting_standard_uk__öko_pv') {
      // Very basic fallback if logic isn't perfectly handled in UI
      if (config.windLoadZone === 2) selectedId = 'lv_mounting_agri_pv_din_spec_91434,_windlastzone_2';
      else selectedId = 'lv_mounting_agri_pv_din_spec_91434,_windlastzone_3';
    }
    if (config.isRootProtection) {
      selectedId = 'lv_mounting_root_protection__wurzelmanschetten__moor_uk';
    }
    let ukCostPerKwp = getVal(selectedId);
    ukCapex = dcMWp * 1000 * ukCostPerKwp;
  } else if (config.ukMethod === 'manual_kwp') {
    ukCapex = dcMWp * 1000 * config.manualUKKwp;
  } else {
    ukCapex = config.manualUKTotal;
  }

  // A2. Modules
  let moduleCapex = 0;
  const moduleItem = getItem(config.selectedModuleId);
  // parse kWp from notes, e.g. "0.455 kWp/module"
  const parsedKwP = moduleItem && moduleItem.notes ? parseFloat(moduleItem.notes.split(' ')[0]) : 0;
  const moduleWp = config.manualModuleWp || (parsedKwP * 1000);
  const modulePrice = config.manualModulePrice || (moduleItem?.defaultValue || 0);
  let moduleCount = 0;
  if (config.manualModuleQuantity && config.manualModuleQuantity > 0) {
    moduleCount = config.manualModuleQuantity;
  } else if (moduleWp > 0) {
    moduleCount = Math.ceil(dcMWp * 1000000 / moduleWp);
  }
  moduleCapex = moduleCount * modulePrice;

  // A3. LV Cables
  let lvCableMaterialCapex = 0;
  if (config.includeLVCable) {
    if (config.lvCableMethod === 'catalog') {
      lvCableMaterialCapex = config.lvCableLengthM * config.lvCableRuns * getVal(config.selectedLVCableId);
    } else if (config.lvCableMethod === 'manual_m') {
      lvCableMaterialCapex = config.lvCableLengthM * config.lvCableRuns * config.manualLVCableM;
    } else {
      lvCableMaterialCapex = config.manualLVCableTotal;
    }
  }

  // A4. LV Route Installation
  let lvRouteInstallationCapex = 0;
  if (config.manualLVRouteTotal !== undefined && config.manualLVRouteTotal > 0) {
    lvRouteInstallationCapex = config.manualLVRouteTotal;
  } else {
    lvRouteInstallationCapex = config.lvRouteLengthM * (
      (config.lvShareOpenTrench / 100) * 38 +
      (config.lvShareCableTray / 100) * 23 +
      (config.lvShareAsphalt / 100) * 110 +
      (config.lvSharePressDrilling / 100) * 150 +
      (config.lvShareHDD / 100) * 275
    );
  }

  // A5. LV Assembly
  let lvAssemblyCapex = 0;
  if (config.useSimplifiedMontage) {
    lvAssemblyCapex = dcMWp * 1000 * config.montageTotalKwp * ((config.montageDCShare + config.montageACShare) / 100);
  } else {
    lvAssemblyCapex = (config.manualDCAssemblyTotal || 0) + (config.manualACAssemblyTotal || 0);
  }

  // A6. Adders
  let compensatoryCapex = config.includeCompensatory ? config.compensatoryTotal : 0;
  let ordnanceCapex = config.includeOrdnance ? config.ordnanceTotal : 0;
  let fireProtectionCapex = config.includeFireProtection ? config.fireProtectionTotal : 0;
  
  let fenceCapex = config.manualFenceTotal !== undefined && config.manualFenceTotal > 0 ? config.manualFenceTotal : (config.fenceLengthM * config.fenceCostPerM);
  let roadCapex = config.manualRoadTotal !== undefined && config.manualRoadTotal > 0 ? config.manualRoadTotal : (config.roadLengthM * config.roadCostPerM);
  
  let otherCapex = 0;

  // B. MV / HV Grid-Side
  let mvCableMaterialCapex = 0;
  let mvRouteInstallationCapex = 0;
  let transformerCapex = 0;
  let ugsKombiCapex = 0;
  let hvSubstationCapex = 0;

  if (config.includeMVRoute) {
    mvCableMaterialCapex = config.mvRouteLengthM * config.mvCableRuns * getVal(config.selectedMVCableId);
    
    if (config.manualMVRouteTotal !== undefined && config.manualMVRouteTotal > 0) {
      mvRouteInstallationCapex = config.manualMVRouteTotal;
    } else {
      const publicLength = config.mvRouteLengthM * (config.mvSharePublicRoad / 100);
      const privateLength = config.mvRouteLengthM * (config.mvSharePrivateRoad / 100);
      
      const installCost = publicLength * (
        (config.mvShareOpenTrench / 100) * 38 +
        (config.mvShareAsphalt / 100) * 110 +
        (config.mvSharePressDrilling / 100) * 150 +
        (config.mvShareHDD / 100) * 275
      ) * config.mvManualRouteComplexityFactor;
      
      const privateCost = privateLength * config.privateLandCostPerM;
      
      mvRouteInstallationCapex = installCost + privateCost + config.mvEasementCost + config.mvPlanningCost;
    }
  }

  let comboName = undefined;
  let inverterIncludedInCombo = false;
  const combo = getItem(config.selectedTrafoInverterComboId);

  if (combo && combo.id !== 'combo_none' && combo.id !== 'none') {
    comboName = combo.label;
    inverterIncludedInCombo = combo.includesInverterCost || false;
    
    // The combo cost goes into transformerCapex
    transformerCapex = getVal(combo.id);

    // If combo includes MV station (like SMA MVPS), we don't add separate UGS/Kombi unless forced.
    if (!combo.includesMVStationCost) {
       // We still need a station if UGS or Kombi is enabled
       if (config.useKombistation === 'yes') {
         ugsKombiCapex = getVal(config.selectedKombiId);
       } else if (config.includeUGS) {
         ugsKombiCapex = getVal(config.selectedUGSId);
       }
    }
  } else {
    // Normal logic without Inverter-Combo
    if (config.useKombistation === 'yes') {
      ugsKombiCapex = getVal(config.selectedKombiId);
      // Kombi replaces separate trafo
      transformerCapex = 0;
    } else {
      if (config.includeTrafo) {
        transformerCapex = getVal(config.selectedTrafoId);
      }
      if (config.includeUGS) {
        ugsKombiCapex = getVal(config.selectedUGSId);
      }
    }
  }

  if (config.includeHVSubstation) {
    hvSubstationCapex = getVal(config.selectedHVSubstationId);
  }
  
  if (config.includeFeedInCell && config.gridConcept === 'edis_cell') {
     hvSubstationCapex += getVal('hv_substation_einspeisezelle_e.dis');
  }

  if (config.manualGridOverrideTotal !== undefined && config.manualGridOverrideTotal > 0) {
    mvCableMaterialCapex = 0;
    mvRouteInstallationCapex = 0;
    transformerCapex = 0;
    ugsKombiCapex = 0;
    hvSubstationCapex = config.manualGridOverrideTotal;
  }

  // C. Inverter
  // inverterCapex is passed in as a parameter, but we nullify it if it's included in the combo
  if (inverterIncludedInCombo) {
    inverterCapex = 0;
  }

  // D. BESS
  let bessCapex = 0;
  if (config.selectedBessSystemId) bessCapex += getVal(config.selectedBessSystemId);
  if (config.selectedBessInverterId) bessCapex += getVal(config.selectedBessInverterId);
  bessCapex += config.bessInstallationCost;

  // E. Certification
  let certificationCapex = getVal(config.selectedCertId) + config.certComponentB + config.certComponentC;

  let baseTotal = moduleCapex + ukCapex + lvCableMaterialCapex + lvRouteInstallationCapex + lvAssemblyCapex + 
    mvCableMaterialCapex + mvRouteInstallationCapex + transformerCapex + ugsKombiCapex + hvSubstationCapex + 
    inverterCapex + bessCapex + certificationCapex + fireProtectionCapex + compensatoryCapex + 
    ordnanceCapex + roadCapex + fenceCapex + otherCapex;

  let contingencyCapex = baseTotal * (config.contingencyPercent / 100);
  let totalCapex = baseTotal + contingencyCapex;

  let groupLvPlant = moduleCapex + ukCapex + lvCableMaterialCapex + lvRouteInstallationCapex + lvAssemblyCapex +
                     compensatoryCapex + ordnanceCapex + roadCapex + fenceCapex + fireProtectionCapex;
  let groupMvHvGrid = mvCableMaterialCapex + mvRouteInstallationCapex + transformerCapex + ugsKombiCapex + hvSubstationCapex;
  let groupInverter = inverterCapex;
  let groupBess = bessCapex;
  let groupOther = certificationCapex + otherCapex + contingencyCapex;

  return {
    moduleCapex,
    ukCapex,
    lvCableMaterialCapex,
    lvRouteInstallationCapex,
    lvAssemblyCapex,
    mvCableMaterialCapex,
    mvRouteInstallationCapex,
    transformerCapex,
    ugsKombiCapex,
    hvSubstationCapex,
    inverterCapex,
    bessCapex,
    certificationCapex,
    fireProtectionCapex,
    compensatoryCapex,
    ordnanceCapex,
    roadCapex,
    fenceCapex,
    otherCapex,
    contingencyCapex,
    totalCapex,

    groupLvPlant,
    groupMvHvGrid,
    groupInverter,
    groupBess,
    groupOther,

    inverterIncludedInCombo,
    comboName
  };
}
