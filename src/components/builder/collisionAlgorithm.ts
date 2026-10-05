import {
  CollisionDetection,
  Collision,
  closestCenter,
  pointerWithin,
  rectIntersection,
} from '@dnd-kit/core';

/**
 * Custom Depth-First Proximity Collision Algorithm for Dyno Forms.
 *
 * Prevents parent-shadowing and flickering in deeply nested structures
 * (Section -> Grid -> Column -> Fields).
 */
export const customDepthCollisionAlgorithm: CollisionDetection = (args) => {
  const { pointerCoordinates, active } = args;
  if (!pointerCoordinates) return [];

  // 1. Gather all intersecting containers with the pointer (or bounding rect)
  let intersections = pointerWithin(args);

  if (intersections.length === 0) {
    intersections = rectIntersection(args);
  }

  if (intersections.length === 0) {
    return closestCenter(args);
  }

  // 2. Filter intersecting containers by hierarchy rules
  const validTargets = intersections.filter((hit: Collision) => {
    const targetData = (hit.data as any)?.droppableContainer?.data?.current;
    const activeData = active.data?.current;

    // Disallow self-collision
    if (hit.id === active.id) return false;

    // Disallow dropping a container inside itself or its own descendants
    if (activeData?.isContainer && targetData?.ancestorIds?.includes(active.id)) {
      return false;
    }

    return true;
  });

  if (validTargets.length === 0) {
    return closestCenter(args);
  }

  // 3. Sort by tree depth (Deepest First Rule)
  // If pointer hovers over Canvas -> Section -> Grid -> Field, the Field/Grid wins.
  return validTargets.sort((a: Collision, b: Collision) => {
    const depthA = ((a.data as any)?.droppableContainer?.data?.current?.treeDepth as number) || 0;
    const depthB = ((b.data as any)?.droppableContainer?.data?.current?.treeDepth as number) || 0;
    return depthB - depthA;
  });
};
