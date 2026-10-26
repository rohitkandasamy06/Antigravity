# 🏎️ APEXDRIVE AUTOMOTIVE TELEMETRY & DEMAND FORECASTING
## Official AI/ML Project Technical Documentation & Defense Guide
**Student / Author:** Rohit Kandasamy  
**Context:** 4th Semester Industrial Internship — Contus  
**Domain:** Applied Machine Learning, Predictive Time-Series Forecasting & Generative AI Systems  
**Repository:** [https://github.com/rohitkandasamy06/Antigravity](https://github.com/rohitkandasamy06/Antigravity)  

---

## 📌 Executive Summary
This project implements an **Enterprise-Grade Dual-Tier Artificial Intelligence & Machine Learning Architecture** engineered for automotive aftermarket logistics, inventory optimization, and sales demand forecasting across 5 global distribution hubs.

The system bridges **Classical Supervised Machine Learning** (for deterministic numerical time-series forecasting) with **Generative AI Foundation Models** (for natural language telemetry intelligence and strategic anomaly evaluation).

---

## 📋 Comprehensive AI/ML Project Checklist
Every rigorous academic and industrial AI/ML project is expected to deliver the following 8 pillars. Here is how this repository fulfills each requirement:

| # | Essential AI/ML Requirement | Repository Implementation / File Path | Status |
|:---|:---|:---|:---|
| **1** | **Structured Dataset & Schema** | `data/automotive_parts_sales.csv` (29,240 multi-hub records, 13 features) | ✅ Complete |
| **2** | **Exploratory Data Analysis (EDA)** | `reports/eda_correlation_heatmap.png`, statistical summary across 8 part categories | ✅ Complete |
| **3** | **Feature Engineering** | 7-day & 14-day temporal lags, rolling 7-day moving averages, price elasticity ratios | ✅ Complete |
| **4** | **Chronological Train/Val/Test Split** | Strict 70% Train / 15% Val / 15% Test chronological temporal split (Zero Lookahead Leakage) | ✅ Complete |
| **5** | **Multi-Model Benchmarking** | Ridge Regression, Random Forest Regressor, Gradient Boosting Regressor | ✅ Complete |
| **6** | **Quantitative Evaluation Metrics** | $R^2$ Score, RMSE (Root Mean Squared Error), MAE, MAPE | ✅ Complete |
| **7** | **Model Serialization & Artifacts** | `models/best_sales_forecaster.pkl`, `models/model_metadata.json` | ✅ Complete |
| **8** | **Interactive Web Deployment** | Real-time Express / Chart.js dashboard with Groq LPU Generative AI Copilot | ✅ Complete |

---

## 🧠 Model Comparison & Benchmark Results

All models were evaluated on the exact same chronological cross-validation and unseen future test horizons:

| Model Paradigm | Algorithm | Validation $R^2$ | Validation RMSE | Validation MAE | Unseen Test $R^2$ | Unseen Test MAPE |
|:---|:---|:---:|:---:|:---:|:---:|:---:|
| **Baseline Linear** | Ridge Regression (L2) | `0.7595` | `9.75 units` | `8.00 units` | `0.7410` | `12.79%` |
| **Ensemble Bagging** | Random Forest (120 Trees) | `0.9072` | `6.06 units` | `4.54 units` | `0.8590` | `6.26%` |
| **Ensemble Boosting (Champion)** | **Gradient Boosting Regressor** | **`0.9270`** | **`5.38 units`** | **`4.13 units`** | **`0.8746`** | **`6.74%`** |

> **Champion Model Conclusion:**  
> **Gradient Boosting Regressor** achieved the highest generalization capability ($R^2 = 0.9270$, Test $R^2 = 0.8746$) by iteratively minimizing pseudo-residuals and capturing non-linear interactions between seasonal tuning surges, competitor price indexing, and warehouse transit delays.

---

## 📊 Visual Evaluation Artifacts (in `reports/`)

1. **`reports/actual_vs_predicted.png`**: Time-series trajectory tracking ground-truth actual demand versus Gradient Boosting forecast over a 90-day test window ($R^2 = 0.8746$).
2. **`reports/model_comparison_metrics.png`**: Dual-axis bar chart comparing $R^2$ accuracy vs. RMSE error across all 3 trained algorithms.
3. **`reports/feature_importance.png`**: Normalized Gini feature importance ranking showing the most influential demand drivers:
   - `rolling_mean_7d` (34.2%)
   - `lag_1_units` (26.8%)
   - `seasonal_index` (14.5%)
   - `discount_pct` & `competitor_price_ratio` (9.1%)
4. **`reports/eda_correlation_heatmap.png`**: Pearson correlation matrix mapping economic, operational, and demand variables.

---

## 🏛️ Dual-Tier AI System Architecture

```
                                  ┌──────────────────────────────────────────────┐
                                  │      APEXDRIVE DUAL-TIER AI ARCHITECTURE     │
                                  └──────────────────────┬───────────────────────┘
                                                         │
                         ┌───────────────────────────────┴───────────────────────────────┐
                         ▼                                                               ▼
             [ TIER 1: NUMERICAL ML ]                                        [ TIER 2: GENERATIVE AI ]
      • Model: Gradient Boosting Regressor                            • Model: Meta LLaMA 3.3 70B / Qwen 27B
      • Training Data: 29,240 hub records                             • Acceleration: Groq Tensor Streaming LPUs
      • Primary Task: Demand & Volume Forecasting                     • Primary Task: Telemetry Insights & Chat
      • Metrics: R² = 0.9270, RMSE = 5.38                             • Inference Speed: ~400 tokens / sec
      • Artifact: models/best_sales_forecaster.pkl                    • Technique: Dynamic In-Context Grounding
                         │                                                               │
                         └───────────────────────────────┬───────────────────────────────┘
                                                         ▼
                                       ┌───────────────────────────────────┐
                                       │   FULL-STACK PRODUCTION ENGINE    │
                                       │  • Express.js REST API Backend    │
                                       │  • Glassmorphic SPA Dashboard     │
                                       │  • Real-time Chart.js Analytics   │
                                       └───────────────────────────────────┘
```

---

## 🎓 Viva Voce & Academic Defense Questions & Answers

### Q1: Why did you use Gradient Boosting instead of simple Linear Regression?
> **Answer:** *"Demand for specialized automotive components is non-linear. Factors such as spring tuning surges, price discounts, and competitor price ratios do not scale linearly. Ridge Regression achieved an $R^2$ of 0.7595, while Gradient Boosting captured high-order feature interactions, boosting $R^2$ to 0.9270 and reducing RMSE by 44.8%."*

### Q2: Why did you use a chronological split instead of K-Fold Cross Validation?
> **Answer:** *"In time-series forecasting, standard K-Fold cross-validation randomly shuffles samples, creating data leakage where future records predict past events. A strict chronological split (70% train, 15% validation, 15% test) guarantees realistic evaluation on completely unseen future quarters."*

### Q3: What is the role of Generative AI (Groq LPU) versus Classical ML?
> **Answer:** *"Classical ML handles structured, deterministic quantitative forecasting (e.g., predicting exact units sold with confidence intervals). Generative AI (LLaMA 3.3 70B via Groq) handles unstructured, qualitative intelligence—interpreting the telemetry numbers, diagnosing supply chain bottlenecks, and answering executive questions in plain English."*

### Q4: What are the key engineered features?
> **Answer:** *"We engineered temporal autocorrelation features: `lag_1_units` (prior day demand), `lag_7_units` (weekly seasonality), `rolling_mean_7d` (trend smoothing), and `competitor_price_ratio` (relative market pricing index)."*

---

## 🚀 How to Run the ML Pipeline & Interactive Dashboard

1. **Run the Classical ML Training Pipeline:**
   ```powershell
   python train_model.py
   ```
2. **Open the Interactive Jupyter Notebook:**
   ```powershell
   jupyter notebook notebooks/01_automotive_demand_forecasting.ipynb
   ```
3. **Launch the Production AI Web Dashboard:**
   ```powershell
   npm start
   ```
   Access the dashboard at: [http://localhost:3000](http://localhost:3000)
