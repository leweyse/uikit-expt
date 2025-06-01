import type { ComponentProps } from 'react';

import { GithubIcon } from 'lucide-react';

export const Github = (props: ComponentProps<'a'>) => (
  <a
    target='_blank'
    rel='noreferrer'
    className='pointer-events-auto [&_svg]:size-5 text-foreground'
    {...props}
  >
    <GithubIcon />
    <span className='sr-only'>Source code</span>
  </a>
);

export const Reference = ({ children, ...props }: ComponentProps<'a'>) => {
  return (
    <a
      target='_blank'
      rel='noreferrer'
      className='pointer-events-auto hover:underline [&>span]:transition-colors underline-offset-2'
      {...props}
    >
      <span className='text-muted-foreground'>Inspired by:</span>{' '}
      <span className='text-foreground'>{children}</span>
    </a>
  );
};
