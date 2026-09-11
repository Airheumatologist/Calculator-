import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const urlQ = params.get('q') ?? '';
  const [draft, setDraft] = useState(urlQ);

  useEffect(() => {
    setDraft(urlQ);
  }, [urlQ]);

  return (
    <>
      <header className="app-header">
        <div className="app-header-inner">
          <Link to="/" className="logo-mark" aria-label="MedCalc home">
            <span className="logo-md">MD+</span>
            <span className="logo-calc">CALC</span>
          </Link>
          <div className="header-search">
            <input
              type="search"
              value={draft}
              placeholder="Calculator, Specialty, Condition"
              aria-label="Search calculators, specialties, conditions"
              autoComplete="off"
              onChange={(e) => {
                const value = e.target.value;
                setDraft(value);
                const next = new URLSearchParams();
                if (value) next.set('q', value);
                const search = next.toString();
                navigate({ pathname: '/', search }, { replace: true });
              }}
            />
            <svg
              className="search-icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
        </div>
      </header>
      <Outlet key={location.pathname} />
    </>
  );
}
