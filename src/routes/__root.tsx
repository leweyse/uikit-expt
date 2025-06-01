import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { FontFamilyProvider } from '@react-three/uikit';
import { noEvents, PointerEvents } from '@react-three/xr';
import {
  createRootRoute,
  Link,
  Outlet,
  useLocation,
  useRouter,
} from '@tanstack/react-router';

import { Canvas as CanvasTunnel, Footer, Header } from '@/global/tunnels';

export const Route = createRootRoute({
  component: Root,
});

const NavigationButtons = () => {
  const router = useRouter();
  const { pathname } = useLocation();

  const routes = useMemo(() => Object.keys(router.routesByPath), [router]);

  const currentRoute = useMemo(
    () => routes.findIndex((route) => route === pathname),
    [pathname, routes],
  );

  return (
    <div
      className='flex gap-2 [&>button]:shrink-0 [&>button]:disabled:text-muted-foreground/80 [&>button]:text-foreground [&>button]:cursor-pointer [&>button]:hover:underline [&>button]:hover:underline-offset-2'
      style={{
        opacity: currentRoute <= 0 ? 0 : 1,
        pointerEvents: currentRoute <= 0 ? 'none' : 'auto',
      }}
    >
      <button
        disabled={currentRoute === 0 || !routes[currentRoute - 1]}
        onClick={() => router.navigate({ to: routes[currentRoute - 1] })}
      >
        prev
      </button>

      <button
        disabled={
          currentRoute === routes.length - 1 || !routes[currentRoute + 1]
        }
        onClick={() => router.navigate({ to: routes[currentRoute + 1] })}
      >
        next
      </button>
    </div>
  );
};

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

        <FontFamilyProvider
          satoshi={{ normal: '/satoshi/satoshi-uikit.json' }}
          heming={{ normal: '/heming/heming-uikit.json' }}
        >
          <CanvasTunnel.Out />
        </FontFamilyProvider>
      </Canvas>

      <main className='flex-1 relative z-20'>
        <Outlet />
      </main>

      <footer className='p-6 relative flex justify-between gap-2 z-20'>
        <NavigationButtons />

        <Footer.Out />
      </footer>
    </>
  );
}
