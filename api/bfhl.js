


const USER_INFO = {
  user_id: "anubhav_parashar_24042026",
  email_id: "ap9748@srmist.edu.in",
  college_roll_number: "RA2311003030535"
};

// checks format like "A->B" — single uppercase letters only, no self-loops
function isValidEdge(edge) {
  const trimmed = edge.trim();
  const parts = trimmed.split('->');
  if (parts.length !== 2) return false;

  const left = parts[0].trim();
  const right = parts[1].trim();
  const re = /^[A-Z]$/;
  if (!re.test(left) || !re.test(right)) return false;
  if (left === right) return false;

  return true;
}

// standard DFS cycle detection with recursion stack
function hasCycle(adjList, start, visited, recStack) {
  visited.add(start);
  recStack.add(start);

  const neighbors = adjList.get(start) || [];
  for (const neighbor of neighbors) {
    if (!visited.has(neighbor)) {
      if (hasCycle(adjList, neighbor, visited, recStack)) return true;
    } else if (recStack.has(neighbor)) {
      return true;
    }
  }

  recStack.delete(start);
  return false;
}

// build nested tree object recursively
function buildTree(node, adjList, visited) {
  const children = adjList.get(node) || [];
  const result = {};

  for (const child of children) {
    if (!visited.has(child)) {
      visited.add(child);
      result[child] = buildTree(child, adjList, visited);
    }
  }

  return result;
}

// count depth (nodes, not edges)
function getDepth(node, adjList, visited = new Set()) {
  if (visited.has(node)) return 0;
  visited.add(node);
  const children = adjList.get(node) || [];
  if (children.length === 0) return 1;

  let max = 0;
  for (const child of children) {
    const d = getDepth(child, adjList, visited);
    if (d > max) max = d;
  }
  return 1 + max;
}

function processEdges(data) {
  const invalid_entries = [];
  const duplicate_edges = [];
  const seenEdges = new Set();
  const validEdges = [];

  // step 1: validate and deduplicate
  for (const raw of data) {
    const edge = typeof raw === 'string' ? raw.trim() : String(raw).trim();

    if (!isValidEdge(edge)) {
      invalid_entries.push(raw);
      continue;
    }

    const parts = edge.split('->');
    const canonical = `${parts[0].trim()}->${parts[1].trim()}`;

    if (seenEdges.has(canonical)) {
      if (!duplicate_edges.includes(canonical)) duplicate_edges.push(canonical);
      continue;
    }

    seenEdges.add(canonical);
    validEdges.push(canonical);
  }

  // step 2: build adjacency list — first parent wins for multi-parent nodes
  const adjList = new Map();
  const parentOf = new Map();

  for (const edge of validEdges) {
    const [parent, child] = edge.split('->');
    if (parentOf.has(child)) continue;

    parentOf.set(child, parent);
    if (!adjList.has(parent)) adjList.set(parent, []);
    adjList.get(parent).push(child);
  }

  // step 3: collect all nodes and find roots (nodes with no parent)
  const allNodes = new Set();
  for (const [parent, children] of adjList.entries()) {
    allNodes.add(parent);
    for (const c of children) allNodes.add(c);
  }

  const roots = [];
  for (const node of allNodes) {
    if (!parentOf.has(node)) roots.push(node);
  }
  roots.sort();

  // step 4: build hierarchies, detect cycles
  const hierarchies = [];
  let total_trees = 0;
  let total_cycles = 0;
  let largest_tree_root = null;
  let largest_tree_depth = 0;
  const globalVisited = new Set();

  for (const root of roots) {
    const visited = new Set();
    const recStack = new Set();
    const cycleFound = hasCycle(adjList, root, visited, recStack);
    for (const v of visited) globalVisited.add(v);
    globalVisited.add(root);

    if (cycleFound) {
      total_cycles++;
      hierarchies.push({ root, tree: {}, has_cycle: true, depth: 0 });
    } else {
      total_trees++;
      const treeVisited = new Set([root]);
      const tree = buildTree(root, adjList, treeVisited);
      const depth = getDepth(root, adjList);

      hierarchies.push({ root, tree: { [root]: tree }, has_cycle: false, depth });

      if (depth > largest_tree_depth) {
        largest_tree_depth = depth;
        largest_tree_root = root;
      } else if (depth === largest_tree_depth && (largest_tree_root === null || root < largest_tree_root)) {
        largest_tree_root = root;
      }
    }
  }

  // step 5: handle pure-cycle components (all nodes are children of each other)
  const uvVisited = new Set();
  const unvisited = [...allNodes].filter(n => !globalVisited.has(n)).sort();

  for (const startNode of unvisited) {
    if (uvVisited.has(startNode)) continue;

    const component = [];
    const stack = [startNode];
    while (stack.length > 0) {
      const n = stack.pop();
      if (uvVisited.has(n)) continue;
      uvVisited.add(n);
      component.push(n);
      for (const c of adjList.get(n) || []) {
        if (!uvVisited.has(c)) stack.push(c);
      }
    }

    component.sort();
    total_cycles++;
    hierarchies.push({ root: component[0], tree: {}, has_cycle: true, depth: 0 });
  }

  return {
    hierarchies,
    invalid_entries,
    duplicate_edges,
    summary: { total_trees, total_cycles, largest_tree_root: largest_tree_root || null }
  };
}

// vercel serverless handler
export default function handler(req, res) {
  // allow all origins — same as the cors() middleware we had before
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({ user: USER_INFO });
  }

  if (req.method === 'POST') {
    const { data } = req.body || {};

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ error: 'data field must be an array' });
    }

    try {
      const result = processEdges(data);
      return res.status(200).json({ user: USER_INFO, result });
    } catch (err) {
      console.error('handler error:', err);
      return res.status(500).json({ error: 'internal server error' });
    }
  }

  return res.status(405).json({ error: 'method not allowed' });
}
