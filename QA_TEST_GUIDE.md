# KitchenPulse — QA Release Test Guide & Verification Summary
**Release Target**: Week 1 Sprint — AI Microservice PostgreSQL Connection, Tenant-Isolated Live State Inspection & Dish BOM Pipeline  
**Version**: `v0.4.0-ai-db`  
**Platforms Covered**: Web Command Center (Next.js 15), Mobile Tablet App (Expo SDK 57), Node.js API Gateway, Python FastAPI AI Microservice  
**Database**: PostgreSQL 16 (Multi-Tenant Partitioned)  
**AI Model**: Google Gemini 3.8 Flash (SDK `google-genai` >= 2.30.1 with Structured JSON Output)

---

## 📋 Teams & Slack Quick Executive Summary

* 🔴 **CRITICAL** — **Scenario 1**: Multi-Tenant Isolation & Zero Data Leakage (Est. 4 mins)
* 🔴 **CRITICAL** — **Scenario 2**: Real-Time Health & Asyncpg Database Latency Probe (Est. 2 mins)
* 🔴 **CRITICAL** — **Scenario 3**: Live Pantry Deficit Audit & AI Grounded Purchase Orders (Est. 5 mins)
* 🟡 **HIGH** — **Scenario 4**: Live Menu & Historical Prep Sheet Forecast (Est. 5 mins)
* 🟡 **HIGH** — **Scenario 5**: Dual-Mode AI Dish Generator & Dynamic Inventory Auto-Seeding (Est. 6 mins)
* 🟡 **HIGH** — **Scenario 6**: Real-Time KDS Firing & Automatic Bill-of-Materials Deduction (Est. 5 mins)
* 🟢 **MEDIUM** — **Scenario 7**: Mobile Tablet Queue & MMKV Offline Session Persistence (Est. 4 mins)
* 🔴 **CRITICAL** — **Scenario 8**: Edge Cases: Offline Degradation, Rapid Actions & Network Drops (Est. 5 mins)

**Estimated Total Testing Time**: ~35 minutes  
**Target QA Sign-Off Date**: 2026-10-21  

---

## 🧪 Detailed Step-by-Step QA Test Scenarios

### 🔴 Scenario 1: Multi-Tenant Data Isolation & Client Boundary Audit
> **Goal**: Verify that client organizations (The Grand Palace Hotel vs. Bistro Bella Napoli) remain strictly partitioned with zero data leakage across database tables, AI queries, and UI dashboards.

* **Where**: Web Command Center -> Login Portal / API Endpoints (`/api/v1/agent/live-inventory/{orgId}`)
* **Pre-condition**: PostgreSQL database running with seeded multi-tenant data.

**Steps**:
1. Log in to the Web Command Center using Grand Palace Owner credentials (`owner@grandpalace.com` / `password123`).
2. Navigate to **Inventory** tab and note the total stock items (16 items) and the low-stock alert (`Beef Tenderloin`, Stock: 4.0 kg, Minimum Safe: 5.0 kg).
3. Open a separate browser window (or incognito session) and log in with Bistro Bella Napoli Owner credentials (`owner@bellanapoli.com` / `password123`).
4. Inspect the Bistro Bella Napoli **Inventory** tab (6 items total) and observe its low-stock alert (`Fresh Basil`, Stock: 0.97 kg, Minimum Safe: 1.5 kg).
5. Attempt to query Bistro Bella Napoli's inventory endpoint using Grand Palace's tenant token or examine the AI agent response for `11111111-1111-1111-1111-111111111111`.

✅ **Expected Result (PASS)**:
* Grand Palace displays strictly 16 pantry items; Bistro Bella Napoli displays strictly 6 pantry items.
* Grand Palace shows `Beef Tenderloin` deficit; `Beef Tenderloin` NEVER appears in Bistro Bella Napoli.
* Bistro Bella Napoli shows `Fresh Basil` deficit; `Fresh Basil` NEVER appears in Grand Palace.
* Cross-tenant access attempts return HTTP 403 Forbidden or HTTP 404 Not Found.

❌ **What Indicates a BUG (FAIL)**:
* Any Grand Palace item (e.g., Prime Lasuni Methi, Beef Tenderloin) appearing in Bistro Bella Napoli's dashboard or AI responses.
* Querying `/live-inventory` returns records belonging to another hotel or restaurant.

---

### 🔴 Scenario 2: Database Connection Pool Health & Sub-10ms Latency Probe
> **Goal**: Confirm that the Python AI microservice connects to PostgreSQL using asyncpg connection pooling and returns sub-10ms response latency without blocking the event loop.

* **Where**: HTTP Client / Browser -> AI Microservice (`http://localhost:8000/health`)
* **Pre-condition**: Python AI microservice (`uvicorn app.main:app`) is running on port 8000.

**Steps**:
1. Issue a `GET` request to `http://localhost:8000/health`.
2. Inspect the JSON payload structure and values.
3. Observe the `database` sub-object containing connection details and latency metrics.

✅ **Expected Result (PASS)**:
* HTTP 200 OK returned.
* JSON payload contains:
  * `"status": "ok"`
  * `"service": "kitchenpulse-ai-agent"`
  * `"database": { "connected": true, "driver": "asyncpg", "latency_ms": < 20.0 }`
* Response latency is under 10ms on local environments.

❌ **What Indicates a BUG (FAIL)**:
* `status` reports `"degraded"` or `"error"`.
* `database.connected` is `false` or key is missing.
* Response time exceeds 200ms or microservice throws an unhandled connection timeout.

---

### 🔴 Scenario 3: Live Pantry Deficit Audit & AI Grounded Purchase Orders
> **Goal**: Validate that the AI supply chain engine evaluates real PostgreSQL pantry balances and calculates accurate, urgent purchase order recommendations.

* **Where**: Web Command Center -> AI Assistant Tab / `POST /api/v1/agent/inventory-eval`
* **Pre-condition**: User logged in as Owner or Executive Chef for The Grand Palace Hotel.

**Steps**:
1. Open the Web Command Center or issue `POST /api/v1/agent/inventory-eval` with payload:
   `{ "organization_id": "11111111-1111-1111-1111-111111111111", "use_live_db": true }`
2. Inspect the returned AI recommendation cards or response JSON.
3. Verify the flagged ingredient names, current stock values, and recommended purchase order quantities against actual pantry balances.

✅ **Expected Result (PASS)**:
* Response includes `data_source: "live_database"`.
* Exactly 1 critical shortfall flagged (`Beef Tenderloin`).
* Current stock matches database (4.0 kg) with safety threshold (5.0 kg).
* Urgency flagged as `URGENT` or `CRITICAL`.
* Suggested purchase order quantity calculates adequate restocking buffer (e.g., suggested order between 1.0 kg and 12.0 kg).
* Response completes within 1-3 seconds.

❌ **What Indicates a BUG (FAIL)**:
* Response returns static mock data without querying PostgreSQL (`data_source: "deterministic_fallback"` while DB is online).
* In-stock ingredients with abundant balances (e.g., Chicken Breast at 25 kg) falsely marked as critical deficits.
* Missing `Beef Tenderloin` in the recommended orders list.

---

### 🟡 Scenario 4: Live Menu & Historical Prep Sheet Forecasting
> **Goal**: Verify that the AI prep sheet engine ingests active menu recipes and past prep/scrap logs to recommend station-specific batch volumes.

* **Where**: Web Command Center -> AI Prep Tab / Mobile Tablet -> Prep Sheet Screen
* **Pre-condition**: Seeded prep logs exist for target weekday (e.g., "Friday").

**Steps**:
1. Navigate to the **AI Prep Sheet** tab in the Web Command Center.
2. Select target service day: **Friday**.
3. Click **"Generate AI Prep Sheet"** (triggers `/api/v1/agent/forecast`).
4. Inspect the generated station breakdown (Grill, Sauté, Oven, Starters).

✅ **Expected Result (PASS)**:
* Prep sheet displays active dishes for Grand Palace Hotel (e.g., Beef Tenderloin Steak, Grilled Chicken, Margherita Pizza, Lasuni Methi).
* Each dish card displays:
  * Kitchen station pill (`Grill`, `Sauté`, `Oven`, etc.)
  * Recommended portion volume (calibrated between 15-45 portions)
  * Confidence score (>= 0.60)
  * Chef operational reasoning grounded in Friday demand volume
* Structured overall summary outlines daily prep timeline and scrap-minimization tactics.

❌ **What Indicates a BUG (FAIL)**:
* Generic or irrelevant dishes generated that do not exist in the tenant's recipe catalog.
* Confidence scores outside the 0.0 - 1.0 boundary.
* Crashing or hanging when switching between weekdays.

---

### 🟡 Scenario 5: Dual-Mode AI Dish Generator & Dynamic Inventory Auto-Seeding
> **Goal**: Confirm that creating a new dish using the AI Generator extracts the Bill of Materials (BOM), detects missing pantry items, and automatically creates them in stock.

* **Where**: Web Command Center -> Dishes & BOM Tab -> "+ Add New Recipe"
* **Pre-condition**: Logged in with `Owner` or `Executive Chef` role.

**Steps**:
1. Click **Dishes & BOM** tab in the navigation header.
2. Click **"+ Add New Recipe"** to open the modal.
3. Select **"✨ AI Generator"** tab.
4. Click the quick chip **"Chicken Masala Handi"** (or type a custom dish prompt).
5. Click **"Generate Recipe Specification"**.
6. Review the extracted fields: Dish Name, Station, Prep Time, Suggested Selling Price, and dynamic BOM rows.
7. Observe the indicator: "X ingredients matched in pantry / Y new ingredients will be added to stock".
8. Click **"Save Recipe & Add Missing Ingredients"**.

✅ **Expected Result (PASS)**:
* Recipe saves successfully and modal closes with a green confirmation toast.
* New dish appears in the catalog under the appropriate station filter tab.
* In the **Inventory** view, all previously unstocked ingredients (e.g., Handi spices, specialty cuts) appear immediately with non-zero initial stock and safety thresholds.
* Portions cost and gross margin percentage calculate accurately without `NaN%` or `$0.00` glitches.

❌ **What Indicates a BUG (FAIL)**:
* Error thrown when saving dishes with newly created ingredients.
* Duplicate ingredient rows created in the database for items that already existed.
* Dish appears in catalog without its attached Bill of Materials.

---

### 🟡 Scenario 6: Real-Time KDS Firing & Automatic Bill-of-Materials Deduction
> **Goal**: Validate that advancing a ticket to COMPLETED automatically deducts the recipe's required ingredient quantities from live inventory.

* **Where**: Web Command Center -> KDS Kanban Board & Inventory View
* **Pre-condition**: Ingredients have recorded stock levels before firing.

**Steps**:
1. Note the current stock of `Beef Tenderloin` in the **Inventory** view (e.g., 4.0 kg).
2. Go to **Dishes & BOM** (or use the New Ticket modal) and click **"Fire to KDS"** for `Beef Tenderloin Steak`.
3. Switch to **KDS Board** and verify the ticket appears in the **QUEUE** column.
4. Click **"Start Firing"** -> Ticket moves to **FIRING** column with active elapsed wait timer.
5. Click **"Complete"** -> Ticket moves to **COMPLETED** column.
6. Return to **Inventory** tab and check `Beef Tenderloin` stock.

✅ **Expected Result (PASS)**:
* Ticket advances smoothly across all 3 kanban columns with live clock `T+ mm:ss`.
* Inventory immediately decrements by the exact BOM portion quantity (e.g., 4.0 kg -> 3.75 kg for a 0.25 kg portion).
* If decrement pushes stock below minimum threshold, a real-time `stock:alert` pill appears in the top navigation bar.

❌ **What Indicates a BUG (FAIL)**:
* Stock balance remains unchanged after ticket completion.
* Stock decrements before the ticket is marked COMPLETED (premature deduction during QUEUE).
* Negative stock without safety warnings or transaction rollbacks.

---

### 🟢 Scenario 7: Mobile Tablet Queue & MMKV Offline Session Persistence
> **Goal**: Verify that kitchen staff can authenticate on the Expo tablet app, navigate active tickets, and retain session state across app relaunches.

* **Where**: Kitchen Tablet App (Expo SDK 57 / React Native)
* **Pre-condition**: Mobile app running in Expo Go or development client.

**Steps**:
1. Launch the mobile app; verify the Auth Guard displays `<AuthScreen />` when unauthenticated.
2. Tap the 1-tap demo credentials for **"Grand Palace - Chef"**.
3. Verify that the mobile header displays hotel badge `🏨 The Grand Palace Hotel` and role pill `Executive Chef`.
4. Inspect the **Kitchen Queue** tab; advance a ticket from QUEUE to FIRING.
5. Force close the mobile app and reopen it immediately.

✅ **Expected Result (PASS)**:
* App opens directly to the authenticated Kitchen Queue without flashing the login screen.
* MMKV synchronous storage restores user token, role, and organization ID in under 50ms.
* Advanced ticket preserves its updated FIRING status.

❌ **What Indicates a BUG (FAIL)**:
* App gets stuck on a blank screen or loops back to the login screen on restart.
* Hotel name displays as blank or undefined in the status header.

---

### 🔴 Scenario 8: Edge Cases, Rapid Stress Actions & Offline Resilience
> **Goal**: Verify system stability under high-speed kitchen operations, rapid taps, and network disconnects.

* **Where**: Web Command Center & Mobile Tablet App
* **Pre-condition**: Active network connection.

**Steps**:
1. **Stress Test (Rapid Ticket Clicks)**: On the KDS Board, rapidly tap "Advance Status" 3 times in quick succession on the same ticket.
2. **Offline Simulation**: Turn on Airplane Mode (or disable local network adapter).
3. Attempt to mark a ticket as completed or log a scrap waste entry while offline.
4. Re-enable network connection.
5. **AI Microservice Outage Resilience**: Temporarily stop the Python AI microservice (`docker stop` or stop process) and click **"Generate AI Prep Sheet"** in the web client.

✅ **Expected Result (PASS)**:
* Rapid consecutive taps execute idempotently without duplicate inventory deductions or double transitions.
* Offline actions fail gracefully with an informative toast (`"Network connection lost. Action buffered/queued"`), without blank screen crashes.
* When network is restored, client reconnects Socket.IO automatically within 3-5 seconds.
* When AI microservice is offline, the web UI displays a graceful fallback message (`"AI engine offline - displaying cached SOP prep schedule"`) rather than an unhandled runtime error.

❌ **What Indicates a BUG (FAIL)**:
* Uncaught React Red Screen of Death or White Screen.
* Duplicate deductions applied to inventory for a single order.
* App freezes completely when the AI service is temporarily offline.

---

## 📱 Hardware & Responsive Layout Checks

* **Android 3-Button Navigation**: Verify bottom modals and action buttons do not overlap system Back/Home/Overview navigation buttons.
* **iOS / Tablet Safe Area**: Verify top status bars and home indicator notch do not obscure ticket timer clocks or station filter pills.
* **Dark OLED Kitchen Mode**: Verify all text elements maintain high contrast against `#090D16` canvas under bright kitchen overhead lighting.

---

## ✍️ QA Sign-Off Checklist

* [ ] **Scenario 1**: Multi-Tenant Isolation & Zero Data Leakage
* [ ] **Scenario 2**: Real-Time Health & Asyncpg Database Latency Probe
* [ ] **Scenario 3**: Live Pantry Deficit Audit & AI Grounded Purchase Orders
* [ ] **Scenario 4**: Live Menu & Historical Prep Sheet Forecast
* [ ] **Scenario 5**: Dual-Mode AI Dish Generator & Dynamic Inventory Auto-Seeding
* [ ] **Scenario 6**: Real-Time KDS Firing & Automatic BOM Deduction
* [ ] **Scenario 7**: Mobile Tablet Queue & MMKV Offline Session Persistence
* [ ] **Scenario 8**: Edge Cases: Offline Degradation, Rapid Actions & Network Drops

---

## 📝 Tester Notes & Observations

* **Tested By**: ___________________________
* **Date**: ___________________________
* **Device / Environment**: ___________________________
* **Overall Build Status**: `[ ] PASS  |  [ ] CONDITIONAL PASS  |  [ ] FAIL`
* **Defects / Blockers Logged**:
  1. __________________________________________________________________
  2. __________________________________________________________________
