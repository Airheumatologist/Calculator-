import type { Calculator, EvidenceRef } from '../types/calculator';

function normalizeDoi(doi: string): string {
  return doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').trim();
}

function RefLinks({ ref }: { ref: EvidenceRef }) {
  const links: { href: string; label: string; title: string }[] = [];

  if (ref.pmid) {
    links.push({
      href: `https://pubmed.ncbi.nlm.nih.gov/${ref.pmid}/`,
      label: `PMID ${ref.pmid}`,
      title: 'Open PubMed abstract',
    });
  }

  if (ref.doi) {
    const doi = normalizeDoi(ref.doi);
    links.push({
      href: `https://doi.org/${doi}`,
      label: `DOI ${doi}`,
      title: 'Open DOI landing page',
    });
  }

  if (ref.url && !links.some((l) => l.href === ref.url)) {
    links.push({
      href: ref.url,
      label: 'Source',
      title: 'Open source document',
    });
  }

  if (links.length === 0) return null;

  return (
    <>
      {links.map((link, i) => (
        <span key={link.href}>
          {i === 0 ? ' · ' : ' · '}
          <a
            className="pmid-link"
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            title={link.title}
          >
            {link.label}
          </a>
        </span>
      ))}
    </>
  );
}

export function EvidencePanel({ calc }: { calc: Calculator }) {
  const { evidence } = calc;
  return (
    <div className="panel info-section">
      <div className="panel-header">Evidence</div>
      <div className="panel-body">
        <h3>Summary</h3>
        <p>{evidence.summary}</p>
        {evidence.formula && (
          <>
            <h3>Formula / Scoring</h3>
            <div className="formula-box">{evidence.formula}</div>
          </>
        )}
        <h3>Validation</h3>
        <p>{evidence.validation}</p>
        <h3>References</h3>
        <ul className="ref-list">
          {evidence.references.map((ref) => (
            <li key={ref.title + ref.citation}>
              <strong>{ref.title}</strong>
              <span>
                {ref.citation}
                {ref.year ? ` (${ref.year})` : ''}
                <RefLinks ref={ref} />
              </span>
            </li>
          ))}
        </ul>
        {calc.pearls && calc.pearls.length > 0 && (
          <>
            <h3 style={{ marginTop: '1rem' }}>Pearls & Pitfalls</h3>
            <ul className="pearl-list">
              {calc.pearls.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
