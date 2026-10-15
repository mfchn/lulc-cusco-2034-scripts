# Software and Environment Specification

This document details the desktop software, cloud platforms, Python environment, and package versions used for the study **"Spatiotemporal Prediction of Land Use and Land Cover Change in Cusco Using Random Forest, Cellular Automata and Markov Chains"** (completed in January 2026).

---

## 1. Cloud Platforms & Desktop GIS Software

| Software / Platform | Version / Release (Dec 2025) | Role in the Study |
| :--- | :--- | :--- |
| **Google Earth Engine (GEE)** | JavaScript API (Code Editor) | Acquisition, radiometric/cloud filtering, median composites, spectral indices calculation, and Random Forest (RF) classification (`clasification/GEE/`). |
| **Google Colaboratory** | Ubuntu 22.04 LTS (Cloud Runtime, Dec 2025 – Jan 2026) | Execution environment for Multilayer Perceptron (MLP) classification, CA-Markov simulation, and Explainable AI (XAI) analysis. |
| **QGIS** | `3.40.14-Bratislava (LTR)` *(or `3.44.6-Solothurn`)* | Preparation of spatial driving factors (Euclidean distances, topographic layers), spatial harmonization (UTM Zone 19S, WGS 84, 30 m), and final cartographic layout. |
| **Google Earth Pro** | `7.3.6.10201 (64-bit)` | Collection and visual photo-interpretation of 4,521 ground-truth reference points (2004, 2014, and 2024). |

---

## 2. Python Environment (`clasification/mlp/` & `prediccion/`)

All Python notebooks (`.ipynb`) were executed in Google Colaboratory using the standard runtime environment:

* **Python Version:** `3.11.11` (64-bit)

### Core Python Packages

| Package | Version | Purpose |
| :--- | :--- | :--- |
| `numpy` | `1.26.4` | Matrix operations, Markov Chain (MC) transition probability matrices, and Cellular Automata (CA) iterative spatial allocation. |
| `scikit-learn` | `1.6.0` | Implementation and hyperparameter optimization of Multilayer Perceptron (MLP) models, accuracy metrics (OA, Kappa, F1-score, AUC-ROC), Permutation Feature Importance (PFI), and Partial Dependence Plots (PDP). |
| `pandas` | `2.2.2` | Tabular data manipulation, ground-truth sample handling, and cross-tabulation analysis. |
| `scipy` | `1.13.1` | Statistical calculations, Pearson correlation ($r$) collinearity filtering, and spatial neighborhood convolutions ($3 \times 3$ moving window). |
| `rasterio` | `1.4.3` | Reading, writing, and georeferencing of GeoTIFF (`.tif`) raster layers. |
| `matplotlib` | `3.10.0` | Visualization of training curves, Partial Dependence Plots (PDP), and validation figures. |
| `seaborn` | `0.13.2` | Confusion matrices and correlation heatmaps. |
| `joblib` | `1.4.2` | Serialization and deployment of trained MLP models (`03_inferencia_despliegue_modelo.ipynb`). |

---

## 3. Repository Structure & Execution Mapping

* **`clasification/GEE/*.js`**: Executed in Google Earth Engine Code Editor (JavaScript API).
* **`clasification/mlp/*.ipynb`**: Executed in Google Colab (`Python 3.11.11`, `scikit-learn==1.6.0`).
* **`prediccion/*.ipynb`**: Executed in Google Colab (`Python 3.11.11`, `numpy==1.26.4`, `scikit-learn==1.6.0`, `rasterio==1.4.3`).
