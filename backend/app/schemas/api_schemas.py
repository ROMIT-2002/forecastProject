from datetime import datetime, date
from pydantic import BaseModel
from typing import List, Optional

# User Schemas
class UserBase(BaseModel):
    email: str
    name: Optional[str] = None
    role: Optional[str] = "Analyst"

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

# Account Schemas
class AccountBase(BaseModel):
    account_name: str
    platform: str
    currency: Optional[str] = "USD"

class AccountCreate(AccountBase):
    user_id: int

class AccountResponse(AccountBase):
    id: int
    user_id: int
    created_at: datetime
    class Config:
        from_attributes = True

# Campaign Performance Schemas
class CampaignPerformanceResponse(BaseModel):
    id: int
    account_id: int
    date: date
    campaign_name: str
    channel: str
    impressions: int
    clicks: int
    cost: float
    conversions: int
    revenue: float
    ctr: float
    cpc: float
    cvr: float
    cpa: float
    roas: float
    created_at: datetime
    class Config:
        from_attributes = True

class CampaignSummaryRow(BaseModel):
    campaign_name: str
    channel: str
    impressions: int
    clicks: int
    cost: float
    conversions: int
    revenue: float
    ctr: float
    cpc: float
    cvr: float
    cpa: float
    roas: float

# Forecast Schemas
class ForecastResponse(BaseModel):
    forecast_date: date
    predicted_value: float
    lower_bound: Optional[float] = None
    upper_bound: Optional[float] = None
    metric: str
    campaign_name: str
    class Config:
        from_attributes = True

# Recommendation Schemas
class RecommendationResponse(BaseModel):
    id: int
    account_id: int
    campaign_name: str
    recommendation_type: str
    priority: str
    title: str
    description: str
    expected_impact: Optional[str] = None
    action: Optional[str] = None
    status: str
    created_at: datetime
    class Config:
        from_attributes = True

class RecommendationUpdate(BaseModel):
    status: str # accepted, dismissed, new

# Anomaly Schemas
class AnomalyResponse(BaseModel):
    id: int
    account_id: int
    campaign_name: str
    metric: str
    anomaly_date: date
    actual_value: float
    expected_value: float
    severity: str
    explanation: str
    created_at: datetime
    class Config:
        from_attributes = True

# Simulation Schemas
class SimulationRequest(BaseModel):
    budget_change_percentage: float
    campaign_name: Optional[str] = "All Campaigns"

class SimulationResponse(BaseModel):
    projected_spend: float
    projected_conversions: float
    projected_revenue: float
    projected_cpa: float
    projected_roas: float
    diminishing_returns_impact_applied: bool
    explanation: str

# Agent Schemas
class AgentInfo(BaseModel):
    name: str
    description: str
    status: str

class AgentRunResponse(BaseModel):
    agent_name: str
    status: str
    summary: str
    output_json: Optional[str] = None

class AgentRunLogResponse(BaseModel):
    id: int
    agent_name: str
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    summary: Optional[str] = None
    output_json: Optional[str] = None
    class Config:
        from_attributes = True

# Dashboard summary
class DashboardSummary(BaseModel):
    total_spend: float
    total_clicks: int
    total_conversions: int
    total_revenue: float
    ctr: float
    cpc: float
    cvr: float
    cpa: float
    roas: float

# Executive report
class ExecutiveReportResponse(BaseModel):
    performance_summary: str
    forecast_summary: str
    risks: str
    opportunities: str
    action_plan: str
    business_impact: str

# SEM Summary Response
class SemSummaryResponse(BaseModel):
    estimated_cpi: float
    estimated_value: float
    marginal_cpa: float
    incremental_roas: float
    diminishing_return_status: str
    wasted_spend: float
    estimated_savings: float
    budget_opportunity: float

# SEM Diminishing Returns Campaign
class SemCampaignDiminishingReturns(BaseModel):
    campaign_name: str
    current_spend: float
    recommended_spend: float
    diminishing_return_point: float
    marginal_cpa: float
    incremental_roas: float
    saturation_score: float
    status: str
    explanation: str
    a: Optional[float] = None
    b: Optional[float] = None
    ltv: Optional[float] = None

# SEM Incremental Budget Request & Response
class SemIncrementalBudgetRequest(BaseModel):
    additional_budget: float
    selected_campaigns: Optional[List[str]] = None
    objective: Optional[str] = "estimated_value"

class SemCampaignAllocation(BaseModel):
    campaign_name: str
    channel: str
    allocated_increase: float
    base_spend: float
    new_spend: float
    projected_conversions: float
    projected_revenue: float
    projected_estimated_value: float
    saturation_score: float
    status: str

class SemIncrementalBudgetResponse(BaseModel):
    total_incremental_budget: float
    campaign_allocations: List[SemCampaignAllocation]
    projected_incremental_conversions: float
    projected_incremental_revenue: float
    projected_estimated_value: float
    projected_cpa: float
    projected_cpi: float
    projected_incremental_roas: float
    explanation: str

# SEM SQR Response
class WasteQueryItem(BaseModel):
    id: int
    query: str
    campaign_name: str
    cost: float
    clicks: int
    conversions: int
    CPA: float
    ROAS: float
    reason: str

class NegativeKeywordCandidate(BaseModel):
    id: int
    search_query: str
    campaign_name: str
    cost: float
    clicks: int
    conversions: int
    revenue: float
    CPA: float
    ROAS: float
    reason: str
    suggested_match_type: str
    priority: str
    estimated_savings: float

class ExpansionOpportunity(BaseModel):
    id: int
    query: str
    campaign_name: str
    keyword: str
    cost: float
    conversions: int
    CPA: float
    ROAS: float
    current_match_type: str
    reason: str

class ExactMatchCandidate(BaseModel):
    id: int
    query: str
    campaign_name: str
    conversions: int
    ROAS: float
    CPA: float
    reason: str

class QueryCategoryDetails(BaseModel):
    count: int
    spend: float
    percentage_of_spend: float

class SemSqrResponse(BaseModel):
    has_data: bool
    message: Optional[str] = None
    waste_queries: List[WasteQueryItem]
    negative_keyword_candidates: List[NegativeKeywordCandidate]
    expansion_opportunities: List[ExpansionOpportunity]
    exact_match_candidates: List[ExactMatchCandidate]
    query_category_summary: dict
    total_wasted_spend: float
    estimated_savings: float
    recommendation_count: int

# SEM Negative Keywords Response
class SemNegativeKeywordsResponse(BaseModel):
    has_data: bool
    message: Optional[str] = None
    candidates: List[NegativeKeywordCandidate]
    campaign_groups: dict
    total_wasted_spend: float
    estimated_monthly_savings: float

# SEM Bid Recommendation
class SemBidRecommendation(BaseModel):
    campaign_name: str
    channel: str
    current_cpc: float
    recommended_bid_change_percentage: float
    action: str
    reason: str
    expected_impact: str
    confidence: str

# SEM Impression Share Response
class SemCampaignImpressionShare(BaseModel):
    campaign_name: str
    channel: str
    impression_share: float
    lost_is_budget: float
    lost_is_rank: float
    missed_clicks: float
    missed_conversions: float
    missed_value: float

class SemImpressionShareResponse(BaseModel):
    has_data: bool
    message: Optional[str] = None
    campaigns: List[SemCampaignImpressionShare]
    total_missed_clicks: float
    total_missed_conversions: float
    total_missed_value: float

# SEM Portfolio Optimize Request & Response
class SemPortfolioOptimizeRequest(BaseModel):
    total_budget: float
    objective: Optional[str] = "estimated_value"

class SemBudgetShiftRecommendation(BaseModel):
    campaign_name: str
    channel: str
    current_spend: float
    optimized_spend: float
    shift_amount: float
    projected_revenue_change: float

class SemPortfolioOptimizeResponse(BaseModel):
    total_budget: float
    current_allocation: dict
    optimized_allocation: dict
    expected_value: float
    expected_conversions: float
    expected_roas: float
    expected_cpa: float
    budget_shift_recommendations: List[SemBudgetShiftRecommendation]

# SEM Campaign Efficiency
class SemCampaignEfficiency(BaseModel):
    campaign_name: str
    channel: str
    cpi: float
    estimated_value: float
    marginal_cpa: float
    incremental_roas: float
    diminishing_return_point: float
    efficiency_label: str

