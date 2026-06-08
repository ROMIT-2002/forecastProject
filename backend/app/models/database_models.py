from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Date, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=True)
    role = Column(String, default="Analyst") # e.g. SEM Manager, Media Executive, Analyst
    created_at = Column(DateTime, default=datetime.utcnow)

    accounts = relationship("Account", back_populates="user", cascade="all, delete-orphan")

class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    account_name = Column(String, nullable=False)
    platform = Column(String, nullable=False) # e.g. Google Search, Meta, Bing, etc.
    currency = Column(String, default="USD")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="accounts")
    performance_records = relationship("CampaignPerformance", back_populates="account", cascade="all, delete-orphan")
    forecasts = relationship("Forecast", back_populates="account", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="account", cascade="all, delete-orphan")
    anomalies = relationship("Anomaly", back_populates="account", cascade="all, delete-orphan")
    simulations = relationship("Simulation", back_populates="account", cascade="all, delete-orphan")

class CampaignPerformance(Base):
    __tablename__ = "campaign_performance"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, index=True, nullable=False)
    campaign_name = Column(String, index=True, nullable=False)
    channel = Column(String, nullable=False) # e.g. Google Search, YouTube, PMax, Meta, Bing
    impressions = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    cost = Column(Float, default=0.0)
    conversions = Column(Integer, default=0)
    revenue = Column(Float, default=0.0)
    
    # Derivative columns
    ctr = Column(Float, default=0.0)
    cpc = Column(Float, default=0.0)
    cvr = Column(Float, default=0.0)
    cpa = Column(Float, default=0.0)
    roas = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    account = relationship("Account", back_populates="performance_records")

class Forecast(Base):
    __tablename__ = "forecasts"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    campaign_name = Column(String, index=True, nullable=False)
    forecast_date = Column(Date, index=True, nullable=False)
    metric = Column(String, nullable=False) # e.g. cost, clicks, conversions, revenue, cpc, cpa, roas
    predicted_value = Column(Float, nullable=False)
    lower_bound = Column(Float, nullable=True)
    upper_bound = Column(Float, nullable=True)
    model_name = Column(String, default="fallback_regression")
    created_at = Column(DateTime, default=datetime.utcnow)

    account = relationship("Account", back_populates="forecasts")

class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    campaign_name = Column(String, index=True, nullable=False)
    recommendation_type = Column(String, nullable=False) # budget_scale, budget_reduction, pause_campaign, bid_increase, etc.
    priority = Column(String, default="medium") # low, medium, high
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    expected_impact = Column(String, nullable=True)
    action = Column(String, nullable=True)
    status = Column(String, default="new") # new, accepted, dismissed
    created_at = Column(DateTime, default=datetime.utcnow)

    account = relationship("Account", back_populates="recommendations")

class Anomaly(Base):
    __tablename__ = "anomalies"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    campaign_name = Column(String, index=True, nullable=False)
    metric = Column(String, nullable=False) # e.g. cpc, cpa, roas, cost, conversions, revenue
    anomaly_date = Column(Date, index=True, nullable=False)
    actual_value = Column(Float, nullable=False)
    expected_value = Column(Float, nullable=False)
    severity = Column(String, default="medium") # low, medium, high, critical
    explanation = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    account = relationship("Account", back_populates="anomalies")

class Simulation(Base):
    __tablename__ = "simulations"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    budget_change_percentage = Column(Float, nullable=False)
    projected_spend = Column(Float, nullable=False)
    projected_conversions = Column(Float, nullable=False)
    projected_revenue = Column(Float, nullable=False)
    projected_cpa = Column(Float, nullable=False)
    projected_roas = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    account = relationship("Account", back_populates="simulations")

class AgentRun(Base):
    __tablename__ = "agent_runs"

    id = Column(Integer, primary_key=True, index=True)
    agent_name = Column(String, nullable=False, index=True)
    status = Column(String, nullable=False) # started, success, failed
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    summary = Column(Text, nullable=True)
    output_json = Column(Text, nullable=True) # JSON dump of logs/outputs
