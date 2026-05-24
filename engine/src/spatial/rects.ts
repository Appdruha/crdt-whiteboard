export function rectsIntersect(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number
) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export function intersectsBounds(
  item: { x: number; y: number; width: number; height: number },
  bounds: { x: number; y: number; width: number; height: number }
) {
  return rectsIntersect(
    item.x,
    item.y,
    item.width,
    item.height,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height
  );
}
