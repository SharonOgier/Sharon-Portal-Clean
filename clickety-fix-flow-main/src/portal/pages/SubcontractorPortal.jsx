import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../client";

const safe = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const currency = (v) => `$${safe(v).toFixed(2)}`;
const formatDate = (d) => {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-AU"); } catch { return d; }
};

const COST_TYPES = [
  { value: "labour", label: "Labour" },
  { value: "materials", label: "Materials" },
  { value: "other", label: "Other" },
];

export default function SubcontractorPortal({ authUser, onSignOut }) {
  const [assignments, setAssignments] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [costForm, setCostForm] = useState({
    cost_type: "labour",
    description: "",
    amount: "",
    hours: "",
    rate: "",
    notes: "",
  });

  // Load assignments and submissions
  useEffect(() => {
    if (!authUser?.id) return;
    loadData();
  }, [authUser]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Get assignments
      const { data: assignData } = await supabase
        .from("sas_subcontractor_assignments")
        .select("*")
        .eq("subcontractor_user_id", authUser.id)
        .eq("status", "active");

      setAssignments(assignData || []);

      // Get jobs data for each assignment
      if (assignData?.length) {
        const ownerIds = [...new Set(assignData.map(a => a.job_owner_user_id))];
        const jobIds = assignData.map(a => a.job_id);
        
        // Fetch jobs from all owners
        const allJobs = [];
        for (const ownerId of ownerIds) {
          const { data: jobsData } = await supabase
            .from("sas_jobs")
            .select("*")
            .eq("user_id", ownerId);
          if (jobsData) allJobs.push(...jobsData);
        }
        
        // Filter to only assigned jobs and strip financial data
        const SAFE_FIELDS = [
          "id", "title", "name", "client", "clientId", "location", "siteAddress",
          "startDate", "endDate", "startTime", "endTime", "status", "priority",
          "description", "notes", "colour", "photos", "assignedStaff",
        ];
        const assignedJobs = allJobs
          .map(j => {
            const data = j.data || {};
            const safe = {};
            for (const k of SAFE_FIELDS) {
              if (data[k] !== undefined) safe[k] = data[k];
            }
            safe._dbId = j.id;
            safe._userId = j.user_id;
            return safe;
          })
          .filter(j => jobIds.includes(String(j.id || j._dbId)));

        setJobs(assignedJobs);
      }

      // Get my submissions
      const { data: costData } = await supabase
        .from("sas_subcontractor_costs")
        .select("*")
        .eq("subcontractor_user_id", authUser.id)
        .order("created_at", { ascending: false });
      
      setSubmissions(costData || []);
    } catch (err) {
      console.error("Failed to load subcontractor data:", err);
    }
    setLoading(false);
  };

  const selectedJobData = useMemo(() => {
    if (!selectedJob) return null;
    return jobs.find(j => String(j.id || j._dbId) === String(selectedJob));
  }, [selectedJob, jobs]);

  const selectedAssignment = useMemo(() => {
    if (!selectedJob) return null;
    return assignments.find(a => a.job_id === String(selectedJob));
  }, [selectedJob, assignments]);

  const jobSubmissions = useMemo(() => {
    if (!selectedJob) return [];
    return submissions.filter(s => s.job_id === String(selectedJob));
  }, [selectedJob, submissions]);

  const handleSubmitCost = async () => {
    if (!selectedAssignment || !costForm.description.trim()) return;
    
    const amount = costForm.cost_type === "labour" 
      ? safe(costForm.hours) * safe(costForm.rate) 
      : safe(costForm.amount);

    if (amount <= 0) return;

    setSubmitting(true);
    try {
      // Upload receipt if present
      let receiptUrl = null;
      if (receiptFile) {
        setUploadingReceipt(true);
        const ext = receiptFile.name.split(".").pop();
        const path = `${authUser.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("subcontractor-receipts")
          .upload(path, receiptFile);
        if (!uploadErr) {
          const { data: urlData } = supabase.storage
            .from("subcontractor-receipts")
            .getPublicUrl(path);
          receiptUrl = urlData?.publicUrl || path;
        }
        setUploadingReceipt(false);
      }

      const { error } = await supabase
        .from("sas_subcontractor_costs")
        .insert({
          subcontractor_user_id: authUser.id,
          job_owner_user_id: selectedAssignment.job_owner_user_id,
          job_id: String(selectedJob),
          cost_type: costForm.cost_type,
          description: costForm.description.trim(),
          amount,
          hours: costForm.cost_type === "labour" ? safe(costForm.hours) : null,
          rate: costForm.cost_type === "labour" ? safe(costForm.rate) : null,
          receipt_url: receiptUrl,
          notes: costForm.notes.trim() || null,
        });

      if (error) throw error;

      setCostForm({ cost_type: "labour", description: "", amount: "", hours: "", rate: "", notes: "" });
      setReceiptFile(null);
      setShowSubmitForm(false);
      await loadData();
    } catch (err) {
      alert(err.message || "Failed to submit cost");
    }
    setSubmitting(false);
  };

  const totalSubmitted = useMemo(() => 
    submissions.reduce((sum, s) => sum + safe(s.amount), 0), [submissions]);
  const totalPending = useMemo(() => 
    submissions.filter(s => s.status === "pending").reduce((sum, s) => sum + safe(s.amount), 0), [submissions]);
  const totalApproved = useMemo(() => 
    submissions.filter(s => s.status === "approved").reduce((sum, s) => sum + safe(s.amount), 0), [submissions]);

  const colours = {
    purple: "#6A1B9A", navy: "#14202B", teal: "#009688", text: "#14202B",
    muted: "#64748B", bg: "#F8FAFC", border: "#E2E8F0", white: "#fff",
    lightPurple: "#F3E5F5",
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: colours.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔧</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: colours.text }}>Loading your portal...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: colours.bg, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @media (max-width: 768px) {
          .subcon-grid { grid-template-columns: 1fr !important; }
          .subcon-job-detail-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      {/* Header */}
      <div style={{ background: colours.white, borderBottom: `1px solid ${colours.border}`, padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 24 }}>🔧</span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: colours.purple }}>Subcontractor Portal</div>
            <div style={{ fontSize: 12, color: colours.muted }}>{authUser.email}</div>
          </div>
        </div>
        <button onClick={onSignOut} style={{ background: "#F1F5F9", color: "#475569", border: "none", borderRadius: 10, padding: "8px 16px", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
          Log out
        </button>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
        {/* Summary Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 24 }}>
          <div style={{ background: colours.white, borderRadius: 16, padding: 20, border: `1px solid ${colours.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: colours.muted, textTransform: "uppercase" }}>Active Jobs</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: colours.purple }}>{assignments.length}</div>
          </div>
          <div style={{ background: colours.white, borderRadius: 16, padding: 20, border: `1px solid ${colours.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: colours.muted, textTransform: "uppercase" }}>Total Submitted</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#1565C0" }}>{currency(totalSubmitted)}</div>
          </div>
          <div style={{ background: colours.white, borderRadius: 16, padding: 20, border: `1px solid ${colours.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: colours.muted, textTransform: "uppercase" }}>Pending Review</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#E65100" }}>{currency(totalPending)}</div>
          </div>
          <div style={{ background: colours.white, borderRadius: 16, padding: 20, border: `1px solid ${colours.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: colours.muted, textTransform: "uppercase" }}>Approved</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#2E7D32" }}>{currency(totalApproved)}</div>
          </div>
        </div>

        {assignments.length === 0 ? (
          <div style={{ background: colours.white, borderRadius: 20, padding: 48, textAlign: "center", border: `1px solid ${colours.border}` }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: colours.text, marginBottom: 8 }}>No jobs assigned yet</div>
            <div style={{ fontSize: 14, color: colours.muted, lineHeight: 1.7 }}>
              You'll see your assigned jobs here once a business owner adds you to a project.
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: selectedJob ? "300px 1fr" : "1fr", gap: 20 }} className="subcon-grid">
            {/* Jobs List */}
            <div style={{ display: "grid", gap: 8, alignContent: "start" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: colours.text, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                Your Assigned Jobs
              </div>
              {jobs.map(job => {
                const jobId = String(job.id || job._dbId);
                const isSelected = String(selectedJob) === jobId;
                const jobSubs = submissions.filter(s => s.job_id === jobId);
                const pendingCount = jobSubs.filter(s => s.status === "pending").length;
                return (
                  <button key={jobId} onClick={() => setSelectedJob(jobId)} style={{
                    background: isSelected ? colours.lightPurple : colours.white,
                    border: `1px solid ${isSelected ? colours.purple : colours.border}`,
                    borderRadius: 14, padding: 14, cursor: "pointer", textAlign: "left", display: "grid", gap: 4,
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: colours.text }}>{job.title || job.name || `Job #${jobId}`}</div>
                    <div style={{ fontSize: 12, color: colours.muted }}>{job.client || "No client"}</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: job.status === "completed" ? "#E8F5E9" : "#E3F2FD", color: job.status === "completed" ? "#2E7D32" : "#1565C0" }}>
                        {job.status || "Active"}
                      </span>
                      {pendingCount > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "#FFF3E0", color: "#E65100" }}>
                          {pendingCount} pending
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Job Detail */}
            {selectedJob && selectedJobData && (
              <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
                {/* Job Info */}
                <div style={{ background: colours.white, borderRadius: 16, padding: 20, border: `1px solid ${colours.border}` }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: colours.text, marginBottom: 8 }}>
                    {selectedJobData.title || selectedJobData.name || `Job #${selectedJob}`}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13 }} className="subcon-job-detail-grid">
                    {selectedJobData.client && (
                      <div><span style={{ fontWeight: 700, color: colours.muted }}>Client:</span> <span style={{ color: colours.text }}>{selectedJobData.client}</span></div>
                    )}
                    {(selectedJobData.location || selectedJobData.siteAddress) && (
                      <div><span style={{ fontWeight: 700, color: colours.muted }}>Site Address:</span> <span style={{ color: colours.text }}>{selectedJobData.siteAddress || selectedJobData.location}</span></div>
                    )}
                    {selectedJobData.startDate && (
                      <div><span style={{ fontWeight: 700, color: colours.muted }}>Start:</span> <span style={{ color: colours.text }}>{formatDate(selectedJobData.startDate)}</span></div>
                    )}
                    {selectedJobData.endDate && (
                      <div><span style={{ fontWeight: 700, color: colours.muted }}>End:</span> <span style={{ color: colours.text }}>{formatDate(selectedJobData.endDate)}</span></div>
                    )}
                    {selectedJobData.status && (
                      <div><span style={{ fontWeight: 700, color: colours.muted }}>Status:</span> <span style={{ color: colours.text }}>{selectedJobData.status}</span></div>
                    )}
                    {selectedJobData.priority && (
                      <div><span style={{ fontWeight: 700, color: colours.muted }}>Priority:</span> <span style={{ color: colours.text }}>{selectedJobData.priority}</span></div>
                    )}
                  </div>
                  {selectedJobData.notes && (
                    <div style={{ fontSize: 13, color: colours.text, lineHeight: 1.6, marginTop: 12, padding: 12, background: "#FFFDE7", borderRadius: 10, border: "1px solid #FFF9C4", whiteSpace: "pre-wrap" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: colours.muted, marginBottom: 4 }}>📝 Notes</div>
                      {selectedJobData.notes}
                    </div>
                  )}
                  {selectedJobData.description && (
                    <div style={{ fontSize: 13, color: colours.muted, lineHeight: 1.6, marginTop: 8, padding: 12, background: colours.bg, borderRadius: 10 }}>
                      {selectedJobData.description}
                    </div>
                  )}
                  {/* Job Photos */}
                  {selectedJobData.photos?.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: colours.muted, marginBottom: 8 }}>📸 Job Photos</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {selectedJobData.photos.map((photo, pi) => (
                          <a key={pi} href={photo.url || photo} target="_blank" rel="noopener noreferrer">
                            <img
                              src={photo.url || photo}
                              alt={photo.caption || `Photo ${pi + 1}`}
                              style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, border: `1px solid ${colours.border}` }}
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Payment Status */}
                {selectedAssignment && (
                  <div style={{ background: colours.white, borderRadius: 16, padding: 16, border: `1px solid ${colours.border}` }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: colours.muted, textTransform: "uppercase", marginBottom: 10 }}>💳 Your Payment Status</div>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      {(() => {
                        const myTotal = jobSubmissions.reduce((s, c) => s + safe(c.amount), 0);
                        const approvedTotal = jobSubmissions.filter(c => c.status === "approved").reduce((s, c) => s + safe(c.amount), 0);
                        return (
                          <>
                            <div style={{ textAlign: "center", flex: 1 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: colours.muted }}>Submitted</div>
                              <div style={{ fontSize: 18, fontWeight: 900, color: "#1565C0" }}>{currency(myTotal)}</div>
                            </div>
                            <div style={{ textAlign: "center", flex: 1 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: colours.muted }}>Approved</div>
                              <div style={{ fontSize: 18, fontWeight: 900, color: "#2E7D32" }}>{currency(approvedTotal)}</div>
                            </div>
                            <div style={{ textAlign: "center", flex: 1 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: colours.muted }}>Pending</div>
                              <div style={{ fontSize: 18, fontWeight: 900, color: "#E65100" }}>{currency(myTotal - approvedTotal)}</div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Submit Cost Button */}
                <button onClick={() => setShowSubmitForm(true)} style={{
                  background: colours.purple, color: "#fff", border: "none", borderRadius: 12,
                  padding: "12px 24px", fontWeight: 800, fontSize: 14, cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(106,27,154,0.2)",
                }}>
                  + Submit Cost for This Job
                </button>

                {/* Submit Form */}
                {showSubmitForm && (
                  <div style={{ background: colours.white, borderRadius: 16, padding: 20, border: `2px solid ${colours.purple}` }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: colours.text, marginBottom: 14 }}>Submit a Cost</div>
                    <div style={{ display: "grid", gap: 12 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: colours.muted, marginBottom: 4 }}>Cost Type</label>
                        <select value={costForm.cost_type} onChange={e => setCostForm(p => ({ ...p, cost_type: e.target.value }))}
                          style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${colours.border}`, fontSize: 13 }}>
                          {COST_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: colours.muted, marginBottom: 4 }}>Description *</label>
                        <input value={costForm.description} onChange={e => setCostForm(p => ({ ...p, description: e.target.value }))}
                          placeholder="e.g. Plumbing work - bathroom renovation"
                          style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${colours.border}`, fontSize: 13 }} />
                      </div>
                      {costForm.cost_type === "labour" ? (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                          <div>
                            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: colours.muted, marginBottom: 4 }}>Hours</label>
                            <input type="number" min="0" step="0.5" value={costForm.hours}
                              onChange={e => setCostForm(p => ({ ...p, hours: e.target.value }))}
                              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${colours.border}`, fontSize: 13 }} />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: colours.muted, marginBottom: 4 }}>Rate $/hr</label>
                            <input type="number" min="0" step="0.01" value={costForm.rate}
                              onChange={e => setCostForm(p => ({ ...p, rate: e.target.value }))}
                              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${colours.border}`, fontSize: 13 }} />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: colours.muted, marginBottom: 4 }}>Total</label>
                            <div style={{ padding: "10px 12px", borderRadius: 10, background: colours.bg, fontWeight: 700, fontSize: 14, color: colours.purple }}>
                              {currency(safe(costForm.hours) * safe(costForm.rate))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: colours.muted, marginBottom: 4 }}>Amount $</label>
                          <input type="number" min="0" step="0.01" value={costForm.amount}
                            onChange={e => setCostForm(p => ({ ...p, amount: e.target.value }))}
                            style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${colours.border}`, fontSize: 13 }} />
                        </div>
                      )}
                      <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: colours.muted, marginBottom: 4 }}>Receipt / Invoice (optional)</label>
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={e => setReceiptFile(e.target.files?.[0] || null)}
                          style={{ fontSize: 13 }} />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: colours.muted, marginBottom: 4 }}>Notes (optional)</label>
                        <textarea value={costForm.notes} onChange={e => setCostForm(p => ({ ...p, notes: e.target.value }))}
                          placeholder="Any additional details..."
                          style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${colours.border}`, fontSize: 13, minHeight: 60, resize: "vertical" }} />
                      </div>
                      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                        <button onClick={() => { setShowSubmitForm(false); setReceiptFile(null); }}
                          style={{ background: "#F1F5F9", color: "#475569", border: "none", borderRadius: 10, padding: "10px 18px", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                          Cancel
                        </button>
                        <button onClick={handleSubmitCost} disabled={submitting}
                          style={{ background: colours.purple, color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                          {submitting ? (uploadingReceipt ? "Uploading..." : "Submitting...") : "Submit Cost"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Submissions History */}
                {jobSubmissions.length > 0 && (
                  <div style={{ background: colours.white, borderRadius: 16, padding: 20, border: `1px solid ${colours.border}` }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: colours.muted, textTransform: "uppercase", marginBottom: 12 }}>📋 Your Submissions</div>
                    <div style={{ display: "grid", gap: 8 }}>
                      {jobSubmissions.map(s => (
                        <div key={s.id} style={{ padding: 12, borderRadius: 10, background: colours.bg, display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, alignItems: "center" }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: colours.text }}>{s.description}</div>
                            <div style={{ fontSize: 11, color: colours.muted, marginTop: 2 }}>
                              {s.cost_type} • {formatDate(s.submitted_at)}
                              {s.hours ? ` • ${s.hours}h @ $${safe(s.rate).toFixed(2)}/hr` : ""}
                            </div>
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: colours.text }}>{currency(s.amount)}</div>
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 6,
                            background: s.status === "approved" ? "#E8F5E9" : s.status === "rejected" ? "#FFEBEE" : "#FFF3E0",
                            color: s.status === "approved" ? "#2E7D32" : s.status === "rejected" ? "#C62828" : "#E65100",
                          }}>
                            {s.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
