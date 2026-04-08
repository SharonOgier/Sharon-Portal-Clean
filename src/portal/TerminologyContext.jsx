import React, { createContext, useContext, useMemo, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Terminology Adaptation System
// Maps generic terms to business-type-specific labels.
// ─────────────────────────────────────────────────────────────────────────────

const TERMINOLOGY_MAP = {
  tradie: {
    job: "Job",
    jobs: "Jobs",
    site: "Site",
    sites: "Sites",
    subLocation: "Area",
    subLocations: "Areas",
    subcontractor: "Subcontractor",
    subcontractors: "Subcontractors",
    materials: "Parts & Materials",
    schedule: "Job Schedule",
    customer: "Customer",
    customers: "Customers",
    booking: "Job",
    bookings: "Jobs",
    dispatch: "Dispatch",
    property: "Site",
    properties: "Sites",
    paddock: "Area",
    paddocks: "Areas",
    workPlanner: "Job Schedule",
  },
  farmer: {
    job: "Task",
    jobs: "Tasks",
    site: "Property",
    sites: "Properties",
    subLocation: "Paddock / Shed",
    subLocations: "Paddocks / Sheds",
    subcontractor: "Contractor",
    subcontractors: "Contractors",
    materials: "Inputs & Supplies",
    schedule: "Work Planner",
    customer: "Client",
    customers: "Clients",
    booking: "Task",
    bookings: "Tasks",
    dispatch: "Work Planner",
    property: "Property",
    properties: "Properties",
    paddock: "Paddock",
    paddocks: "Paddocks",
    workPlanner: "Work Planner",
  },
  smallbusiness: {
    job: "Booking",
    jobs: "Bookings",
    site: "Premises",
    sites: "Premises",
    subLocation: "Zone",
    subLocations: "Zones",
    subcontractor: "Freelancer",
    subcontractors: "Freelancers",
    materials: "Consumables",
    schedule: "Booking Calendar",
    customer: "Customer",
    customers: "Customers",
    booking: "Booking",
    bookings: "Bookings",
    dispatch: "Booking Calendar",
    property: "Premises",
    properties: "Premises",
    paddock: "Zone",
    paddocks: "Zones",
    workPlanner: "Booking Calendar",
  },
};

// Fallback / default (tradie)
const DEFAULT_TYPE = "tradie";

const TerminologyContext = createContext({
  businessType: DEFAULT_TYPE,
  t: (key) => key,
});

export function TerminologyProvider({ businessType, customOverrides, children }) {
  const resolvedType = (businessType || DEFAULT_TYPE).toLowerCase().replace(/[\s/]/g, "");

  const t = useCallback(
    (key) => {
      if (customOverrides && customOverrides[key]) return customOverrides[key];
      const map = TERMINOLOGY_MAP[resolvedType] || TERMINOLOGY_MAP[DEFAULT_TYPE];
      return map[key] || TERMINOLOGY_MAP[DEFAULT_TYPE][key] || key;
    },
    [resolvedType, customOverrides]
  );

  const value = useMemo(() => ({ businessType: resolvedType, t }), [resolvedType, t]);

  return (
    <TerminologyContext.Provider value={value}>
      {children}
    </TerminologyContext.Provider>
  );
}

export function useTerminology() {
  return useContext(TerminologyContext);
}

export { TERMINOLOGY_MAP };
export default TerminologyContext;
