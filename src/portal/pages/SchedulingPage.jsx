import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useTerminology } from "../TerminologyContext";
import JobCostingPanel, { computeJobFinancials } from "./JobCostingPanel";
import { writeJobSheetPreviewToWindow, writeCertificatePreviewToWindow, buildCertificateHtml } from "../PortalDocumentBuilders";
import { supabase } from "@/integrations/supabase/client";

/* ─── helpers ──────────────────────────────────────────────────────────── */
const VIEWS = ["month", "week", "day", "list"];
const STATUS_OPTIONS = ["Scheduled", "In Progress", "Completed", "Cancelled"];
const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Urgent"];
const COLOUR_OPTIONS = [
  { label: "Purple", value: "#6A1B9A" },
  { label: "Teal",   value: "#006D6D" },
  { label: "Blue",   value: "#1E88E5" },
  { label: "Orange", value: "#E65100" },
  { label: "Green",  value: "#2E7D32" },
  { label: "Red",    value: "#C62828" },
];

const pad = (n) => String(n).padStart(2, "0");
const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const fmtDateAU = (iso) => { if (!iso) return "—"; const p = iso.split("-"); return `${p[2]}/${p[1]}/${p[0]}`; };
const fmtTime = (t) => { if (!t) return ""; const [h,m] = t.split(":"); const hh = +h; return `${hh > 12 ? hh-12 : hh || 12}:${m} ${hh >= 12 ? "pm" : "am"}`; };

const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay(); // 0=Sun

const getWeekDates = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Mon start
  const mon = new Date(d.setDate(diff));
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(mon);
    dd.setDate(mon.getDate() + i);
    return dd;
  });
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS_SHORT = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const REMINDER_RECURRENCE_OPTIONS = ["Monthly", "Quarterly", "Every 6 months", "Annually", "Custom"];

const recurrenceMonths = (interval, customMonths = 1) => {
  const key = String(interval || "").toLowerCase();
  if (key === "monthly") return 1;
  if (key === "quarterly") return 3;
  if (key === "every 6 months") return 6;
  if (key === "annually") return 12;
  if (key === "custom") return Math.max(1, Number(customMonths || 1));
  return 1;
};

/* ─── status badge ────────────────────────────────────────────────────── */
const StatusBadge = ({ status, colours }) => {
  const map = {
    Scheduled: { bg: "#E3F2FD", color: "#1565C0" },
    "In Progress": { bg: "#FFF3E0", color: "#E65100" },
    Completed: { bg: "#E8F5E9", color: "#2E7D32" },
    Cancelled: { bg: "#FFEBEE", color: "#C62828" },
  };
  const s = map[status] || { bg: colours.lightPurple, color: colours.purple };
  return <span style={{ padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>{status}</span>;
};

const PriorityBadge = ({ priority }) => {
  const map = { Low: "#64748B", Medium: "#1E88E5", High: "#E65100", Urgent: "#C62828" };
  return <span style={{ fontSize: 11, fontWeight: 700, color: map[priority] || "#64748B" }}>● {priority}</span>;
};

/* ─── Job Photos Panel ─────────────────────────────────────────────────── */
function JobPhotosPanel({ job, onUpdate, colours, buttonPrimary, buttonSecondary, authUser }) {
  const { t } = useTerminology();
  const [uploading, setUploading] = useState(false);
  const [viewImg, setViewImg] = useState(null);
  const beforeRef = useRef(null);
  const afterRef = useRef(null);

  const photos = job.photos || { before: [], after: [] };
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

  const getPublicUrl = (path) => `${SUPABASE_URL}/storage/v1/object/public/job-photos/${path}`;

  const uploadPhotos = async (files, type) => {
    if (!authUser?.id || !files.length) return;
    setUploading(true);
    try {
      const newPhotos = [];
      for (const file of files) {
        const ext = file.name.split(".").pop() || "jpg";
        const fileName = `${authUser.id}/${job.id}/${type}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from("job-photos").upload(fileName, file, { upsert: false });
        if (error) { console.error("Upload error:", error); continue; }
        newPhotos.push({ path: fileName, url: getPublicUrl(fileName), uploadedAt: new Date().toISOString(), name: file.name });
      }
      if (newPhotos.length > 0) {
        const updated = {
          ...job,
          photos: {
            before: type === "before" ? [...(photos.before || []), ...newPhotos] : (photos.before || []),
            after: type === "after" ? [...(photos.after || []), ...newPhotos] : (photos.after || []),
          },
        };
        await onUpdate(updated);
      }
    } catch (err) { console.error("Upload failed:", err); }
    setUploading(false);
  };

  const deletePhoto = async (type, index) => {
    const photo = photos[type]?.[index];
    if (!photo) return;
    try {
      await supabase.storage.from("job-photos").remove([photo.path]);
    } catch (_) {}
    const updated = {
      ...job,
      photos: {
        ...photos,
        [type]: photos[type].filter((_, i) => i !== index),
      },
    };
    await onUpdate(updated);
  };

  const PhotoGrid = ({ items, type }) => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10, marginTop: 8 }}>
      {(items || []).map((p, i) => (
        <div key={i} style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "1px solid #E2E8F0", aspectRatio: "1", cursor: "pointer" }}>
          <img src={p.url} alt={`${type} photo ${i + 1}`}
            onClick={() => setViewImg(p.url)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <button onClick={(e) => { e.stopPropagation(); deletePhoto(type, i); }}
            style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: 99, width: 22, height: 22, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
      ))}
    </div>
  );

  const UploadButton = ({ type, inputRef }) => (
    <>
      <input ref={inputRef} type="file" accept="image/*" multiple capture="environment" style={{ display: "none" }}
        onChange={(e) => { if (e.target.files?.length) uploadPhotos(Array.from(e.target.files), type); e.target.value = ""; }} />
      <button style={{ ...buttonSecondary, fontSize: 13 }} onClick={() => inputRef.current?.click()} disabled={uploading}>
        {uploading ? "Uploading…" : `📷 Add ${type === "before" ? "Before" : "After"} Photos`}
      </button>
    </>
  );

  return (
    <div>
      <p style={{ fontSize: 13, color: colours.muted, marginBottom: 16 }}>
        Take before & after photos on {t("site").toLowerCase()}. They'll be auto-attached to this {t("job").toLowerCase()} and included in completion reports.
      </p>

      {/* Before Photos */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: colours.text, margin: 0 }}>📷 Before Photos <span style={{ fontSize: 12, fontWeight: 500, color: colours.muted }}>({(photos.before || []).length})</span></h3>
          <UploadButton type="before" inputRef={beforeRef} />
        </div>
        {(photos.before || []).length > 0 ? <PhotoGrid items={photos.before} type="before" /> :
          <div style={{ background: "#F8FAFC", border: "2px dashed #E2E8F0", borderRadius: 12, padding: 24, textAlign: "center", marginTop: 8, color: colours.muted, fontSize: 13, cursor: "pointer" }}
            onClick={() => beforeRef.current?.click()}>
            Tap to add before photos
          </div>
        }
      </div>

      {/* After Photos */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: colours.text, margin: 0 }}>✅ After Photos <span style={{ fontSize: 12, fontWeight: 500, color: colours.muted }}>({(photos.after || []).length})</span></h3>
          <UploadButton type="after" inputRef={afterRef} />
        </div>
        {(photos.after || []).length > 0 ? <PhotoGrid items={photos.after} type="after" /> :
          <div style={{ background: "#F8FAFC", border: "2px dashed #E2E8F0", borderRadius: 12, padding: 24, textAlign: "center", marginTop: 8, color: colours.muted, fontSize: 13, cursor: "pointer" }}
            onClick={() => afterRef.current?.click()}>
            Tap to add after photos
          </div>
        }
      </div>

      {/* Lightbox */}
      {viewImg && (
        <div onClick={() => setViewImg(null)} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}>
          <img src={viewImg} alt="Full size" style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 8, objectFit: "contain" }} />
        </div>
      )}
    </div>
  );
}


/* ─── Signature Pad ────────────────────────────────────────────────────── */
function SignaturePad({ onSave, existingSignature, colours, buttonPrimary, buttonSecondary }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (existingSignature) {
      const img = new Image();
      img.onload = () => { ctx.drawImage(img, 0, 0, canvas.width, canvas.height); };
      img.src = existingSignature;
    }
  }, [existingSignature]);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#000";
    setDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const endDraw = () => setDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const saveSignature = () => {
    if (!hasDrawn && !existingSignature) return;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    onSave(dataUrl);
  };

  return (
    <div>
      <div style={{ border: `2px solid ${colours.border}`, borderRadius: 12, overflow: "hidden", background: "#fff", touchAction: "none" }}>
        <canvas
          ref={canvasRef}
          width={500}
          height={200}
          style={{ width: "100%", height: 160, cursor: "crosshair", display: "block" }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button style={{ ...buttonSecondary, fontSize: 12, padding: "6px 14px" }} onClick={clearCanvas}>Clear</button>
        <button style={{ ...buttonPrimary, fontSize: 12, padding: "6px 14px", opacity: (hasDrawn || existingSignature) ? 1 : 0.5 }}
          onClick={saveSignature} disabled={!hasDrawn && !existingSignature}>
          ✓ Save Signature
        </button>
      </div>
    </div>
  );
}

/* ─── Certificate of Completion Panel ──────────────────────────────────── */
function CertificatePanel({ job, onUpdate, colours, buttonPrimary, buttonSecondary, inputStyle, labelStyle, profile, clients, properties, authUser }) {
  const { t } = useTerminology();
  const cert = job.certificate || {};
  const [certNotes, setCertNotes] = useState(cert.notes || "");
  const [signedByName, setSignedByName] = useState(cert.signedByName || "");
  const [saving, setSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const hasCert = !!cert.signatureDataUrl;
  const certNumber = cert.certNumber || `COC-${String(job.id).slice(-6)}`;

  const handleSignatureSave = async (dataUrl) => {
    setSaving(true);
    try {
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
      const updated = {
        ...job,
        certificate: {
          ...cert,
          signatureDataUrl: dataUrl,
          signedByName: signedByName || cert.signedByName || "",
          signedDate: dateStr,
          completionDate: cert.completionDate || job.endDate || job.startDate || dateStr,
          notes: certNotes,
          certNumber,
          generatedAt: now.toISOString(),
        },
      };
      await onUpdate(updated);
    } catch (err) {
      console.error("Save signature error:", err);
      alert("Failed to save signature. Please try again.");
    }
    setSaving(false);
  };

  const handleSaveNotes = async () => {
    setSaving(true);
    const updated = {
      ...job,
      certificate: {
        ...cert,
        notes: certNotes,
        signedByName: signedByName || cert.signedByName || "",
        certNumber,
      },
    };
    await onUpdate(updated);
    setSaving(false);
  };

  const handlePreview = () => {
    const w = window.open("", "_blank");
    if (w) writeCertificatePreviewToWindow(w, { ...job, certificate: { ...cert, notes: certNotes, signedByName: signedByName || cert.signedByName, certNumber } }, { profile, clients, properties });
  };

  const handleSavePdf = async () => {
    setGeneratingPdf(true);
    try {
      const html = buildCertificateHtml(
        { ...job, certificate: { ...cert, notes: certNotes, signedByName: signedByName || cert.signedByName, certNumber } },
        { profile, clients, properties }
      );
      // Use html2pdf to generate
      const { default: html2pdf } = await import("html2pdf.js");
      const container = document.createElement("div");
      container.innerHTML = html;
      // Remove toolbar
      const toolbar = container.querySelector(".print-toolbar");
      if (toolbar) toolbar.remove();
      document.body.appendChild(container);
      const pdfBlob = await html2pdf()
        .set({
          margin: 0,
          filename: `Certificate-${certNumber}.pdf`,
          image: { type: "jpeg", quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(container.querySelector(".cert-border") || container)
        .outputPdf("blob");
      document.body.removeChild(container);

      // Upload to storage
      if (authUser?.id) {
        const path = `${authUser.id}/${job.id}/certificate-${certNumber}.pdf`;
        const { error: uploadError } = await supabase.storage.from("job-photos").upload(path, pdfBlob, { upsert: true, contentType: "application/pdf" });
        if (uploadError) console.error("Upload error:", uploadError);
        else {
          const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
          const pdfUrl = `${SUPABASE_URL}/storage/v1/object/public/job-photos/${path}`;
          const updated = {
            ...job,
            certificate: { ...job.certificate, pdfUrl, pdfPath: path, notes: certNotes, signedByName: signedByName || cert.signedByName, certNumber },
          };
          await onUpdate(updated);
          alert("✅ Certificate PDF saved to job permanently!");
        }
      }

      // Also trigger download
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Certificate-${certNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("Failed to generate PDF. Please try again.");
    }
    setGeneratingPdf(false);
  };

  return (
    <div>
      <p style={{ fontSize: 13, color: colours.muted, marginBottom: 16 }}>
        Generate a Certificate of Completion for legal protection. Get the {t("customer").toLowerCase()} to sign on screen, then save as PDF to the {t("job").toLowerCase()} record.
      </p>

      {/* Status */}
      {hasCert ? (
        <div style={{ background: "#E8F5E9", border: "1px solid #A5D6A7", borderRadius: 12, padding: 14, marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>✅</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#2E7D32" }}>Certificate Signed</div>
            <div style={{ fontSize: 12, color: "#388E3C" }}>
              Signed by {cert.signedByName || "Customer"} on {cert.signedDate || "—"}
              {cert.pdfUrl && <span> • <a href={cert.pdfUrl} target="_blank" rel="noreferrer" style={{ color: "#1565C0" }}>View PDF</a></span>}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ background: "#FFF3E0", border: "1px solid #FFE0B2", borderRadius: 12, padding: 14, marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#E65100" }}>Not Yet Signed</div>
            <div style={{ fontSize: 12, color: "#EF6C00" }}>Get the customer to sign below to complete the certificate.</div>
          </div>
        </div>
      )}

      {/* Certificate number */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: colours.muted }}>Certificate No.</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: colours.purple }}>{certNumber}</div>
      </div>

      {/* Signed by name */}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>{t("customer")} Name (Print)</label>
        <input style={inputStyle} value={signedByName} onChange={e => setSignedByName(e.target.value)} placeholder={`${t("customer")}'s full name`} />
      </div>

      {/* Notes */}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Completion Notes</label>
        <textarea style={{ ...inputStyle, minHeight: 60 }} value={certNotes} onChange={e => setCertNotes(e.target.value)}
          placeholder="e.g. All work completed as quoted. Minor touch-up scheduled for next week." />
      </div>

      <button style={{ ...buttonSecondary, fontSize: 12, padding: "6px 14px", marginBottom: 16 }}
        onClick={handleSaveNotes} disabled={saving}>
        {saving ? "Saving…" : "💾 Save Details"}
      </button>

      {/* Signature */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ ...labelStyle, marginBottom: 8 }}>{t("customer")} Signature</label>
        <SignaturePad
          onSave={handleSignatureSave}
          existingSignature={cert.signatureDataUrl}
          colours={colours}
          buttonPrimary={buttonPrimary}
          buttonSecondary={buttonSecondary}
        />
        {saving && <div style={{ fontSize: 12, color: colours.muted, marginTop: 4 }}>Saving…</div>}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button style={{ ...buttonSecondary, color: "#6A1B9A", borderColor: "#6A1B9A" }} onClick={handlePreview}>
          👁️ Preview Certificate
        </button>
        <button style={{ ...buttonPrimary, opacity: generatingPdf ? 0.6 : 1 }} onClick={handleSavePdf} disabled={generatingPdf}>
          {generatingPdf ? "Generating…" : `📄 Save PDF to ${t("job")}`}
        </button>
      </div>
    </div>
  );
}

/* ─── Job Notes & Tasks Panel ──────────────────────────────────────────── */
function JobNotesTasksPanel({ job, onUpdate, colours, buttonPrimary, buttonSecondary, inputStyle, labelStyle }) {
  const { t } = useTerminology();
  const internalNotes = job.internalNotes || [];
  const checklist = job.checklist || [];

  const [newNote, setNewNote] = useState("");
  const [newTask, setNewTask] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async (updates) => {
    setSaving(true);
    await onUpdate({ ...job, ...updates });
    setSaving(false);
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    const note = { id: Date.now(), text: newNote.trim(), createdAt: new Date().toISOString(), author: "Staff" };
    await save({ internalNotes: [...internalNotes, note] });
    setNewNote("");
  };

  const deleteNote = async (id) => {
    await save({ internalNotes: internalNotes.filter(n => n.id !== id) });
  };

  const addTask = async () => {
    if (!newTask.trim()) return;
    const task = { id: Date.now(), text: newTask.trim(), done: false, createdAt: new Date().toISOString(), completedAt: null, completedBy: null };
    await save({ checklist: [...checklist, task] });
    setNewTask("");
  };

  const toggleTask = async (id) => {
    const updated = checklist.map(t =>
      t.id === id ? { ...t, done: !t.done, completedAt: !t.done ? new Date().toISOString() : null, completedBy: !t.done ? "Staff" : null } : t
    );
    await save({ checklist: updated });
  };

  const deleteTask = async (id) => {
    await save({ checklist: checklist.filter(t => t.id !== id) });
  };

  const completedCount = checklist.filter(t => t.done).length;
  const totalTasks = checklist.length;
  const progressPct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  const fmtTs = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,"0")}`;
  };

  return (
    <div>
      {/* ── Task Checklist ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: colours.text, margin: 0 }}>✅ {t("job")} Tasks</h3>
          {totalTasks > 0 && (
            <span style={{ fontSize: 12, fontWeight: 700, color: progressPct === 100 ? "#2E7D32" : colours.purple }}>
              {completedCount}/{totalTasks} ({progressPct}%)
            </span>
          )}
        </div>

        {totalTasks > 0 && (
          <div style={{ height: 6, background: "#F1F5F9", borderRadius: 99, marginBottom: 12, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progressPct}%`, background: progressPct === 100 ? "#2E7D32" : colours.purple, borderRadius: 99, transition: "width 0.3s ease" }} />
          </div>
        )}

        <div style={{ display: "grid", gap: 4 }}>
          {checklist.map(task => (
            <div key={task.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", background: task.done ? "#F0FDF4" : "#fff", border: `1px solid ${task.done ? "#BBF7D0" : colours.border}`, borderRadius: 10, transition: "all 0.2s" }}>
              <div onClick={() => toggleTask(task.id)}
                style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${task.done ? "#2E7D32" : colours.border}`, background: task.done ? "#2E7D32" : "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1, transition: "all 0.15s" }}>
                {task.done && <span style={{ color: "#fff", fontSize: 13, fontWeight: 900 }}>✓</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: task.done ? "#64748B" : colours.text, textDecoration: task.done ? "line-through" : "none" }}>{task.text}</div>
                {task.done && task.completedAt && (
                  <div style={{ fontSize: 11, color: "#2E7D32", marginTop: 2 }}>✓ Completed {fmtTs(task.completedAt)}{task.completedBy ? ` by ${task.completedBy}` : ""}</div>
                )}
              </div>
              <button onClick={() => deleteTask(task.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#CBD5E1", fontSize: 16, padding: "0 4px", flexShrink: 0 }} title="Delete task">✕</button>
            </div>
          ))}
        </div>

        {checklist.length === 0 && (
          <div style={{ background: "#F8FAFC", border: "2px dashed #E2E8F0", borderRadius: 12, padding: 20, textAlign: "center", color: colours.muted, fontSize: 13 }}>
            No tasks yet. Add tasks below for staff to tick off as they work.
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <input style={{ ...inputStyle, flex: 1 }} value={newTask} onChange={e => setNewTask(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") addTask(); }} placeholder="Add a task… e.g. Install new gate hinges" />
          <button style={{ ...buttonPrimary, whiteSpace: "nowrap" }} onClick={addTask} disabled={saving || !newTask.trim()}>+ Add</button>
        </div>
      </div>

      {/* ── Internal Notes ── */}
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: colours.text, margin: "0 0 12px" }}>🔒 Internal Notes</h3>
        <p style={{ fontSize: 12, color: colours.muted, marginBottom: 12, marginTop: 0 }}>Private notes only visible to staff — never shown to {t("customers").toLowerCase()}.</p>

        <div style={{ display: "grid", gap: 6, marginBottom: 12 }}>
          {internalNotes.map(note => (
            <div key={note.id} style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: "10px 14px", position: "relative" }}>
              <div style={{ fontSize: 14, color: colours.text, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{note.text}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                <div style={{ fontSize: 11, color: "#92400E" }}>
                  {note.author && <span style={{ fontWeight: 600 }}>{note.author} • </span>}{fmtTs(note.createdAt)}
                </div>
                <button onClick={() => deleteNote(note.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#D97706", fontSize: 13, padding: "0 4px" }} title="Delete note">✕</button>
              </div>
            </div>
          ))}
        </div>

        {internalNotes.length === 0 && (
          <div style={{ background: "#F8FAFC", border: "2px dashed #E2E8F0", borderRadius: 12, padding: 20, textAlign: "center", color: colours.muted, fontSize: 13, marginBottom: 12 }}>
            No internal notes yet.
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <textarea style={{ ...inputStyle, flex: 1, minHeight: 50 }} value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Add a private note…" />
          <button style={{ ...buttonPrimary, alignSelf: "flex-end", whiteSpace: "nowrap" }} onClick={addNote} disabled={saving || !newNote.trim()}>+ Add</button>
        </div>
      </div>
    </div>
  );
}


const RECURRENCE_OPTIONS = ["Never", "Weekly", "Fortnightly", "Monthly"];

const calcNextDate = (fromDate, freq) => {
  const d = new Date(fromDate + "T00:00:00");
  if (freq === "Weekly") d.setDate(d.getDate() + 7);
  else if (freq === "Fortnightly") d.setDate(d.getDate() + 14);
  else if (freq === "Monthly") d.setMonth(d.getMonth() + 1);
  else return null;
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
};

export default function SchedulingPage({
  jobs = [], clients = [], properties = [], recurringReminders = [], quotes = [], invoices = [], colours: c, cardStyle, buttonPrimary, buttonSecondary,
  inputStyle, labelStyle, DashboardHero, InsightChip, MetricCard, SectionCard, DataTable, EmptyState,
  saveJob, deleteJob, confirm, setActivePage, currency = (v) => `$${Number(v||0).toFixed(2)}`,
  authUser, profile = {}, createInvoiceFromJob,
  saveRecurringReminder, deleteRecurringReminder, sendRecurringReminderNow,
}) {
  const { t } = useTerminology();
  const colours = c;
  // Filter out admin/overhead pseudo-jobs from scheduling
  jobs = useMemo(() => jobs.filter(j => !j.isAdminJob), [jobs]);
  const today = new Date();
  const [viewDate, setViewDate] = useState(today);
  const [view, setView] = useState("month");
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [detailJob, setDetailJob] = useState(null);
  const [detailTab, setDetailTab] = useState("info");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [savingReminder, setSavingReminder] = useState(false);
  const [sendingReminderId, setSendingReminderId] = useState(null);

  const blankJob = {
    title: "", description: "", status: "Scheduled", priority: "Medium",
    startDate: fmtDate(today), startTime: "09:00", endDate: fmtDate(today), endTime: "17:00",
    clientId: "", propertyId: "", subLocationId: "", assignedTo: "", colour: "#6A1B9A", notes: "",
    recurs: "Never",
  };
  const [form, setForm] = useState(blankJob);

  const blankReminder = useMemo(() => ({
    reminderName: "",
    recurrenceInterval: "Annually",
    customMonths: 1,
    nextDueDate: fmtDate(today),
    messageToCustomer: "Hi [Name], it is time to book your [Reminder Name] with [Business Name]. Click here to request a booking: [link]",
    sendVia: "Email",
    status: "Active",
  }), [today]);
  const [reminderForm, setReminderForm] = useState(blankReminder);

  const clientMap = useMemo(() => Object.fromEntries(clients.map(c => [String(c.id), c])), [clients]);
  const propertyMap = useMemo(() => Object.fromEntries(properties.map(p => [String(p.id), p])), [properties]);

  const getClientName = (id) => clientMap[String(id)]?.name || "—";
  const getPropertyName = (id) => propertyMap[String(id)]?.name || "—";
  const getSubLocations = (propId) => {
    const p = propertyMap[String(propId)];
    return p?.subLocations || [];
  };
  const activeWithholdingEndDate = useMemo(() => {
    const selectedProperty = propertyMap[String(form.propertyId || "")];
    if (!selectedProperty) return "";
    const subLocation = (selectedProperty.subLocations || []).find((s) => String(s.id) === String(form.subLocationId || ""));
    const propertyEnd = String(selectedProperty.withholdingEndDate || "");
    const subEnd = String(subLocation?.withholdingEndDate || "");
    return subEnd && subEnd > propertyEnd ? subEnd : propertyEnd;
  }, [form.propertyId, form.subLocationId, propertyMap]);

  const getJobAddress = (job) => {
    const prop = propertyMap[String(job.propertyId)];
    if (prop?.address) return prop.address;
    const client = clientMap[String(job.clientId)];
    return client?.address || client?.addressDetails || "";
  };

  const openNavigation = (address) => {
    if (!address) { alert(`No address found for this ${t("job").toLowerCase()}. Add an address to the linked ${t("property").toLowerCase()} or contact.`); return; }
    const encoded = encodeURIComponent(address);
    // Detect iOS/macOS for Apple Maps, otherwise Google Maps
    const isApple = /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent);
    const url = isApple
      ? `https://maps.apple.com/?daddr=${encoded}`
      : `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
    window.open(url, "_blank");
  };

  const reminderSendViaLabelToValue = (label) => {
    const key = String(label || "").toLowerCase();
    if (key === "sms") return "sms";
    if (key === "both") return "both";
    return "email";
  };

  const reminderSendViaValueToLabel = (value) => {
    const key = String(value || "").toLowerCase();
    if (key === "sms") return "SMS";
    if (key === "both") return "Both";
    return "Email";
  };

  const getClientReminderContact = (clientId) => {
    const client = clientMap[String(clientId)];
    return {
      email: String(client?.email || "").trim(),
      mobile: String(client?.mobile || client?.phone || client?.phoneNumber || "").trim(),
    };
  };

  const openReminderCreateForJob = (job) => {
    if (!job?.clientId) {
      alert(`This ${t("job").toLowerCase()} has no linked contact. Link a contact first.`);
      return;
    }
    const reminderName = `${job.title || "Service"} Due`;
    setEditingReminder(null);
    setReminderForm({
      ...blankReminder,
      reminderName,
      nextDueDate: job.completedDate ? String(job.completedDate).slice(0, 10) : fmtDate(today),
      linkedJobId: String(job.id),
      linkedJobTitle: job.title || "",
      linkedJobType: job.jobType || job.title || "",
      clientId: String(job.clientId),
      clientName: getClientName(job.clientId),
      messageToCustomer: `Hi [Name], it is time to book your [Reminder Name] with [Business Name]. Click here to request a booking: [link]`,
    });
    setShowReminderForm(true);
  };

  const openReminderEdit = (reminder) => {
    setEditingReminder(reminder);
    setReminderForm({
      ...blankReminder,
      ...reminder,
      sendVia: reminderSendViaValueToLabel(reminder.sendVia),
      recurrenceInterval: reminder.recurrenceInterval || "Annually",
      customMonths: Number(reminder.customMonths || 1),
    });
    setShowReminderForm(true);
  };

  const persistReminder = async () => {
    if (!saveRecurringReminder) return;
    const reminderName = String(reminderForm.reminderName || "").trim();
    if (!reminderName) {
      alert("Reminder name is required.");
      return;
    }
    if (!reminderForm.clientId) {
      alert("A linked contact is required.");
      return;
    }
    if (!reminderForm.nextDueDate) {
      alert("Next due date is required.");
      return;
    }

    setSavingReminder(true);
    try {
      const payload = {
        ...reminderForm,
        id: editingReminder?.id || reminderForm.id,
        reminderName,
        recurrenceInterval: reminderForm.recurrenceInterval || "Annually",
        customMonths: recurrenceMonths(reminderForm.recurrenceInterval, reminderForm.customMonths),
        sendVia: reminderSendViaLabelToValue(reminderForm.sendVia),
        status: reminderForm.status || "Active",
        createdAt: editingReminder?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const saved = await saveRecurringReminder(payload);
      if (saved) {
        setShowReminderForm(false);
        setEditingReminder(null);
      }
    } finally {
      setSavingReminder(false);
    }
  };

  const toggleReminderPaused = async (reminder) => {
    if (!saveRecurringReminder) return;
    const next = { ...reminder, status: reminder.status === "Paused" ? "Active" : "Paused", updatedAt: new Date().toISOString() };
    await saveRecurringReminder(next, { silent: true });
  };

  const handleReminderDelete = (reminder) => {
    if (!deleteRecurringReminder) return;
    confirm({
      title: "Delete recurring reminder",
      message: `Delete "${reminder.reminderName}"? This cannot be undone.`,
      onConfirm: () => deleteRecurringReminder(reminder.id),
    });
  };

  const handleSendReminderNow = async (reminder) => {
    if (!sendRecurringReminderNow) return;
    setSendingReminderId(reminder.id);
    try {
      await sendRecurringReminderNow(reminder.id);
    } finally {
      setSendingReminderId(null);
    }
  };

  const reminderRows = useMemo(() => {
    return [...(Array.isArray(recurringReminders) ? recurringReminders : [])]
      .sort((a, b) => String(a.nextDueDate || "").localeCompare(String(b.nextDueDate || "")));
  }, [recurringReminders]);

  /* ── filter + search ─────────────────────────────────────── */
  const filtered = useMemo(() => {
    let list = jobs;
    if (filterStatus !== "all") list = list.filter(j => j.status === filterStatus);
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(j =>
        (j.title || "").toLowerCase().includes(q) ||
        getClientName(j.clientId).toLowerCase().includes(q) ||
        getPropertyName(j.propertyId).toLowerCase().includes(q) ||
        (j.assignedTo || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [jobs, filterStatus, searchTerm]);

  /* ── stats ───────────────────────────────────────────────── */
  const stats = useMemo(() => ({
    total: jobs.length,
    scheduled: jobs.filter(j => j.status === "Scheduled").length,
    inProgress: jobs.filter(j => j.status === "In Progress").length,
    completed: jobs.filter(j => j.status === "Completed").length,
  }), [jobs]);

  /* ── calendar nav ────────────────────────────────────────── */
  const navPrev = () => {
    const d = new Date(viewDate);
    if (view === "month") d.setMonth(d.getMonth() - 1);
    else if (view === "week") d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setViewDate(d);
  };
  const navNext = () => {
    const d = new Date(viewDate);
    if (view === "month") d.setMonth(d.getMonth() + 1);
    else if (view === "week") d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setViewDate(d);
  };
  const goToday = () => setViewDate(new Date());

  /* ── job helpers ─────────────────────────────────────────── */
  const jobsOnDate = (dateStr) => filtered.filter(j => j.startDate === dateStr);

  const openNew = () => { setForm(blankJob); setEditingJob(null); setShowForm(true); };
  const openEdit = (job) => { setForm({ ...blankJob, ...job }); setEditingJob(job); setShowForm(true); setDetailJob(null); };
  const closeForm = () => { setShowForm(false); setEditingJob(null); setForm(blankJob); };

  /* ── notification sending ────────────────────────────────── */
  const [notifSending, setNotifSending] = useState(null); // "job-booked" | "job-completed" | null

  const sendJobNotification = async (job, type, invoiceInfo = null) => {
    const client = clientMap[String(job.clientId)];
    if (!client?.email) {
      alert("No email address on file for this contact. Please add one first.");
      return;
    }
    const property = propertyMap[String(job.propertyId)];
    setNotifSending(type);
    try {
      const { data, error } = await supabase.functions.invoke("send-job-notification", {
        body: {
          type,
          job,
          profile,
          client: { name: client.name, email: client.email },
          propertyAddress: property?.address || "",
          invoiceInfo,
        },
      });
      if (error) throw error;
      if (data?.ok) {
        alert(`✅ ${type === "job-booked" ? "Booking confirmation" : type === "day-before-reminder" ? "Reminder" : "Completion notification"} sent to ${client.email}`);
        // Mark as sent on the job
        const flag = type === "job-booked" ? "bookingConfirmationSent" : type === "job-completed" ? "completionNotificationSent" : "dayBeforeReminderSent";
        const updated = { ...job, [flag]: new Date().toISOString() };
        await saveJob(updated);
        setDetailJob(updated);
      } else {
        alert("Failed to send notification. Please try again.");
      }
    } catch (err) {
      console.error("Notification error:", err);
      alert("Failed to send notification: " + (err.message || "Unknown error"));
    }
    setNotifSending(null);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    const payload = { ...form, id: editingJob?.id || Date.now() };
    const wasCompleted = editingJob?.status === "Completed";
    const isNowCompleted = payload.status === "Completed";
    await saveJob(payload);

    // When a recurring job is marked Completed:
    // 1) Auto-generate matching invoice
    // 2) Schedule the next occurrence
    if (isNowCompleted && !wasCompleted) {
      const hasRecurrence = payload.recurs && payload.recurs !== "Never";

      // Auto-generate invoice from completed job
      if (createInvoiceFromJob && payload.clientId) {
        try {
          await createInvoiceFromJob(payload);
        } catch (err) {
          console.error("Auto-invoice from job failed:", err);
        }
      }

      // Schedule next recurring job instance
      if (hasRecurrence) {
        const nextStart = calcNextDate(payload.startDate, payload.recurs);
        const nextEnd = payload.endDate ? calcNextDate(payload.endDate, payload.recurs) : nextStart;
        if (nextStart) {
          const nextJob = {
            ...payload,
            id: Date.now(),
            status: "Scheduled",
            startDate: nextStart,
            endDate: nextEnd || nextStart,
            completionNotificationSent: null,
            bookingConfirmationSent: null,
            reviewRequestSent: null,
            dayBeforeReminderSent: null,
            certificate: null,
            photos: { before: [], after: [] },
            checklist: (payload.checklist || []).map(t => ({ ...t, done: false })),
            parentRecurringJobId: payload.parentRecurringJobId || payload.id,
          };
          await saveJob(nextJob);
        }
      }

      // Auto-send review request
      if (!payload.reviewRequestSent && profile.autoSendReviewRequest !== false) {
        sendReviewRequest(payload);
      }
    }
    closeForm();
  };

  const sendReviewRequest = async (job) => {
    const client = clientMap[String(job.clientId)];
    if (!client?.email) return; // silently skip if no email
    setNotifSending("review-request");
    try {
      // Build portal URL if client has a portal token
      const portalUrl = client.portalToken
        ? `${window.location.origin}/client-portal?token=${encodeURIComponent(client.portalToken)}`
        : "";
      const { data, error } = await supabase.functions.invoke("send-job-notification", {
        body: {
          type: "review-request",
          job,
          profile,
          client: { name: client.name, email: client.email },
          googleReviewUrl: profile.googleReviewUrl || "",
          portalUrl,
        },
      });
      if (error) throw error;
      if (data?.ok) {
        const updated = { ...job, reviewRequestSent: new Date().toISOString() };
        await saveJob(updated);
        if (detailJob && String(detailJob.id) === String(job.id)) setDetailJob(updated);
        alert(`⭐ Review request sent to ${client.email}`);
      }
    } catch (err) {
      console.error("Review request error:", err);
    }
    setNotifSending(null);
  };

  const handleDelete = (job) => {
    confirm({
      title: "Delete Job",
      message: `Delete "${job.title}"? This cannot be undone.`,
      onConfirm: () => deleteJob(job.id),
    });
    setDetailJob(null);
  };

  /* ── drag-and-drop helpers ──────────────────────────────── */
  const [dragOverDate, setDragOverDate] = useState(null);

  const handleDragStart = (e, job) => {
    e.dataTransfer.setData("application/json", JSON.stringify(job));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = async (e, targetDateStr) => {
    e.preventDefault();
    setDragOverDate(null);
    try {
      const job = JSON.parse(e.dataTransfer.getData("application/json"));
      if (job.startDate === targetDateStr) return; // same date, no-op
      // compute day offset and shift both start and end dates
      const oldStart = new Date(job.startDate + "T00:00:00");
      const newStart = new Date(targetDateStr + "T00:00:00");
      const diffMs = newStart - oldStart;
      const newEnd = job.endDate ? new Date(new Date(job.endDate + "T00:00:00").getTime() + diffMs) : newStart;
      const updated = { ...job, startDate: targetDateStr, endDate: fmtDate(newEnd) };
      await saveJob(updated);
    } catch (_) { /* ignore bad data */ }
  };

  const handleDragOver = (e, dateStr) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverDate !== dateStr) setDragOverDate(dateStr);
  };

  const handleDragLeave = () => setDragOverDate(null);

  /* ── job card (mini) ─────────────────────────────────────── */
  const JobPill = ({ job }) => (
    <div
      draggable
      onDragStart={(e) => handleDragStart(e, job)}
      onClick={(e) => { e.stopPropagation(); setDetailJob(job); }}
      style={{
        background: job.colour || colours.purple, color: "#fff", borderRadius: 6,
        padding: "2px 6px", fontSize: 11, fontWeight: 600, cursor: "grab",
        marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}
      title={`Drag to reschedule: ${job.title}`}
    >
      {fmtTime(job.startTime)} {job.title}
    </div>
  );

  /* ═══════ MONTH VIEW ═══════ */
  const MonthView = () => {
    const y = viewDate.getFullYear(), m = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(y, m);
    let firstDay = getFirstDayOfMonth(y, m) - 1; // shift Sun=0 → Mon=0
    if (firstDay < 0) firstDay = 6;
    const cells = [];
    // fill blanks before 1st
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    // fill blanks at end
    while (cells.length % 7 !== 0) cells.push(null);

    const todayStr = fmtDate(today);

    return (
      <div style={{ overflowX: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, minWidth: 700 }}>
          {DAYS_SHORT.map(d => (
            <div key={d} style={{ padding: "8px 4px", textAlign: "center", fontWeight: 700, fontSize: 12, color: colours.muted, background: "#F1F5F9" }}>{d}</div>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <div key={`e${i}`} style={{ minHeight: 90, background: "#FAFAFA" }} />;
            const dateStr = `${y}-${pad(m+1)}-${pad(day)}`;
            const dayJobs = jobsOnDate(dateStr);
            const isToday = dateStr === todayStr;
            const isDragOver = dragOverDate === dateStr;
            return (
              <div key={i}
                onClick={() => { setViewDate(new Date(y, m, day)); setView("day"); }}
                onDragOver={(e) => handleDragOver(e, dateStr)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, dateStr)}
                style={{ minHeight: 90, padding: 4, background: isDragOver ? "#E8D5F5" : isToday ? colours.lightPurple : "#fff", cursor: "pointer", border: isDragOver ? `2px dashed ${colours.purple}` : "1px solid #F1F5F9", position: "relative", transition: "background 0.15s" }}>
                <div style={{ fontSize: 12, fontWeight: isToday ? 800 : 500, color: isToday ? colours.purple : colours.text, marginBottom: 2,
                  ...(isToday ? { background: colours.purple, color: "#fff", borderRadius: 99, width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center" } : {}) }}>
                  {day}
                </div>
                {dayJobs.slice(0, 3).map(j => <JobPill key={j.id} job={j} />)}
                {dayJobs.length > 3 && <div style={{ fontSize: 10, color: colours.muted, fontWeight: 600 }}>+{dayJobs.length - 3} more</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* ═══════ WEEK VIEW ═══════ */
  const WeekView = () => {
    const weekDates = getWeekDates(viewDate);
    const todayStr = fmtDate(today);
    return (
      <div style={{ overflowX: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, minWidth: 700 }}>
          {weekDates.map((d, i) => {
            const dateStr = fmtDate(d);
            const dayJobs = jobsOnDate(dateStr);
            const isToday = dateStr === todayStr;
            const isDragOver = dragOverDate === dateStr;
            return (
              <div key={i}
                onDragOver={(e) => handleDragOver(e, dateStr)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, dateStr)}
                style={{ minHeight: 200, background: isDragOver ? "#E8D5F5" : isToday ? colours.lightPurple : "#fff", border: isDragOver ? `2px dashed ${colours.purple}` : "1px solid #F1F5F9", padding: 6, transition: "background 0.15s" }}>
                <div style={{ textAlign: "center", marginBottom: 6 }}>
                  <div style={{ fontSize: 11, color: colours.muted, fontWeight: 600 }}>{DAYS_SHORT[i]}</div>
                  <div style={{ fontSize: 18, fontWeight: isToday ? 800 : 600, color: isToday ? colours.purple : colours.text }}>{d.getDate()}</div>
                </div>
                {dayJobs.map(j => <JobPill key={j.id} job={j} />)}
                {dayJobs.length === 0 && <div style={{ fontSize: 11, color: "#CBD5E1", textAlign: "center", marginTop: 20 }}>—</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* ═══════ DAY VIEW (timeline) ═══════ */
  const DayView = () => {
    const dateStr = fmtDate(viewDate);
    const dayJobs = jobsOnDate(dateStr).sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
    const hours = Array.from({ length: 13 }, (_, i) => i + 6); // 6am–6pm

    return (
      <div style={{ position: "relative", marginTop: 8 }}>
        {hours.map(h => {
          const timeStr = `${pad(h)}:00`;
          const slotJobs = dayJobs.filter(j => {
            const jh = parseInt((j.startTime || "09:00").split(":")[0], 10);
            return jh === h;
          });
          return (
            <div key={h} style={{ display: "flex", minHeight: 60, borderBottom: "1px solid #F1F5F9" }}>
              <div style={{ width: 60, flexShrink: 0, fontSize: 12, color: colours.muted, fontWeight: 600, paddingTop: 4 }}>{fmtTime(timeStr)}</div>
              <div style={{ flex: 1, padding: "4px 8px", display: "flex", flexWrap: "wrap", gap: 4, alignItems: "flex-start" }}>
                {slotJobs.map(j => (
                  <div key={j.id} onClick={() => setDetailJob(j)}
                    style={{ background: j.colour || colours.purple, color: "#fff", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13, fontWeight: 600, minWidth: 120, position: "relative" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>{j.title}</div>
                      {getJobAddress(j) && (
                        <button onClick={(e) => { e.stopPropagation(); openNavigation(getJobAddress(j)); }}
                          style={{ background: "rgba(255,255,255,0.25)", border: "none", borderRadius: 6, padding: "2px 6px", cursor: "pointer", color: "#fff", fontSize: 12, fontWeight: 700, marginLeft: 6, flexShrink: 0 }}
                          title={`Navigate to ${t("site").toLowerCase()}`}>📍</button>
                      )}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.85 }}>{fmtTime(j.startTime)} – {fmtTime(j.endTime)}</div>
                    {j.clientId && <div style={{ fontSize: 10, opacity: 0.7 }}>👤 {getClientName(j.clientId)}</div>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {dayJobs.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: colours.muted }}>
            No {t("jobs").toLowerCase()} scheduled for {fmtDateAU(dateStr)}
          </div>
        )}
      </div>
    );
  };

  /* ═══════ LIST VIEW ═══════ */
  const ListView = () => {
    const sorted = [...filtered].sort((a, b) => (a.startDate || "").localeCompare(b.startDate || "") || (a.startTime || "").localeCompare(b.startTime || ""));
    if (sorted.length === 0) return <EmptyState icon="📅" title={`No ${t("jobs").toLowerCase()} found`} subtitle={`Create your first ${t("job").toLowerCase()} to get started`} />;

    return (
      <DataTable
        columns={[
          { key: "title", label: `${t("job")} Title` },
          { key: "startDate", label: "Date", render: (_v, r) => fmtDateAU(r.startDate) },
          { key: "startTime", label: "Time", render: (_v, r) => fmtTime(r.startTime) },
          { key: "clientId", label: "Contact", render: (_v, r) => getClientName(r.clientId) },
          { key: "propertyId", label: t("property"), render: (_v, r) => getPropertyName(r.propertyId) },
          { key: "status", label: "Status", render: (_v, r) => <StatusBadge status={r.status} colours={colours} /> },
          { key: "priority", label: "Priority", render: (_v, r) => <PriorityBadge priority={r.priority} /> },
        ]}
        rows={sorted}
      />
    );
  };

  /* ═══════ view title ═══════ */
  const viewTitle = () => {
    if (view === "month") return `${MONTHS[viewDate.getMonth()]} ${viewDate.getFullYear()}`;
    if (view === "week") {
      const wd = getWeekDates(viewDate);
      return `${fmtDateAU(fmtDate(wd[0]))} – ${fmtDateAU(fmtDate(wd[6]))}`;
    }
    if (view === "day") return fmtDateAU(fmtDate(viewDate));
    return `All ${t("jobs")}`;
  };

  /* ═══════ RENDER ═══════ */
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Hero */}
      <DashboardHero title={t("schedule")} subtitle={`Plan, schedule, and track ${t("jobs").toLowerCase()}. Link them to contacts and ${t("properties").toLowerCase()}.`}>
        <InsightChip label="Scheduled" value={stats.scheduled} />
        <InsightChip label="In Progress" value={stats.inProgress} />
        <InsightChip label="Completed" value={stats.completed} />
      </DashboardHero>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <MetricCard label={`TOTAL ${t("jobs").toUpperCase()}`} value={stats.total} sub="All scheduled work" colour={colours.purple} />
        <MetricCard label="SCHEDULED" value={stats.scheduled} sub={`Upcoming ${t("jobs").toLowerCase()}`} colour="#1E88E5" />
        <MetricCard label="IN PROGRESS" value={stats.inProgress} sub="Currently active" colour="#E65100" />
        <MetricCard label="COMPLETED" value={stats.completed} sub={`Finished ${t("jobs").toLowerCase()}`} colour="#2E7D32" />
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 16 }}>
        <button style={buttonPrimary} onClick={openNew}>+ Add {t("job")}</button>

        <div style={{ display: "flex", gap: 2, background: "#F1F5F9", borderRadius: 10, padding: 3 }}>
          {VIEWS.map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{ padding: "6px 14px", borderRadius: 8, border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer",
                background: view === v ? colours.purple : "transparent", color: view === v ? "#fff" : colours.muted }}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        {view !== "list" && (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button onClick={navPrev} style={{ ...buttonSecondary, padding: "6px 12px" }}>◀</button>
            <button onClick={goToday} style={{ ...buttonSecondary, padding: "6px 12px", fontWeight: 700 }}>Today</button>
            <button onClick={navNext} style={{ ...buttonSecondary, padding: "6px 12px" }}>▶</button>
            <span style={{ fontWeight: 700, fontSize: 15, color: colours.text, marginLeft: 6 }}>{viewTitle()}</span>
          </div>
        )}

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <select style={{ ...inputStyle, width: "auto", minWidth: 130 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input style={{ ...inputStyle, width: 180 }} placeholder={`Search ${t("jobs").toLowerCase()}…`} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {/* Calendar / list area */}
      <div style={{ ...cardStyle, padding: view === "list" ? 0 : 12 }}>
        {view === "month" && <MonthView />}
        {view === "week" && <WeekView />}
        {view === "day" && <DayView />}
        {view === "list" && <ListView />}
      </div>

      <SectionCard title="Recurring Reminders">
        {reminderRows.length === 0 ? (
          <EmptyState title="No recurring reminders yet" subtitle="Open a completed job and click Set Recurring Reminder." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", fontSize: 12, color: colours.muted, borderBottom: "1px solid #E2E8F0", padding: "8px 10px" }}>Customer</th>
                  <th style={{ textAlign: "left", fontSize: 12, color: colours.muted, borderBottom: "1px solid #E2E8F0", padding: "8px 10px" }}>Reminder</th>
                  <th style={{ textAlign: "left", fontSize: 12, color: colours.muted, borderBottom: "1px solid #E2E8F0", padding: "8px 10px" }}>Last Sent</th>
                  <th style={{ textAlign: "left", fontSize: 12, color: colours.muted, borderBottom: "1px solid #E2E8F0", padding: "8px 10px" }}>Next Due</th>
                  <th style={{ textAlign: "left", fontSize: 12, color: colours.muted, borderBottom: "1px solid #E2E8F0", padding: "8px 10px" }}>Status</th>
                  <th style={{ textAlign: "left", fontSize: 12, color: colours.muted, borderBottom: "1px solid #E2E8F0", padding: "8px 10px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reminderRows.map((rem) => {
                  const status = String(rem.status || "Active");
                  const badgeStyle = status === "Paused"
                    ? { background: "#FEF3C7", color: "#92400E" }
                    : status === "Unable to send"
                      ? { background: "#FEE2E2", color: "#991B1B" }
                      : { background: "#DCFCE7", color: "#166534" };
                  const canSendNow = status !== "Paused";
                  const contact = getClientReminderContact(rem.clientId);
                  return (
                    <tr key={rem.id}>
                      <td style={{ borderBottom: "1px solid #F1F5F9", padding: "10px" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: colours.text }}>{rem.clientName || getClientName(rem.clientId)}</div>
                        <div style={{ fontSize: 11, color: colours.muted }}>{contact.email || contact.mobile || "No contact details"}</div>
                      </td>
                      <td style={{ borderBottom: "1px solid #F1F5F9", padding: "10px" }}>
                        <div style={{ fontSize: 13, color: colours.text, fontWeight: 600 }}>{rem.reminderName}</div>
                        <div style={{ fontSize: 11, color: colours.muted }}>{rem.recurrenceInterval}{rem.recurrenceInterval === "Custom" ? ` (${rem.customMonths} months)` : ""}</div>
                      </td>
                      <td style={{ borderBottom: "1px solid #F1F5F9", padding: "10px", fontSize: 12, color: colours.text }}>{rem.lastSentDate || (rem.lastSentAt ? fmtDateAU(String(rem.lastSentAt).slice(0, 10)) : "Not sent yet")}</td>
                      <td style={{ borderBottom: "1px solid #F1F5F9", padding: "10px", fontSize: 12, color: colours.text }}>{rem.nextDueDate ? fmtDateAU(rem.nextDueDate) : "—"}</td>
                      <td style={{ borderBottom: "1px solid #F1F5F9", padding: "10px" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 99, padding: "4px 10px", ...badgeStyle }}>{status}</span>
                      </td>
                      <td style={{ borderBottom: "1px solid #F1F5F9", padding: "10px" }}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button style={{ ...buttonSecondary, fontSize: 11, padding: "5px 10px" }} onClick={() => openReminderEdit(rem)}>Edit</button>
                          <button style={{ ...buttonSecondary, fontSize: 11, padding: "5px 10px" }} onClick={() => toggleReminderPaused(rem)}>{status === "Paused" ? "Resume" : "Pause"}</button>
                          <button style={{ ...buttonSecondary, fontSize: 11, padding: "5px 10px", opacity: canSendNow ? 1 : 0.5 }} onClick={() => handleSendReminderNow(rem)} disabled={!canSendNow || sendingReminderId === rem.id}>
                            {sendingReminderId === rem.id ? "Sending..." : "Send Now"}
                          </button>
                          <button style={{ ...buttonSecondary, fontSize: 11, padding: "5px 10px", color: "#B91C1C", borderColor: "#FCA5A5" }} onClick={() => handleReminderDelete(rem)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* ═══ JOB DETAIL PANEL ═══ */}
      {detailJob && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", justifyContent: "flex-end" }} onClick={() => { setDetailJob(null); setDetailTab("info"); }}>
          <div style={{ background: "rgba(0,0,0,0.25)", position: "absolute", inset: 0 }} />
          <div onClick={e => e.stopPropagation()}
            style={{ position: "relative", width: 560, maxWidth: "95vw", background: "#fff", height: "100vh", overflowY: "auto", padding: 28, boxShadow: "-4px 0 24px rgba(0,0,0,0.12)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div style={{ width: 40, height: 6, borderRadius: 3, background: detailJob.colour || colours.purple, marginBottom: 10 }} />
                <h2 style={{ fontSize: 22, fontWeight: 800, color: colours.text, margin: 0 }}>{detailJob.title}</h2>
              </div>
              <button onClick={() => { setDetailJob(null); setDetailTab("info"); }} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: colours.muted }}>✕</button>
            </div>

            {/* Tab bar */}
            <div style={{ display: "flex", gap: 2, background: "#F1F5F9", borderRadius: 10, padding: 3, marginBottom: 16, flexWrap: "wrap" }}>
              {["info", "notes", "photos", "costs", "certificate"].map(t => (
                <button key={t} onClick={() => setDetailTab(t)}
                  style={{ padding: "6px 14px", borderRadius: 8, border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer",
                    background: detailTab === t ? colours.purple : "transparent", color: detailTab === t ? "#fff" : colours.muted }}>
                  {t === "info" ? "Details" : t === "notes" ? "📋 Notes & Tasks" : t === "photos" ? "📷 Photos" : t === "certificate" ? "📜 Certificate" : "💰 Costs"}
                </button>
              ))}
            </div>

            {detailTab === "info" && (<>
              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                <StatusBadge status={detailJob.status} colours={colours} />
                <PriorityBadge priority={detailJob.priority} />
                {detailJob.recurs && detailJob.recurs !== "Never" && (
                  <span style={{ padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: colours.lightPurple || "#F3E5F5", color: colours.purple }}>
                    🔄 {detailJob.recurs}
                  </span>
                )}
              </div>

              {/* Quick financial summary */}
              {(() => {
                const fin = computeJobFinancials(detailJob);
                return (fin.quotedTotal > 0 || fin.totalCost > 0) ? (
                  <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                    {fin.quotedTotal > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: colours.purple, background: colours.lightPurple || "#F3E5F5", padding: "4px 12px", borderRadius: 99 }}>Quoted: {currency(fin.quotedTotal)}</span>}
                    {fin.totalCost > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: "#1565C0", background: "#E3F2FD", padding: "4px 12px", borderRadius: 99 }}>Cost: {currency(fin.totalCost)}</span>}
                    {fin.quotedTotal > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: fin.grossMarginPct >= 20 ? "#2E7D32" : "#E65100", background: fin.grossMarginPct >= 20 ? "#E8F5E9" : "#FFF3E0", padding: "4px 12px", borderRadius: 99 }}>Margin: {fin.grossMarginPct.toFixed(0)}%</span>}
                  </div>
                ) : null;
              })()}

              <div style={{ display: "grid", gap: 12, fontSize: 14 }}>
                <div><span style={{ color: colours.muted, fontWeight: 600 }}>📅 Date</span><br/>{fmtDateAU(detailJob.startDate)}{detailJob.endDate && detailJob.endDate !== detailJob.startDate ? ` – ${fmtDateAU(detailJob.endDate)}` : ""}</div>
                <div><span style={{ color: colours.muted, fontWeight: 600 }}>🕐 Time</span><br/>{fmtTime(detailJob.startTime)} – {fmtTime(detailJob.endTime)}</div>
                {detailJob.clientId && <div><span style={{ color: colours.muted, fontWeight: 600 }}>👤 Contact</span><br/>{getClientName(detailJob.clientId)}</div>}
                {detailJob.propertyId && <div><span style={{ color: colours.muted, fontWeight: 600 }}>🏠 {t("property")}</span><br/>{getPropertyName(detailJob.propertyId)}{detailJob.subLocationId ? ` › ${getSubLocations(detailJob.propertyId).find(s => s.id === detailJob.subLocationId)?.name || ""}` : ""}</div>}
                {getJobAddress(detailJob) && (
                  <div>
                    <span style={{ color: colours.muted, fontWeight: 600 }}>📍 Address</span><br/>
                    <span>{getJobAddress(detailJob)}</span>
                    <button onClick={() => openNavigation(getJobAddress(detailJob))}
                      style={{ background: "#1565C0", color: "#fff", border: "none", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", marginLeft: 8, verticalAlign: "middle" }}>
                      🧭 Navigate
                    </button>
                  </div>
                )}
                {detailJob.assignedTo && <div><span style={{ color: colours.muted, fontWeight: 600 }}>👷 Assigned to</span><br/>{detailJob.assignedTo}</div>}
                {detailJob.description && <div><span style={{ color: colours.muted, fontWeight: 600 }}>📝 Description</span><br/>{detailJob.description}</div>}
                {detailJob.notes && <div><span style={{ color: colours.muted, fontWeight: 600 }}>📌 Notes</span><br/>{detailJob.notes}</div>}
                {/* Task progress summary */}
                {(detailJob.checklist || []).length > 0 && (() => {
                  const tasks = detailJob.checklist || [];
                  const done = tasks.filter(t => t.done).length;
                  return (
                    <div onClick={() => setDetailTab("notes")} style={{ cursor: "pointer" }}>
                      <span style={{ color: colours.muted, fontWeight: 600 }}>✅ Tasks</span><br/>
                      <span style={{ fontWeight: 700, color: done === tasks.length ? "#2E7D32" : colours.text }}>{done}/{tasks.length} completed</span>
                      <div style={{ height: 4, background: "#F1F5F9", borderRadius: 99, marginTop: 4, width: 120 }}>
                        <div style={{ height: "100%", width: `${Math.round((done/tasks.length)*100)}%`, background: done === tasks.length ? "#2E7D32" : colours.purple, borderRadius: 99 }} />
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 28, flexWrap: "wrap" }}>
                <button style={buttonPrimary} onClick={() => openEdit(detailJob)}>Edit {t("job")}</button>
                <button style={{ ...buttonSecondary, color: "#C62828" }} onClick={() => handleDelete(detailJob)}>Delete</button>
                <button style={buttonSecondary} onClick={() => setDetailTab("costs")}>View Costs</button>
                {detailJob.status === "Completed" && detailJob.clientId && (
                  <button
                    style={{ ...buttonSecondary, color: "#6A1B9A", borderColor: "#6A1B9A" }}
                    onClick={() => openReminderCreateForJob(detailJob)}
                  >
                    Set Recurring Reminder
                  </button>
                )}
                {getJobAddress(detailJob) && (
                  <button style={{ ...buttonSecondary, color: "#1565C0", borderColor: "#1565C0" }} onClick={() => openNavigation(getJobAddress(detailJob))}>
                    📍 Navigate to {t("site")}
                  </button>
                )}
                <button style={{ ...buttonSecondary, color: "#6A1B9A", borderColor: "#6A1B9A" }} onClick={() => {
                  const w = window.open("", "_blank");
                  if (w) writeJobSheetPreviewToWindow(w, detailJob, { profile, clients, properties });
                }}>📄 {t("job")} Sheet</button>
              </div>

              {/* ── Customer Notifications ── */}
              {detailJob.clientId && (
                <div style={{ marginTop: 20, padding: 16, background: "#F8FAFC", borderRadius: 12, border: "1px solid #E2E8F0" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: colours.text, marginBottom: 10 }}>📧 Customer Notifications</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      style={{ ...buttonSecondary, fontSize: 12, padding: "6px 14px", opacity: notifSending ? 0.6 : 1 }}
                      disabled={!!notifSending}
                      onClick={() => sendJobNotification(detailJob, "job-booked")}
                    >
                      {notifSending === "job-booked" ? "Sending…" : "📩 Send Booking Confirmation"}
                    </button>
                    <button
                      style={{ ...buttonSecondary, fontSize: 12, padding: "6px 14px", opacity: notifSending ? 0.6 : 1 }}
                      disabled={!!notifSending}
                      onClick={() => sendJobNotification(detailJob, "day-before-reminder")}
                    >
                      {notifSending === "day-before-reminder" ? "Sending…" : "⏰ Send Reminder"}
                    </button>
                    <button
                      style={{ ...buttonSecondary, fontSize: 12, padding: "6px 14px", color: "#2E7D32", borderColor: "#2E7D32", opacity: notifSending ? 0.6 : 1 }}
                      disabled={!!notifSending}
                      onClick={() => {
                        // Find linked invoice if exists
                        const linkedInv = invoices.find(inv => String(inv.jobId) === String(detailJob.id));
                        sendJobNotification(detailJob, "job-completed", linkedInv ? {
                          invoiceNumber: linkedInv.invoiceNumber,
                          total: linkedInv.total,
                          dueDate: linkedInv.dueDate,
                          paymentLink: linkedInv.paymentLink || "",
                        } : null);
                      }}
                    >
                      {notifSending === "job-completed" ? "Sending…" : `✅ Send Completion + Invoice`}
                    </button>
                    <button
                      style={{ ...buttonSecondary, fontSize: 12, padding: "6px 14px", color: "#F57F17", borderColor: "#F57F17", opacity: notifSending ? 0.6 : 1 }}
                      disabled={!!notifSending}
                      onClick={() => sendReviewRequest(detailJob)}
                    >
                      {notifSending === "review-request" ? "Sending…" : "⭐ Request Review"}
                    </button>
                  </div>
                  {/* Sent indicators */}
                  <div style={{ marginTop: 8, display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {detailJob.bookingConfirmationSent && <span style={{ fontSize: 11, color: "#2E7D32" }}>✓ Booking sent {new Date(detailJob.bookingConfirmationSent).toLocaleDateString()}</span>}
                    {detailJob.dayBeforeReminderSent && <span style={{ fontSize: 11, color: "#1E88E5" }}>✓ Reminder sent {new Date(detailJob.dayBeforeReminderSent).toLocaleDateString()}</span>}
                    {detailJob.completionNotificationSent && <span style={{ fontSize: 11, color: "#2E7D32" }}>✓ Completion sent {new Date(detailJob.completionNotificationSent).toLocaleDateString()}</span>}
                    {detailJob.reviewRequestSent && <span style={{ fontSize: 11, color: "#F57F17" }}>⭐ Review request sent {new Date(detailJob.reviewRequestSent).toLocaleDateString()}</span>}
                  </div>
                </div>
              )}
            </>)}

            {detailTab === "notes" && (
              <JobNotesTasksPanel
                job={detailJob}
                onUpdate={async (updated) => { await saveJob(updated); setDetailJob(updated); }}
                colours={colours} buttonPrimary={buttonPrimary} buttonSecondary={buttonSecondary}
                inputStyle={inputStyle} labelStyle={labelStyle}
              />
            )}

            {detailTab === "photos" && (
              <JobPhotosPanel
                job={detailJob}
                onUpdate={async (updated) => { await saveJob(updated); setDetailJob(updated); }}
                colours={colours} buttonPrimary={buttonPrimary} buttonSecondary={buttonSecondary}
                authUser={authUser}
              />
            )}

            {detailTab === "costs" && (
              <JobCostingPanel
                job={detailJob}
                onUpdate={async (updated) => { await saveJob(updated); setDetailJob(updated); }}
                colours={colours} cardStyle={cardStyle} inputStyle={inputStyle} labelStyle={labelStyle}
                buttonPrimary={buttonPrimary} buttonSecondary={buttonSecondary}
                currency={currency} quotes={quotes} invoices={invoices}
                authUser={authUser}
              />
            )}

            {detailTab === "certificate" && (
              <CertificatePanel
                job={detailJob}
                onUpdate={async (updated) => { await saveJob(updated); setDetailJob(updated); }}
                colours={colours} buttonPrimary={buttonPrimary} buttonSecondary={buttonSecondary}
                inputStyle={inputStyle} labelStyle={labelStyle}
                profile={profile} clients={clients} properties={properties}
                authUser={authUser}
              />
            )}
          </div>
        </div>
      )}

      {/* ═══ JOB FORM MODAL ═══ */}
      {showReminderForm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "rgba(0,0,0,0.35)", position: "absolute", inset: 0 }} onClick={() => { setShowReminderForm(false); setEditingReminder(null); }} />
          <div style={{ position: "relative", background: "#fff", borderRadius: 18, padding: 28, width: 640, maxWidth: "95vw", maxHeight: "92vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: colours.text, marginBottom: 8 }}>{editingReminder ? "Edit Recurring Reminder" : "Set Recurring Reminder"}</h2>
            <p style={{ margin: 0, fontSize: 13, color: colours.muted, lineHeight: 1.6 }}>
              Create automatic customer reminders for future maintenance and service work.
            </p>

            <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
              <div>
                <label style={labelStyle}>Reminder Name</label>
                <input style={inputStyle} value={reminderForm.reminderName || ""} onChange={(e) => setReminderForm((prev) => ({ ...prev, reminderName: e.target.value }))} placeholder="e.g. Annual Service Due" />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Recurrence Interval</label>
                  <select style={inputStyle} value={reminderForm.recurrenceInterval || "Annually"} onChange={(e) => setReminderForm((prev) => ({ ...prev, recurrenceInterval: e.target.value }))}>
                    {REMINDER_RECURRENCE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Next Due Date</label>
                  <input type="date" style={inputStyle} value={reminderForm.nextDueDate || ""} onChange={(e) => setReminderForm((prev) => ({ ...prev, nextDueDate: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Send Via</label>
                  <select style={inputStyle} value={reminderForm.sendVia || "Email"} onChange={(e) => setReminderForm((prev) => ({ ...prev, sendVia: e.target.value }))}>
                    <option value="Email">Email</option>
                    <option value="SMS">SMS</option>
                    <option value="Both">Both</option>
                  </select>
                </div>
              </div>

              {reminderForm.recurrenceInterval === "Custom" && (
                <div>
                  <label style={labelStyle}>Custom Frequency (months)</label>
                  <input
                    type="number"
                    min={1}
                    style={inputStyle}
                    value={reminderForm.customMonths || 1}
                    onChange={(e) => setReminderForm((prev) => ({ ...prev, customMonths: Math.max(1, Number(e.target.value || 1)) }))}
                  />
                </div>
              )}

              <div>
                <label style={labelStyle}>Message to Customer</label>
                <textarea
                  style={{ ...inputStyle, minHeight: 110 }}
                  value={reminderForm.messageToCustomer || ""}
                  onChange={(e) => setReminderForm((prev) => ({ ...prev, messageToCustomer: e.target.value }))}
                  placeholder="Use placeholders [Name], [Reminder Name], [Business Name], [link]"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Linked Contact</label>
                  <input style={{ ...inputStyle, background: "#F8FAFC" }} value={reminderForm.clientName || getClientName(reminderForm.clientId)} readOnly />
                </div>
                <div>
                  <label style={labelStyle}>Reminder Status</label>
                  <select style={inputStyle} value={reminderForm.status || "Active"} onChange={(e) => setReminderForm((prev) => ({ ...prev, status: e.target.value }))}>
                    <option value="Active">Active</option>
                    <option value="Paused">Paused</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
              <button style={buttonSecondary} onClick={() => { setShowReminderForm(false); setEditingReminder(null); }}>Cancel</button>
              <button style={{ ...buttonPrimary, opacity: savingReminder ? 0.7 : 1 }} onClick={persistReminder} disabled={savingReminder}>
                {savingReminder ? "Saving..." : "Save Reminder"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "rgba(0,0,0,0.35)", position: "absolute", inset: 0 }} onClick={closeForm} />
          <div style={{ position: "relative", background: "#fff", borderRadius: 18, padding: 32, width: 560, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: colours.text, marginBottom: 20 }}>{editingJob ? `Edit ${t("job")}` : `New ${t("job")}`}</h2>

            <div style={{ display: "grid", gap: 14 }}>
              {/* Title */}
              <div>
                <label style={labelStyle}>{t("job")} Title *</label>
                <input style={inputStyle} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder={`e.g. Fence repair at ${t("property").toLowerCase()}`} />
              </div>

              {/* Date/Time row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Start Date</label>
                  <input type="date" style={inputStyle} value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Start Time</label>
                  <input type="time" style={inputStyle} value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>End Date</label>
                  <input type="date" style={inputStyle} value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>End Time</label>
                  <input type="time" style={inputStyle} value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
                </div>
              </div>

              {/* Status + Priority */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select style={inputStyle} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Priority</label>
                  <select style={inputStyle} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                    {PRIORITY_OPTIONS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              {/* Contact */}
              <div>
                <label style={labelStyle}>Link to Contact</label>
                <select style={inputStyle} value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}>
                  <option value="">— none —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* Property + Sub-location */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Link to {t("property")}</label>
                  <select style={inputStyle} value={form.propertyId} onChange={e => setForm(f => ({ ...f, propertyId: e.target.value, subLocationId: "" }))}>
                    <option value="">— none —</option>
                    {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                {form.propertyId && getSubLocations(form.propertyId).length > 0 && (
                  <div>
                    <label style={labelStyle}>{t("subLocation")}</label>
                    <select style={inputStyle} value={form.subLocationId} onChange={e => setForm(f => ({ ...f, subLocationId: e.target.value }))}>
                      <option value="">— none —</option>
                      {getSubLocations(form.propertyId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
              {activeWithholdingEndDate && String(form.startDate || "") <= String(activeWithholdingEndDate) && (
                <div style={{ fontSize: 12, color: "#B91C1C", fontWeight: 700, background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 10, padding: "8px 10px" }}>
                  Withholding warning: this {t("paddock").toLowerCase()} has an active chemical withholding period until {activeWithholdingEndDate}. Check livestock movement before scheduling.
                </div>
              )}

              {/* Assigned + Colour + Recurrence */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Assigned To</label>
                  <input style={inputStyle} value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))} placeholder="Staff name" />
                </div>
                <div>
                  <label style={labelStyle}>Recurring</label>
                  <select style={inputStyle} value={form.recurs || "Never"} onChange={e => setForm(f => ({ ...f, recurs: e.target.value }))}>
                    {RECURRENCE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  {form.recurs && form.recurs !== "Never" && (
                    <div style={{ fontSize: 11, color: colours.purple, marginTop: 4, fontWeight: 600 }}>
                      🔄 Next {t("job").toLowerCase()} auto-created on completion
                      {form.clientId && <span> + invoice generated</span>}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Colour</label>
                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                  {COLOUR_OPTIONS.map(c => (
                    <div key={c.value} onClick={() => setForm(f => ({ ...f, colour: c.value }))}
                      style={{ width: 28, height: 28, borderRadius: 8, background: c.value, cursor: "pointer",
                        border: form.colour === c.value ? "3px solid #333" : "2px solid transparent" }}
                      title={c.label} />
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={labelStyle}>Description</label>
                <textarea style={{ ...inputStyle, minHeight: 60 }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder={`${t("job")} details…`} />
              </div>

              {/* Notes */}
              <div>
                <label style={labelStyle}>Notes</label>
                <textarea style={{ ...inputStyle, minHeight: 50 }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Internal notes…" />
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
              <button style={buttonSecondary} onClick={closeForm}>Cancel</button>
              <button style={buttonPrimary} onClick={handleSave}>{editingJob ? "Save Changes" : `Create ${t("job")}`}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
