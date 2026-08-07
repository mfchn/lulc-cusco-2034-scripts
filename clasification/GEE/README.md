# Multitemporal Land Cover Classification and Dynamic Analysis in Cusco, Peru (2004–2014–2024)

[![Platform: Google Earth Engine](https://img.shields.io/badge/Platform-Google%20Earth%20Engine-brightgreen)](https://earthengine.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Official repository for the Earth Observation scripts accompanying the scientific paper presented at **SIMBIG (International Conference on Information Management and Big Data)**.

This repository contains the full processing workflow implemented in **Google Earth Engine (GEE)** for multi-temporal Land Use and Land Cover (LULC) classification and change detection in the Province of Cusco, Peru across a 20-year timeframe (2004, 2014, and 2024).

---

## 📌 Workflow Overview

The methodology follows a multi-stage pipeline designed for cloud-free compositing, multi-source feature extraction, hyperparameter-tuned machine learning classification, and model validation.

```
[Satellite Data Ingestion] ➔ [Cloud Masking & Compositing] ➔ [Index & Topo Integration] ➔ [Random Forest Classification] ➔ [Validation & Export]
    - Landsat 5 TM (2004)        - QA / Cloud Score+ Masking     - NDVI, SAVI, NDBI, NDMI       - SmileRandomForest Grid Search     - Confusion Matrix
    - Landsat 8 OLI (2014)       - Austral Winter Composite      - BSI, UI                      - Hyperparameter Optimization       - Kappa & Accuracy
    - Sentinel-2 MSI (2024)      - Median Reduction              - ALOS AW3D30 Elevation & Slope                                     - Asset / Drive Exports
```

---

## 📁 Repository Structure

The scripts are organized sequentially according to their execution order:

| File Name | Stage | Description |
| :--- | :--- | :--- |
| `0_tiles.js` | Ingestion | Sentinel-2 tile selection and spatial region indexing for Cusco province. |
| `a_LS5_2004_get_imgs.js` | Ingestion | Landsat 5 TM Collection 2 Tier 1 L2 acquisition & austral winter filtering (2004). |
| `a_LS8_2014_get_imgs.js` | Ingestion | Landsat 8 OLI Collection 2 Tier 1 L2 acquisition & filtering (2014). |
| `a_S2A_2024_get_imgs.js` | Ingestion | Sentinel-2 SR Harmonized acquisition & filtering (2024). |
| `b_LS5_2004_mskd_mdn.js` | Compositing | Cloud masking and median composite creation for Landsat 5 (2004). |
| `b_LS5_2004_mskd_mdn_cmplt.js` | Compositing | Gap-filling and spatial clipping of 2004 median composite. |
| `b_LS8_2014_mskd_mdn.js` | Compositing | Cloud/shadow masking and median composite creation for Landsat 8 (2014). |
| `b_S2A_2024_cmps.js` | Compositing | Cloud Score+ QA masking and composite generation for Sentinel-2 (2024). |
| `b_S2A_mosaic_mskd.js` | Compositing | Sentinel-2 mosaic aggregation and spatial alignment. |
| `c_indices_bandas_altura_slope.js` | Feature Extraction | Computation of spectral indices (NDVI, SAVI, NDBI, NDMI, BSI, UI) and ALOS DEM integration. |
| `d_LS5_2004_clasificacion.js` | ML & Validation | Random Forest hyperparameter tuning, classification, accuracy matrix, and export for 2004. |
| `d_LS8_2014_clasificacion.js` | ML & Validation | Random Forest hyperparameter tuning, classification, accuracy matrix, and export for 2014. |
| `d_S2A_2024_clasificacion.js` | ML & Validation | Random Forest hyperparameter tuning, classification, accuracy matrix, and export for 2024. |

---

## 📊 Datasets & Feature Space

### 1. Satellite Imagery & DEM Inputs

| Sensor / Dataset | Acquisition Window | Resolution | Source Collection |
| :--- | :--- | :--- | :--- |
| **Landsat 5 TM** | June 20, 2004 – Sept 24, 2004 | 30 m | `LANDSAT/LT05/C02/T1_L2` |
| **Landsat 8 OLI** | June 20, 2014 – Sept 24, 2014 | 30 m | `LANDSAT/LC08/C02/T1_L2` |
| **Sentinel-2 MSI** | June 20, 2024 – Sept 24, 2024 | 10–20 m | `COPERNICUS/S2_SR_HARMONIZED` & `GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED` |
| **ALOS AW3D30 V3.2** | Static DEM | 30 m | `JAXA/ALOS/AW3D30/V3_2` |

### 2. Spectral Indices & Topographic Variables

For each period, the feature vector consists of multispectral bands, 6 spectral indices, and 2 topographic metrics:

* **NDVI (Normalized Difference Vegetation Index)**: $(NIR - RED) / (NIR + RED)$
* **SAVI (Soil-Adjusted Vegetation Index)**: $((NIR - RED) \times (1 + L)) / (NIR + RED + L)$, where $L = 0.5$
* **NDBI (Normalized Difference Built-up Index)**: $(SWIR_1 - NIR) / (SWIR_1 + NIR)$
* **NDMI (Normalized Difference Moisture Index)**: $(NIR - SWIR_1) / (NIR + SWIR_1)$
* **BSI (Bare Soil Index)**: $((SWIR_1 + RED) - (NIR + BLUE)) / ((SWIR_1 + RED) + (NIR + BLUE))$
* **UI (Urban Index)**: $(SWIR_2 - NIR) / (SWIR_2 + NIR)$
* **Elevation**: Digital Surface Model from ALOS DEM.
* **Slope**: Terrain slope derived from elevation (in degrees).

---

## 🏷️ Land Cover Classes

The classification legend uses a standardized 4-class system:

| Class Code | Class Name | Description | Palette |
| :---: | :--- | :--- | :---: |
| `0` | **Agua / Background** | Water bodies / Reserved background class for GIS interoperability | `#1e88e5` |
| `1` | **Vegetación** | Native forests, agricultural fields, grasslands, and shrubs | `#004d40` |
| `2` | **Suelo Desnudo** | Unvegetated soil, exposed rock, and degraded terrain | `#cc6d8f` |
| `3` | **Urbano** | Built-up areas, roads, impervious surfaces, and infrastructure | `#ffc107` |

---

## 🤖 Machine Learning Model & Tuning

The classification is performed using GEE's `ee.Classifier.smileRandomForest`.

* **Hyperparameter Grid Search**:
  * `numberOfTrees`: Evaluated from 10 to 150 (step 10).
  * `bagFraction`: Evaluated from 0.1 to 0.9 (step 0.1).
* **Validation & Accuracy Assessment**:
  * Overall Accuracy
  * Cohen's Kappa Coefficient
  * Producer's Accuracy (Recall)
  * Consumer's Accuracy (Precision)
  * Variable Importance analysis (Gini importance relative percentage)

---

## 🚀 Execution Instructions

1. Open the [Google Earth Engine Code Editor](https://code.earthengine.google.com/).
2. Load the boundary geometry (`cusco_prov_shapefile`) and training ground control points (`urbano`, `vegetacion`, `suelo`) into your GEE assets or Code Editor script header.
3. Run the compositing script for the desired year (`b_*_mskd_mdn.js` or `b_S2A_2024_cmps.js`).
4. Execute `c_indices_bandas_altura_slope.js` to compute features and DEM variables.
5. Execute the corresponding classification script (`d_LS5_2004_clasificacion.js`, `d_LS8_2014_clasificacion.js`, or `d_S2A_2024_clasificacion.js`).
6. Results will be logged in the GEE Console and tasks generated in the **Tasks** tab for asset and Google Drive export (CSV hyperparameter table and GeoTIFF classified maps).

---

## 📜 Citation & Reference

If you use these scripts or data in your research, please cite our SIMBIG paper:

```bibtex
@inproceedings{cusco_lulc_simbig2024,
  title={Multitemporal Land Cover Classification and Change Detection in Cusco, Peru Using Google Earth Engine and Random Forest},
  author={Author Names},
  booktitle={Proceedings of the International Conference on Information Management and Big Data (SIMBIG)},
  year={2024}
}
```
