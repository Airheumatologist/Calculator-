import { Link } from 'react-router-dom';
import type { Calculator } from '../types/calculator';
import { CATEGORIES } from '../types/calculator';

export function CalculatorCard({ calc }: { calc: Calculator }) {
  const cat = CATEGORIES.find((c) => c.id === calc.category);
  return (
    <Link to={`/calc/${calc.id}`} className="calc-card">
      <div className="calc-card-top">
        <h3>{calc.shortName}</h3>
        <span className="badge">{cat?.name ?? calc.category}</span>
      </div>
      <p>{calc.description}</p>
      <div className="calc-card-footer">
        {calc.tags.slice(0, 3).map((t) => (
          <span className="tag" key={t}>
            {t}
          </span>
        ))}
      </div>
    </Link>
  );
}
