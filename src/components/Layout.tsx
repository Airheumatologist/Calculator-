import { Link, Outlet, useNavigate, useSearchParams } from 'react-router-dom';
import { calculators } from '../data/calculators';

export function Layout() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const q = params.get('q') ?? '';

  return (
    <>
      <header className="app-header">
        <div className="app-header-inner">
          <Link to="/" className="brand">
            <div className="brand-mark">MD</div>
            <div className="brand-text">
              <strong>MedCalc Live</strong>
              <span>Evidence-based clinical calculators</span>
            </div>
          </Link>
          <form
            className="header-search"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const query = String(fd.get('q') ?? '').trim();
              navigate(query ? `/?q=${encodeURIComponent(query)}` : '/');
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              name="q"
              key={q}
              defaultValue={q}
              placeholder="Search calculators, scores, equations…"
              aria-label="Search calculators"
            />
          </form>
          <div className="header-meta">{calculators.length}+ calculators</div>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <footer className="footer">
        <strong>Educational use only.</strong> Not a substitute for clinical judgment. Verify formulas and local
        protocols before patient care decisions. Inspired by MDCalc-style decision support tools.
      </footer>
    </>
  );
}
