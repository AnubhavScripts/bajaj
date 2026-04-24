// processor.js — all the actual logic lives here
// took me a while to get cycles right lol

// checks if edge string is valid format like "A->B"
// single uppercase letter on both sides, separated by ->
function isValidEdge(edge) {
  // trim first before checking
  const trimmed = edge.trim();
  const parts = trimmed.split('->');
  
  // must split into exactly 2 parts
  if (parts.length !== 2) return false;

  const left = parts[0].trim();
  const right = parts[1].trim();

  // both must be single uppercase letter
  const re = /^[A-Z]$/;
  if (!re.test(left) || !re.test(right)) return false;

  // no self loops
  if (left === right) return false;

  return true;
}

// detect cycle in the graph using DFS
// returns true if cycle found
function hasCycle(adjList, start, visited, recStack) {
  visited.add(start);
  recStack.add(start);

  const neighbors = adjList.get(start) || [];
  for (const neighbor of neighbors) {
    if (!visited.has(neighbor)) {
      if (hasCycle(adjList, neighbor, visited, recStack)) {
        return true;
      }
    } else if (recStack.has(neighbor)) {
      return true;
    }
  }

  recStack.delete(start);
  return false;
}

// build tree object recursively from adj list
// depth = count of nodes from root to deepest leaf
function buildTree(node, adjList, visited) {
  const children = adjList.get(node) || [];
  const result = {};

  for (const child of children) {
    // avoid infinite loops (shouldnt happen after cycle check but just in case)
    if (!visited.has(child)) {
      visited.add(child);
      result[child] = buildTree(child, adjList, visited);
    }
  }

  return result;
}

// count depth of tree (nodes not edges)
function getDepth(node, adjList) {
  const children = adjList.get(node) || [];
  if (children.length === 0) return 1;

  let maxChildDepth = 0;
  for (const child of children) {
    const d = getDepth(child, adjList);
    if (d > maxChildDepth) maxChildDepth = d;
  }

  return 1 + maxChildDepth;
}

function processEdges(data) {
  const invalid_entries = [];
  const duplicate_edges = [];
  const seenEdges = new Set(); // track unique edges
  const validEdges = [];

  // step 1: validate all input
  for (const raw of data) {
    const edge = typeof raw === 'string' ? raw.trim() : String(raw).trim();

    if (!isValidEdge(edge)) {
      invalid_entries.push(raw); // keep original for reporting
      continue;
    }

    const parts = edge.split('->');
    const canonical = `${parts[0].trim()}->${parts[1].trim()}`;

    if (seenEdges.has(canonical)) {
      // already seen this exact edge
      if (!duplicate_edges.includes(canonical)) {
        duplicate_edges.push(canonical);
      }
      continue;
    }

    seenEdges.add(canonical);
    validEdges.push(canonical);
  }

  // step 2: build adjacency list, handle multiple parents
  // first parent wins rule
  const adjList = new Map(); // parent -> [children]
  const parentOf = new Map(); // child -> parent (first one wins)

  for (const edge of validEdges) {
    const [parent, child] = edge.split('->');

    if (parentOf.has(child)) {
      // this child already has a parent, ignore silently
      // but we still add to adj list for the first parent relationship
      continue;
    }

    parentOf.set(child, parent);

    if (!adjList.has(parent)) {
      adjList.set(parent, []);
    }
    adjList.get(parent).push(child);
  }

  // step 3: find all nodes that appear
  const allNodes = new Set();
  for (const [parent, children] of adjList.entries()) {
    allNodes.add(parent);
    for (const c of children) allNodes.add(c);
  }

  // roots = nodes that have no parent
  const roots = [];
  for (const node of allNodes) {
    if (!parentOf.has(node)) {
      roots.push(node);
    }
  }

  // sort roots lexicographically (for consistent output)
  roots.sort();

  // step 4: detect cycles per connected component
  // we need to find components first
  // actually easier: for each root, check if its subtree has cycle

  const hierarchies = [];
  let total_trees = 0;
  let total_cycles = 0;
  let largest_tree_root = null;
  let largest_tree_depth = 0;

  // track ALL nodes visited across root passes
  // so we can find cycle-only nodes (pure cycles with no external root)
  const globalVisited = new Set();

  for (const root of roots) {
    // check for cycle in this root's subgraph
    const visited = new Set();
    const recStack = new Set();
    const cycleFound = hasCycle(adjList, root, visited, recStack);

    // mark all visited nodes globally
    for (const v of visited) globalVisited.add(v);
    globalVisited.add(root);

    if (cycleFound) {
      total_cycles++;
      hierarchies.push({
        root: root,
        tree: {},
        has_cycle: true,
        depth: 0
      });
    } else {
      total_trees++;
      const treeVisited = new Set([root]);
      const tree = buildTree(root, adjList, treeVisited);
      const depth = getDepth(root, adjList);

      hierarchies.push({
        root: root,
        tree: { [root]: tree },
        has_cycle: false,
        depth: depth
      });

      // track largest tree
      if (depth > largest_tree_depth) {
        largest_tree_depth = depth;
        largest_tree_root = root;
      } else if (depth === largest_tree_depth) {
        // tie-break: lexicographically smaller root wins
        if (largest_tree_root === null || root < largest_tree_root) {
          largest_tree_root = root;
        }
      }
    }
  }

  // handle pure cycle components — nodes where everyone is a child of someone
  // these nodes won't appear in globalVisited since we never started DFS from them
  const unvisited = [];
  for (const node of allNodes) {
    if (!globalVisited.has(node)) {
      unvisited.push(node);
    }
  }

  // group unvisited into their connected components using the adjList
  // just do a simple BFS/DFS per component
  const uvVisited = new Set();
  for (const startNode of unvisited.sort()) {
    if (uvVisited.has(startNode)) continue;

    // DFS to find all nodes in this component
    const component = [];
    const stack = [startNode];
    while (stack.length > 0) {
      const n = stack.pop();
      if (uvVisited.has(n)) continue;
      uvVisited.add(n);
      component.push(n);
      const children = adjList.get(n) || [];
      for (const c of children) {
        if (!uvVisited.has(c)) stack.push(c);
      }
    }

    // pick smallest node as the "representative root" for display
    component.sort();
    const rep = component[0];

    // these are definitely cycles since they have no real root
    total_cycles++;
    hierarchies.push({
      root: rep,
      tree: {},
      has_cycle: true,
      depth: 0
    });
  }

  const summary = {
    total_trees,
    total_cycles,
    largest_tree_root: largest_tree_root || null
  };

  return {
    hierarchies,
    invalid_entries,
    duplicate_edges,
    summary
  };
}

module.exports = { processEdges };
