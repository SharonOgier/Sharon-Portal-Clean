import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import CompliancePage from '../portal/pages/CompliancePage';
import { TerminologyProvider } from '../portal/TerminologyContext';

// Mock PortalComponents to avoid deep rendering issues
vi.mock('../portal/PortalComponents', () => ({
  SectionCard: ({ children, title }) => <div><h2>{title}</h2>{children}</div>,
  DashboardHero: ({ children, title, highlight }) => (
    <div>
      <h1>{title}</h1>
      <div>{highlight}</div>
      {children}
    </div>
  ),
  InsightChip: ({ label, value }) => <div>{label}: {value}</div>,
  DataTable: ({ rows, columns }) => (
    <table>
      <thead>
        <tr>{columns.map(c => <th key={c.key}>{c.label}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>{columns.map(c => <td key={c.key}>{c.render ? c.render(r[c.key], r) : r[c.key]}</td>)}</tr>
        ))}
      </tbody>
    </table>
  ),
  EmptyState: ({ title }) => <div>{title}</div>,
}));

// Helper to render with context
const renderWithContext = (ui, { businessType = 'farmer' } = {}) => {
  return render(
    <TerminologyProvider businessType={businessType}>
      {ui}
    </TerminologyProvider>
  );
};

describe('CompliancePage Logic', () => {
  const mockProperties = [{ id: 'prop1', name: 'Home Farm' }];
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  it('identifies active chemical withholding periods', () => {
    const chemicalRecords = [
      { id: 1, propertyId: 'prop1', chemicalName: 'Roundup', withholdingEndDate: tomorrow, archived: false }
    ];

    renderWithContext(
      <CompliancePage
        chemicalRecords={chemicalRecords}
        properties={mockProperties}
      />
    );

    expect(screen.getByText(/Active WHPs: 1/)).toBeDefined();
    expect(screen.getByText(/Roundup/)).toBeDefined();
    expect(screen.getByText(/Home Farm/)).toBeDefined();
  });

  it('identifies active livestock withholding and ESI', () => {
    const livestockRecords = [
      { id: 1, propertyId: 'prop1', mobName: 'Bulls', treatment: 'Drench', withholdingEndDate: tomorrow, archived: false },
      { id: 2, propertyId: 'prop1', mobName: 'Heifers', treatment: 'Vaccine', esiEndDate: tomorrow, archived: false }
    ];

    renderWithContext(
      <CompliancePage
        livestockRecords={livestockRecords}
        properties={mockProperties}
      />
    );

    expect(screen.getByText(/Active WHPs: 2/)).toBeDefined();
    expect(screen.getByText(/Bulls - Drench/)).toBeDefined();
    expect(screen.getByText(/Heifers - Vaccine/)).toBeDefined();
  });

  it('flags missing chemical records for relevant jobs (Audit Logic)', () => {
    const jobs = [
      { id: 'job1', title: 'Paddock Spraying', startDate: today, propertyId: 'prop1' }
    ];
    // No chemical records for this date/property

    renderWithContext(
      <CompliancePage
        jobs={jobs}
        chemicalRecords={[]}
        properties={mockProperties}
      />
    );

    expect(screen.getByText(/Audit Flags: 1/)).toBeDefined();
    expect(screen.getByText(/Missing Record/)).toBeDefined();
    expect(screen.getByText(/Job "Paddock Spraying" mentions chemicals/)).toBeDefined();
  });

  it('does not flag jobs when a chemical record exists', () => {
    const jobs = [
      { id: 'job1', title: 'Paddock Spraying', startDate: today, propertyId: 'prop1' }
    ];
    const chemicalRecords = [
      { id: 1, propertyId: 'prop1', date: today, archived: false }
    ];

    renderWithContext(
      <CompliancePage
        jobs={jobs}
        chemicalRecords={chemicalRecords}
        properties={mockProperties}
      />
    );

    expect(screen.getByText(/Audit Flags: 0/)).toBeDefined();
  });

  it('identifies missing NLIS transfer IDs for movement records', () => {
      const livestockRecords = [
        { id: 1, type: 'movement', mobName: 'Sheep', archived: false } // missing nlisTransferId
      ];

      renderWithContext(
        <CompliancePage
          livestockRecords={livestockRecords}
          properties={mockProperties}
        />
      );

      expect(screen.getByText(/NLIS Actions: 1/)).toBeDefined();
      expect(screen.getByText(/Missing NLIS Transfer ID/)).toBeDefined();
  });
});
