
# Master Brief — Gap Implementation Plan

## Gap 1: Terminology Adaptation System
**What:** Build a context provider that maps generic terms (Job, Site, Sub-location, etc.) to business-type-specific labels (Tradie/Farmer/Small Business) as defined in the brief's terminology table.

**Implementation:**
- Create `src/portal/TerminologyContext.jsx` — a React context that reads `businessType` from the user's profile and exposes a `t()` helper function
- Terminology map: Job→Job/Task/Booking, Site→Site/Property/Premises, Sub-location→Area/Paddock/Zone, Subcontractor→Subcontractor/Contractor/Freelancer, Materials→Parts & Materials/Inputs & Supplies/Consumables, Schedule→Job Schedule/Work Planner/Booking Calendar, Customer→Customer/Client/Customer
- Wrap the portal in this provider
- Update all page headers, buttons, and labels to use `t("job")` instead of hardcoded strings
- Allow custom overrides stored in profile settings

## Gap 2: Onboarding Business Type Selection
**What:** Add the 3-card business type selector to the Setup Wizard (Step 1) with Tradie (hard hat icon), Farmer (tractor icon), Small Business (storefront icon).

**Implementation:**
- Update `SetupWizardPage.jsx` to add a new first step with 3 large cards
- Step 2 adapts: trade/industry dropdown changes based on selection (Electrician/Plumber/Builder for Tradie, Broadacre/Livestock/Horticulture for Farmer, Retail/Hospitality/Cleaning for Small Biz)
- Save `businessType` to `sas_profile.data`
- Step 3: "What do you want to set up first?" checklist adapted per type

## Gap 3: Dashboard Adaptation
**What:** Make the dashboard layout change based on business type.

**Implementation:**
- Tradie: Today's dispatch view (jobs grouped by assigned person with map links), unscheduled jobs, who is where
- Farmer: Seasonal overview, property/paddock summary, contractor schedule
- Small Business: Today's bookings, staff roster, outstanding invoices
- Update `DashboardPage.jsx` to read `businessType` from profile and render the appropriate layout
- All three share the same underlying data, just different presentation

## Gap 4: Role-Specific Contact Fields
**What:** Ensure each contact role unlocks the correct additional fields as specified in the brief.

**Implementation:**
- Verify/add fields per role in `ClientsPage.jsx`:
  - Subcontractor: ABN, trade type, insurance expiry, licence number ✅ (mostly done)
  - Supplier: product categories, account number, payment terms
  - Staff: position/title, start date, hourly rate, emergency contact
  - Customer: billing address, preferred contact method
- Add "Related Jobs" section on contact detail showing all linked jobs

## Gap 5: Properties Map View
**What:** Full-screen map showing all properties as pins, clicking opens summary with active jobs.

**Implementation:**
- Enhance existing `PropertiesPage.jsx` map view
- Ensure pin click opens property summary card with sub-locations and active job count
- Add link to open full property detail from map

---

**Order of implementation:** Gap 1 → Gap 2 → Gap 3 → Gap 4 → Gap 5 (terminology first since it affects all subsequent UI work)
