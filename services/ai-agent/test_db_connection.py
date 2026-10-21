#!/usr/bin/env python3
"""
KitchenPulse — Day 4 Verification Suite: PostgreSQL Database Connection (SQLAlchemy + asyncpg)
Validates asynchronous connection pooling, tenant-isolated queries, live inventory audits,
and Gemini grounding over real database records.
"""

import sys
import os
import asyncio
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Ensure services/ai-agent is in python path
current_dir = Path(__file__).resolve().parent
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))

from app.db import (
    init_db,
    close_db,
    check_db_connectivity,
    KitchenDbRepository,
    get_session_factory,
)
from app.routers.health import health_check
from app.routers.agent import (
    generate_forecast,
    evaluate_inventory,
    get_live_inventory,
    get_live_recipes,
)
from app.schemas.agent import (
    ForecastRequest,
    InventoryEvalRequest,
)

GRAND_PALACE_ORG = "11111111-1111-1111-1111-111111111111"
BELLA_NAPOLI_ORG = "22222222-2222-2222-2222-222222222222"


async def main():
    print("=" * 70)
    print(" KitchenPulse AI Microservice — Day 4: SQLAlchemy Database Verification")
    print("=" * 70)

    # 1. Database Connection & Ping Test
    print("\n[1/6] Testing Asynchronous Database Engine & Health Ping...")
    connected = await init_db()
    assert connected is True, "Database failed to connect on initialization!"
    
    health = await health_check()
    assert health["status"] == "ok"
    assert "database" in health
    assert health["database"]["connected"] is True
    assert health["database"]["latency_ms"] < 200, "Database ping took over 200ms!"
    print(f"  -> DB Engine Active: True")
    print(f"  -> Driver: {health['database']['driver']}")
    print(f"  -> Latency: {health['database']['latency_ms']} ms")
    print(f"  -> URL: {health['database']['url']}")

    factory = get_session_factory()

    async with factory() as session:
        # 2. Multi-Tenant Organization Discovery & Isolation
        print("\n[2/6] Verifying Multi-Tenant Organization Discovery & Isolation...")
        orgs = await KitchenDbRepository.get_all_organizations(session)
        assert len(orgs) >= 2, "Expected at least 2 seeded demo organizations!"
        org_names = [o.name for o in orgs]
        print(f"  -> Discovered {len(orgs)} organizations in PostgreSQL:")
        for o in orgs:
            print(f"     • {o.name} [ID: {o.id}] (Slug: {o.slug})")
        assert "The Grand Palace Hotel" in org_names
        assert "Bistro Bella Napoli" in org_names

        # 3. Live Inventory Querying & Deficit Detection for Grand Palace
        print("\n[3/6] Querying Live Ingredients & Deficits: The Grand Palace Hotel...")
        gp_inv = await KitchenDbRepository.get_inventory_by_org(session, GRAND_PALACE_ORG)
        assert len(gp_inv) >= 8, f"Expected Grand Palace ingredients >= 8, got {len(gp_inv)}"
        print(f"  -> Total Pantry Items in DB: {len(gp_inv)}")

        gp_low = await KitchenDbRepository.get_low_stock_by_org(session, GRAND_PALACE_ORG)
        print(f"  -> Low-stock Items in DB: {len(gp_low)}")
        low_names = [item.name for item in gp_low]
        print(f"  -> Deficit items: {low_names}")
        assert "Mutton Curry Cut" in low_names, "Expected Mutton Curry Cut to be below safety threshold!"

        gp_summary = await KitchenDbRepository.get_inventory_audit_summary(session, GRAND_PALACE_ORG)
        assert gp_summary["critical_count"] == len(gp_low)
        print(f"  -> Total Stock Valuation: ₹{gp_summary['estimated_valuation']}")

        # 4. Cross-Tenant Isolation Verification (Bistro Bella Napoli)
        print("\n[4/6] Verifying Cross-Tenant Isolation: Bistro Bella Napoli...")
        bella_inv = await KitchenDbRepository.get_inventory_by_org(session, BELLA_NAPOLI_ORG)
        bella_names = [i.name for i in bella_inv]
        print(f"  -> Bistro Bella Napoli Items: {len(bella_inv)}")
        # Strict isolation check: ensure no Grand Palace ingredients appear in Bella Napoli
        assert "Mutton Curry Cut" not in bella_names, "Tenant Leak: Mutton Curry Cut found in Bella Napoli!"
        assert "Assam CTC Tea & Spices" in bella_names, "Expected Assam CTC Tea & Spices in Bella Napoli!"
        
        bella_low = await KitchenDbRepository.get_low_stock_by_org(session, BELLA_NAPOLI_ORG)
        bella_low_names = [item.name for item in bella_low]
        print(f"  -> Bella Napoli Deficit items: {bella_low_names}")
        assert "Fresh Mint & Coriander" in bella_low_names, "Expected Fresh Mint & Coriander to be low in Bella Napoli!"
        print("  -> Multi-Tenant Isolation VERIFIED: Zero cross-tenant data leakage detected.")

        # 5. Live State Inspection Endpoints
        print("\n[5/6] Testing Live Inspection API Endpoints (/live-inventory & /live-recipes)...")
        live_inv_res = await get_live_inventory(GRAND_PALACE_ORG, session)
        assert live_inv_res.total_items == len(gp_inv)
        assert live_inv_res.organization_name == "The Grand Palace Hotel"
        print(f"  -> /live-inventory/{GRAND_PALACE_ORG}: OK ({live_inv_res.total_items} items, {live_inv_res.low_stock_count} low stock)")

        live_rec_res = await get_live_recipes(GRAND_PALACE_ORG, session)
        assert live_rec_res.total_recipes > 0
        print(f"  -> /live-recipes/{GRAND_PALACE_ORG}: OK ({live_rec_res.total_recipes} dishes across stations)")
        for rec in live_rec_res.recipes[:3]:
            print(f"     * [{rec.station}] {rec.menu_item_name}: ₹{rec.price} (BOM items: {rec.bom_count})")

        # 6. End-to-End Grounded AI Operations with Live PostgreSQL State
        print("\n[6/6] Testing AI Operations Grounded in Real PostgreSQL State...")
        # 6a. Live Inventory Shortfall Evaluation
        inv_eval_req = InventoryEvalRequest(
            organization_id=GRAND_PALACE_ORG,
            use_live_db=True,
        )
        inv_result = await evaluate_inventory(inv_eval_req, session)
        assert inv_result.critical_count > 0
        assert inv_result.data_source == "live_database"
        print(f"  -> /agent/inventory-eval Grounded Result:")
        print(f"     Data Source: {inv_result.data_source}")
        print(f"     Critical Shortfalls: {inv_result.critical_count}")
        print(f"     Audited Items: {inv_result.total_ingredients_audited}")
        for order in inv_result.recommended_orders:
            print(f"     * {order.ingredient_name}: Current {order.current_stock} / Safe {order.safety_threshold} -> Order {order.suggested_order_qty} ({order.urgency})")

        # 6b. Live Historical Prep Forecast
        forecast_req = ForecastRequest(
            organization_id=GRAND_PALACE_ORG,
            day_of_week="Friday",
            use_live_db=True,
        )
        forecast_result = await generate_forecast(forecast_req, session)
        assert len(forecast_result.items) > 0
        assert forecast_result.data_source == "live_database"
        print(f"  -> /agent/forecast Grounded Result for {forecast_result.target_day}:")
        print(f"     Data Source: {forecast_result.data_source}")
        print(f"     Recommended Dishes: {len(forecast_result.items)}")
        for item in forecast_result.items[:3]:
            print(f"     * [{item.station}] {item.menu_item_name}: {item.recommended_portions} portions (Conf: {item.confidence_score})")

    await close_db()
    print("\n" + "=" * 70)
    print(" [+] ALL DAY 4 SQLALCHEMY DATABASE & TENANT TESTS PASSED!")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())
