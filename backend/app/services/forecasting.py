import logging
import numpy as np
import pandas as pd
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session
from app.models.database_models import CampaignPerformance, Forecast
from sklearn.linear_model import LinearRegression

logger = logging.getLogger(__name__)

# Check for prophet dependency
try:
    from prophet import Prophet
    PROPHET_AVAILABLE = True
except ImportError:
    PROPHET_AVAILABLE = False
    logger.info("Prophet not found. Using seasonal linear regression as default forecasting model.")

def fit_forecast_linear_regression(history_df: pd.DataFrame, metric: str, horizon: int) -> list[dict]:
    """
    Fits a seasonal Linear Regression model on historical campaign data.
    Features: Trend, Day of Week.
    Returns forecasted values with confidence intervals for the horizon days.
    """
    history_df = history_df.sort_values("date")
    n_samples = len(history_df)
    
    # Needs at least 7 points to fit seasonal model
    if n_samples < 7:
        # Simple rolling fallback
        mean_val = float(history_df[metric].mean()) if n_samples > 0 else 0.0
        std_val = float(history_df[metric].std()) if n_samples > 1 else mean_val * 0.1
        last_date = history_df["date"].max()
        
        forecasts = []
        for i in range(1, horizon + 1):
            f_date = last_date + timedelta(days=i)
            forecasts.append({
                "date": f_date,
                "predicted_value": max(0.0, mean_val),
                "lower_bound": max(0.0, mean_val - 1.96 * std_val),
                "upper_bound": max(0.0, mean_val + 1.96 * std_val),
                "model_name": "rolling_average"
            })
        return forecasts

    # Build features: trend and day-of-week dummies
    history_df["t"] = np.arange(n_samples)
    history_df["day_of_week"] = history_df["date"].dt.dayofweek
    
    X = pd.get_dummies(history_df[["t", "day_of_week"]], columns=["day_of_week"], drop_first=False)
    y = history_df[metric].values

    # Ensure all days of the week are present in dummy variables
    for day in range(7):
        col_name = f"day_of_week_{day}"
        if col_name not in X.columns:
            X[col_name] = 0
            
    # Keep columns ordered
    feature_cols = ["t"] + [f"day_of_week_{day}" for day in range(7)]
    X = X[feature_cols]

    model = LinearRegression()
    model.fit(X, y)
    
    # Calculate residuals for confidence intervals
    preds = model.predict(X)
    residuals = y - preds
    residual_std = np.std(residuals) if len(residuals) > 1 else 0.1

    # Predict horizon
    last_date = history_df["date"].max()
    last_t = history_df["t"].max()
    
    forecasts = []
    for i in range(1, horizon + 1):
        f_date = last_date + timedelta(days=i)
        f_t = last_t + i
        f_day = f_date.weekday()
        
        # Build features row
        row = {"t": f_t}
        for d in range(7):
            row[f"day_of_week_{d}"] = 1 if d == f_day else 0
            
        row_df = pd.DataFrame([row])[feature_cols]
        pred_val = float(model.predict(row_df)[0])
        
        # Keep non-negative values for advertising metrics
        pred_val_clipped = max(0.0, pred_val)
        
        forecasts.append({
            "date": f_date,
            "predicted_value": pred_val_clipped,
            "lower_bound": max(0.0, pred_val_clipped - 1.96 * residual_std),
            "upper_bound": max(0.0, pred_val_clipped + 1.96 * residual_std),
            "model_name": "seasonal_regression"
        })
        
    return forecasts

def fit_forecast_prophet(history_df: pd.DataFrame, metric: str, horizon: int) -> list[dict]:
    """
    Fits a Prophet model and forecasts for the requested horizon.
    """
    # Rename columns for Prophet
    pdf = history_df[["date", metric]].rename(columns={"date": "ds", metric: "y"})
    
    m = Prophet(daily_seasonality=False, weekly_seasonality=True, yearly_seasonality=False)
    m.fit(pdf)
    
    future = m.make_future_dataframe(periods=horizon)
    forecast = m.predict(future)
    
    # Filter for future dates
    future_forecast = forecast.iloc[-horizon:]
    
    forecasts = []
    for _, row in future_forecast.iterrows():
        pred_val = max(0.0, float(row["yhat"]))
        forecasts.append({
            "date": row["ds"].date(),
            "predicted_value": pred_val,
            "lower_bound": max(0.0, float(row["yhat_lower"])),
            "upper_bound": max(0.0, float(row["yhat_upper"])),
            "model_name": "prophet"
        })
    return forecasts

def run_campaign_forecasts(db: Session, account_id: int, horizon: int = 30) -> int:
    """
    Runs forecasts for spend (cost), conversions, revenue, CPA, and ROAS
    for each campaign in the campaign_performance database.
    Stores results in the forecasts table.
    """
    # Clear previous forecasts
    db.query(Forecast).filter(Forecast.account_id == account_id).delete()
    db.commit()

    # Load campaign performance historical records
    records = db.query(CampaignPerformance).filter(CampaignPerformance.account_id == account_id).all()
    if not records:
        logger.warning(f"No performance data found for account_id {account_id} to forecast.")
        return 0

    # Convert to pandas
    data = []
    for r in records:
        data.append({
            "campaign_name": r.campaign_name,
            "date": pd.to_datetime(r.date),
            "cost": r.cost,
            "conversions": r.conversions,
            "revenue": r.revenue,
            "clicks": r.clicks,
            "impressions": r.impressions,
            "installs": r.installs if r.installs is not None else r.conversions,
            "estimated_ltv": r.estimated_ltv,
            "conversion_value": r.conversion_value
        })
    df = pd.DataFrame(data)

    forecast_objects = []
    campaign_names = df["campaign_name"].unique()
    metrics_to_forecast = ["cost", "conversions", "revenue", "clicks", "installs"]

    for camp_name in campaign_names:
        camp_df = df[df["campaign_name"] == camp_name].sort_values("date")
        
        # We need historical records to build models
        if len(camp_df) < 5:
            continue

        # Get average LTV/conversion value for estimated value calculation
        if "estimated_ltv" in camp_df.columns and not camp_df["estimated_ltv"].isna().all():
            ltv = float(camp_df["estimated_ltv"].dropna().iloc[-1])
        elif "conversion_value" in camp_df.columns and not camp_df["conversion_value"].isna().all():
            ltv = float(camp_df["conversion_value"].dropna().iloc[-1])
        else:
            ltv = 150.0

        # Run forecast model for each base metric
        camp_forecasts = {}
        for metric in metrics_to_forecast:
            if PROPHET_AVAILABLE:
                try:
                    camp_forecasts[metric] = fit_forecast_prophet(camp_df, metric, horizon)
                except Exception as e:
                    logger.error(f"Prophet failed for campaign {camp_name}, metric {metric}: {str(e)}. Falling back.")
                    camp_forecasts[metric] = fit_forecast_linear_regression(camp_df, metric, horizon)
            else:
                camp_forecasts[metric] = fit_forecast_linear_regression(camp_df, metric, horizon)

        # Iterate days and assemble forecast entries
        for idx in range(horizon):
            # Base forecasts
            cost_f = camp_forecasts["cost"][idx]
            conv_f = camp_forecasts["conversions"][idx]
            rev_f = camp_forecasts["revenue"][idx]
            clicks_f = camp_forecasts["clicks"][idx]
            installs_f = camp_forecasts["installs"][idx]

            forecast_date = cost_f["date"]
            if hasattr(forecast_date, "date"):
                forecast_date = forecast_date.date()

            # Save base forecasts
            forecast_objects.append(Forecast(
                account_id=account_id,
                campaign_name=camp_name,
                forecast_date=forecast_date,
                metric="cost",
                predicted_value=cost_f["predicted_value"],
                lower_bound=cost_f["lower_bound"],
                upper_bound=cost_f["upper_bound"],
                model_name=cost_f["model_name"]
            ))
            forecast_objects.append(Forecast(
                account_id=account_id,
                campaign_name=camp_name,
                forecast_date=forecast_date,
                metric="conversions",
                predicted_value=conv_f["predicted_value"],
                lower_bound=conv_f["lower_bound"],
                upper_bound=conv_f["upper_bound"],
                model_name=conv_f["model_name"]
            ))
            forecast_objects.append(Forecast(
                account_id=account_id,
                campaign_name=camp_name,
                forecast_date=forecast_date,
                metric="revenue",
                predicted_value=rev_f["predicted_value"],
                lower_bound=rev_f["lower_bound"],
                upper_bound=rev_f["upper_bound"],
                model_name=rev_f["model_name"]
            ))
            forecast_objects.append(Forecast(
                account_id=account_id,
                campaign_name=camp_name,
                forecast_date=forecast_date,
                metric="clicks",
                predicted_value=clicks_f["predicted_value"],
                lower_bound=clicks_f["lower_bound"],
                upper_bound=clicks_f["upper_bound"],
                model_name=clicks_f["model_name"]
            ))
            forecast_objects.append(Forecast(
                account_id=account_id,
                campaign_name=camp_name,
                forecast_date=forecast_date,
                metric="installs",
                predicted_value=installs_f["predicted_value"],
                lower_bound=installs_f["lower_bound"],
                upper_bound=installs_f["upper_bound"],
                model_name=installs_f["model_name"]
            ))

            # Derive and save CPA forecast (CPA = cost / conversions)
            pred_cost = cost_f["predicted_value"]
            pred_conv = conv_f["predicted_value"]
            pred_cpa = pred_cost / pred_conv if pred_conv > 0 else 0.0
            
            # Simple bound derivation for CPA
            lower_cpa = cost_f["lower_bound"] / conv_f["upper_bound"] if conv_f["upper_bound"] > 0 else 0.0
            upper_cpa = cost_f["upper_bound"] / conv_f["lower_bound"] if conv_f["lower_bound"] > 0 else pred_cpa * 1.5
            
            forecast_objects.append(Forecast(
                account_id=account_id,
                campaign_name=camp_name,
                forecast_date=forecast_date,
                metric="cpa",
                predicted_value=pred_cpa,
                lower_bound=lower_cpa,
                upper_bound=upper_cpa,
                model_name=cost_f["model_name"]
            ))

            # Derive and save ROAS forecast (ROAS = revenue / cost)
            pred_rev = rev_f["predicted_value"]
            pred_roas = pred_rev / pred_cost if pred_cost > 0 else 0.0
            
            lower_roas = rev_f["lower_bound"] / cost_f["upper_bound"] if cost_f["upper_bound"] > 0 else 0.0
            upper_roas = rev_f["upper_bound"] / cost_f["lower_bound"] if cost_f["lower_bound"] > 0 else pred_roas * 1.5

            forecast_objects.append(Forecast(
                account_id=account_id,
                campaign_name=camp_name,
                forecast_date=forecast_date,
                metric="roas",
                predicted_value=pred_roas,
                lower_bound=lower_roas,
                upper_bound=upper_roas,
                model_name=cost_f["model_name"]
            ))

            # Derive and save CPI forecast (CPI = cost / installs)
            pred_inst = installs_f["predicted_value"]
            pred_cpi = pred_cost / pred_inst if pred_inst > 0 else 0.0
            
            lower_cpi = cost_f["lower_bound"] / installs_f["upper_bound"] if installs_f["upper_bound"] > 0 else 0.0
            upper_cpi = cost_f["upper_bound"] / installs_f["lower_bound"] if installs_f["lower_bound"] > 0 else pred_cpi * 1.5

            forecast_objects.append(Forecast(
                account_id=account_id,
                campaign_name=camp_name,
                forecast_date=forecast_date,
                metric="cpi",
                predicted_value=pred_cpi,
                lower_bound=lower_cpi,
                upper_bound=upper_cpi,
                model_name=cost_f["model_name"]
            ))

            # Derive and save Estimated Value forecast (Estimated Value = conversions * ltv)
            pred_val = pred_conv * ltv
            lower_val = conv_f["lower_bound"] * ltv
            upper_val = conv_f["upper_bound"] * ltv

            forecast_objects.append(Forecast(
                account_id=account_id,
                campaign_name=camp_name,
                forecast_date=forecast_date,
                metric="estimated_value",
                predicted_value=pred_val,
                lower_bound=lower_val,
                upper_bound=upper_val,
                model_name=cost_f["model_name"]
            ))

    db.bulk_save_objects(forecast_objects)
    db.commit()
    return len(forecast_objects)
