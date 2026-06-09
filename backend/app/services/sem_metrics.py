# App SEM Metrics Services and formulas
import pandas as pd

def calculate_ctr(clicks: float, impressions: float) -> float:
    return clicks / impressions if impressions > 0 else 0.0

def calculate_cpc(cost: float, clicks: float) -> float:
    return cost / clicks if clicks > 0 else 0.0

def calculate_cvr(conversions: float, clicks: float) -> float:
    return conversions / clicks if clicks > 0 else 0.0

def calculate_cpa(cost: float, conversions: float) -> float:
    return cost / conversions if conversions > 0 else 0.0

def calculate_roas(revenue: float, cost: float) -> float:
    return revenue / cost if cost > 0 else 0.0

def calculate_cpi(cost: float, installs: float) -> float:
    return cost / installs if installs > 0 else 0.0

def calculate_estimated_value(conversions: float, estimated_ltv: float, conversion_value: float, revenue: float) -> float:
    if estimated_ltv and estimated_ltv > 0:
        return conversions * estimated_ltv
    if conversion_value and conversion_value > 0:
        return conversions * conversion_value
    return revenue

def calculate_estimated_profit(revenue: float, margin: float, cost: float) -> float:
    margin_val = margin if (margin is not None) else 0.30
    return (revenue * margin_val) - cost

def calculate_spend_efficiency(
    cost: float,
    conversions: float,
    roas: float,
    cpa: float,
    target_roas: float,
    target_cpa: float,
    saturation_score: float = 0.0
) -> str:
    """
    Classifies campaign efficiency into:
    - Wasteful: Cost > 100 with 0 conversions, or ROAS < 0.25 * Target, or CPA > 3 * Target
    - Diminishing returns: Saturation score >= 80% (or spend is past saturation)
    - Near saturation: Saturation score >= 60% and < 80%
    - Efficient: Otherwise
    """
    t_roas = target_roas if target_roas else 2.0
    t_cpa = target_cpa if target_cpa else 30.0

    if cost > 100.0 and conversions == 0:
        return "Wasteful"
    if cost > 0 and roas < 0.25 * t_roas:
        return "Wasteful"
    if conversions > 0 and cpa > 3.0 * t_cpa:
        return "Wasteful"
    
    if saturation_score >= 80.0:
        return "Diminishing returns"
    if saturation_score >= 60.0:
        return "Near saturation"
        
    return "Efficient"
