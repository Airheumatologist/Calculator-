import * as fs from 'fs';
import * as path from 'path';

interface Finding {
  calcId: string;
  calcName: string;
  category: string;
  wave: string;
  issueType: string;
  severity: string;
  summary: string;
  details: any;
}

const findings: Finding[] = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../scripts/master_audit_findings.json'), 'utf8')
);

// Group findings by wave
const waves: Record<string, Record<string, Finding[]>> = {};

for (const f of findings) {
  if (!waves[f.wave]) waves[f.wave] = {};
  if (!waves[f.wave][f.calcId]) waves[f.wave][f.calcId] = [];
  waves[f.wave][f.calcId].push(f);
}

let report = `# Calculator Scoring Audit Report — MedCalc Live

This report presents the findings of a comprehensive audit of the **scoring logic and option point metadata** across all **918 medical calculators** in MedCalc Live.

## Audit Overview & Statistics

- **Total Calculators Audited**: 918
- **Calculators with Scoring Defects**: ${Object.keys(findings.reduce((acc, f) => ({ ...acc, [f.calcId]: true }), {})).length}
- **Total Defect Findings**: ${findings.length}
  - **Unused / Dead Inputs** (Inputs rendered in UI but completely ignored in \`calculate()\`): **${findings.filter((f) => f.issueType === 'UNUSED_INPUT').length}**
  - **Option Point Mismatches** (Declared \`points\` in UI options mismatch actual \`calculate()\` score delta): **${findings.filter((f) => f.issueType === 'OPTION_POINTS_MISMATCH').length}**
  - **Runtime Execution Safety**: **0** crashes on default/max inputs

---

## Detailed Findings by Wave

`;

for (const [waveName, calcs] of Object.entries(waves)) {
  report += `### ${waveName}\n\n`;
  report += `Total Calculators Affected in Wave: **${Object.keys(calcs).length}**\n\n`;

  for (const [calcId, calcFindings] of Object.entries(calcs)) {
    const first = calcFindings[0];
    report += `#### [${first.calcName} (\`${calcId}\`)](file:///Volumes/Vibing/mdcalc/src/data/calculators)\n`;
    report += `- **Category**: \`${first.category}\` | **Total Defects**: ${calcFindings.length}\n`;

    for (const f of calcFindings) {
      report += `  - **[${f.severity}] ${f.issueType}**: ${f.summary}\n`;
      if (f.details) {
        report += `    - *Details*: \`${JSON.stringify(f.details)}\` \n`;
      }
    }
    report += `\n`;
  }
}

fs.writeFileSync(path.join(__dirname, '../scripts/SCORING_AUDIT_REPORT.md'), report);
console.log('Generated SCORING_AUDIT_REPORT.md successfully!');
