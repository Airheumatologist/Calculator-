import { describe, it } from 'vitest';
import { calculators } from '../src/data/calculators/index';

describe('Calculator Scoring Audit', () => {
  it('counts calculators', () => {
    console.log(`TOTAL_CALCULATORS: ${calculators.length}`);
  });
});
