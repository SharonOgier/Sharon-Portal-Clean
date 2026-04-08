import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ComplianceDashboardPage from "./ComplianceDashboardPage";
import { TerminologyProvider } from "../TerminologyContext";
import React from "react";

// Mock PortalComponents since they might have complex logic/dependencies
const MockComponent = ({ children, title, subtitle, value, label }) => (
  <div>
    {title && <h2>{title}</h2>}
    {subtitle && <p>{subtitle}</p>}
    {label && <span>{label}</span>}
    {value && <span>{value}</span>}
    {children}
  </div>
);

const mockProps = {
  SectionCard: MockComponent,
  MetricCard: MockComponent,
  DataTable: ({ rows, emptyState, columns }) => (
    <div>
      {rows.length === 0 ? (
        <div>{emptyState.title}</div>
      ) : (
        <table>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {columns.map(col => (
                  <td key={col.key}>{col.render ? col.render(row[col.key], row) : row[col.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  ),
  DashboardHero: MockComponent,
  InsightChip: MockComponent,
  colours: { teal: "#006D6D" },
  formatDateAU: (v) => v,
  todayLocal: () => "2025-05-20",
};

describe("ComplianceDashboardPage", () => {
  it("renders 'Clear' when no active withholding periods exist", () => {
    render(
      <TerminologyProvider businessType="farmer">
        <ComplianceDashboardPage {...mockProps} chemicalRecords={[]} livestockRecords={[]} />
      </TerminologyProvider>
    );

    expect(screen.getByText("Chemical Status")).toBeDefined();
    expect(screen.getAllByText("✔ Clear")).toHaveLength(2); // Chemical and Livestock Status
    expect(screen.getByText("✔ All clear")).toBeDefined(); // NLIS Status
  });

  it("renders 'Restricted' when active chemical WHP exists", () => {
    const chemicalRecords = [
      { id: 1, withholdingEndDate: "2025-05-21", archived: false, chemicalProductName: "Roundup" }
    ];

    render(
      <TerminologyProvider businessType="farmer">
        <ComplianceDashboardPage {...mockProps} chemicalRecords={chemicalRecords} />
      </TerminologyProvider>
    );

    expect(screen.getByText("❌ Restricted")).toBeDefined();
    expect(screen.getByText("Roundup")).toBeDefined();
  });

  it("detects missing records in audit trail", () => {
    const jobs = [
      { id: 1, title: "Spray north paddock", date: "2025-05-15" }
    ];

    render(
      <TerminologyProvider businessType="farmer">
        <ComplianceDashboardPage {...mockProps} jobs={jobs} chemicalRecords={[]} />
      </TerminologyProvider>
    );

    expect(screen.getByText(/mentions spraying but no chemical record found/)).toBeDefined();
  });
});
