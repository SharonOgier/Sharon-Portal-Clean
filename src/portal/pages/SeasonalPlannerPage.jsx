import React, { useState, useMemo } from "react";
import { Calendar, ChevronLeft, ChevronRight, Plus, CheckCircle, Clock, MapPin, User, ArrowRight, LayoutGrid, List, Filter, Edit2, Trash2 } from "lucide-react";

const CATEGORIES = ["Cattle", "Pasture", "Chemical", "Machinery", "Finance", "Other"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const SUGGESTED_TASKS = [
  { name: "Check water points", category: "Cattle", months: [0], notes: "Ensure all troughs are functional for summer heat." },
  { name: "Weed spraying", category: "Pasture", months: [0], notes: "Target summer weeds in north paddocks." },
  { name: "Pregnancy testing", category: "Cattle", months: [2, 3], notes: "Book vet for annual preg testing." },
  { name: "Weaning", category: "Cattle", months: [2, 3], notes: "Move calves to weaning paddock with hay." },
  { name: "Preg test results review", category: "Finance", months: [4], notes: "Analyze reproductive performance and cull dry cows." },
  { name: "Winter pasture assessment", category: "Pasture", months: [4], notes: "Evaluate biomass for winter carrying capacity." },
  { name: "Supplement feeding review", category: "Cattle", months: [6], notes: "Check licks and protein blocks availability." },
  { name: "Calving begins", category: "Cattle", months: [7, 8], notes: "Check calving paddocks daily." },
  { name: "Bull turnout", category: "Cattle", months: [7, 8], notes: "Joining period starts." },
  { name: "Tick treatment", category: "Chemical", months: [9], notes: "Spring parasite control." },
  { name: "Calf marking and branding", category: "Cattle", months: [9], notes: "Vaccinations and tagging." },
  { name: "Weaners to separate paddock", category: "Cattle", months: [10], notes: "Final drafting of weaners." },
  { name: "Annual cattle sale preparation", category: "Finance", months: [11], notes: "Organise transport and agent for end of year sales." },
];

export default function SeasonalPlannerPage(props) {
  const {
    seasonalTasks = [],
    saveSeasonalTask,
    deleteSeasonalTask,
    properties = [],
    clients = [], // For team/subcontractors
    saveJob,
    colours, cardStyle,
    buttonPrimary, buttonSecondary,
    inputStyle, labelStyle,
    formatDateAU, todayLocal,
    SectionCard, DataTable, EmptyState,
    confirm, toast,
    setActivePage
  } = props;

  const [viewMode, setViewMode] = useState("year"); // 'year', 'quarter', 'month'
  const [currentMonthIndex, setCurrentMonthIndex] = useState(new Date().getMonth());
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filterCategory, setFilterCategory] = useState("All");

  const [taskForm, setTaskForm] = useState({
    name: "", category: "Cattle", months: [new Date().getMonth()],
    notes: "", linkedPaddock: "", assignedTo: "", paused: false
  });

  const teamMembers = useMemo(() =>
    clients.filter(c => (c.roles || []).includes("staff") || (c.roles || []).includes("subcontractor")),
    [clients]
  );

  const filteredTasks = useMemo(() => {
    let tasks = [...seasonalTasks];
    if (filterCategory !== "All") {
      tasks = tasks.filter(t => t.category === filterCategory);
    }
    return tasks;
  }, [seasonalTasks, filterCategory]);

  const tasksByMonth = useMemo(() => {
    const map = MONTHS.map(() => []);
    filteredTasks.forEach(task => {
      (task.months || []).forEach(mIdx => {
        if (map[mIdx]) map[mIdx].push(task);
      });
    });
    return map;
  }, [filteredTasks]);

  const handleAddSuggested = async (suggested) => {
    await saveSeasonalTask({ ...suggested, id: Date.now() + Math.random() });
    toast.success("Task added to your planner!");
  };

  const handleSaveTask = async () => {
    if (!taskForm.name) return alert("Task name is required");
    if (!taskForm.months.length) return alert("Select at least one month");

    await saveSeasonalTask({ ...taskForm, id: editingTask?.id || Date.now() + Math.random() });
    setShowAddModal(false);
    setEditingTask(null);
    setTaskForm({ name: "", category: "Cattle", months: [new Date().getMonth()], notes: "", linkedPaddock: "", assignedTo: "", paused: false });
  };

  const convertToJob = async (task, monthIdx) => {
    const jobPayload = {
      title: task.name,
      description: task.notes,
      category: task.category,
      startDate: `${new Date().getFullYear()}-${String(monthIdx + 1).padStart(2, '0')}-01`,
      endDate: `${new Date().getFullYear()}-${String(monthIdx + 1).padStart(2, '0')}-01`,
      status: "Scheduled",
      assignedTo: task.assignedTo,
      propertyId: task.linkedPaddock, // Simplified link
      seasonalTaskId: task.id,
      id: Date.now() + Math.random()
    };
    await saveJob(jobPayload);
    toast.success("Task converted to job and added to schedule!");
    setActivePage("scheduling");
  };

  const renderMonthBox = (mIdx, compact = false) => {
    const monthTasks = tasksByMonth[mIdx] || [];
    return (
      <div key={mIdx} style={{
        ...cardStyle,
        padding: compact ? 12 : 16,
        minHeight: compact ? 100 : 160,
        display: "flex",
        flexDirection: "column",
        opacity: currentMonthIndex === mIdx && viewMode !== 'year' ? 1 : 0.9,
        border: currentMonthIndex === mIdx ? `2px solid ${colours.purple}` : `1px solid ${colours.border}`
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontWeight: 800, fontSize: compact ? 13 : 15, color: colours.navy }}>{MONTHS[mIdx]}</span>
          {monthTasks.length > 0 && (
            <span style={{ fontSize: 10, background: colours.lightPurple, color: colours.purple, padding: "2px 6px", borderRadius: 99, fontWeight: 700 }}>
              {monthTasks.length}
            </span>
          )}
        </div>
        <div style={{ display: "grid", gap: 6, flex: 1 }}>
          {monthTasks.slice(0, compact ? 3 : 5).map(task => (
            <div key={task.id} style={{
              fontSize: 11, padding: "4px 8px", borderRadius: 6,
              background: task.paused ? "#F1F5F9" : colours.bg,
              color: task.paused ? colours.muted : colours.text,
              borderLeft: `3px solid ${getCategoryColor(task.category)}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: compact ? 80 : 120 }}>
                {task.name}
              </span>
              {!compact && (
                <button onClick={() => convertToJob(task, mIdx)} style={{ background: "none", border: "none", cursor: "pointer", color: colours.purple, padding: 0 }}>
                  <ArrowRight size={12} />
                </button>
              )}
            </div>
          ))}
          {monthTasks.length > (compact ? 3 : 5) && (
            <div style={{ fontSize: 10, color: colours.muted, textAlign: "center" }}>
              + {monthTasks.length - (compact ? 3 : 5)} more
            </div>
          )}
          {monthTasks.length === 0 && !compact && (
            <div style={{ flex: 1, display: "grid", placeItems: "center", border: `1px dashed ${colours.border}`, borderRadius: 8 }}>
              <span style={{ fontSize: 10, color: colours.muted }}>No tasks</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const getCategoryColor = (cat) => {
    const colors = { Cattle: "#6A1B9A", Pasture: "#059669", Chemical: "#DC2626", Machinery: "#EA580C", Finance: "#2B2F6B", Other: "#64748B" };
    return colors[cat] || "#64748B";
  };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <DashboardHero title="Seasonal Task Planner" subtitle="Layout your recurring farm tasks across the year. Planning for the long haul." highlight={seasonalTasks.length + " tasks active"}>
        <InsightChip label="Active tasks" value={String(seasonalTasks.filter(t => !t.paused).length)} />
        <InsightChip label="Next month" value={String(tasksByMonth[(new Date().getMonth() + 1) % 12].length)} />
      </DashboardHero>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", background: "#fff", padding: 4, borderRadius: 12, border: `1px solid ${colours.border}` }}>
          {[
            { id: "year", label: "Year", icon: LayoutGrid },
            { id: "quarter", label: "Quarter", icon: List },
            { id: "month", label: "Month", icon: Clock },
          ].map(mode => (
            <button key={mode.id} onClick={() => setViewMode(mode.id)} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8,
              border: "none", background: viewMode === mode.id ? colours.purple : "transparent",
              color: viewMode === mode.id ? "#fff" : colours.text, fontWeight: 700, fontSize: 13, cursor: "pointer"
            }}>
              <mode.icon size={14} /> {mode.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <select style={{ ...inputStyle, width: "auto", padding: "8px 12px" }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
            <option value="All">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button style={buttonPrimary} onClick={() => { setEditingTask(null); setTaskForm({ name: "", category: "Cattle", months: [new Date().getMonth()], notes: "", linkedPaddock: "", assignedTo: "", paused: false }); setShowAddModal(true); }}>
            <Plus size={16} style={{ marginRight: 8 }} /> Add Task
          </button>
        </div>
      </div>

      {viewMode === "year" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          {MONTHS.map((_, i) => renderMonthBox(i, true))}
        </div>
      )}

      {viewMode === "quarter" && (
        <div style={{ display: "grid", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20, justifyContent: "center" }}>
            <button style={buttonSecondary} onClick={() => setCurrentMonthIndex(p => (p - 3 + 12) % 12)}><ChevronLeft size={20} /></button>
            <span style={{ fontSize: 18, fontWeight: 800 }}>{MONTHS[currentMonthIndex]} — {MONTHS[(currentMonthIndex + 2) % 12]}</span>
            <button style={buttonSecondary} onClick={() => setCurrentMonthIndex(p => (p + 3) % 12)}><ChevronRight size={20} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {[0, 1, 2].map(offset => renderMonthBox((currentMonthIndex + offset) % 12))}
          </div>
        </div>
      )}

      {viewMode === "month" && (
        <div style={{ display: "grid", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20, justifyContent: "center" }}>
            <button style={buttonSecondary} onClick={() => setCurrentMonthIndex(p => (p - 1 + 12) % 12)}><ChevronLeft size={20} /></button>
            <span style={{ fontSize: 22, fontWeight: 900 }}>{MONTHS[currentMonthIndex]}</span>
            <button style={buttonSecondary} onClick={() => setCurrentMonthIndex(p => (p + 1) % 12)}><ChevronRight size={20} /></button>
          </div>

          <SectionCard title={`${MONTHS[currentMonthIndex]} Tasks`}>
            <DataTable
              rows={tasksByMonth[currentMonthIndex]}
              columns={[
                { key: "name", label: "Task", render: (v, row) => (
                  <div style={{ opacity: row.paused ? 0.6 : 1 }}>
                    <div style={{ fontWeight: 700 }}>{v}</div>
                    <div style={{ fontSize: 11, color: colours.muted }}>{row.notes}</div>
                  </div>
                )},
                { key: "category", label: "Category", render: v => (
                  <span style={{ fontSize: 11, fontWeight: 700, color: getCategoryColor(v), background: getCategoryColor(v) + "15", padding: "4px 8px", borderRadius: 6 }}>{v}</span>
                )},
                { key: "assignedTo", label: "Assigned To", render: v => v || "Unassigned" },
                { key: "actions", label: "", render: (_, row) => (
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button style={{ ...buttonPrimary, padding: "6px 12px", fontSize: 12 }} onClick={() => convertToJob(row, currentMonthIndex)}>
                      Make Job
                    </button>
                    <button style={{ ...buttonSecondary, padding: "6px 10px" }} onClick={() => { setEditingTask(row); setTaskForm({...row}); setShowAddModal(true); }}>
                      <Edit2 size={14} />
                    </button>
                  </div>
                )}
              ]}
              emptyState={{ title: "Free month!", message: "No tasks scheduled for this month. Enjoy the break or add a new one.", icon: "🌤️" }}
            />
          </SectionCard>
        </div>
      )}

      {seasonalTasks.length === 0 && (
        <SectionCard title="Common Farming Tasks" subtitle="Quickly add these standard beef cattle tasks to your planner.">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
            {SUGGESTED_TASKS.map((task, i) => (
              <div key={i} style={{ ...cardStyle, padding: 16, display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: getCategoryColor(task.category) + "15", display: "grid", placeItems: "center" }}>
                   <CheckCircle size={20} color={getCategoryColor(task.category)} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{task.name}</div>
                  <div style={{ fontSize: 11, color: colours.muted }}>{task.months.map(m => MONTHS[m].slice(0,3)).join('/')}</div>
                </div>
                <button style={{ ...buttonSecondary, padding: "6px 12px", fontSize: 12 }} onClick={() => handleAddSuggested(task)}>Add</button>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(15,23,42,0.5)", display: "grid", placeItems: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: 28, width: "100%", maxWidth: 500, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 20 }}>{editingTask ? "Edit" : "Add"} Seasonal Task</div>

            <div style={{ display: "grid", gap: 16 }}>
              <div>
                <label style={labelStyle}>Task Name *</label>
                <input style={inputStyle} value={taskForm.name} onChange={e => setTaskForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Weed Spraying" />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={labelStyle}>Category</label>
                  <select style={inputStyle} value={taskForm.category} onChange={e => setTaskForm(p => ({ ...p, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Assigned To</label>
                  <select style={inputStyle} value={taskForm.assignedTo} onChange={e => setTaskForm(p => ({ ...p, assignedTo: e.target.value }))}>
                    <option value="">Unassigned</option>
                    {teamMembers.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Months (Recurring)</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                  {MONTHS.map((m, i) => (
                    <button key={m} onClick={() => {
                      const next = taskForm.months.includes(i)
                        ? taskForm.months.filter(x => x !== i)
                        : [...taskForm.months, i].sort((a,b) => a-b);
                      setTaskForm(p => ({ ...p, months: next }));
                    }} style={{
                      padding: "6px 0", borderRadius: 8, fontSize: 11, fontWeight: 700,
                      border: `1px solid ${taskForm.months.includes(i) ? colours.purple : colours.border}`,
                      background: taskForm.months.includes(i) ? colours.purple : "#fff",
                      color: taskForm.months.includes(i) ? "#fff" : colours.text,
                      cursor: "pointer"
                    }}>
                      {m.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Linked Paddock / Mob</label>
                <select style={inputStyle} value={taskForm.linkedPaddock} onChange={e => setTaskForm(p => ({ ...p, linkedPaddock: e.target.value }))}>
                  <option value="">None</option>
                  {properties.map(p => (
                    <optgroup key={p.id} label={p.name}>
                      {(p.subLocations || []).map(sub => (
                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Notes</label>
                <textarea style={{ ...inputStyle, minHeight: 80 }} value={taskForm.notes} onChange={e => setTaskForm(p => ({ ...p, notes: e.target.value }))} />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="checkbox" checked={taskForm.paused} onChange={e => setTaskForm(p => ({ ...p, paused: e.target.checked }))} />
                <label style={{ ...labelStyle, marginBottom: 0 }}>Pause this task for now</label>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24 }}>
              {editingTask && (
                <button style={{ ...buttonSecondary, color: "#DC2626", marginRight: "auto" }} onClick={() => {
                  confirm({ title: "Delete task?", message: "This will remove the recurring task from your planner.", onConfirm: () => { deleteSeasonalTask(editingTask.id); setShowAddModal(false); } });
                }}>Delete</button>
              )}
              <button style={buttonSecondary} onClick={() => setShowAddModal(false)}>Cancel</button>
              <button style={buttonPrimary} onClick={handleSaveTask}>Save Task</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
