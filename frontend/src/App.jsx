import { useState } from 'react'
import TreeCard from './TreeCard.jsx'


const API_URL = '/api/bfhl';


const PLACEHOLDER = `A->B
A->C
B->D
C->E
hello
A->A
A->B`;

function App() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setResult(null);

    const lines = input.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    if (lines.length === 0) {
      setError('please enter at least one edge');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: lines }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `server returned ${res.status}`);
      }

      const data = await res.json();
      // pull the two top-level keys out so the rest of the JSX stays clean
      setResult({ user: data.user, result: data.result });
    } catch (err) {
      setError(err.message || 'something went wrong, is the backend running?');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <h1> BFHL Tree Builder</h1>
      <p className="subtitle">paste edges like "A-&gt;B" (one per line) and see the tree structure</p>

      <form onSubmit={handleSubmit}>
        <div className="input-section">
          <label>Input Edges</label>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={PLACEHOLDER}
            spellCheck={false}
          />
          <p className="hint">one edge per line · format: X-&gt;Y (uppercase letters only)</p>
        </div>
        <button type="submit" className="btn-submit" disabled={loading}>
          {loading ? 'processing...' : 'Build Trees'}
        </button>
      </form>

      {error && (
        <div className="error-box" style={{ marginTop: '1.2rem' }}>
          ❌ {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: '2rem' }}>

          {/* user info */}
          <div className="result-section">
            <h2>User Info</h2>
            <div className="info-card">
              <div className="info-row">
                <span>User ID</span>
                <span>{result.user.user_id}</span>
              </div>
              <div className="info-row">
                <span>Email</span>
                <span>{result.user.email_id}</span>
              </div>
              <div className="info-row">
                <span>Roll Number</span>
                <span>{result.user.college_roll_number}</span>
              </div>
              <div className="info-row">
                <span>Largest Tree Root</span>
                <span>{result.result.summary.largest_tree_root || '—'}</span>
              </div>
            </div>
          </div>

          {/* summary numbers */}
          <div className="result-section">
            <h2>Summary</h2>
            <div className="summary-grid">
              <div className="summary-stat">
                <div className="num">{result.result.summary.total_trees}</div>
                <div className="label">Trees</div>
              </div>
              <div className="summary-stat">
                <div className="num">{result.result.summary.total_cycles}</div>
                <div className="label">Cycles</div>
              </div>
              <div className="summary-stat">
                <div className="num">{result.result.hierarchies.length}</div>
                <div className="label">Components</div>
              </div>
            </div>
          </div>

          {/* invalid entries */}
          <div className="result-section">
            <h2>Invalid Entries</h2>
            {result.result.invalid_entries.length === 0
              ? <span className="tag none">none</span>
              : <div className="tag-list">
                  {result.result.invalid_entries.map((e, i) => (
                    <span key={i} className="tag invalid">{e}</span>
                  ))}
                </div>
            }
          </div>

          {/* duplicates */}
          <div className="result-section">
            <h2>Duplicate Edges</h2>
            {result.result.duplicate_edges.length === 0
              ? <span className="tag none">none</span>
              : <div className="tag-list">
                  {result.result.duplicate_edges.map((e, i) => (
                    <span key={i} className="tag duplicate">{e}</span>
                  ))}
                </div>
            }
          </div>

          {/* hierarchies */}
          <div className="result-section">
            <h2>Hierarchies ({result.result.hierarchies.length})</h2>
            {result.result.hierarchies.length === 0
              ? <span style={{ color: '#555', fontSize: '0.85rem' }}>no valid trees to show</span>
              : result.result.hierarchies.map((item, i) => (
                  <TreeCard key={i} item={item} />
                ))
            }
          </div>

        </div>
      )}
    </div>
  );
}

export default App;
