import { createRoot } from 'react-dom/client';
import '@fontsource-variable/geist';
import '../app/globals.css';
import KindHandoff from '../app/kindhandoff';
import { lazy, Suspense } from 'react';
const Join = lazy(() => import('../app/join/page')); 
const SignIn = lazy(() => import('../app/signin/page'));
const Page =
  window.location.pathname === '/join'
    ? Join
    : window.location.pathname === '/signin'
      ? SignIn
      : KindHandoff;
createRoot(document.getElementById('root')!).render(<Suspense fallback={<main className="join-page"><p>Opening KindHandoff…</p></main>}><Page /></Suspense>);
