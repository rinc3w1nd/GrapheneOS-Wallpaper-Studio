/* styles/chic.js — tessellated GrapheneOS-mark grid (GOS-Chic port).
 * Depends on core.js. */
"use strict";

// Chic style: a tessellated grid of the GrapheneOS mark with one accent tile
// at the fingerprint position. SVG port of the GOS-Chic "signature look".
function generateChicSvg(p) {
  const W = p.width;
  const H = p.height;
  const unit = Math.min(W, H);
  const C = 2644.0798 / 2; // logo viewBox center

  const dark = p.chicTheme !== "light";
  const bg = dark ? "#000000" : "#f0f0f0";
  const tileBase = p.chicTileColor || (dark ? "#191919" : "#969696");
  const gradTop = scaleColor(tileBase, p.chicDeep ? 1.4 : 1.1);
  const gradBottom = scaleColor(tileBase, p.chicDeep ? 0.4 : 0.6);
  const flat = scaleColor(tileBase, 0.8);
  const [warm, cool] = complementaryPair(tileBase);

  const tileSize = unit * 0.15 * (p.chicTileScale || 1);
  const step = tileSize * (p.chicSpacing || 1.6);
  const accentCx = W * ((p.fingerprintXPct ?? 50) / 100);
  const accentCy = H * ((p.fingerprintYPct ?? 72.5) / 100);
  const weaveDeg = p.chicWeave ? (p.chicWeaveDeg || 3) : 0;
  const tessellate = p.chicTessellate !== false;
  const glow = p.chicEffect === "glow";

  function tileFill(row) {
    if (p.chicFill === "gradient") return "url(#chicGrad)";
    if (p.chicFill === "duotone") return row % 2 === 0 ? warm : cool;
    return flat;
  }

  function tile(cx, cy, size, fill, rot, withClass) {
    const s = (size / (C * 2)).toFixed(6);
    const t = `translate(${cx.toFixed(1)} ${cy.toFixed(1)})${rot ? ` rotate(${rot})` : ""} scale(${s}) translate(${-C} ${-C})`;
    return `<use href="#chicLogoPath"${withClass ? ' class="chic-tile"' : ""} fill="${fill}" transform="${t}"/>`;
  }

  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`];
  parts.push("<defs>");
  parts.push(`<path id="chicLogoPath" d="${OFFICIAL_LOGO_PATH}" fill-rule="nonzero"/>`);
  parts.push(`<linearGradient id="chicGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${gradTop}"/><stop offset="100%" stop-color="${gradBottom}"/></linearGradient>`);
  if (glow) {
    parts.push(`<filter id="chicGlow" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation="${(tileSize * 0.05).toFixed(1)}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);
  }
  parts.push("</defs>");
  parts.push(`<rect width="100%" height="100%" fill="${bg}"/>`);

  parts.push(`<g id="chic-grid"${glow ? ' filter="url(#chicGlow)"' : ""}>`);
  const cols = Math.ceil(W / step) + 2;
  const rows = Math.ceil(H / step) + 2;
  for (let j = -rows; j <= rows; j += 1) {
    for (let i = -cols; i <= cols; i += 1) {
      if (i === 0 && j === 0) continue; // accent replaces the center cell
      let x = accentCx + i * step;
      const y = accentCy + j * step;
      if (tessellate && (j & 1)) x += step / 2;
      if (x < -tileSize || x > W + tileSize || y < -tileSize || y > H + tileSize) continue;
      const rot = weaveDeg ? (((i + j) & 1) ? -weaveDeg : weaveDeg) : 0;
      parts.push(tile(x, y, tileSize, tileFill(Math.abs(j)), rot, true));
    }
  }
  parts.push("</g>");

  parts.push('<g id="chic-accent">');
  const accentSize = unit * ((p.fingerprintRadiusPct ?? 10) / 100) * 3.3;
  if (p.chicCenterFill) {
    parts.push(`<polygon points="${flatHexPoints(accentCx, accentCy, accentSize * 0.155)}" fill="#1f1f1f"/>`);
  }
  parts.push(tile(accentCx, accentCy, accentSize, p.chicAccentColor, 0, false));
  parts.push("</g>");

  parts.push("</svg>");
  return parts.join("\n");
}
