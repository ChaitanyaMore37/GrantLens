import {
  AlertCircle,
  ArrowUpDown,
  CheckCircle2,
  Search,
  X,
} from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { ReviewStatus } from "../../types";
import { riskLabel, statuses } from "../../utils";
export function RiskBadge({ score }: { score: number }) {
  return (
    <span className={`risk ${riskLabel(score).toLowerCase()}`}>
      {score}
      <span>{riskLabel(score)}</span>
    </span>
  );
}
export function StatusBadge({ status }: { status: ReviewStatus }) {
  return (
    <span className={`status ${status.toLowerCase()}`}>
      <i />
      {statuses[status]}
    </span>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">
          {eyebrow || "SCHOLARSHIP FORENSIC INTELLIGENCE"}
        </div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
export function Panel({
  title,
  icon,
  action,
  children,
  className = "",
}: {
  title?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <div className="panel-heading">
          <h2>
            {icon}
            {title}
          </h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function DataState({
  loading,
  error,
  empty,
  retry,
  children,
}: {
  loading?: boolean;
  error?: Error | null;
  empty?: boolean;
  retry?: () => void;
  children?: ReactNode;
}) {
  if (loading)
    return (
      <div role="status" className="skeleton">
        <span />
        <span />
        <span />
        Loading audit records…
      </div>
    );
  if (error)
    return (
      <div role="alert" className="empty-state">
        <AlertCircle />
        <h3>Unable to load records</h3>
        <p>{error.message}</p>
        {retry && <button onClick={retry}>Try again</button>}
      </div>
    );
  if (empty)
    return (
      <div className="empty-state">
        <Search />
        <h3>No matching records</h3>
        <p>Try changing your search or filters.</p>
      </div>
    );
  return <>{children}</>;
}
export function SearchField({
  value,
  onChange,
  placeholder = "Search records…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="search-field">
      <Search size={17} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button aria-label="Clear search" onClick={() => onChange("")}>
          <X size={14} />
        </button>
      )}
    </label>
  );
}
export function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  options: (string | { value: string; label: string })[];
}) {
  return (
    <label className="select-field">
      <span>{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option
            key={typeof o === "string" ? o : o.value}
            value={typeof o === "string" ? o : o.value}
          >
            {typeof o === "string" ? o || "All" : o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
export function SortHead({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button className="sort-head" onClick={onClick}>
      {children}
      <ArrowUpDown size={12} />
    </button>
  );
}
export function Pagination({
  page,
  setPage,
  total,
  size = 5,
}: {
  page: number;
  setPage: (p: number) => void;
  total: number;
  size?: number;
}) {
  const max = Math.max(1, Math.ceil(total / size));
  return (
    <div className="pagination">
      <span>
        Showing {total ? (page - 1) * size + 1 : 0}–
        {Math.min(page * size, total)} of {total} records
      </span>
      <div>
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
          Previous
        </button>
        <span className="page-number">
          {page} / {max}
        </span>
        <button disabled={page >= max} onClick={() => setPage(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="modal"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          if (e.key === "Tab") {
            const items = Array.from(
              e.currentTarget.querySelectorAll<HTMLElement>(
                "button,input,select,textarea,a[href]",
              ),
            );
            if (e.shiftKey && document.activeElement === items[0]) {
              e.preventDefault();
              items.at(-1)?.focus();
            } else if (!e.shiftKey && document.activeElement === items.at(-1)) {
              e.preventDefault();
              items[0]?.focus();
            }
          }
        }}
      >
        <div className="panel-heading">
          <h2>{title}</h2>
          <button
            autoFocus
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
const ToastContext = createContext<(message: string) => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");
  return (
    <ToastContext.Provider
      value={(m) => {
        setMessage(m);
        setTimeout(() => setMessage(""), 4500);
      }}
    >
      {children}
      {message && (
        <div role="status" className="toast">
          <CheckCircle2 size={19} />
          {message}
          <button
            aria-label="Dismiss notification"
            onClick={() => setMessage("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);
