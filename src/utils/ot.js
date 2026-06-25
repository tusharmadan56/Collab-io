// Operational Transformation (OT) engine
//
// Operation types:
//   insert: { type: 'insert', position: number, text: string }
//   delete: { type: 'delete', position: number, length: number }
//   retain: { type: 'retain', length: number }
//
// transform(op1, op2) resolves conflicts when two ops target the same document version.
// Convention: op1 has priority (server-side) when positions collide.

function apply(doc, op) {
  switch (op.type) {
    case 'insert':
      return doc.slice(0, op.position) + op.text + doc.slice(op.position);

    case 'delete': {
      const end = Math.min(op.position + op.length, doc.length);
      return doc.slice(0, op.position) + doc.slice(end);
    }

    case 'retain':
      return doc;

    default:
      throw new Error(`Unknown operation type: ${op.type}`);
  }
}

function applyAll(doc, ops) {
  return ops.reduce((current, op) => apply(current, op), doc);
}

// Transform op2 so it can be applied AFTER op1.
// Both ops were intended for the same document state — after op1 is applied,
// op2's positions may need adjustment.
function transform(op1, op2) {
  if (op1.type === 'retain' || op2.type === 'retain') {
    return { ...op2 };
  }

  // INSERT vs INSERT
  if (op1.type === 'insert' && op2.type === 'insert') {
    // op2 at or after op1's position — shift right by inserted text length
    if (op2.position >= op1.position) {
      return { ...op2, position: op2.position + op1.text.length };
    }
    return { ...op2 };
  }

  // INSERT vs DELETE
  if (op1.type === 'insert' && op2.type === 'delete') {
    if (op2.position >= op1.position) {
      return { ...op2, position: op2.position + op1.text.length };
    }
    // Delete range overlaps the insert point — extend delete to cover inserted text
    if (op2.position + op2.length > op1.position) {
      return { ...op2, length: op2.length + op1.text.length };
    }
    return { ...op2 };
  }

  // DELETE vs INSERT
  if (op1.type === 'delete' && op2.type === 'insert') {
    if (op2.position >= op1.position + op1.length) {
      return { ...op2, position: op2.position - op1.length };
    }
    // Insert inside deleted region — collapse to delete start
    if (op2.position >= op1.position) {
      return { ...op2, position: op1.position };
    }
    return { ...op2 };
  }

  // DELETE vs DELETE — most complex case due to overlapping ranges
  if (op1.type === 'delete' && op2.type === 'delete') {
    const op1End = op1.position + op1.length;
    const op2End = op2.position + op2.length;

    // No overlap: op2 entirely after op1
    if (op2.position >= op1End) {
      return { ...op2, position: op2.position - op1.length };
    }

    // No overlap: op2 entirely before op1
    if (op2End <= op1.position) {
      return { ...op2 };
    }

    // op2 fully inside op1 — already deleted, nothing left to do
    if (op2.position >= op1.position && op2End <= op1End) {
      return { type: 'retain', length: 0 };
    }

    // op2 fully contains op1 — shrink by what op1 already deleted
    if (op2.position < op1.position && op2End > op1End) {
      return { ...op2, length: op2.length - op1.length };
    }

    // Partial overlap: op2 starts before op1
    if (op2.position < op1.position) {
      return { ...op2, length: op1.position - op2.position };
    }

    // Partial overlap: op2 starts inside op1 but extends beyond
    return {
      ...op2,
      position: op1.position,
      length: op2End - op1End,
    };
  }

  return { ...op2 };
}

// Transform an array of client ops against server ops (rebase)
function transformAll(clientOps, serverOps) {
  let transformed = [...clientOps];

  for (const serverOp of serverOps) {
    transformed = transformed.map((clientOp) => transform(serverOp, clientOp));
  }

  return transformed;
}

module.exports = { apply, applyAll, transform, transformAll };
