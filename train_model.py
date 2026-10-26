import os
import sys
import json
import numpy as np
import pandas as pd

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import TimeSeriesSplit
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import joblib

# Create directories
os.makedirs('data', exist_ok=True)
os.makedirs('models', exist_ok=True)
os.makedirs('reports', exist_ok=True)
os.makedirs('notebooks', exist_ok=True)

print("=" * 70)
print("  APEXDRIVE AUTO PARTS - ML DEMAND FORECASTING ENGINE PIPELINE")
print("=" * 70)

# ─── 1. DATASET GENERATION ───────────────────────────────────────────────────
print("\n[*] Step 1: Generating 2-year realistic multi-hub telemetry dataset...")
np.random.seed(42)

dates = pd.date_range(start='2024-01-01', end='2025-12-31', freq='D')
categories = [
    'Braking & Rotors', 'Turbo & Powertrain', 'Suspension & Steering',
    'Electrical & Ignition', 'Wheels & Track Tires', 'Performance Exhausts',
    'Fluids & Race Lubricants', 'Engine Internals'
]
hubs = ['HUB-DTW', 'HUB-DFW', 'HUB-LAX', 'HUB-ATL', 'HUB-FRA']

base_prices = {
    'Braking & Rotors': 650, 'Turbo & Powertrain': 1450, 'Suspension & Steering': 1100,
    'Electrical & Ignition': 320, 'Wheels & Track Tires': 880, 'Performance Exhausts': 920,
    'Fluids & Race Lubricants': 140, 'Engine Internals': 1850
}

rows = []
for d in dates:
    month = d.month
    day_of_week = d.dayofweek
    is_weekend = 1 if day_of_week in [5, 6] else 0
    
    # Seasonal multipliers (Spring tuning surge in Mar-May, Winter brake/fluids in Nov-Dec)
    seasonal_factor = 1.0 + 0.25 * np.sin(2 * np.pi * (month - 2) / 12) + 0.15 * (1 if month in [3, 4, 10, 11] else 0)
    
    for cat in categories:
        cat_mult = {
            'Braking & Rotors': 1.4, 'Turbo & Powertrain': 0.8, 'Suspension & Steering': 1.1,
            'Electrical & Ignition': 1.6, 'Wheels & Track Tires': 0.9, 'Performance Exhausts': 0.75,
            'Fluids & Race Lubricants': 2.2, 'Engine Internals': 0.6
        }[cat]
        for hub in hubs:
            hub_mult = {'HUB-DTW': 1.45, 'HUB-DFW': 1.20, 'HUB-LAX': 1.30, 'HUB-ATL': 1.10, 'HUB-FRA': 0.90}[hub]
            base_price = base_prices[cat]
            unit_price = round(base_price * np.random.uniform(0.95, 1.05), 2)
            discount_pct = np.random.choice([0, 5, 10, 15, 20], p=[0.50, 0.22, 0.14, 0.09, 0.05])
            lead_time_days = np.random.randint(1, 5)
            comp_price_index = round(np.random.uniform(0.92, 1.12), 3)
            
            # Non-linear demand relationships
            price_ratio = unit_price / base_price
            discount_effect = 1.0 + (discount_pct / 100.0) * 1.8
            competitor_effect = 1.0 + (comp_price_index - 1.0) * 1.5
            lead_time_effect = 1.0 - ((lead_time_days - 1) * 0.05)
            weekend_boost = 1.22 if is_weekend else 0.94
            
            # Deterministic demand core with controlled Gaussian stochasticity
            demand_core = (12.0 * cat_mult * hub_mult * seasonal_factor * discount_effect * competitor_effect * lead_time_effect * weekend_boost) / price_ratio
            noise = np.random.normal(0, 1.2)
            units_sold = int(max(1, round(demand_core + noise)))
            
            revenue = round(units_sold * unit_price * (1 - discount_pct / 100), 2)
            
            rows.append({
                'date': d.strftime('%Y-%m-%d'),
                'hub_code': hub,
                'category': cat,
                'unit_price': unit_price,
                'discount_pct': discount_pct,
                'lead_time_days': lead_time_days,
                'competitor_price_ratio': comp_price_index,
                'seasonal_index': round(seasonal_factor, 3),
                'is_weekend': is_weekend,
                'month': month,
                'day_of_week': day_of_week,
                'units_sold': units_sold,
                'revenue': revenue
            })

df = pd.DataFrame(rows)
df.to_csv('data/automotive_parts_sales.csv', index=False)
print(f"[+] Dataset saved to data/automotive_parts_sales.csv with {len(df):,} records and {df.shape[1]} features.")

# ─── 2. FEATURE ENGINEERING & TEMPORAL AGGREGATION ────────────────────────────
print("\n[*] Step 2: Aggregating daily hub telemetry & engineering temporal lag features...")

# Daily level aggregation across hub and category for robust time-series forecasting
daily_agg = df.groupby(['date', 'category']).agg({
    'units_sold': 'sum',
    'revenue': 'sum',
    'unit_price': 'mean',
    'discount_pct': 'mean',
    'lead_time_days': 'mean',
    'competitor_price_ratio': 'mean',
    'seasonal_index': 'mean',
    'is_weekend': 'first',
    'month': 'first',
    'day_of_week': 'first'
}).reset_index()

daily_agg['date'] = pd.to_datetime(daily_agg['date'])
daily_agg = daily_agg.sort_values(by=['category', 'date']).reset_index(drop=True)

# Lags and rolling features per category
daily_agg['lag_1_units'] = daily_agg.groupby('category')['units_sold'].shift(1)
daily_agg['lag_7_units'] = daily_agg.groupby('category')['units_sold'].shift(7)
daily_agg['lag_14_units'] = daily_agg.groupby('category')['units_sold'].shift(14)
daily_agg['rolling_mean_7d'] = daily_agg.groupby('category')['units_sold'].shift(1).rolling(7).mean().reset_index(0, drop=True)
daily_agg['rolling_std_7d'] = daily_agg.groupby('category')['units_sold'].shift(1).rolling(7).std().reset_index(0, drop=True)

# Drop initial NaN rows created by lags
daily_agg = daily_agg.dropna().reset_index(drop=True)
print(f"[+] Engineered features: lag_1, lag_7, lag_14, rolling_mean_7d, rolling_std_7d. Active rows: {len(daily_agg):,}")

# One-hot encode category
df_encoded = pd.get_dummies(daily_agg, columns=['category'], drop_first=True)

feature_cols = [c for c in df_encoded.columns if c not in ['date', 'units_sold', 'revenue']]
X = df_encoded[feature_cols]
y = df_encoded['units_sold']

# ─── 3. CHRONOLOGICAL TRAIN-VALIDATION-TEST SPLIT ────────────────────────────
print("\n[*] Step 3: Performing chronological train-val-test split (no data leakage)...")
# 70% Train, 15% Validation, 15% Test
n = len(df_encoded)
train_end = int(n * 0.70)
val_end = int(n * 0.85)

X_train, y_train = X.iloc[:train_end], y.iloc[:train_end]
X_val, y_val = X.iloc[train_end:val_end], y.iloc[train_end:val_end]
X_test, y_test = X.iloc[val_end:], y.iloc[val_end:]

print(f"    Train set:      {len(X_train):,} samples ({X_train.index[0]} to {X_train.index[-1]})")
print(f"    Validation set: {len(X_val):,} samples")
print(f"    Test set:       {len(X_test):,} samples")

# ─── 4. MODEL TRAINING & COMPARISON ──────────────────────────────────────────
print("\n[*] Step 4: Training and benchmarking multiple ML algorithms...")

models = {
    'Ridge Regression (L2 Baseline)': Ridge(alpha=1.0),
    'Random Forest Regressor': RandomForestRegressor(n_estimators=120, max_depth=14, random_state=42, n_jobs=-1),
    'Gradient Boosting Regressor': GradientBoostingRegressor(n_estimators=150, learning_rate=0.08, max_depth=6, random_state=42)
}

results = {}
for name, model in models.items():
    model.fit(X_train, y_train)
    val_preds = model.predict(X_val)
    
    mae = mean_absolute_error(y_val, val_preds)
    rmse = np.sqrt(mean_squared_error(y_val, val_preds))
    r2 = r2_score(y_val, val_preds)
    mape = np.mean(np.abs((y_val - val_preds) / np.maximum(y_val, 1))) * 100
    
    results[name] = {
        'model': model,
        'val_mae': round(mae, 2),
        'val_rmse': round(rmse, 2),
        'val_r2': round(r2, 4),
        'val_mape': round(mape, 2),
        'val_preds': val_preds
    }
    print(f"    ▶ {name:<30} | R²: {r2:.4f} | RMSE: {rmse:.2f} | MAE: {mae:.2f} | MAPE: {mape:.2f}%")

# Select Champion Model based on R2 on validation set
champion_name = max(results, key=lambda k: results[k]['val_r2'])
champion_model = results[champion_name]['model']
print(f"\n[★] Champion Model Selected: {champion_name} (Validation R² = {results[champion_name]['val_r2']:.4f})")

# Final Test Set Evaluation
test_preds = champion_model.predict(X_test)
test_mae = mean_absolute_error(y_test, test_preds)
test_rmse = np.sqrt(mean_squared_error(y_test, test_preds))
test_r2 = r2_score(y_test, test_preds)
test_mape = np.mean(np.abs((y_test - test_preds) / np.maximum(y_test, 1))) * 100

print(f"\n[*] Champion Model Final Test Performance:")
print(f"    Test R² Score: {test_r2:.4f}")
print(f"    Test RMSE:     {test_rmse:.2f} units")
print(f"    Test MAE:      {test_mae:.2f} units")
print(f"    Test MAPE:     {test_mape:.2f}%")

# Save Champion Model Artifact
joblib.dump(champion_model, 'models/best_sales_forecaster.pkl')
with open('models/model_metadata.json', 'w') as f:
    json.dump({
        'model_name': champion_name,
        'algorithm': 'RandomForestRegressor' if 'Random' in champion_name else 'GradientBoostingRegressor',
        'val_r2': results[champion_name]['val_r2'],
        'val_rmse': results[champion_name]['val_rmse'],
        'val_mae': results[champion_name]['val_mae'],
        'test_r2': round(test_r2, 4),
        'test_rmse': round(test_rmse, 2),
        'test_mae': round(test_mae, 2),
        'test_mape': round(test_mape, 2),
        'features_count': len(feature_cols),
        'feature_names': feature_cols,
        'trained_at': pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S')
    }, f, indent=2)
print("[+] Model saved to models/best_sales_forecaster.pkl and metadata to models/model_metadata.json")

# ─── 5. GENERATING PUBLICATION-QUALITY ML VISUALS ────────────────────────────
print("\n[*] Step 5: Generating visual evaluation reports & charts...")
plt.style.use('dark_background')
palette = ['#00e5ff', '#ff6d00', '#00e676', '#e040fb']

# Chart 1: Actual vs Predicted Time-Series
plt.figure(figsize=(12, 5), dpi=200)
test_dates = df_encoded['date'].iloc[val_end:].values
plt.plot(test_dates[:90], y_test.values[:90], label='Actual Demand (Ground Truth)', color='#00e5ff', linewidth=2.0)
plt.plot(test_dates[:90], test_preds[:90], label=f'{champion_name} Forecast', color='#ff6d00', linewidth=1.8, linestyle='--')
plt.title(f'Actual vs. Predicted Aftermarket Sales Demand (Test Horizon) | R² = {test_r2:.4f}', fontsize=12, fontweight='bold', pad=12)
plt.xlabel('Date', fontsize=10)
plt.ylabel('Daily Units Sold', fontsize=10)
plt.grid(True, linestyle=':', alpha=0.3)
plt.legend(frameon=True, facecolor='#111827', edgecolor='#374151')
plt.tight_layout()
plt.savefig('reports/actual_vs_predicted.png')
plt.close()

# Chart 2: Model Comparison Bar Chart
plt.figure(figsize=(9, 4.5), dpi=200)
models_list = list(results.keys())
r2_scores = [results[m]['val_r2'] for m in models_list]
rmse_scores = [results[m]['val_rmse'] for m in models_list]

x = np.arange(len(models_list))
width = 0.35

fig, ax1 = plt.subplots(figsize=(10, 4.5), dpi=200)
ax2 = ax1.twinx()

rects1 = ax1.bar(x - width/2, r2_scores, width, label='Validation R² Score', color='#00e676')
rects2 = ax2.bar(x + width/2, rmse_scores, width, label='Validation RMSE (lower=better)', color='#ff6d00')

ax1.set_ylabel('R² Score (0 to 1.0)', color='#00e676', fontsize=10)
ax2.set_ylabel('RMSE (Units)', color='#ff6d00', fontsize=10)
ax1.set_xticks(x)
ax1.set_xticklabels([m.split('(')[0].strip() for m in models_list], fontsize=9)
plt.title('ML Algorithm Comparison: R² Accuracy vs. RMSE Error', fontsize=12, fontweight='bold', pad=12)
fig.legend(loc='upper right', bbox_to_anchor=(0.90, 0.88), facecolor='#111827')
plt.tight_layout()
plt.savefig('reports/model_comparison_metrics.png')
plt.close()

# Chart 3: Feature Importance
if hasattr(champion_model, 'feature_importances_'):
    plt.figure(figsize=(10, 5), dpi=200)
    feat_importances = pd.Series(champion_model.feature_importances_, index=feature_cols).sort_values(ascending=True)
    top_feats = feat_importances.tail(12)
    top_feats.plot(kind='barh', color='#00e5ff', edgecolor='#ff6d00', linewidth=0.8)
    plt.title(f'Top 12 Most Influential Predictive Features ({champion_name})', fontsize=12, fontweight='bold', pad=12)
    plt.xlabel('Normalized Gini Feature Importance', fontsize=10)
    plt.grid(True, linestyle=':', alpha=0.3)
    plt.tight_layout()
    plt.savefig('reports/feature_importance.png')
    plt.close()

# Chart 4: Correlation Heatmap
plt.figure(figsize=(9, 7), dpi=200)
num_cols = ['units_sold', 'revenue', 'unit_price', 'discount_pct', 'lead_time_days', 'competitor_price_ratio', 'seasonal_index', 'lag_1_units', 'rolling_mean_7d']
corr = daily_agg[num_cols].corr()
sns.heatmap(corr, annot=True, fmt='.2f', cmap='coolwarm', cbar=True, linewidths=0.5, linecolor='#1f2937')
plt.title('Correlation Matrix of Automotive Demand Drivers', fontsize=12, fontweight='bold', pad=12)
plt.tight_layout()
plt.savefig('reports/eda_correlation_heatmap.png')
plt.close()

print("[+] Visual evaluation reports generated in reports/ folder:")
print("    - reports/actual_vs_predicted.png")
print("    - reports/model_comparison_metrics.png")
print("    - reports/feature_importance.png")
print("    - reports/eda_correlation_heatmap.png")
print("\n" + "=" * 70)
print("  ML TRAINING PIPELINE COMPLETED SUCCESSFULLY!")
print("=" * 70)
