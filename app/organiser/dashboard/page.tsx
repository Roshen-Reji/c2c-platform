"use client";

export default function OrganiserDashboard() {
  const assignedDays = [
    { title: "Self Assessment Workshop", date: "Phase 1 - Day 1", type: "learning", time: "10:00 AM - 11:30 AM" },
    { title: "DSA Fundamentals", date: "Phase 2 - Day 1", type: "learning", time: "2:00 PM - 3:30 PM" },
  ];

  return (
    <div>
      <div className="portal-header">
        <div>
          <h1 className="portal-page-title">Organiser <span className="accent-purple">Dashboard</span></h1>
          <p className="portal-page-subtitle">Your assigned sessions and evaluations</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-card-label">📅 Assigned Days</div><div className="stat-card-value accent-purple">{assignedDays.length}</div></div>
        <div className="stat-card"><div className="stat-card-label">📝 Pending Reviews</div><div className="stat-card-value accent-orange">0</div></div>
        <div className="stat-card"><div className="stat-card-label">✅ Evaluated</div><div className="stat-card-value accent-green">0</div></div>
      </div>

      <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--text-lg)", marginBottom: "var(--space-4)" }}>Your Sessions</h2>
      <div style={{ display: "grid", gap: "var(--space-4)" }}>
        {assignedDays.map((day, i) => (
          <div className="card" key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontFamily: "var(--font-heading)", marginBottom: "var(--space-1)" }}>{day.title}</h3>
                <p style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>{day.date} • {day.time}</p>
              </div>
              <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
                <span className="badge badge-blue">{day.type}</span>
                <button className="btn btn-primary" style={{ padding: "var(--space-2) var(--space-4)" }}>Join Meet</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
