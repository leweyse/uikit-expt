import type { QueryClient } from '@tanstack/react-query';

import { useMemo } from 'react';
import { Canvas as R3FCanvas } from '@react-three/fiber';
import { Handle, HandleTarget } from '@react-three/handle';
import {
  FontFamilyProvider,
  Text,
  Root as UikitRoot,
} from '@react-three/uikit';
import {
  IfInSessionMode,
  noEvents,
  PointerEvents,
  XR,
  XRDomOverlay,
  XROrigin,
} from '@react-three/xr';
import {
  createRootRouteWithContext,
  Link,
  Outlet,
  useLocation,
  useRouter,
} from '@tanstack/react-router';
import { X } from 'lucide-react';

import { Button } from '@/common/canvas/button';
import { AR } from '@/common/dom/icons';
import { themes } from '@/common/themes';
import { Canvas, Footer, Header } from '@/global/tunnels';
import { xrStore } from '@/global/xr';

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  component: Root,
});

const NavigationButtonsDom = () => {
  const router = useRouter();
  const { pathname } = useLocation();

  const routes = useMemo(() => Object.keys(router.routesByPath), [router]);

  const currentRoute = useMemo(
    () => routes.findIndex((route) => route === pathname),
    [pathname, routes],
  );

  return (
    <>
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

      <Canvas.In>
        <IfInSessionMode allow={['immersive-vr', 'immersive-ar']}>
          <group position={[0, 0.6, 0.01]}>
            <Handle
              targetRef='from-context'
              scale={false}
              multitouch={false}
              rotate={{ x: false }}
            >
              <UikitRoot gap={1} depthTest={false}>
                <Button
                  height={6}
                  paddingX={4}
                  paddingY={2}
                  backgroundColor={themes.neutral.light.background}
                  disabled={currentRoute === 0 || !routes[currentRoute - 1]}
                  onClick={() => {
                    router.navigate({ to: routes[currentRoute - 1] });
                  }}
                >
                  <Text color={themes.neutral.light.foreground} fontSize={3}>
                    prev
                  </Text>
                </Button>

                <Button
                  height={6}
                  paddingX={4}
                  paddingY={2}
                  backgroundColor={themes.neutral.light.background}
                  disabled={
                    currentRoute === routes.length - 1 ||
                    !routes[currentRoute + 1]
                  }
                  onClick={() => {
                    router.navigate({ to: routes[currentRoute + 1] });
                  }}
                >
                  <Text color={themes.neutral.light.foreground} fontSize={3}>
                    next
                  </Text>
                </Button>
              </UikitRoot>
            </Handle>
          </group>
        </IfInSessionMode>
      </Canvas.In>
    </>
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

          <div className='flex items-center gap-4 flex-col'>
            <Header.Out />

            <button
              className='pointer-events-auto'
              onClick={() => xrStore.enterAR()}
            >
              <AR className='w-6 h-6' />
            </button>
          </div>
        </nav>
      </header>

      <R3FCanvas
        gl={{ localClippingEnabled: true, alpha: true }}
        className='!fixed !inset-0'
        camera={{ position: [0, 0, 1.25] }}
        events={noEvents}
      >
        <PointerEvents />

        <FontFamilyProvider
          satoshi={{ normal: '/satoshi/satoshi-uikit.json' }}
          heming={{ normal: '/heming/heming-uikit.json' }}
        >
          <XR store={xrStore}>
            <IfInSessionMode allow={['immersive-ar', 'immersive-vr']}>
              <XROrigin position={[0, -1, 1.25]} />
            </IfInSessionMode>

            <XRDomOverlay
              style={{ width: '100%', height: '100%', position: 'relative' }}
            >
              <button
                onClick={() => xrStore.getState().session?.end()}
                className='absolute top-8 right-4 p-2 cursor-pointer rounded-md bg-accent/50 shadow-accent'
              >
                <X className='size-4 stroke-2 text-accent-foreground shadow-accent' />
              </button>
            </XRDomOverlay>

            <HandleTarget>
              <Canvas.Out />
            </HandleTarget>
          </XR>
        </FontFamilyProvider>
      </R3FCanvas>

      <main className='flex-1 relative z-20'>
        <Outlet />
      </main>

      <footer className='p-6 relative flex justify-between gap-2 z-20'>
        <NavigationButtonsDom />

        <Footer.Out />
      </footer>
    </>
  );
}
