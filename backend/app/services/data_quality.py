import io
import pandas as pd
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.database_models import CampaignPerformance

REQUIRED_COLUMNS = ["date", "campaign_name", "channel", "impressions", "clicks", "cost", "conversions", "revenue"]

def validate_and_clean_csv(file_bytes: bytes) -> tuple[pd.DataFrame, dict]:
    """
    Validates the uploaded CSV file.
    Performs data cleaning:
    - Deduplicates rows
    - Converts columns to appropriate types
    - Filters out rows with invalid dates or campaign names
    - Calculates missing KPI fields safely (CTR, CPC, CVR, CPA, ROAS)
    - Returns cleaned DataFrame and a dictionary of data quality metrics.
    """
    report = {
        "missing_dates": 0,
        "duplicates_removed": 0,
        "bad_values_fixed": 0,
        "zero_cost_rows": 0,
        "invalid_campaigns_skipped": 0,
        "total_rows_ingested": 0
    }
    
    try:
        # Load CSV
        df = pd.read_csv(io.BytesIO(file_bytes))
    except Exception as e:
        raise ValueError(f"Invalid CSV format: {str(e)}")

    # Check for required columns
    missing_cols = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    if missing_cols:
        raise ValueError(f"Missing required columns: {', '.join(missing_cols)}")

    # Deduplicate
    initial_len = len(df)
    df = df.drop_duplicates()
    report["duplicates_removed"] = initial_len - len(df)

    # Convert Date and drop invalid rows
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    null_dates = df["date"].isnull().sum()
    report["missing_dates"] = int(null_dates)
    df = df.dropna(subset=["date"])

    # Clean numeric columns
    numeric_cols = ["impressions", "clicks", "cost", "conversions", "revenue"]
    for col in numeric_cols:
        # Fill missing values with 0
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
        # Ensure non-negative
        df[col] = df[col].clip(lower=0)

    # Track metrics
    report["zero_cost_rows"] = int((df["cost"] == 0).sum())
    
    # Strip campaign names & skip invalid
    df["campaign_name"] = df["campaign_name"].astype(str).str.strip()
    df = df[df["campaign_name"] != ""]
    
    # Calculate KPIs safely
    df["ctr"] = df.apply(lambda r: r["clicks"] / r["impressions"] if r["impressions"] > 0 else 0.0, axis=1)
    df["cpc"] = df.apply(lambda r: r["cost"] / r["clicks"] if r["clicks"] > 0 else 0.0, axis=1)
    df["cvr"] = df.apply(lambda r: r["conversions"] / r["clicks"] if r["clicks"] > 0 else 0.0, axis=1)
    df["cpa"] = df.apply(lambda r: r["cost"] / r["conversions"] if r["conversions"] > 0 else 0.0, axis=1)
    df["roas"] = df.apply(lambda r: r["revenue"] / r["cost"] if r["cost"] > 0 else 0.0, axis=1)

    report["total_rows_ingested"] = len(df)
    return df, report

def save_campaign_performance(db: Session, df: pd.DataFrame, account_id: int) -> int:
    """
    Saves campaign performance records to the campaign_performance table.
    Cleans previous campaign performance records for this account to avoid duplicate upload runs.
    """
    # Clear previous performance records for this account
    db.query(CampaignPerformance).filter(CampaignPerformance.account_id == account_id).delete()
    
    records = []
    for _, row in df.iterrows():
        record = CampaignPerformance(
            account_id=account_id,
            date=row["date"].date(),
            campaign_name=row["campaign_name"],
            channel=row["channel"],
            impressions=int(row["impressions"]),
            clicks=int(row["clicks"]),
            cost=float(row["cost"]),
            conversions=int(row["conversions"]),
            revenue=float(row["revenue"]),
            ctr=float(row["ctr"]),
            cpc=float(row["cpc"]),
            cvr=float(row["cvr"]),
            cpa=float(row["cpa"]),
            roas=float(row["roas"])
        )
        records.append(record)
        
    db.bulk_save_objects(records)
    db.commit()
    return len(records)
