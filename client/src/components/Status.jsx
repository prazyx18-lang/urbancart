export function Loader({ label = 'Loading…' }) {
  return <div className="status-block"><span className="spinner" aria-hidden="true" /> {label}</div>;
}

export function ErrorBox({ message }) {
  if (!message) return null;
  return <div className="alert alert-error" role="alert">{message}</div>;
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="empty-state">
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}
