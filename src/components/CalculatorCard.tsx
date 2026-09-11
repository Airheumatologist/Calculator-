import { Link } from 'react-router-dom';
import type { Calculator } from '../types/calculator';

export function CalculatorCard({ calc }: { calc: Calculator }) {
  return (
    <Link to={`/calc/${calc.id}`} className="calc-row">
      <h3>{calc.name}</h3>
      <p>{calc.description}</p>
    </Link>
  );
}
