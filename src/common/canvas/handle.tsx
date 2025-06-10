import type { ReactNode, RefObject } from 'react';
import type { PointerEvent } from '@pmndrs/pointer-events';
import type { Group, Object3D } from 'three';

import { useRef, useState } from 'react';
import { isXRInputSourceState, useHover } from '@react-three/xr';

function vibrateOnEvent(e: PointerEvent) {
  if (
    isXRInputSourceState(e.pointerState) &&
    e.pointerState.type === 'controller'
  ) {
    e.pointerState.inputSource.gamepad?.hapticActuators[0]?.pulse(0.3, 50);
  }
}

type HoverParams = Parameters<typeof useHover>;

export function Hover({
  children,
  hoverTargetRef,
}: {
  hoverTargetRef?: RefObject<Object3D | null>;
  children?: (hovered: boolean) => ReactNode;
}) {
  const ref = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);

  useHover((hoverTargetRef ?? ref) as HoverParams[0], (hoverd, e) => {
    setHovered(hoverd);
    if (hoverd) {
      vibrateOnEvent(e);
    }
  });

  return <group ref={ref}>{children?.(hovered)}</group>;
}
