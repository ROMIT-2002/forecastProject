import pandas as pd
from datetime import datetime, date
from sqlalchemy.orm import Session
from app.models.database_models import CampaignPerformance, Anomaly

def detect_anomalies(db: Session, account_id: int) -> int:
    """
    Scans campaign performance records and detects statistical anomalies in key metrics
    (CPC, CPA, ROAS, Spend, Conversions, Revenue) using a rolling 7-day window.
    Deletes existing anomalies for the account first to prevent duplicate entries.
    """
    # Delete previous anomalies
    db.query(Anomaly).filter(Anomaly.account_id == account_id).delete()
    db.commit()

    # Load campaign performance historical records
    records = db.query(CampaignPerformance).filter(CampaignPerformance.account_id == account_id).all()
    if not records:
        return 0

    # Build DataFrame
    data = []
    for r in records:
        data.append({
            "campaign_name": r.campaign_name,
            "date": pd.to_datetime(r.date),
            "cost": r.cost,
            "conversions": r.conversions,
            "revenue": r.revenue,
            "cpc": r.cpc,
            "cpa": r.cpa,
            "roas": r.roas
        })
    df = pd.DataFrame(data)

    anomaly_objects = []
    campaign_names = df["campaign_name"].unique()
    
    # We check these metrics for spikes
    spike_metrics = ["cpc", "cpa", "cost"]
    # We check these metrics for drops
    drop_metrics = ["roas", "conversions", "revenue"]
    
    for name in campaign_names:
        camp_df = df[df["campaign_name"] == name].sort_values("date").copy()
        if len(camp_df) < 7:
            continue
            
        # Set date index for rolling functions
        camp_df = camp_df.set_index("date")
        
        # Detect for each metric
        for metric in spike_metrics + drop_metrics:
            series = camp_df[metric]
            
            # Calculate 7-day rolling statistics
            rolling_mean = series.rolling(window=7, min_periods=4).mean()
            rolling_std = series.rolling(window=7, min_periods=4).std()
            
            for idx, (dt, val) in enumerate(series.items()):
                # Skip the first few rows (min_periods)
                mean_val = rolling_mean.iloc[idx]
                std_val = rolling_std.iloc[idx]
                
                if pd.isna(mean_val) or pd.isna(std_val) or std_val == 0:
                    continue
                    
                z_score = (val - mean_val) / std_val
                
                is_anomaly = False
                severity = "low"
                explanation = ""
                
                # Check for Spikes
                if metric in spike_metrics:
                    if z_score > 2.0:
                        is_anomaly = True
                        # Severity thresholds
                        if z_score > 4.0:
                            severity = "critical"
                        elif z_score > 3.0:
                            severity = "high"
                        elif z_score > 2.5:
                            severity = "medium"
                        else:
                            severity = "low"
                        
                        pct_change = ((val - mean_val) / mean_val) * 100 if mean_val > 0 else 0.0
                        explanation = f"{metric.upper()} spiked by {pct_change:.1f}% compared to 7-day rolling average. (Z-Score: {z_score:.2f})"
                
                # Check for Drops
                elif metric in drop_metrics:
                    if z_score < -2.0:
                        is_anomaly = True
                        abs_z = abs(z_score)
                        if abs_z > 4.0:
                            severity = "critical"
                        elif abs_z > 3.0:
                            severity = "high"
                        elif abs_z > 2.5:
                            severity = "medium"
                        else:
                            severity = "low"
                            
                        pct_change = ((mean_val - val) / mean_val) * 100 if mean_val > 0 else 0.0
                        explanation = f"{metric.upper()} dropped by {pct_change:.1f}% compared to 7-day rolling average. (Z-Score: {z_score:.2f})"
                
                if is_anomaly:
                    # Save anomaly
                    anomaly_objects.append(Anomaly(
                        account_id=account_id,
                        campaign_name=name,
                        metric=metric,
                        anomaly_date=dt.date(),
                        actual_value=float(val),
                        expected_value=float(mean_val),
                        severity=severity,
                        explanation=explanation
                    ))

    db.bulk_save_objects(anomaly_objects)
    db.commit()
    return len(anomaly_objects)
