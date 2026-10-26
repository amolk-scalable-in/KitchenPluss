#!/usr/bin/env python3
"""
KitchenPulse AI Microservice — Server-Sent Events (SSE) Streaming Test Suite
Verifies Day 5 SSE streaming endpoints (/api/v1/agent/stream and /api/agent/stream)
testing token-by-token streaming, event headers, meta events, and stream completion.
"""

import asyncio
import json
import httpx
from app.main import app

GRAND_PALACE_ORG_ID = "11111111-1111-1111-1111-111111111111"


async def parse_sse_stream(response_lines):
    """Parses raw SSE lines into structured events."""
    events = []
    current_event = None
    current_data = []

    for line in response_lines:
        line = line.strip()
        if not line:
            if current_event and current_data:
                events.append({
                    "event": current_event,
                    "data": json.loads("\n".join(current_data))
                })
            current_event = None
            current_data = []
            continue

        if line.startswith("event:"):
            current_event = line[len("event:"):].strip()
        elif line.startswith("data:"):
            current_data.append(line[len("data:"):].strip())

    if current_event and current_data:
        events.append({
            "event": current_event,
            "data": json.loads("\n".join(current_data))
        })
    return events


async def main():
    print("=" * 65)
    print(" KitchenPulse AI Microservice — Day 5 SSE Streaming Test Suite")
    print("=" * 65)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:

        # ── Test 1: GET /api/v1/agent/stream (EventSource compatible) ──
        print("\n[1/4] Testing GET /api/v1/agent/stream (Prep Forecast)...")
        params = {
            "organization_id": GRAND_PALACE_ORG_ID,
            "stream_type": "prep_forecast",
            "day_of_week": "Friday",
            "prompt": "Recommend morning batch prep volumes for signature curries.",
        }
        async with client.stream("GET", "/api/v1/agent/stream", params=params, timeout=30.0) as resp:
            assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
            assert "text/event-stream" in resp.headers.get("content-type", "")
            print("  -> Status 200 OK | Content-Type: text/event-stream verified")

            raw_lines = []
            async for line in resp.aiter_lines():
                raw_lines.append(line)

            events = await parse_sse_stream(raw_lines)
            assert len(events) >= 3, f"Expected at least meta, token, and done events, got {len(events)}"

            # Verify meta event
            meta_event = events[0]
            assert meta_event["event"] == "meta"
            assert meta_event["data"]["organization_id"] == GRAND_PALACE_ORG_ID
            assert meta_event["data"]["stream_type"] == "prep_forecast"
            print(f"  -> Event 'meta' received: Model={meta_event['data']['ai_model']} Source={meta_event['data']['data_source']}")

            # Verify token events
            token_events = [e for e in events if e["event"] == "token"]
            assert len(token_events) > 0, "No token events received"
            sample_tokens = "".join([e["data"]["chunk"] for e in token_events[:10]])
            print(f"  -> Streamed {len(token_events)} tokens successfully! Sample: \"{sample_tokens.strip()}\"...")

            # Verify done event
            done_event = events[-1]
            assert done_event["event"] == "done"
            assert done_event["data"]["status"] == "completed"
            print(f"  -> Event 'done' received: Status={done_event['data']['status']}, Total Tokens={done_event['data']['total_tokens']}")

        # ── Test 2: POST /api/v1/agent/stream (JSON Body) ──────────────
        print("\n[2/4] Testing POST /api/v1/agent/stream (Inventory Restock Audit)...")
        body = {
            "organization_id": GRAND_PALACE_ORG_ID,
            "stream_type": "inventory_eval",
            "prompt": "Audit pantry items below threshold and recommend emergency supplier POs.",
            "use_live_db": True,
        }
        async with client.stream("POST", "/api/v1/agent/stream", json=body, timeout=30.0) as resp:
            assert resp.status_code == 200
            raw_lines = []
            async for line in resp.aiter_lines():
                raw_lines.append(line)

            events = await parse_sse_stream(raw_lines)
            assert events[0]["event"] == "meta"
            assert events[0]["data"]["stream_type"] == "inventory_eval"
            token_events = [e for e in events if e["event"] == "token"]
            assert len(token_events) > 0
            done_event = events[-1]
            assert done_event["event"] == "done"
            print(f"  -> Inventory restock stream completed with {len(token_events)} tokens streamed!")

        # ── Test 3: GET /api/agent/stream (Un-versioned Alias) ─────────
        print("\n[3/4] Testing GET /api/agent/stream (Un-versioned Alias Path)...")
        params_alias = {
            "organization_id": GRAND_PALACE_ORG_ID,
            "stream_type": "chef_assistant",
            "prompt": "How can line cooks minimize firing time for Paneer Tikka and Butter Chicken?",
        }
        async with client.stream("GET", "/api/agent/stream", params=params_alias, timeout=30.0) as resp:
            assert resp.status_code == 200
            raw_lines = []
            async for line in resp.aiter_lines():
                raw_lines.append(line)

            events = await parse_sse_stream(raw_lines)
            assert events[0]["event"] == "meta"
            assert events[0]["data"]["stream_type"] == "chef_assistant"
            token_events = [e for e in events if e["event"] == "token"]
            assert len(token_events) > 0
            assert events[-1]["event"] == "done"
            print(f"  -> Alias endpoint /api/agent/stream verified with {len(token_events)} tokens streamed!")

        # ── Test 4: Verify Multi-Tenant Scoping ────────────────────────
        print("\n[4/4] Verifying Tenant Isolation in SSE Stream...")
        BELLA_NAPOLI_ORG_ID = "22222222-2222-2222-2222-222222222222"
        params_bella = {
            "organization_id": BELLA_NAPOLI_ORG_ID,
            "stream_type": "prep_forecast",
            "day_of_week": "Saturday",
        }
        async with client.stream("GET", "/api/v1/agent/stream", params=params_bella, timeout=30.0) as resp:
            assert resp.status_code == 200
            raw_lines = []
            async for line in resp.aiter_lines():
                raw_lines.append(line)
            events = await parse_sse_stream(raw_lines)
            assert events[0]["data"]["organization_id"] == BELLA_NAPOLI_ORG_ID
            print("  -> Tenant isolation verified for Bistro Bella Napoli.")

    print("\n" + "=" * 65)
    print(" ALL DAY 5 SSE STREAMING TESTS PASSED (4/4)! ")
    print("=" * 65)


if __name__ == "__main__":
    asyncio.run(main())
