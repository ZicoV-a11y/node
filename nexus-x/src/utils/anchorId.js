// Anchor IDs encode their owning node. Format: "node-{timestamp}-{rest...}"
// Node IDs always have 2 segments: "node-TIMESTAMP".
export const getNodeIdFromAnchor = (anchorId) =>
  anchorId.split('-').slice(0, 2).join('-');
