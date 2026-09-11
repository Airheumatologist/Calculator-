import { Link, useSearchParams } from 'react-router-dom';
import { CATEGORIES } from '../types/calculator';
import { calculators, searchCalculators, getByCategory } from '../data/calculators';

export function HomePage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const cat = params.get('cat') ?? '';
  const tab = params.get('tab') === 'specialties' && !q ? 'specialties' : 'all';

  const setSearch = (next: { q?: string; tab?: string; cat?: string }) => {
    const p = new URLSearchParams();
    if (next.q) p.set('q', next.q);
    if (next.tab === 'specialties' && !next.q) p.set('tab', 'specialties');
    if (next.cat) p.set('cat', next.cat);
    setParams(p);
  };

  const matches = q ? searchCalculators(q) : calculators;
  const list = cat ? matches.filter((c) => c.category === cat) : matches;
  const catName = cat ? CATEGORIES.find((c) => c.id === cat)?.name : undefined;

  return (
    <main className="home-main">
      <div className="home-tabs">
        <button
          type="button"
          className={tab === 'all' ? 'home-tab active' : 'home-tab'}
          onClick={() => setSearch({ q, cat })}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          All Calculators
        </button>
        <button
          type="button"
          className={tab === 'specialties' ? 'home-tab active' : 'home-tab'}
          onClick={() => setSearch({ tab: 'specialties' })}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
            <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
            <circle cx="20" cy="10" r="2" />
          </svg>
          Specialties
        </button>
      </div>

      {tab === 'specialties' ? (
        CATEGORIES.map((category) => {
          const count = getByCategory(category.id).length;
          if (!count) return null;
          return (
            <button
              key={category.id}
              type="button"
              className="specialty-row"
              onClick={() => setSearch({ cat: category.id })}
            >
              <span>
                <strong>{category.name}</strong>
                <small>{category.description}</small>
              </span>
              <span className="count">{count}</span>
            </button>
          );
        })
      ) : (
        <>
          {cat ? (
            <div className="filter-bar">
              <span>{catName}</span>
              <button type="button" onClick={() => setSearch({ q })}>
                Clear
              </button>
            </div>
          ) : null}
          {list.length ? (
            list.map((calc) => (
              <Link key={calc.id} to={`/calc/${calc.id}`} className="calc-row">
                <h3>{calc.name}</h3>
                <p>{calc.description}</p>
              </Link>
            ))
          ) : (
            <div className="empty-state">No calculators match.</div>
          )}
        </>
      )}

      <p className="disclaimer">Educational use only. Not a substitute for clinical judgment.</p>
    </main>
  );
}
