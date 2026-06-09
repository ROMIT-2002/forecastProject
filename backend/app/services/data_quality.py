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

    # Optional SEM columns cleaning and fallbacks
    # 1. Text fields
    text_fields = ["search_query", "keyword", "match_type", "device", "country"]
    for field in text_fields:
        if field in df.columns:
            df[field] = df[field].fillna("").astype(str).str.strip()
        else:
            df[field] = None

    # 2. Installs
    if "installs" in df.columns:
        df["installs"] = pd.to_numeric(df["installs"], errors="coerce").fillna(0).astype(int).clip(lower=0)
    else:
        df["installs"] = df["conversions"]

    # 3. Impression share fields
    is_fields = ["impression_share", "lost_is_budget", "lost_is_rank", "avg_position", "top_impression_share", "absolute_top_impression_share"]
    for field in is_fields:
        if field in df.columns:
            df[field] = pd.to_numeric(df[field], errors="coerce").fillna(0.0).astype(float).clip(lower=0)
        else:
            df[field] = None

    # 4. Target values and economics
    if "margin" in df.columns:
        df["margin"] = pd.to_numeric(df["margin"], errors="coerce").fillna(0.3).astype(float)
    else:
        df["margin"] = 0.30

    if "conversion_value" in df.columns:
        df["conversion_value"] = pd.to_numeric(df["conversion_value"], errors="coerce").fillna(0.0).astype(float)
    else:
        df["conversion_value"] = df.apply(lambda r: r["revenue"] / r["conversions"] if r["conversions"] > 0 else 50.0, axis=1)

    if "estimated_ltv" in df.columns:
        df["estimated_ltv"] = pd.to_numeric(df["estimated_ltv"], errors="coerce").fillna(150.0).astype(float)
    else:
        df["estimated_ltv"] = df["conversion_value"].clip(lower=50.0)

    if "target_cpa" in df.columns:
        df["target_cpa"] = pd.to_numeric(df["target_cpa"], errors="coerce").fillna(30.0).astype(float)
    else:
        df["target_cpa"] = 30.0

    if "target_roas" in df.columns:
        df["target_roas"] = pd.to_numeric(df["target_roas"], errors="coerce").fillna(2.0).astype(float)
    else:
        df["target_roas"] = 2.0

    if "target_cpi" in df.columns:
        df["target_cpi"] = pd.to_numeric(df["target_cpi"], errors="coerce").fillna(10.0).astype(float)
    else:
        df["target_cpi"] = df["target_cpa"] * 0.33

    # 5. Budgets
    if "campaign_budget" in df.columns:
        df["campaign_budget"] = pd.to_numeric(df["campaign_budget"], errors="coerce").fillna(100.0).astype(float)
    else:
        # Fallback to campaign average daily spend or $100
        df["campaign_budget"] = df.apply(lambda r: r["cost"] if r["cost"] > 0 else 100.0, axis=1)

    if "monthly_budget" in df.columns:
        df["monthly_budget"] = pd.to_numeric(df["monthly_budget"], errors="coerce").fillna(3000.0).astype(float)
    else:
        df["monthly_budget"] = df["campaign_budget"] * 30.4

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
        # Clean helper for floats that might be NaN
        def get_float(name):
            val = row.get(name, None)
            if val is None or pd.isna(val):
                return None
            return float(val)

        def get_int(name, default=0):
            val = row.get(name, default)
            if val is None or pd.isna(val):
                return default
            return int(val)

        record = CampaignPerformance(
            account_id=account_id,
            date=row["date"].date() if hasattr(row["date"], "date") else pd.to_datetime(row["date"]).date(),
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
            roas=float(row["roas"]),
            # Optional SEM columns
            search_query=row.get("search_query", None),
            keyword=row.get("keyword", None),
            match_type=row.get("match_type", None),
            installs=get_int("installs", int(row["conversions"])),
            impression_share=get_float("impression_share"),
            lost_is_budget=get_float("lost_is_budget"),
            lost_is_rank=get_float("lost_is_rank"),
            avg_position=get_float("avg_position"),
            top_impression_share=get_float("top_impression_share"),
            absolute_top_impression_share=get_float("absolute_top_impression_share"),
            device=row.get("device", None),
            country=row.get("country", None),
            campaign_budget=get_float("campaign_budget"),
            monthly_budget=get_float("monthly_budget"),
            target_cpa=get_float("target_cpa"),
            target_roas=get_float("target_roas"),
            target_cpi=get_float("target_cpi"),
            conversion_value=get_float("conversion_value"),
            estimated_ltv=get_float("estimated_ltv"),
            margin=get_float("margin")
        )
        records.append(record)
        
    db.bulk_save_objects(records)
    db.commit()
    return len(records)
