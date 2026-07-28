import { Link, useSearchParams } from 'react-router-dom';
import { CATEGORIES } from '../types/calculator';
import { calculators, searchCalculators, getByCategory } from '../data/calculators';
import { CalculatorCard } from '../components/CalculatorCard';

export function HomePage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const cat = params.get('cat') ?? '';

  let list = q ? searchCalculators(q) : calculators;
  if (cat) list = list.filter((c) => c.category === cat);

  const setCategory = (id: string) => {
    const next = new URLSearchParams(params);
    if (!id || id === cat) next.delete('cat');
    else next.set('cat', id);
    setParams(next);
  };

  return (
    <>
      <section className="hero">
        <h1>Clinical calculators with live scores</h1>
        <p>
          MDCalc-style medical decision tools — risk scores, equations, and criteria with instant results as you
          click, plus evidence summaries and next-step guidance for each calculator.
        </p>
        <div className="hero-stats">
          <span className="stat-pill">{calculators.length} calculators</span>
          <span className="stat-pill">{CATEGORIES.length} specialties</span>
          <span className="stat-pill">Live scoring</span>
          <span className="stat-pill">Evidence + next steps</span>
        </div>
      </section>

      <h2 className="section-title">
        Specialties <span>filter by category</span>
      </h2>
      <div className="category-grid">
        {CATEGORIES.map((c) => {
          const count = getByCategory(c.id).length;
          if (count === 0) return null;
          return (
            <button
              key={c.id}
              type="button"
              className={`category-card ${cat === c.id ? 'active' : ''}`}
              onClick={() => setCategory(c.id)}
            >
              <span className="category-icon">{c.icon}</span>
              <strong>{c.name}</strong>
              <small>
                {count} tool{count === 1 ? '' : 's'}
              </small>
            </button>
          );
        })}
      </div>

      <h2 className="section-title">
        {q ? `Results for “${q}”` : cat ? CATEGORIES.find((c) => c.id === cat)?.name ?? 'Calculators' : 'All calculators'}
        <span>
          {list.length} shown
          {(q || cat) && (
            <Link className="clear-filter" to="/">
              Clear filters
            </Link>
          )}
        </span>
      </h2>

      {list.length === 0 ? (
        <div className="empty-state">No calculators match your search. Try a different term or clear filters.</div>
      ) : (
        <div className="calc-grid">
          {list.map((c) => (
            <CalculatorCard key={c.id} calc={c} />
          ))}
        </div>
      )}
    </>
  );
}
