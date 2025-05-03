import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createRouter, RouterProvider } from '@tanstack/react-router';

import { routeTree } from './routeTree.gen';

import './index.css';

const NotFound = () => {
  return (
    <div className='fixed inset-0 flex flex-col items-center justify-center gap-2 p-4'>
      <h1 className='text-3xl font-bold'>404</h1>
      <p className='text-xl'>No experiment available (yet)</p>
    </div>
  );
};

const router = createRouter({
  routeTree,
  defaultViewTransition: true,
  defaultNotFoundComponent: NotFound,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById('app')!;

if (!rootElement.innerHTML) {
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
}
