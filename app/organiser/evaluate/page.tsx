"use client";

export default function OrganiserEvaluatePage() {
  return (
    <div>
      <div className="portal-header">
        <div>
          <h1 className="portal-page-title">Evaluate <span className="accent-purple">Submissions</span></h1>
          <p className="portal-page-subtitle">Review and grade student submissions for your sessions</p>
        </div>
      </div>
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <div className="empty-state-title">No submissions yet</div>
          <div className="empty-state-text">Student task and test submissions for your assigned days will appear here for evaluation.</div>
        </div>
      </div>
    </div>
  );
}
