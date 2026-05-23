'use client';

import NextLink from 'next/link';
import { useParams, usePathname, useRouter, useSearchParams as useNextSearchParams } from 'next/navigation';
import { useEffect, useMemo } from 'react';

const ROUTER_STATE_PREFIX = 'aptico-router-state:';

function normalizeHref(to = '/') {
  if (typeof to === 'string') {
    return to;
  }

  if (to?.pathname) {
    const query = to.search || '';
    return `${to.pathname}${query}`;
  }

  return '/';
}

function saveNavigationState(href, state) {
  if (typeof window === 'undefined' || !state) {
    return;
  }

  window.sessionStorage.setItem(`${ROUTER_STATE_PREFIX}${href.split('?')[0]}`, JSON.stringify(state));
}

function readNavigationState(pathname) {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const key = `${ROUTER_STATE_PREFIX}${pathname}`;
    const rawValue = window.sessionStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : null;
  } catch {
    return null;
  }
}

export function Link({ to, href, state, replace: _replace, children, onClick, ...props }) {
  const resolvedHref = normalizeHref(href || to);

  return (
    <NextLink
      href={resolvedHref}
      onClick={(event) => {
        saveNavigationState(resolvedHref, state);
        onClick?.(event);
      }}
      {...props}
    >
      {children}
    </NextLink>
  );
}

export function Navigate({ to = '/', replace = true }) {
  const router = useRouter();

  useEffect(() => {
    if (replace) {
      router.replace(normalizeHref(to));
    } else {
      router.push(normalizeHref(to));
    }
  }, [replace, router, to]);

  return null;
}

export function useNavigate() {
  const router = useRouter();

  return (to, options = {}) => {
    const href = normalizeHref(to);
    saveNavigationState(href, options.state);

    if (options.replace) {
      router.replace(href);
      return;
    }

    router.push(href);
  };
}

export function useLocation() {
  const pathname = usePathname();
  const searchParams = useNextSearchParams();
  const search = searchParams.toString();
  const state = readNavigationState(pathname);

  return useMemo(
    () => ({
      pathname,
      search: search ? `?${search}` : '',
      state
    }),
    [pathname, search, state]
  );
}

export function useSearchParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useNextSearchParams();

  const setSearchParams = (nextParams = {}, options = {}) => {
    const params = new URLSearchParams();

    Object.entries(nextParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      }
    });

    const query = params.toString();
    const href = query ? `${pathname}?${query}` : pathname;

    if (options.replace) {
      router.replace(href);
    } else {
      router.push(href);
    }
  };

  return [searchParams, setSearchParams];
}

export { useParams };
