import React from "react";
import EntityLink from "../EntityLink";

class DocumentsPageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("DocumentsPage crash:", error, info);
  }

  render() {
    if (this.state.error) {
      const colours = this.props.colours || {};
      const text = colours.text || "#14202B";
      const muted = colours.muted || "#64748B";
      const border = colours.border || "#E2E8F0";

      return (
        <div
          style={{
            background: "#fff",
            border: `1px solid ${border}`,
            borderRadius: 18,
            padding: 24,
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 800, color: text }}>Documents</div>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: muted }}>
            This page hit an error while loading, so I swapped in a safe fallback.
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function DocumentsPageInner(props) {
  const {
    documents = [],
    setDocumentFile = () => {},
    documentEditorOpen = false,
    documentEditorForm = null,
    setDocumentEditorForm = () => {},
    savingDocumentEdits = false,
    colours = {},
    cardStyle = {},
    buttonPrimary = {},
    buttonSecondary = {},
    inputStyle = {},
    labelStyle = {},
    formatDateAU = (value) => String(value || ""),
    uploadDocument = () => {},
    deleteDocument = () => {},
    openDocumentEditor = () => {},
    closeDocumentEditor = () => {},
    saveDocumentEdits = () => {},
    openDocumentFile = null,
    jobs = [],
    setActivePage = () => {},
  } = props;

  const palette = {
    text: colours.text || "#14202B",
    muted: colours.muted || "#64748B",
    purple: colours.purple || "#6A1B9A",
    teal: colours.teal || "#006D6D",
    border: colours.border || "#E2E8F0",
    white: colours.white || "#FFFFFF",
    surface: colours.lightPurple || "#F8FAFC",
  };

  const safeDocuments = Array.isArray(documents) ? documents : [];
  const safeJobs = Array.isArray(jobs) ? jobs : [];
  const sortedDocuments = [...safeDocuments].sort(
    (a, b) => new Date(b?.uploadedAt || 0) - new Date(a?.uploadedAt || 0),
  );
  const latestDocument = sortedDocuments[0] || null;
  const lastUploaded = latestDocument?.uploadedAt ? formatDateAU(latestDocument.uploadedAt) : "None yet";

  const docTypes = safeDocuments.reduce((acc, item) => {
    const extension = String(item?.name || "")
      .split(".")
      .pop()
      .toLowerCase() || "other";
    acc[extension] = (acc[extension] || 0) + 1;
    return acc;
  }, {});

  const cardBase = {
    ...cardStyle,
    background: cardStyle.background || palette.white,
    border: cardStyle.border || `1px solid ${palette.border}`,
    borderRadius: cardStyle.borderRadius || 18,
  };

  const stats = [
    { label: "Total documents", value: String(safeDocuments.length) },
    { label: "Last uploaded", value: lastUploaded },
    { label: "File types", value: String(Object.keys(docTypes).length) },
  ];

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={{ ...cardBase, padding: 24, display: "grid", gap: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.6, color: palette.muted }}>
          Workspace
        </div>
        <div style={{ fontSize: 32, fontWeight: 900, color: palette.text, lineHeight: 1.05 }}>
          Documents
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.7, color: palette.muted, maxWidth: 820 }}>
          Store, organise and access your uploaded files, receipts and generated PDFs in one place.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          {stats.map((item) => (
            <div key={item.label} style={{ ...cardBase, padding: 16, display: "grid", gap: 6, background: palette.surface }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: palette.muted }}>{item.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: palette.text }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...cardBase, padding: 24, display: "grid", gap: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "grid", gap: 4 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: palette.text }}>Document library</div>
            <div style={{ fontSize: 14, color: palette.muted }}>Upload and manage files linked to your portal.</div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="file"
              style={{ ...inputStyle, padding: "8px 10px", maxWidth: 280 }}
              onChange={(event) => setDocumentFile(event.target.files?.[0] || null)}
            />
            <button style={buttonPrimary} onClick={uploadDocument}>Upload</button>
          </div>
        </div>

        {safeDocuments.length ? (
          <div style={{ overflowX: "auto", border: `1px solid ${palette.border}`, borderRadius: 16 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760, background: palette.white }}>
              <thead>
                <tr style={{ background: palette.surface }}>
                  {[
                    "Document",
                    "Linked Job",
                    "Uploaded",
                    "Open",
                    "Actions",
                  ].map((heading) => (
                    <th
                      key={heading}
                      style={{
                        textAlign: "left",
                        padding: "14px 16px",
                        fontSize: 12,
                        fontWeight: 800,
                        color: palette.muted,
                        textTransform: "uppercase",
                        letterSpacing: 0.4,
                        borderBottom: `1px solid ${palette.border}`,
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedDocuments.map((row, index) => {
                  const linkedJob = row?.jobId
                    ? safeJobs.find((job) => String(job?.id) === String(row.jobId))
                    : null;

                  return (
                    <tr key={row?.id || index}>
                      <td style={{ padding: "14px 16px", borderBottom: `1px solid ${palette.border}`, color: palette.text, fontWeight: 600 }}>
                        {row?.name || `Document #${row?.id || index + 1}`}
                      </td>
                      <td style={{ padding: "14px 16px", borderBottom: `1px solid ${palette.border}`, color: palette.text }}>
                        {row?.jobId ? (
                          <EntityLink
                            label={linkedJob?.title || `Job #${row.jobId}`}
                            targetPage="scheduling"
                            setActivePage={setActivePage}
                            icon="📋"
                            colour={palette.purple}
                          />
                        ) : (
                          <span style={{ color: palette.muted }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "14px 16px", borderBottom: `1px solid ${palette.border}`, color: palette.text }}>
                        {row?.uploadedAt ? formatDateAU(row.uploadedAt) : "—"}
                      </td>
                      <td style={{ padding: "14px 16px", borderBottom: `1px solid ${palette.border}` }}>
                        {(row?.filePath || row?.url) ? (
                          <button
                            style={{ ...buttonSecondary, color: palette.teal, borderColor: palette.teal }}
                            onClick={() => {
                              if (openDocumentFile) {
                                openDocumentFile(row);
                                return;
                              }
                              if (row?.url) {
                                window.open(row.url, "_blank", "noopener,noreferrer");
                              }
                            }}
                          >
                            View
                          </button>
                        ) : (
                          <span style={{ color: palette.muted }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "14px 16px", borderBottom: `1px solid ${palette.border}` }}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button style={buttonSecondary} onClick={() => openDocumentEditor(row)}>Edit</button>
                          <button style={buttonSecondary} onClick={() => deleteDocument(row?.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            style={{
              ...cardBase,
              padding: 28,
              textAlign: "center",
              display: "grid",
              gap: 8,
              background: palette.surface,
            }}
          >
            <div style={{ fontSize: 40 }}>📁</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: palette.text }}>No documents yet</div>
            <div style={{ fontSize: 14, color: palette.muted, lineHeight: 1.7 }}>
              Upload receipts, contracts and generated PDFs here.
            </div>
          </div>
        )}

        {documentEditorOpen && documentEditorForm && (
          <div style={{ ...cardBase, padding: 20, display: "grid", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: palette.text }}>View / Edit Document</div>
              <button style={buttonSecondary} onClick={closeDocumentEditor}>Close</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
              <div>
                <label style={labelStyle}>Document name</label>
                <input
                  style={inputStyle}
                  value={documentEditorForm.name || ""}
                  onChange={(event) => setDocumentEditorForm((prev) => ({ ...prev, name: event.target.value }))}
                />
              </div>
              <div>
                <label style={labelStyle}>{documentEditorForm.filePath ? "Stored file path" : "URL"}</label>
                <input
                  style={inputStyle}
                  value={documentEditorForm.filePath || documentEditorForm.url || ""}
                  onChange={(event) => {
                    if (!documentEditorForm.filePath) {
                      setDocumentEditorForm((prev) => ({ ...prev, url: event.target.value }));
                    }
                  }}
                  readOnly={Boolean(documentEditorForm.filePath)}
                />
              </div>
              <div>
                <label style={labelStyle}>Link to Job (optional)</label>
                <select
                  style={inputStyle}
                  value={documentEditorForm.jobId || ""}
                  onChange={(event) => setDocumentEditorForm((prev) => ({ ...prev, jobId: event.target.value }))}
                >
                  <option value="">— none —</option>
                  {safeJobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title || `Job #${job.id}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, flexWrap: "wrap" }}>
              <button style={buttonSecondary} onClick={closeDocumentEditor}>Cancel</button>
              <button
                style={{ ...buttonPrimary, opacity: savingDocumentEdits ? 0.7 : 1 }}
                onClick={saveDocumentEdits}
                disabled={savingDocumentEdits}
              >
                {savingDocumentEdits ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DocumentsPage(props) {
  return (
    <DocumentsPageErrorBoundary colours={props.colours}>
      <DocumentsPageInner {...props} />
    </DocumentsPageErrorBoundary>
  );
}
