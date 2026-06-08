import os
import sys
import unittest
from datetime import datetime, date, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Set Python path settings or imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import Base
from app.models.database_models import User, Account, CampaignPerformance, Forecast, Recommendation, Anomaly
from app.services.data_quality import validate_and_clean_csv, save_campaign_performance
from app.services.forecasting import run_campaign_forecasts
from app.services.optimization import generate_recommendations
from app.services.anomaly_detection import detect_anomalies
from app.services.simulation import run_budget_simulation

class TestForecastIQBackend(unittest.TestCase):
    def setUp(self):
        # In-memory SQLite engine for fast testing
        self.engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
        Base.metadata.create_all(bind=self.engine)
        self.TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        self.db = self.TestingSessionLocal()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)

    def test_csv_validation_and_kpis(self):
        # Construct a sample CSV bytes string with duplicate rows and bad datatypes
        csv_content = (
            "date,campaign_name,channel,impressions,clicks,cost,conversions,revenue\n"
            "2026-06-01,Google Search,Google Search,1000,100,150.0,10,300.0\n"
            "2026-06-02,Google Search,Google Search,2000,200,300.0,20,600.0\n"
            "2026-06-02,Google Search,Google Search,2000,200,300.0,20,600.0\n"  # Duplicate row
            "2026-06-03,Meta Ads,Meta,500,50,75.0,0,0.0\n"                      # Zero conversions/revenue
        )
        csv_bytes = csv_content.encode("utf-8")
        
        df, report = validate_and_clean_csv(csv_bytes)
        
        self.assertEqual(report["duplicates_removed"], 1)
        self.assertEqual(report["total_rows_ingested"], 3)
        
        # Verify KPI calculations
        row_google = df[df["campaign_name"] == "Google Search"].iloc[0]
        self.assertEqual(row_google["ctr"], 0.1)
        self.assertEqual(row_google["cpc"], 1.5)
        self.assertEqual(row_google["cvr"], 0.1)
        self.assertEqual(row_google["cpa"], 15.0)
        self.assertEqual(row_google["roas"], 2.0)
        
        row_meta = df[df["campaign_name"] == "Meta Ads"].iloc[0]
        self.assertEqual(row_meta["ctr"], 0.1)
        self.assertEqual(row_meta["cpa"], 0.0) # Handled division by zero
        self.assertEqual(row_meta["roas"], 0.0)

    def test_saving_and_db_models(self):
        # Setup user & account
        user = User(email="test@test.com", name="Test User")
        self.db.add(user)
        self.db.commit()
        
        account = Account(user_id=user.id, account_name="Test Account", platform="Google")
        self.db.add(account)
        self.db.commit()

        import pandas as pd
        data = {
            "date": [pd.to_datetime("2026-06-01"), pd.to_datetime("2026-06-02")],
            "campaign_name": ["Campaign A", "Campaign A"],
            "channel": ["Google", "Google"],
            "impressions": [100, 200],
            "clicks": [10, 20],
            "cost": [10.0, 20.0],
            "conversions": [1, 2],
            "revenue": [20.0, 40.0],
            "ctr": [0.1, 0.1],
            "cpc": [1.0, 1.0],
            "cvr": [0.1, 0.1],
            "cpa": [10.0, 10.0],
            "roas": [2.0, 2.0]
        }
        df = pd.DataFrame(data)
        
        rows_saved = save_campaign_performance(self.db, df, account.id)
        self.assertEqual(rows_saved, 2)
        
        records = self.db.query(CampaignPerformance).filter(CampaignPerformance.account_id == account.id).all()
        self.assertEqual(len(records), 2)
        self.assertEqual(records[0].campaign_name, "Campaign A")

    def test_forecasting_fallback(self):
        user = User(email="test@test.com", name="Test User")
        self.db.add(user)
        self.db.commit()
        account = Account(user_id=user.id, account_name="Test Account", platform="Google")
        self.db.add(account)
        self.db.commit()

        # Create 8 days of dummy performance data for model fitting
        records = []
        for i in range(8):
            records.append(CampaignPerformance(
                account_id=account.id,
                date=date(2026, 6, 1) + timedelta(days=i),
                campaign_name="Campaign A",
                channel="Google",
                impressions=1000,
                clicks=100,
                cost=100.0 + i * 5.0, # spend increases
                conversions=5,
                revenue=200.0 + i * 10.0,
                ctr=0.1,
                cpc=1.0,
                cvr=0.05,
                cpa=20.0,
                roas=2.0
            ))
        self.db.bulk_save_objects(records)
        self.db.commit()

        # Run forecasts
        forecast_count = run_campaign_forecasts(self.db, account.id, horizon=7)
        # We forecast cost, conversions, revenue, clicks, cpa, roas (6 metrics) for 7 days = 42 records
        self.assertEqual(forecast_count, 42)
        
        forecasts = self.db.query(Forecast).filter(Forecast.account_id == account.id).all()
        self.assertEqual(len(forecasts), 42)

    def test_anomaly_detection(self):
        user = User(email="test@test.com", name="Test User")
        self.db.add(user)
        self.db.commit()
        account = Account(user_id=user.id, account_name="Test Account", platform="Google")
        self.db.add(account)
        self.db.commit()

        # Create 9 days of steady data
        records = []
        for i in range(8):
            records.append(CampaignPerformance(
                account_id=account.id,
                date=date(2026, 6, 1) + timedelta(days=i),
                campaign_name="Campaign A",
                channel="Google",
                impressions=1000,
                clicks=100,
                cost=10.0, # steady cost
                conversions=10,
                revenue=20.0,
                ctr=0.1,
                cpc=0.1,
                cvr=0.1,
                cpa=1.0,
                roas=2.0
            ))
        # Add a massive spend spike on day 9
        records.append(CampaignPerformance(
            account_id=account.id,
            date=date(2026, 6, 9),
            campaign_name="Campaign A",
            channel="Google",
            impressions=1000,
            clicks=100,
            cost=150.0, # Massive spend spike (15x average)
            conversions=10,
            revenue=20.0,
            ctr=0.1,
            cpc=1.5,
            cvr=0.1,
            cpa=15.0,
            roas=0.13
        ))
        self.db.bulk_save_objects(records)
        self.db.commit()

        # Detect anomalies
        detect_anomalies(self.db, account.id)
        anoms = self.db.query(Anomaly).filter(Anomaly.account_id == account.id).all()
        
        # We should have found at least one anomaly (cost spike or CPC spike)
        self.assertTrue(len(anoms) > 0)
        self.assertTrue(any(a.metric == "cost" or a.metric == "cpc" for a in anoms))

    def test_recommendation_rules(self):
        user = User(email="test@test.com", name="Test User")
        self.db.add(user)
        self.db.commit()
        account = Account(user_id=user.id, account_name="Test Account", platform="Google")
        self.db.add(account)
        self.db.commit()

        # Create 14 days of data with strong ROAS (e.g. 3.0) and positive conversions trend
        records = []
        for i in range(14):
            records.append(CampaignPerformance(
                account_id=account.id,
                date=date(2026, 6, 1) + timedelta(days=i),
                campaign_name="Campaign A",
                channel="Google",
                impressions=1000,
                clicks=100 + i * 2, # clicks trending positive
                cost=100.0,
                conversions=10 + i, # conversions trending positive
                revenue=350.0, # high ROAS (3.5x)
                ctr=0.1,
                cpc=1.0,
                cvr=0.1,
                cpa=10.0,
                roas=3.5
            ))
        self.db.bulk_save_objects(records)
        self.db.commit()

        # Generate recommendations
        recs_count = generate_recommendations(self.db, account.id)
        self.assertTrue(recs_count > 0)
        
        recs = self.db.query(Recommendation).filter(Recommendation.account_id == account.id).all()
        # High ROAS campaign should trigger budget scaling or bid increases
        self.assertTrue(any(r.recommendation_type == "budget_scale" or r.recommendation_type == "bid_increase" for r in recs))

    def test_scenario_simulation(self):
        user = User(email="test@test.com", name="Test User")
        self.db.add(user)
        self.db.commit()
        account = Account(user_id=user.id, account_name="Test Account", platform="Google")
        self.db.add(account)
        self.db.commit()

        # Ingest baseline data (30 days of campaign records)
        records = []
        for i in range(30):
            records.append(CampaignPerformance(
                account_id=account.id,
                date=date(2026, 5, 1) + timedelta(days=i),
                campaign_name="Campaign A",
                channel="Google",
                impressions=1000,
                clicks=100,
                cost=100.0,
                conversions=10,
                revenue=200.0,
                ctr=0.1,
                cpc=1.0,
                cvr=0.1,
                cpa=10.0,
                roas=2.0
            ))
        self.db.bulk_save_objects(records)
        self.db.commit()

        # Simulate budget increase +20%
        sim_inc = run_budget_simulation(self.db, account.id, 20.0, "Campaign A")
        self.assertEqual(sim_inc["projected_spend"], 3600.0)
        # Because of diminishing returns, projected ROAS should decay slightly below baseline of 2.0
        self.assertTrue(sim_inc["projected_roas"] < 2.0)

        # Simulate budget decrease -10%
        sim_dec = run_budget_simulation(self.db, account.id, -10.0, "Campaign A")
        self.assertEqual(sim_dec["projected_spend"], 2700.0)
        # Because of efficiency preservation, projected ROAS should be higher than/equal to base level
        self.assertTrue(sim_dec["projected_roas"] >= 1.95)

if __name__ == "__main__":
    unittest.main()
