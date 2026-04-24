// renders a tree structure as ascii-style text lines
// got the idea from linux 'tree' command
function renderTree(node, obj, prefix, isLast) {
  const lines = [];
  const connector = isLast ? '└── ' : '├── ';
  const extension = isLast ? '    ' : '│   ';

  lines.push(
    <div key={`${prefix}-${node}`}>
      <span className="connector">{prefix}{connector}</span>
      <span className="node">{node}</span>
    </div>
  );

  const children = Object.keys(obj);
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const childLines = renderTree(child, obj[child], prefix + extension, i === children.length - 1);
    lines.push(...childLines);
  }

  return lines;
}

// TreeCard component for each hierarchy
function TreeCard({ item }) {
  const isCycle = item.has_cycle;

  let treeContent = null;
  if (isCycle) {
    treeContent = <div style={{ color: '#f77', fontSize: '0.82rem', fontFamily: 'monospace' }}>⚠ Cycle detected — tree could not be built</div>;
  } else {
    const rootNode = item.root;
    const rootObj = item.tree[rootNode] || {};
    const children = Object.keys(rootObj);

    if (children.length === 0) {
      // leaf node, no children
      treeContent = (
        <div className="tree-visual">
          <span className="node">{rootNode}</span>
          <span style={{ color: '#555' }}> (leaf)</span>
        </div>
      );
    } else {
      // render tree
      const lines = [];
      lines.push(
        <div key="root">
          <span className="node">{rootNode}</span>
        </div>
      );
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const isLast = i === children.length - 1;
        lines.push(...renderTree(child, rootObj[child], '', isLast));
      }
      treeContent = <div className="tree-visual">{lines}</div>;
    }
  }

  return (
    <div className={`tree-card ${isCycle ? 'has-cycle' : ''}`}>
      <div className="tree-header">
        <span className="root-label">{item.root}</span>
        {isCycle && <span className="badge cycle">CYCLE</span>}
        {!isCycle && <span className="badge depth">depth: {item.depth}</span>}
      </div>
      {treeContent}
    </div>
  );
}

export default TreeCard;
