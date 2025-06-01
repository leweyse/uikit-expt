import { Canvas } from '@react-three/fiber';
import { FontFamilyProvider } from '@react-three/uikit';
import { noEvents, PointerEvents } from '@react-three/xr';
import { createRootRoute, Link, Outlet } from '@tanstack/react-router';

import { Canvas as CanvasTunnel, Footer, Header } from '@/global/tunnels';

export const Route = createRootRoute({
  component: Root,
});

function Root() {
  return (
    <>
      <header className='p-6 relative z-20 w-full'>
        <nav className='flex justify-between gap-2'>
          <Link to='/' className='font-bold pointer-events-auto'>
            leweyse
          </Link>

          <Header.Out />
        </nav>
      </header>

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

      <main className='flex-1 relative z-20'>
        <Outlet />
      </main>

      <footer className='p-6 relative flex justify-end gap-2 z-20'>
        <Footer.Out />
      </footer>
    </>
  );
}
