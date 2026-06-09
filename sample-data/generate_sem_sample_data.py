# Script to generate rich SEM Intelligence demo data
import csv
import random
from datetime import datetime, timedelta

def generate_sem_demo_data():
    start_date = datetime(2026, 1, 1)  # 180 days before late June 2026
    days = 180
    
    # Campaigns list
    # (name, channel, target_cpa, target_roas, target_cpi, conversion_value, estimated_ltv, margin, base_budget)
    campaigns = [
        ("Google Search - Brand", "Google Search", 30.0, 2.5, 10.0, 100.0, 300.0, 0.50, 150.0),
        ("Google Search - NonBrand", "Google Search", 40.0, 1.5, 15.0, 60.0, 150.0, 0.35, 300.0),
        ("Google Search - Competitors", "Google Search", 50.0, 0.8, 20.0, 40.0, 100.0, 0.20, 100.0),
        ("Meta Ads - Prospecting", "Meta", 35.0, 1.8, 12.0, 80.0, 200.0, 0.40, 200.0),
        ("Meta Ads - Retargeting", "Meta", 25.0, 3.5, 8.0, 120.0, 400.0, 0.60, 50.0),
        ("YouTube - Brand Awareness", "YouTube", 60.0, 0.5, 25.0, 30.0, 80.0, 0.15, 150.0)
    ]
    
    # Standard search queries mapping per campaign
    queries_pool = {
        "Google Search - Brand": [
            ("forecastiq", "forecastiq", "exact", 0.05, 0.0),
            ("forecastiq pricing", "forecastiq", "phrase", 0.08, 0.0),
            ("forecastiq software reviews", "forecastiq", "broad", 0.15, 0.0),
            ("forecastiq login portal", "forecastiq", "phrase", 0.02, 0.0)
        ],
        "Google Search - NonBrand": [
            ("paid ads forecasting tool", "forecasting tool", "phrase", 0.15, 0.0),
            ("marketing forecasting software", "forecasting tool", "exact", 0.20, 0.0),
            ("ppc budget optimization planner", "budget optimization", "broad", 0.25, 0.0),
            ("ads forecasting template excel", "forecasting tool", "broad", 0.0, 18.5) # Waste query!
        ],
        "Google Search - Competitors": [
            ("semrush forecasting tool alternative", "semrush", "phrase", 0.05, 35.0), # High cost/poor CPA
            ("ahrefs traffic forecaster", "ahrefs", "broad", 0.02, 45.0),
            ("spyfu competitor ads budget planner", "competitor template", "broad", 0.0, 25.0) # Waste query!
        ],
        "YouTube - Brand Awareness": [
            ("free advertising tutorial youtube", "marketing tutorial", "broad", 0.0, 22.0), # Waste query!
            ("cheap keyword planner software download", "keyword planner", "broad", 0.0, 16.0), # Low intent waste
            ("marketing jobs salary definition", "jobs", "broad", 0.0, 30.0), # Low intent waste
            ("how to reset google ads password", "support", "broad", 0.0, 12.0) # Support query waste
        ]
    }

    import os
    script_dir = os.path.dirname(os.path.abspath(__file__))
    filepath = os.path.join(script_dir, "sem_intelligence_demo_data.csv")
    headers = [
        "date", "campaign_name", "channel", "impressions", "clicks", "cost", "conversions", "revenue",
        "search_query", "keyword", "match_type", "installs", "impression_share", "lost_is_budget", "lost_is_rank",
        "avg_position", "top_impression_share", "absolute_top_impression_share", "device", "country",
        "campaign_budget", "monthly_budget", "target_cpa", "target_roas", "target_cpi", "conversion_value",
        "estimated_ltv", "margin"
    ]
    
    devices = ["Desktop", "Mobile", "Tablet"]
    countries = ["United States", "United Kingdom", "Canada", "Germany"]

    with open(filepath, mode="w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow(headers)
        
        for d in range(days):
            current_date = start_date + timedelta(days=d)
            date_str = current_date.strftime("%Y-%m-%d")
            
            # Weekly seasonality (high on weekdays)
            weekday = current_date.weekday()
            seasonality = 1.15 if weekday < 5 else 0.8
            
            # Growth drift
            drift = 1.0 + (d / 200.0)
            
            for name, channel, t_cpa, t_roas, t_cpi, c_val, ltv, margin, base_budget in campaigns:
                # Calculate daily base budget spend
                daily_spend_target = base_budget * seasonality * random.uniform(0.9, 1.1)
                
                # Apply diminishing returns curve past day 90 for NonBrand
                if name == "Google Search - NonBrand" and d > 90:
                    # NonBrand spend scales up, but conversion rate decays to simulate diminishing returns
                    daily_spend_target *= 1.8 # Increase spend significantly
                    cvr_decay = 0.50 # Decays conversion rate by 50%
                else:
                    cvr_decay = 1.0
                
                # Base performance stats
                clicks = int(daily_spend_target / random.uniform(1.2, 3.5))
                if clicks < 1: clicks = 1
                
                impressions = clicks * random.randint(10, 80)
                cost = round(clicks * random.uniform(1.0, 3.0), 2)
                
                # Conversions based on Target CPA
                conversions = int(cost / (t_cpa * random.uniform(0.8, 1.2) * (1.0 / cvr_decay)))
                if conversions < 0: conversions = 0
                if name == "YouTube - Brand Awareness":
                    conversions = 0 # Forces a wasteful zero-conversion state
                    
                revenue = round(conversions * c_val * random.uniform(0.9, 1.1), 2)
                installs = int(conversions * random.uniform(1.0, 1.3))
                
                # Impression Share
                is_val = random.uniform(0.55, 0.90)
                lost_budget = random.uniform(0.05, 0.25)
                lost_rank = random.uniform(0.05, 0.20)
                
                if name == "Meta Ads - Retargeting":
                    # Retargeting is highly efficient but restricted by small budget
                    is_val = 0.40
                    lost_budget = 0.55 # Lost 55% IS due to budget! (Incremental budget scale opportunity!)
                    lost_rank = 0.05
                    
                if name == "Google Search - Brand":
                    # Brand has high rank share but lost due to rank bid threshold limit
                    is_val = 0.70
                    lost_budget = 0.02
                    lost_rank = 0.28 # Lost due to rank (Bid increase opportunity!)
                
                # Campaign daily rollup row (empty search_query)
                writer.writerow([
                    date_str, name, channel, impressions, clicks, cost, conversions, revenue,
                    "", "", "", installs, round(is_val, 3), round(lost_budget, 3), round(lost_rank, 3),
                    round(random.uniform(1.1, 3.4), 2), round(is_val * 1.1, 3), round(is_val * 0.7, 3),
                    random.choice(devices), random.choice(countries),
                    round(base_budget, 2), round(base_budget * 30.4, 2),
                    t_cpa, t_roas, t_cpi, c_val, ltv, margin
                ])
                
                # Search Query Report daily records
                if name in queries_pool:
                    queries = queries_pool[name]
                    for query, keyword, m_type, success_cvr, force_waste_cost in queries:
                        # Query impressions are a slice of campaign impressions
                        q_imp = int(impressions * random.uniform(0.08, 0.15))
                        q_clicks = int(q_imp * random.uniform(0.02, 0.08))
                        if q_clicks < 1: q_clicks = 1
                        
                        if force_waste_cost > 0:
                            q_cost = round(force_waste_cost * random.uniform(0.9, 1.1), 2)
                            q_convs = 0
                        else:
                            q_cost = round(q_clicks * random.uniform(0.8, 2.0), 2)
                            q_convs = int(q_clicks * success_cvr * random.uniform(0.8, 1.2))
                            
                        q_rev = round(q_convs * c_val * random.uniform(0.9, 1.1), 2)
                        q_inst = int(q_convs * random.uniform(1.0, 1.2))
                        
                        writer.writerow([
                            date_str, name, channel, q_imp, q_clicks, q_cost, q_convs, q_rev,
                            query, keyword, m_type, q_inst, round(is_val, 3), round(lost_budget, 3), round(lost_rank, 3),
                            round(random.uniform(1.2, 3.8), 2), round(is_val * 1.1, 3), round(is_val * 0.7, 3),
                            random.choice(devices), random.choice(countries),
                            round(base_budget, 2), round(base_budget * 30.4, 2),
                            t_cpa, t_roas, t_cpi, c_val, ltv, margin
                        ])

    print(f"Richer SEM Intelligence demo dataset created successfully at '{filepath}'.")

if __name__ == "__main__":
    generate_sem_demo_data()
