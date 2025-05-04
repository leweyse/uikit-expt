import { Canvas } from '@react-three/fiber';
import { createRootRoute, Link, Outlet } from '@tanstack/react-router';

import { Canvas as CanvasTunnel } from '@/global/tunnels';

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

      <Canvas gl={{ localClippingEnabled: true }} className='!fixed !inset-0'>
        <CanvasTunnel.Out />
      </Canvas>

      <Outlet />
    </>
  );
}
