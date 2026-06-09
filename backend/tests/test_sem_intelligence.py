import os
import sys
import unittest
from datetime import datetime, date, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Set Python path settings or imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import Base
from app.models.database_models import User, Account, CampaignPerformance, Forecast
from app.services.sem_metrics import (
    calculate_ctr, calculate_cpc, calculate_cvr, calculate_cpa, 
    calculate_roas, calculate_cpi, calculate_estimated_value, 
    calculate_estimated_profit, calculate_spend_efficiency
)
from app.services.diminishing_returns import get_campaign_diminishing_returns, fit_diminishing_returns_curve
from app.services.sqr_analysis import analyze_sqr
from app.services.negative_keywords import get_negative_keyword_recommendations
from app.services.incremental_budget import allocate_incremental_budget
from app.services.bid_optimization import generate_bid_recommendations
from app.services.impression_share import analyze_impression_share
from app.services.portfolio_optimizer import optimize_portfolio_budget
from app.services.data_quality import validate_and_clean_csv, save_campaign_performance
from app.services.forecasting import run_campaign_forecasts

class TestSemIntelligence(unittest.TestCase):
    def setUp(self):
        # In-memory SQLite engine for fast testing
        self.engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
        Base.metadata.create_all(bind=self.engine)
        self.TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        self.db = self.TestingSessionLocal()
        
        # Setup default user and account
        self.user = User(email="test_sem@test.com", name="Test SEM Admin")
        self.db.add(self.user)
        self.db.commit()
        
        self.account = Account(user_id=self.user.id, account_name="Test Ad Account", platform="Google Ads")
        self.db.add(self.account)
        self.db.commit()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)

    def test_core_sem_metric_formulas(self):
        # Check CTR
        self.assertEqual(calculate_ctr(10, 100), 0.1)
        self.assertEqual(calculate_ctr(0, 0), 0.0) # Zero protection
        
        # Check CPC
        self.assertEqual(calculate_cpc(50.0, 25), 2.0)
        self.assertEqual(calculate_cpc(0, 0), 0.0)

        # Check CVR
        self.assertEqual(calculate_cvr(5, 50), 0.1)
        self.assertEqual(calculate_cvr(0, 0), 0.0)

        # Check CPA
        self.assertEqual(calculate_cpa(100.0, 5), 20.0)
        self.assertEqual(calculate_cpa(0.0, 0), 0.0)

        # Check ROAS
        self.assertEqual(calculate_roas(250.0, 100.0), 2.5)
        self.assertEqual(calculate_roas(0, 0), 0.0)

        # Check CPI
        self.assertEqual(calculate_cpi(100.0, 20), 5.0)
        self.assertEqual(calculate_cpi(50.0, 0), 0.0)

        # Check Estimated Value
        self.assertEqual(calculate_estimated_value(10, 200.0, 0.0, 0.0), 2000.0) # LTV priority
        self.assertEqual(calculate_estimated_value(10, 0.0, 80.0, 0.0), 800.0)   # Conversion Value fallback
        self.assertEqual(calculate_estimated_value(10, 0.0, 0.0, 500.0), 500.0)  # Revenue fallback

        # Check Estimated Profit
        self.assertEqual(calculate_estimated_profit(1000.0, 0.40, 300.0), 100.0)

        # Check Spend Efficiency Labels
        self.assertEqual(calculate_spend_efficiency(150.0, 0, 0.0, 0.0, 2.0, 30.0), "Wasteful")
        self.assertEqual(calculate_spend_efficiency(100.0, 5, 0.1, 20.0, 2.0, 30.0), "Wasteful") # Low ROAS
        self.assertEqual(calculate_spend_efficiency(100.0, 5, 2.0, 120.0, 2.0, 30.0), "Wasteful") # High CPA
        self.assertEqual(calculate_spend_efficiency(100.0, 5, 2.5, 20.0, 2.0, 30.0, 85.0), "Diminishing returns")
        self.assertEqual(calculate_spend_efficiency(100.0, 5, 2.5, 20.0, 2.0, 30.0, 65.0), "Near saturation")
        self.assertEqual(calculate_spend_efficiency(100.0, 5, 2.5, 20.0, 2.0, 30.0, 30.0), "Efficient")

    def test_diminishing_returns_math(self):
        # 1. Fit curve with linear growth (perfect power fit conversions = 1 * spend^0.8)
        spends = [10, 20, 30, 40, 50]
        conversions = [10**0.8, 20**0.8, 30**0.8, 40**0.8, 50**0.8]
        curve = fit_diminishing_returns_curve(spends, conversions, target_cpa=30.0)
        
        self.assertAlmostEqual(curve["b"], 0.8, delta=0.05)
        
        # 2. Test get campaign diminishing returns with database records
        records = []
        for i in range(15):
            records.append(CampaignPerformance(
                account_id=self.account.id,
                date=date(2026, 6, 1) + timedelta(days=i),
                campaign_name="NonBrand Camp",
                channel="Google Search",
                impressions=1000,
                clicks=100,
                cost=100.0 + i*10.0,
                conversions=2 + int(i**0.7),
                revenue=150.0,
                ctr=0.1, cpc=1.0, cvr=0.02, cpa=50.0, roas=1.5,
                target_cpa=30.0, target_roas=2.0
            ))
        self.db.bulk_save_objects(records)
        self.db.commit()

        dim_res = get_campaign_diminishing_returns(self.db, self.account.id, "NonBrand Camp")
        self.assertEqual(dim_res["campaign_name"], "NonBrand Camp")
        self.assertTrue(dim_res["saturation_score"] > 0)
        self.assertIn(dim_res["status"], ["Efficient", "Near saturation", "Diminishing returns"])
        self.assertIn("a", dim_res)
        self.assertIn("b", dim_res)
        self.assertIn("ltv", dim_res)

    def test_sqr_analysis_logic(self):
        # Ingest SQR row + Non-SQR row
        records = [
            # Waste query (cost > 15, conversions = 0)
            CampaignPerformance(
                account_id=self.account.id, date=date(2026, 6, 1),
                campaign_name="NonBrand Camp", channel="Google Search",
                impressions=100, clicks=10, cost=25.0, conversions=0, revenue=0.0,
                ctr=0.1, cpc=2.5, cvr=0.0, cpa=0.0, roas=0.0,
                search_query="free test tutorial jobs", keyword="ppc software", match_type="broad",
                target_cpa=30.0, target_roas=2.0
            ),
            # Expansion query (ROAS > target, CPA < target, conversions > 0, match != exact)
            CampaignPerformance(
                account_id=self.account.id, date=date(2026, 6, 2),
                campaign_name="NonBrand Camp", channel="Google Search",
                impressions=100, clicks=10, cost=10.0, conversions=2, revenue=100.0,
                ctr=0.1, cpc=1.0, cvr=0.2, cpa=5.0, roas=10.0,
                search_query="buy paid ads forecaster", keyword="ppc software", match_type="phrase",
                target_cpa=30.0, target_roas=2.0
            ),
            # Exact match candidate (conversions > 2, ROAS > target * 1.1)
            CampaignPerformance(
                account_id=self.account.id, date=date(2026, 6, 3),
                campaign_name="NonBrand Camp", channel="Google Search",
                impressions=100, clicks=20, cost=30.0, conversions=4, revenue=200.0,
                ctr=0.2, cpc=1.5, cvr=0.2, cpa=7.5, roas=6.67,
                search_query="forecastiq dashboard tool", keyword="ppc software", match_type="phrase",
                target_cpa=30.0, target_roas=2.0
            )
        ]
        self.db.bulk_save_objects(records)
        self.db.commit()

        sqr_res = analyze_sqr(self.db, self.account.id)
        self.assertTrue(sqr_res["has_data"])
        self.assertEqual(len(sqr_res["waste_queries"]), 1)
        self.assertEqual(len(sqr_res["negative_keyword_candidates"]), 1)
        self.assertEqual(len(sqr_res["expansion_opportunities"]), 2)
        self.assertEqual(len(sqr_res["exact_match_candidates"]), 1)
        
        # Test negative keyword groupings
        neg_res = get_negative_keyword_recommendations(self.db, self.account.id)
        self.assertTrue(neg_res["has_data"])
        self.assertIn("NonBrand Camp", neg_res["campaign_groups"])

    def test_budget_planners_and_bid_recommendations(self):
        # Setup 14 days of data for bid optimizations
        records = []
        for i in range(14):
            records.append(CampaignPerformance(
                account_id=self.account.id,
                date=date(2026, 6, 1) + timedelta(days=i),
                campaign_name="Brand Campaign",
                channel="Google Search",
                impressions=2000,
                clicks=100,
                cost=50.0,
                conversions=15, # high CVR, CPA = 3.33
                revenue=300.0,  # ROAS = 6.0
                ctr=0.05, cpc=0.5, cvr=0.15, cpa=3.33, roas=6.0,
                lost_is_rank=0.35, target_cpa=30.0, target_roas=2.0 # lost rank high -> increase bid!
            ))
        self.db.bulk_save_objects(records)
        self.db.commit()

        # Generate bid recommendations
        bids = generate_bid_recommendations(self.db, self.account.id)
        self.assertEqual(len(bids), 1)
        self.assertEqual(bids[0]["action"], "Increase")

        # Test incremental budget allocator
        inc_alloc = allocate_incremental_budget(self.db, self.account.id, additional_budget=500.0, objective="estimated_value")
        self.assertEqual(inc_alloc["total_incremental_budget"], 500.0)
        self.assertEqual(len(inc_alloc["campaign_allocations"]), 1)
        self.assertTrue(inc_alloc["projected_incremental_conversions"] > 0)

        # Test portfolio budget optimizer
        port_opt = optimize_portfolio_budget(self.db, self.account.id, total_budget=1000.0, objective="estimated_value")
        self.assertEqual(port_opt["total_budget"], 1000.0)
        self.assertEqual(len(port_opt["budget_shift_recommendations"]), 1)

    def test_impression_share_opportunity(self):
        # Campaign with IS columns
        record = CampaignPerformance(
            account_id=self.account.id, date=date(2026, 6, 1),
            campaign_name="Brand Campaign", channel="Google Search",
            impressions=1000, clicks=100, cost=50.0, conversions=10, revenue=200.0,
            impression_share=0.80, lost_is_budget=0.15, lost_is_rank=0.05
        )
        self.db.add(record)
        self.db.commit()

        is_res = analyze_impression_share(self.db, self.account.id)
        self.assertTrue(is_res["has_data"])
        self.assertEqual(len(is_res["campaigns"]), 1)
        self.assertTrue(is_res["total_missed_clicks"] > 0)
        self.assertTrue(is_res["total_missed_conversions"] > 0)

    def test_old_vs_new_csv_compatibility(self):
        # 1. Old CSV with only core columns
        csv_old = (
            "date,campaign_name,channel,impressions,clicks,cost,conversions,revenue\n"
            "2026-06-01,Google Search,Google Search,100,10,15.0,1,30.0\n"
        )
        df_old, report_old = validate_and_clean_csv(csv_old.encode("utf-8"))
        self.assertEqual(report_old["total_rows_ingested"], 1)
        self.assertIsNone(df_old.iloc[0]["search_query"])
        self.assertEqual(df_old.iloc[0]["installs"], 1) # Fallback conversions
        self.assertEqual(df_old.iloc[0]["target_cpa"], 30.0) # Fallback

        # 2. Rich CSV with optional SEM columns
        csv_new = (
            "date,campaign_name,channel,impressions,clicks,cost,conversions,revenue,search_query,installs,target_cpa\n"
            "2026-06-01,Google Search,Google Search,100,10,15.0,1,30.0,best ads software,3,45.0\n"
        )
        df_new, report_new = validate_and_clean_csv(csv_new.encode("utf-8"))
        self.assertEqual(report_new["total_rows_ingested"], 1)
        self.assertEqual(df_new.iloc[0]["search_query"], "best ads software")
        self.assertEqual(df_new.iloc[0]["installs"], 3)
        self.assertEqual(df_new.iloc[0]["target_cpa"], 45.0)

    def test_forecast_additional_metrics(self):
        # Load 8 days of data for forecasting
        records = []
        for i in range(8):
            records.append(CampaignPerformance(
                account_id=self.account.id,
                date=date(2026, 6, 1) + timedelta(days=i),
                campaign_name="Brand Campaign",
                channel="Google Search",
                impressions=100, clicks=10, cost=15.0, conversions=1, revenue=30.0,
                installs=2, estimated_ltv=200.0
            ))
        self.db.bulk_save_objects(records)
        self.db.commit()

        forecasts_generated = run_campaign_forecasts(self.db, self.account.id, horizon=5)
        # We forecast: cost, conversions, revenue, clicks, installs, cpa, roas, cpi, estimated_value (9 metrics) * 5 days = 45 records
        self.assertEqual(forecasts_generated, 45)
        
        # Verify forecast metric records in database
        cpi_forecast = self.db.query(Forecast).filter(Forecast.metric == "cpi").all()
        self.assertEqual(len(cpi_forecast), 5)
        
        val_forecast = self.db.query(Forecast).filter(Forecast.metric == "estimated_value").all()
        self.assertEqual(len(val_forecast), 5)
        # Expected value should be Conversions forecast * LTV (200.0)
        self.assertAlmostEqual(val_forecast[0].predicted_value, self.db.query(Forecast).filter(Forecast.metric == "conversions").first().predicted_value * 200.0)

if __name__ == "__main__":
    unittest.main()
