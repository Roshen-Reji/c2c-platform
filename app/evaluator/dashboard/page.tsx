"use client";

export default function EvaluatorDashboard() {
  return (
    <div>
      <div className="portal-header">
        <div>
          <h1 className="portal-page-title">Evaluator <span className="accent-blue">Dashboard</span></h1>
          <p className="portal-page-subtitle">Monitor and evaluate your assigned students</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-card-label">👥 Assigned Students</div><div className="stat-card-value accent-blue">0</div></div>
        <div className="stat-card"><div className="stat-card-label">📝 Pending Reviews</div><div className="stat-card-value accent-orange">0</div></div>
        <div className="stat-card"><div className="stat-card-label">✅ Evaluated</div><div className="stat-card-value accent-green">0</div></div>
        <div className="stat-card"><div className="stat-card-label">⭐ Avg Points Given</div><div className="stat-card-value accent-primary">0</div></div>
      </div>

      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <div className="empty-state-title">No students assigned yet</div>
          <div className="empty-state-text">Once the admin assigns students to you, they will appear here for monitoring and evaluation.</div>
        </div>
      </div>
    </div>
  );
}
