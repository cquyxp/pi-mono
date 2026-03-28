#!/usr/bin/env node
/**
 * Search for Jinhua PV data
 */

import fetch from "node-fetch";

async function main() {
  console.log("=".repeat(80));
  console.log("Searching Jinhua PV Data");
  console.log("=".repeat(80));
  console.log();

  // 1. Try to get NASA POWER data for Jinhua
  console.log("[1/3] Fetching NASA POWER data for Jinhua...");
  try {
    const lat = 29.08;
    const lon = 119.65;
    const nasaUrl = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=ALLSKY_SFC_SW_DWN&community=RE&longitude=${lon}&latitude=${lat}&start=20230101&end=20231231&format=json`;
    console.log("URL:", nasaUrl);
    const response = await fetch(nasaUrl);
    const result = await response.json();
    console.log("NASA POWER data fetched successfully!");
    if (result.properties && result.properties.parameter && result.properties.parameter.ALLSKY_SFC_SW_DWN) {
      const dailyData = result.properties.parameter.ALLSKY_SFC_SW_DWN;
      const values = Object.values(dailyData).filter((v: any) => typeof v === 'number' && v > 0);
      const total = values.reduce((a: number, b: number) => a + b, 0);
      console.log(`  Annual total: ${total.toFixed(1)} kWh/m²`);
      console.log(`  Annual peak sun hours: ${(total / 1000).toFixed(1)} h`);
    }
  } catch (e) {
    console.log("NASA POWER fetch failed:", e);
  }

  console.log();
  console.log();

  // 2. Summary
  console.log("[2/3] Summary:");
  console.log();
  console.log("For accurate Jinhua PV data, recommended sources:");
  console.log("  1. NASA POWER Data Access Viewer");
  console.log("     https://power.larc.nasa.gov/data-access-viewer/");
  console.log("  2. 金华市气象局");
  console.log("  3. 浙江省能源局");
  console.log("  4. PVsyst software with local meteorological data");
  console.log();
  console.log("Typical Jinhua parameters (based on regional data):");
  console.log("  - Latitude: 29.08°N");
  console.log("  - Longitude: 119.65°E");
  console.log("  - Annual peak sun hours: 1150-1300 h");
  console.log("  - Annual global horizontal irradiation: ~1250 kWh/m²");
  console.log("  - Optimal tilt angle: 25-30°");
  console.log("  - System efficiency: 75-82%");
  console.log();
  console.log("[3/3] Done!");
  console.log();
}

main().catch(console.error);
