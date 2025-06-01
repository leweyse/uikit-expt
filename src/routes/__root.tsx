import { Canvas } from '@react-three/fiber';
import { noEvents, PointerEvents } from '@react-three/xr';
import { createRootRoute, Link, Outlet } from '@tanstack/react-router';

import { Canvas as CanvasTunnel } from '@/global/tunnels';
import { FontFamilyProvider } from '@react-three/uikit';

export const Route = createRootRoute({
  component: Root,
});

function Root() {
  return (
    <>
      <div className='p-6 flex gap-2 relative z-20'>
        <Link to='/' className='font-bold'>
          leweyse
        </Link>
      </div>

      <Canvas
        gl={{ localClippingEnabled: true }}
        className='!fixed !inset-0'
        events={noEvents}
      >
        <PointerEvents />

        <FontFamilyProvider satoshi={{ normal: '/satoshi/satoshi-uikit.json' }}>
          <CanvasTunnel.Out />
        </FontFamilyProvider>
      </Canvas>

      <Outlet />
    </>
  );
}
