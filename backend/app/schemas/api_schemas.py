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
