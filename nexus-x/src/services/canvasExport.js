// Canvas 2D Export — live DOM measurements → Canvas 2D draw.
// Coordinates are all in canvas-space (same as node.position.x/y).

const BG_COLOR = '#09090b';

// =============================================
// WIRE PATHS (mirrors App.jsx getWirePath)
// =============================================

function buildWirePath(from, to, waypoints) {
  if (!from || !to) return null;
  if (!waypoints || waypoints.length === 0) {
    const dx = Math.abs(to.x - from.x);
    const offset = Math.max(50, dx * 0.4);
    return {
      type: 'bezier', from, to,
      fromCX: from.side === 'left' ? from.x - offset : from.x + offset,
      toCX:   to.side   === 'left' ? to.x   - offset : to.x   + offset,
    };
  }
  const AO = 30, R = 8;
  const pts = [
    { x: from.x, y: from.y },
    { x: from.side === 'left' ? from.x - AO : from.x + AO, y: from.y },
    ...waypoints,
    { x: to.side   === 'left' ? to.x   - AO : to.x   + AO, y: to.y },
    { x: to.x, y: to.y },
  ];
  return { type: 'ortho', pts, R };
}

function strokePath(ctx, p) {
  if (!p) return;
  ctx.beginPath();
  if (p.type === 'bezier') {
    ctx.moveTo(p.from.x, p.from.y);
    ctx.bezierCurveTo(p.fromCX, p.from.y, p.toCX, p.to.y, p.to.x, p.to.y);
  } else {
    const { pts, R } = p;
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const pr = pts[i - 1], c = pts[i], nx = pts[i + 1];
      if (!nx || i === pts.length - 1) { ctx.lineTo(c.x, c.y); continue; }
      const ax = c.x - pr.x, ay = c.y - pr.y, bx = nx.x - c.x, by = nx.y - c.y;
      const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
      const r = Math.min(la / 2, lb / 2, R);
      if (r < 2 || la < 4 || lb < 4) { ctx.lineTo(c.x, c.y); continue; }
      ctx.lineTo(c.x - (ax / la) * r, c.y - (ay / la) * r);
      ctx.quadraticCurveTo(c.x, c.y, c.x + (bx / lb) * r, c.y + (by / lb) * r);
    }
  }
  ctx.stroke();
}

// Sample cubic bezier at t (scalar)
function bezAt(t, p0, p1, p2, p3) {
  const u = 1 - t;
  return u*u*u*p0 + 3*u*u*t*p1 + 3*u*t*t*p2 + t*t*t*p3;
}

// Arc-length midpoint of a polyline — matches SVG textPath startOffset="50%"
function polylineMidpoint(pts) {
  const segs = [];
  let totalLen = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = pts[i + 1].x - pts[i].x, dy = pts[i + 1].y - pts[i].y;
    const len = Math.hypot(dx, dy);
    if (len < 0.01) continue;
    segs.push({ x0: pts[i].x, y0: pts[i].y, dx, dy, len });
    totalLen += len;
  }
  if (!segs.length) return { x: pts[0].x, y: pts[0].y, angle: 0 };
  let rem = totalLen / 2;
  for (const s of segs) {
    if (rem <= s.len) {
      const t = rem / s.len;
      return { x: s.x0 + s.dx * t, y: s.y0 + s.dy * t, angle: Math.atan2(s.dy, s.dx) };
    }
    rem -= s.len;
  }
  const last = segs[segs.length - 1];
  return { x: last.x0 + last.dx, y: last.y0 + last.dy, angle: Math.atan2(last.dy, last.dx) };
}

// =============================================
// DOM CAPTURE
// =============================================

function isTransparent(c) {
  return !c || c === 'transparent' || c === 'rgba(0, 0, 0, 0)';
}

function directText(el) {
  let s = '';
  for (const n of el.childNodes) if (n.nodeType === 3) s += n.textContent;
  return s.trim();
}

const SKIP_TEXT = /^[⠿×+⇄↕★☆🔗]$|^\d+%$/;

// Capture elements for ONE node, returning a group with clip bounds + elements[]
function captureNode(nodeEl, node, zoom) {
  const nodeScale = node.scale || 1;
  const nr = nodeEl.getBoundingClientRect();
  const nx = node.position.x;
  const ny = node.position.y;
  const nw = nr.width  / zoom;
  const nh = nr.height / zoom;
  const elements = [];

  const walk = (el) => {
    if (!(el instanceof HTMLElement)) return;
    if (el.getAttribute('data-export-ignore') != null) return;
    if (el.tagName === 'svg' || el.tagName === 'SVG') return;

    const r = el.getBoundingClientRect();
    if (r.width < 0.5 || r.height < 0.5) return;

    const cs = window.getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    const op = parseFloat(cs.opacity);
    if (op === 0) return;

    // Screen → canvas-space
    const cx = nx + (r.left - nr.left) / zoom;
    const cy = ny + (r.top  - nr.top)  / zoom;
    const cw = r.width  / zoom;
    const ch = r.height / zoom;

    const e = { x: cx, y: cy, w: cw, h: ch };
    if (op < 1) e.opacity = op;

    // Background
    if (!isTransparent(cs.backgroundColor)) e.bg = cs.backgroundColor;
    const bgImg = cs.backgroundImage;
    if (bgImg && bgImg !== 'none' && bgImg.includes('linear-gradient')) e.bgGradient = bgImg;

    // Border radius (scale for canvas-space)
    const bradius = parseFloat(cs.borderRadius);
    if (bradius > 0) e.radius = bradius * nodeScale;

    // Borders — CSS values are pre-transform, scale by nodeScale
    // In CSS border-box the border is INSIDE the box bounds, so we inset by half lineWidth
    const sides = ['Top','Bottom','Left','Right'];
    let allSame = true;
    let firstBorder = null;
    const borders = {};
    for (const s of sides) {
      const w = parseFloat(cs[`border${s}Width`]);
      const c = cs[`border${s}Color`];
      if (w > 0 && !isTransparent(c)) {
        borders[s.toLowerCase()] = { w: w * nodeScale, c };
        if (!firstBorder) firstBorder = { w: w * nodeScale, c };
        else if (borders[s.toLowerCase()].w !== firstBorder.w || c !== firstBorder.c) allSame = false;
      } else {
        allSame = false;
      }
    }
    const hasBorders = Object.keys(borders).length > 0;
    if (hasBorders) {
      if (allSame && firstBorder) {
        e.uniformBorder = firstBorder;
      } else {
        Object.assign(e, borders);
      }
    }

    // Anchor dot
    if (el.classList.contains('n313-anchor-dot')) e.isAnchor = true;

    // Text
    let txt = el.tagName === 'INPUT' ? (el.value || '') : directText(el);
    if (txt && !SKIP_TEXT.test(txt)) {
      e.text = txt;
      e.fontSize    = parseFloat(cs.fontSize) * nodeScale;
      e.fontFamily  = cs.fontFamily;
      e.fontWeight  = cs.fontWeight;
      e.color       = cs.color;
      e.textAlign   = cs.textAlign;
      e.textTransform = cs.textTransform;
      const ls = parseFloat(cs.letterSpacing);
      if (ls > 0) e.letterSpacing = ls * nodeScale;
      // Actual CSS padding for left/right-aligned text positioning
      const pl = parseFloat(cs.paddingLeft);
      const pr = parseFloat(cs.paddingRight);
      if (pl > 0) e.paddingLeft  = pl * nodeScale;
      if (pr > 0) e.paddingRight = pr * nodeScale;
    }

    elements.push(e);

    for (const child of el.children) {
      if (child instanceof SVGElement) continue;
      walk(child);
    }
  };

  walk(nodeEl);
  return { nx, ny, nw, nh, elements, nodeId: node.id };
}

// =============================================
// DRAWING
// =============================================

// Parse a simple 2-stop top-to-bottom linear-gradient from computed style
// e.g. "linear-gradient(rgba(239, 68, 68, 0.33), rgba(239, 68, 68, 0.2))"
function makeCanvasGradient(ctx, css, x, y, w, h) {
  const colors = css.match(/rgba?\([^)]+\)|#[0-9a-f]{3,8}/gi);
  if (!colors || colors.length < 2) return null;
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, colors[0]);
  g.addColorStop(1, colors[colors.length - 1]);
  return g;
}

function drawNodeGroup(ctx, group) {
  const { nx, ny, nw, nh, elements } = group;

  ctx.save();
  // Clip to node bounds (prevents border bleed outside)
  ctx.beginPath();
  ctx.rect(nx, ny, nw, nh);
  ctx.clip();

  for (const e of elements) {
    const { x, y, w, h } = e;
    const needAlpha = e.opacity != null && e.opacity < 1;
    if (needAlpha) { ctx.save(); ctx.globalAlpha = e.opacity; }

    const r = e.radius || 0;

    // Background — gradient takes priority over solid bg-color
    if (e.bgGradient) {
      const grad = makeCanvasGradient(ctx, e.bgGradient, x, y, w, h);
      if (grad) {
        ctx.fillStyle = grad;
        if (r > 0) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); }
        else ctx.fillRect(x, y, w, h);
      }
    } else if (e.bg) {
      ctx.fillStyle = e.bg;
      if (r > 0) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); }
      else ctx.fillRect(x, y, w, h);
    }

    // Anchor dot
    if (e.isAnchor) {
      ctx.fillStyle = e.bg || '#bbbbbb';
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Uniform border — draw as roundRect, inset by half lineWidth (matches CSS border-box)
    if (e.uniformBorder) {
      const hw = e.uniformBorder.w / 2;
      ctx.strokeStyle = e.uniformBorder.c;
      ctx.lineWidth   = e.uniformBorder.w;
      ctx.beginPath();
      ctx.roundRect(x + hw, y + hw, w - e.uniformBorder.w, h - e.uniformBorder.w, r);
      ctx.stroke();
    }

    // Individual borders — draw inset by half lineWidth
    const drawLine = (bw, bc, x1, y1, x2, y2) => {
      ctx.strokeStyle = bc;
      ctx.lineWidth   = bw;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    };
    const { top: bt, bottom: bb, left: bl, right: br } = e;
    if (bt) drawLine(bt.w, bt.c, x,     y + bt.w/2,      x + w, y + bt.w/2);
    if (bb) drawLine(bb.w, bb.c, x,     y + h - bb.w/2,  x + w, y + h - bb.w/2);
    if (bl) drawLine(bl.w, bl.c, x + bl.w/2, y,          x + bl.w/2, y + h);
    if (br) drawLine(br.w, br.c, x + w - br.w/2, y,      x + w - br.w/2, y + h);

    // Text
    if (e.text && e.fontSize) {
      const txt = e.textTransform === 'uppercase' ? e.text.toUpperCase() : e.text;
      ctx.font = `${e.fontWeight || 500} ${e.fontSize}px ${e.fontFamily || "'Space Grotesk',sans-serif"}`;
      ctx.fillStyle    = e.color || '#cccccc';
      ctx.textBaseline = 'middle';
      try { ctx.letterSpacing = e.letterSpacing > 0 ? `${e.letterSpacing}px` : '0px'; } catch (_) {}

      if (e.textAlign === 'center') {
        ctx.textAlign = 'center';
        ctx.fillText(txt, x + w / 2, y + h / 2);
      } else if (e.textAlign === 'right') {
        ctx.textAlign = 'right';
        ctx.fillText(txt, x + w - (e.paddingRight || 3), y + h / 2);
      } else {
        ctx.textAlign = 'left';
        ctx.fillText(txt, x + (e.paddingLeft || 3), y + h / 2);
      }
      try { ctx.letterSpacing = '0px'; } catch (_) {}
    }

    if (needAlpha) ctx.restore();
  }

  ctx.restore(); // releases clip
}

function drawWires(ctx, conns, anchorPositions, colorMap) {
  for (const conn of conns) {
    const from = anchorPositions[conn.from];
    const to   = anchorPositions[conn.to];
    if (!from || !to) continue;
    const color = colorMap?.get(conn.id) || '#22d3ee';
    const p = buildWirePath(from, to, conn.waypoints);
    if (!p) continue;

    if (conn.enhanced) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 5; ctx.lineCap = 'round';
      if (conn.dashPattern) ctx.setLineDash(conn.dashPattern.split(' ').map(Number));
      strokePath(ctx, p);
      ctx.restore();
    }

    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.setLineDash([]);
    if (conn.enhanced && conn.dashPattern) ctx.setLineDash(conn.dashPattern.split(' ').map(Number));
    ctx.shadowColor = color + '50'; ctx.shadowBlur = 4;
    strokePath(ctx, p);
    ctx.restore();
  }
}

// Returns true if the anchor at (pos.x, pos.y) belonging to anchorId is NOT
// covered by any node drawn AFTER the anchor's own node (i.e. it's visible).
// Anchor IDs are ${nodeId}-${sectionId}-${rowIndex}, so ownership is detected
// by matching the nodeId prefix.
function isAnchorVisible(anchorId, pos, groups) {
  // Find the index of this anchor's own node group
  let ownIdx = -1;
  for (let i = 0; i < groups.length; i++) {
    if (anchorId.startsWith(groups[i].nodeId + '-')) {
      ownIdx = i;
      break;
    }
  }
  if (ownIdx === -1) return true; // unknown node, assume visible

  // Check if any later (frontward) group covers this position
  for (let j = ownIdx + 1; j < groups.length; j++) {
    const g = groups[j];
    if (pos.x >= g.nx && pos.x <= g.nx + g.nw &&
        pos.y >= g.ny && pos.y <= g.ny + g.nh) {
      return false; // buried under a frontward node
    }
  }
  return true;
}

// Draw the anchor-exit stubs for EVERY connection ON TOP of all nodes.
// No visibility gating — the user wants wire endpoints visible regardless
// of whether the anchor's node is buried under another stacked node.
function drawWireEndpointStubs(ctx, conns, anchorPositions, colorMap) {
  const AO = 30; // must match buildWirePath anchor offset
  for (const conn of conns) {
    const from = anchorPositions[conn.from];
    const to   = anchorPositions[conn.to];
    if (!from || !to) continue;

    const color = colorMap?.get(conn.id) || '#22d3ee';
    const exitDx = (side) => side === 'left' ? -AO : AO;

    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.setLineDash([]);
    if (conn.enhanced && conn.dashPattern)
      ctx.setLineDash(conn.dashPattern.split(' ').map(Number));
    ctx.shadowColor = color + '50'; ctx.shadowBlur = 4;

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(from.x + exitDx(from.side), from.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(to.x + exitDx(to.side), to.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    ctx.restore();
  }
}

function drawWireLabels(ctx, connections, anchorPositions, colorMap) {
  for (const conn of connections) {
    let text = conn.label;
    if (!text && (conn.cableType || conn.cableLength)) {
      text = [conn.cableType, conn.cableLength].filter(Boolean).join(' \u2022 ');
    }
    if (!text) continue;

    const from = anchorPositions[conn.from];
    const to   = anchorPositions[conn.to];
    if (!from || !to) continue;
    const color = colorMap?.get(conn.id) || '#22d3ee';

    // Position label on the wire path
    let lx, ly, angle;
    const p = buildWirePath(from, to, conn.waypoints);
    if (p && p.type === 'bezier') {
      lx = bezAt(0.5, p.from.x, p.fromCX, p.toCX, p.to.x);
      ly = bezAt(0.5, p.from.y, p.from.y,  p.to.y,  p.to.y);
      // Tangent angle at midpoint
      const tx = bezAt(0.51, p.from.x, p.fromCX, p.toCX, p.to.x) -
                 bezAt(0.49, p.from.x, p.fromCX, p.toCX, p.to.x);
      const ty = bezAt(0.51, p.from.y, p.from.y, p.to.y, p.to.y) -
                 bezAt(0.49, p.from.y, p.from.y, p.to.y, p.to.y);
      angle = Math.atan2(ty, tx);
    } else {
      // Use arc-length midpoint for orthogonal paths to match SVG textPath startOffset="50%"
      const mid = polylineMidpoint(p ? p.pts : [from, to]);
      lx = mid.x; ly = mid.y; angle = mid.angle;
    }
    // Keep text left-to-right
    if (angle > Math.PI / 2)  angle -= Math.PI;
    if (angle < -Math.PI / 2) angle += Math.PI;

    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(angle);
    // Font matches what SVG wire labels render as (Space Grotesk, forced by global CSS)
    // textBaseline='alphabetic' + dy=-3 matches SVG <text dy={-3}>
    ctx.font = "500 4px 'Space Grotesk',sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.strokeStyle = '#18181b'; ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
    ctx.strokeText(text, 0, -3);
    ctx.fillStyle = color;
    ctx.fillText(text, 0, -3);
    ctx.restore();
  }
}

// =============================================
// TITLE BLOCK (mirrors TitleBlockOverlay.jsx in Canvas 2D)
// =============================================

async function drawTitleBlock(ctx, pageBounds, titleBlockData, showGrid) {
  const { x: bx, y: by, width: bw, height: bh } = pageBounds;
  const data = titleBlockData || {};
  const panelHeight = data.panelHeight || 80;

  const BORDER = 'rgba(255,255,255,0.10)';
  const TEXT_MUTED = '#666666';
  const PANEL_BG = '#111111';
  const SECTION_BG = '#0a0a0a';

  const panelY = by + bh - panelHeight;
  const logoW    = Math.round(bw * 0.14);
  const projectW = Math.round(bw * 0.30);
  const versionW = Math.round(bw * 0.14);
  const dateW    = Math.round(bw * 0.10);
  const notesW   = bw - logoW - projectW - versionW - dateW;

  const logoX    = bx;
  const projectX = bx + logoW;
  const versionX = bx + logoW + projectW;
  const dateX    = bx + logoW + projectW + versionW;
  const notesX   = bx + logoW + projectW + versionW + dateW;

  const LABEL_FONT = 8, VALUE_FONT = 10, TITLE_FONT = 14, PAD = 4, LABEL_H = 12;
  const contentY = panelY + LABEL_H + PAD;
  const contentH = panelHeight - LABEL_H - PAD * 2;

  ctx.save();

  // Drawing area border
  ctx.strokeStyle = BORDER; ctx.lineWidth = 1;
  ctx.strokeRect(bx, by, bw, bh - panelHeight);

  // Grid
  if (showGrid) {
    ctx.strokeStyle = BORDER; ctx.lineWidth = 0.5; ctx.setLineDash([4, 4]);
    for (let i = 1; i < 8; i++) {
      const x = bx + bw * i / 8;
      ctx.beginPath(); ctx.moveTo(x, by); ctx.lineTo(x, by + bh - panelHeight); ctx.stroke();
    }
    for (let i = 1; i < 6; i++) {
      const y = by + (bh - panelHeight) * i / 6;
      ctx.beginPath(); ctx.moveTo(bx, y); ctx.lineTo(bx + bw, y); ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  // Panel background
  ctx.fillStyle = PANEL_BG; ctx.fillRect(bx, panelY, bw, panelHeight);
  ctx.strokeStyle = BORDER; ctx.lineWidth = 1; ctx.strokeRect(bx, panelY, bw, panelHeight);

  // Logo section
  ctx.fillStyle = data.logoUrl ? 'transparent' : SECTION_BG;
  ctx.fillRect(logoX, panelY, logoW, panelHeight);
  ctx.strokeStyle = BORDER; ctx.strokeRect(logoX, panelY, logoW, panelHeight);
  if (data.logoUrl) {
    await new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        ctx.save();
        ctx.beginPath();
        ctx.rect(logoX + 16, panelY + 4, logoW - 32, panelHeight - 8);
        ctx.clip();
        const iw = logoW - 32, ih = panelHeight - 8;
        const s = Math.min(iw / img.width, ih / img.height);
        ctx.drawImage(img, logoX + 16 + (iw - img.width * s) / 2, panelY + 4 + (ih - img.height * s) / 2, img.width * s, img.height * s);
        ctx.restore(); resolve();
      };
      img.onerror = resolve; img.src = data.logoUrl;
    });
  }

  // Section helper
  const drawSection = (sx, sw, label, value, valFont, valWeight, color) => {
    ctx.fillStyle = SECTION_BG; ctx.fillRect(sx, panelY, sw, panelHeight);
    ctx.strokeStyle = BORDER; ctx.strokeRect(sx, panelY, sw, panelHeight);
    ctx.fillStyle = TEXT_MUTED;
    ctx.font = `500 ${LABEL_FONT}px 'Space Grotesk',sans-serif`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    try { ctx.letterSpacing = '2px'; } catch (_) {}
    ctx.fillText(label, sx + PAD, panelY + LABEL_FONT + 2);
    try { ctx.letterSpacing = '0px'; } catch (_) {}
    if (value) {
      ctx.fillStyle = color;
      ctx.font = `${valWeight} ${valFont}px 'Space Grotesk',sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.fillText(value, sx + PAD, contentY + contentH / 2);
    }
  };

  drawSection(projectX, projectW, 'PROJECT', data.projectName, TITLE_FONT, '500', '#e0e0e0');
  drawSection(versionX, versionW, 'VERSION', data.version,     VALUE_FONT, '400', '#bbbbbb');
  drawSection(dateX,    dateW,    'DATE',    data.date,         VALUE_FONT, '400', '#e0e0e0');
  drawSection(notesX,   notesW,   'NOTES',   data.notes,        8,          '400', '#999999');

  ctx.restore();
}

// =============================================
// MAIN EXPORT
// =============================================

export async function exportToCanvas(canvasEl, nodes, connections, anchorPositions, pageBounds, scale, connectionColorMap, zoom, titleBlockData, showGrid) {
  await document.fonts.ready;

  const { x: ox, y: oy, width: w, height: h } = pageBounds;
  const canvas = document.createElement('canvas');
  canvas.width  = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d');

  ctx.scale(scale, scale);
  ctx.translate(-ox, -oy);

  // Background
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(ox, oy, w, h);

  // Capture all nodes from live DOM
  const groups = [];
  canvasEl.querySelectorAll('[data-node-id]').forEach(nodeEl => {
    const node = nodes[nodeEl.getAttribute('data-node-id')];
    if (!node) return;
    groups.push(captureNode(nodeEl, node, zoom));
  });

  // Draw back wires → nodes → front wires → anchor dots (on top) → endpoint stubs → labels
  drawWires(ctx, connections.filter(c => c.zLayer === 'back'), anchorPositions, connectionColorMap);
  groups.forEach(g => drawNodeGroup(ctx, g));
  drawWires(ctx, connections.filter(c => c.zLayer !== 'back'), anchorPositions, connectionColorMap);

  // Re-draw anchor dots on top of nodes — but only for anchors NOT covered by a
  // frontward node, matching live view visibility (buried anchors stay hidden).
  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi];
    for (const e of group.elements) {
      if (!e.isAnchor) continue;
      const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
      // Check if covered by any later (frontward) group
      let covered = false;
      for (let j = gi + 1; j < groups.length; j++) {
        const g = groups[j];
        if (cx >= g.nx && cx <= g.nx + g.nw && cy >= g.ny && cy <= g.ny + g.nh) {
          covered = true; break;
        }
      }
      if (covered) continue;
      ctx.save();
      if (e.opacity != null) ctx.globalAlpha = e.opacity;
      ctx.fillStyle = e.bg || '#666666';
      ctx.beginPath();
      ctx.arc(cx, cy, Math.min(e.w, e.h) / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawWireLabels(ctx, connections, anchorPositions, connectionColorMap);

  if (titleBlockData) await drawTitleBlock(ctx, pageBounds, titleBlockData, showGrid);

  return canvas;
}
