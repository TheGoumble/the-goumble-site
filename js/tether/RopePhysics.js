/* ============================================================
   RopePhysics — ambient drift + hard leash + verlet rope chain.
   charPos/velocity are mutated in place; the rope chain is purely
   cosmetic (draws the cable, never drives position).
   Call: createRopePhysics(anchor, driftZone, charPos, velocity)
     -> { stepCharacter, updateRope, ropeToPath }
   ============================================================ */

function createRopePhysics(anchor, driftZone, charPos, velocity) {
  const ROPE_LENGTH = 500;        // hard leash — rope can't stretch past this
  const MAX_DRIFT_SPEED = 0.3;    // top wander speed (px/frame)
  const RETARGET_CHANCE = 0.006;  // odds/frame of picking a new wander heading
  const EASE = 0.012;             // how gradually velocity bends toward the target
  const WALL_START = 0.85;        // soft wall begins at 85% of the zone's radius
  const WALL_FORCE = 0.02;        // soft wall push strength
  const WALL_DAMPING = 0.4;       // extra damping near the wall (prevents orbiting)

  const SEGMENT_COUNT = 16;
  const SEG_LEN = ROPE_LENGTH / SEGMENT_COUNT;
  const DAMPING = 0.992;
  const CONSTRAINT_ITERATIONS = 6;

  let ropePoints = null;

  // speed stays in a narrow band (60-100% of max) so it wanders in
  // heading only, never slowing near zero or darting to full speed
  const randomTarget = () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = MAX_DRIFT_SPEED * (0.6 + Math.random() * 0.4);
    return { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
  };
  let target = randomTarget();

  function stepCharacter() {
    if (Math.random() < RETARGET_CHANCE) target = randomTarget();
    velocity.x += (target.x - velocity.x) * EASE;
    velocity.y += (target.y - velocity.y) * EASE;

    const { zone } = driftZone;
    const { normDist, dirX, dirY } = driftZone.distanceFraction(charPos);
    if (normDist > WALL_START) {
      const overshoot = normDist - WALL_START;
      velocity.x -= dirX * overshoot * zone.radiusX * WALL_FORCE;
      velocity.y -= dirY * overshoot * zone.radiusY * WALL_FORCE;
      const damp = 1 - Math.min(overshoot * WALL_DAMPING, 0.5);
      velocity.x *= damp;
      velocity.y *= damp;
    }

    charPos.x += velocity.x;
    charPos.y += velocity.y;

    // hard leash: clamp distance from anchor to ROPE_LENGTH
    const dx = charPos.x - anchor.x, dy = charPos.y - anchor.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > ROPE_LENGTH) {
      const scale = ROPE_LENGTH / dist;
      charPos.x = anchor.x + dx * scale;
      charPos.y = anchor.y + dy * scale;
      velocity.x *= 0.2;
      velocity.y *= 0.2;
    }
  }

  function initRope() {
    ropePoints = [];
    for (let i = 0; i <= SEGMENT_COUNT; i++) {
      const t = i / SEGMENT_COUNT;
      const x = anchor.x + (charPos.x - anchor.x) * t;
      const y = anchor.y + (charPos.y - anchor.y) * t;
      ropePoints.push({ x, y, px: x, py: y });
    }
  }

  function pinEnds() {
    const last = ropePoints[ropePoints.length - 1];
    ropePoints[0].x = anchor.x; ropePoints[0].y = anchor.y;
    last.x = charPos.x; last.y = charPos.y;
  }

  function updateRope(time) {
    if (!ropePoints) initRope();

    for (let i = 1; i < ropePoints.length - 1; i++) {
      const p = ropePoints[i];
      const nx = p.x + (p.x - p.px) * DAMPING + Math.sin(time * 0.12 + i * 0.9) * 0.018;
      const ny = p.y + (p.y - p.py) * DAMPING + Math.cos(time * 0.1 + i * 1.3) * 0.018;
      p.px = p.x; p.py = p.y;
      p.x = nx; p.y = ny;
    }
    pinEnds();

    for (let iter = 0; iter < CONSTRAINT_ITERATIONS; iter++) {
      for (let i = 0; i < ropePoints.length - 1; i++) {
        const a = ropePoints[i], b = ropePoints[i + 1];
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
        const diff = (dist - SEG_LEN) / dist;
        const moveX = dx * diff * 0.5, moveY = dy * diff * 0.5;
        if (i > 0) { a.x += moveX; a.y += moveY; }
        if (i + 1 < ropePoints.length - 1) { b.x -= moveX; b.y -= moveY; }
      }
      pinEnds();
    }
  }

  function ropeToPath() {
    let d = `M${ropePoints[0].x},${ropePoints[0].y}`;
    for (let i = 1; i < ropePoints.length - 1; i++) {
      const p = ropePoints[i], next = ropePoints[i + 1];
      d += ` Q${p.x},${p.y} ${(p.x + next.x) / 2},${(p.y + next.y) / 2}`;
    }
    const last = ropePoints[ropePoints.length - 1];
    return d + ` L${last.x},${last.y}`;
  }

  return { stepCharacter, updateRope, ropeToPath };
}