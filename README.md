# BRI vs Non-BRI Development Visualization

Website link: https://com-480-data-visualization.github.io/DVX/

## Overview

This project explores whether countries participating in the Belt and Road Initiative (BRI) show different development trajectories compared to non-BRI countries. Instead of focusing on a single metric, we consider multiple dimensions such as economic growth, infrastructure, technology adoption, trade, and governance.

## Data

The main dataset is the World Development Indicators (WDI) from the World Bank, which provides long-term socio-economic data for over 200 countries.

We also use external sources to identify BRI countries and regional groupings. Official BRI data was considered, but due to download limitations, it is only used as a supplementary source to fill missing values.

## Method

- Countries are grouped into BRI (treatment) and non-BRI (control); they are also grouped by sub-continental groups
- 2013 is treated as the intervention year and the total range is from 2000 to 2025
- Small gaps are filled using limited interpolation

## Variables

We rename raw WDI indicators into shorter and more consistent variable names:

- Country Name → `country`  
- Country Code → `country_code`  
- Year → `year`  

### Infrastructure & Transport
- Access to electricity (% of population) → `electricity_access`  
- Air transport, freight → `air_freight`  
- Air transport, passengers → `air_passengers`  
- Container port traffic → `container_traffic`  
- Railways freight → `rail_freight`  
- Railways passengers → `rail_passengers`  

### Economy & Trade
- GDP growth (annual %) → `gdp_growth`  
- GDP per capita (current US$) → `gdp_pc`  
- GNI per capita (Atlas method) → `gni_pc_atlas`  
- Current account balance (% of GDP) → `cab_gdp_pct`  
- Current account balance (US$) → `cab_usd`  

- Exports growth → `exports_growth`  
- Exports (US$) → `exports_usd`  
- Export value index → `export_value_idx`  
- Export volume index → `export_volume_idx`  

- Imports (% of GDP) → `imports_gdp_pct`  
- Import value index → `import_value_idx`  
- Import volume index → `import_volume_idx`  

### Society & Inequality
- Gini index → `gini`  
- Unemployment (ILO) → `unemp_ilo`  
- Unemployment (national) → `unemp_national`  
- Internet users (% of population) → `internet_users_pct`  

### Governance
- Control of corruption (estimate) → `corr_control_est`  
- Control of corruption (rank) → `corr_control_rank`  
- Government effectiveness (estimate) → `gov_eff_est`  
- Political stability (estimate) → `pol_stab_est`  

### Trade Policy
- Tariff rate (applied) → `tariff_applied_pct`  
- Tariff rate (MFN) → `tariff_mfn_pct`  

### Metadata
- Region → `region`  
- DID group (BRI vs non-BRI) → `did_group`  
