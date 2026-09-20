import { Suspense } from 'react';
import { createLazyFileRoute } from '@tanstack/react-router';

import { Github } from '@/common/dom/reference';
import { Canvas, Header } from '@/global/tunnels';

import { TunaSchool } from './-components/tuna';

export const Route = createLazyFileRoute('/tuna/')({
  component: () => (
    <>
      <Header.In>
        <Github href='https://github.com/leweyse/uikit-expt/blob/main/src/routes/tuna/index.lazy.tsx' />
      </Header.In>

      <RouteComponent />
    </>
  ),
});

function RouteComponent() {
  return (
    <Canvas.In>
      <directionalLight position={[0, 5, 2]} color='#cfe3f2' intensity={7.5} />

      <Suspense fallback={null}>
        <TunaSchool />
      </Suspense>
    </Canvas.In>
  );
}
