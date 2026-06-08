import csv
import random
from datetime import datetime, timedelta

def generate_sample_csv():
    # Setup parameters
    start_date = datetime(2026, 3, 10)  # ~90 days before June 8, 2026
    days = 90
    
    campaigns = [
        # (name, channel, base_impressions, base_ctr, base_cpc, base_cvr, base_roas)
        ("Google Search - Brand", "Google Search", 20000, 0.08, 1.2, 0.05, 2.5),
        ("Google Search - NonBrand", "Google Search", 50000, 0.02, 2.5, 0.02, 1.3),
        ("Google - Performance Max", "Performance Max", 100000, 0.015, 1.5, 0.022, 1.8),
        ("YouTube - Brand Awareness", "YouTube", 250000, 0.003, 0.8, 0.001, 0.4),
        ("YouTube - Prospecting", "YouTube", 80000, 0.006, 1.1, 0.005, 0.8),
        ("Meta Ads - Prospecting", "Meta", 60000, 0.012, 1.8, 0.025, 1.6),
        ("Meta Ads - Retargeting", "Meta", 15000, 0.025, 1.0, 0.06, 3.2),
        ("Meta - Lookalike 1%", "Meta", 40000, 0.010, 2.0, 0.018, 1.2),
        ("Bing Search - Brand", "Bing", 5000, 0.06, 0.9, 0.04, 2.2),
        ("Bing Search - NonBrand", "Bing", 12000, 0.015, 1.8, 0.015, 1.0),
        ("Google Search - Competitors", "Google Search", 18000, 0.012, 4.5, 0.008, 0.5),
        ("Meta Ads - Video Stories", "Meta", 35000, 0.018, 1.4, 0.015, 1.1)  # We will decay CTR
    ]
    
    filepath = "sample_paid_ads_data.csv"
    
    with open(filepath, mode="w", newline="") as file:
        writer = csv.writer(file)
        writer.writerow(["date", "campaign_name", "channel", "impressions", "clicks", "cost", "conversions", "revenue"])
        
        for d in range(days):
            current_date = start_date + timedelta(days=d)
            date_str = current_date.strftime("%Y-%m-%d")
            
            # Weekly seasonality (higher activity on weekdays)
            weekday = current_date.weekday()
            seasonality_factor = 1.2 if weekday < 5 else 0.8
            
            # Add general upward/downward drift over the 90 days
            drift = 1.0 + (d / 180.0)  # Gradual 50% growth at the end
            
            for name, channel, base_imp, base_ctr, base_cpc, base_cvr, base_roas in campaigns:
                # Setup base factors
                imp_factor = seasonality_factor * drift * random.uniform(0.9, 1.1)
                
                # Decay CTR for "Meta Ads - Video Stories" (creative fatigue)
                ctr = base_ctr
                if name == "Meta Ads - Video Stories":
                    # Decays by up to 40% by the end of 90 days
                    ctr = base_ctr * (1.0 - (d / 90.0) * 0.4)
                
                # Dynamic calculations
                impressions = int(base_imp * imp_factor)
                clicks = int(impressions * ctr * random.uniform(0.95, 1.05))
                if clicks < 1:
                    clicks = 1
                
                # Ingest anomaly: CPC spike in Meta Ads - Retargeting on day 80
                cpc = base_cpc * random.uniform(0.9, 1.1)
                if name == "Meta Ads - Retargeting" and d == 80:
                    cpc = base_cpc * 4.0  # 400% CPC spike!
                
                cost = round(clicks * cpc, 2)
                
                # Ingest anomaly: Spend spike in Google Search - Brand on day 60
                if name == "Google Search - Brand" and d == 60:
                    cost = round(cost * 3.5, 2)
                    clicks = int(clicks * 1.2) # minor click increase
                
                # Conversions
                cvr = base_cvr
                # Ingest anomaly: conversion drop in Google - Performance Max on day 45
                if name == "Google - Performance Max" and d == 45:
                    cvr = base_cvr * 0.15 # 85% drop
                
                conversions = int(clicks * cvr * random.uniform(0.9, 1.1))
                if conversions < 0:
                    conversions = 0
                
                # Revenue based on ROAS
                revenue = round(cost * base_roas * random.uniform(0.9, 1.1), 2)
                # Ingest anomaly: ROAS drop in Meta Ads - Prospecting on day 30
                if name == "Meta Ads - Prospecting" and d == 30:
                    revenue = round(cost * 0.2, 2) # ROAS drops to 0.2
                
                writer.writerow([date_str, name, channel, impressions, clicks, cost, conversions, revenue])

    print(f"Sample data generated successfully at {filepath}")

if __name__ == "__main__":
    generate_sample_csv()
