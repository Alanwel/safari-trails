import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';

import { site } from '../data/site';
import { Icon } from './Icon';

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, []);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `relative text-[0.9375rem] font-medium transition-colors ${
      isActive ? 'text-forest-800' : 'text-forest-700/75 hover:text-forest-900'
    }`;

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? 'border-sand-200 bg-sand-50/95 shadow-[0_1px_20px_-12px_rgba(15,36,27,0.4)] backdrop-blur'
          : 'border-transparent bg-sand-50/80 backdrop-blur-sm'
      }`}
    >
      <div className="container-page flex h-16 items-center justify-between gap-6 md:h-20">
        <Link to="/" className="group flex items-center gap-2.5" aria-label={site.brand}>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-forest-700 text-sand-50 transition-transform group-hover:scale-105">
            <Icon name="leaf" className="h-5 w-5" />
          </span>
          <span className="font-display text-xl font-semibold tracking-tight text-forest-900">
            {site.brand}
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {site.nav.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass}>
              {({ isActive }) => (
                <>
                  {item.label}
                  {isActive && (
                    <span className="absolute -bottom-1.5 left-0 h-0.5 w-full rounded-full bg-ochre-500" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <a
            href={`tel:${site.contact.phone.replace(/\s/g, '')}`}
            className="flex items-center gap-2 text-sm font-medium text-forest-700/80 transition-colors hover:text-forest-900"
          >
            <Icon name="phone" className="h-4 w-4" />
            {site.contact.phone}
          </a>
          <Link to="/tours" className="btn btn-primary !px-5 !py-2.5">
            Plan a trip
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-sand-300 text-forest-800 md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          <Icon name={open ? 'close' : 'menu'} className="h-5 w-5" />
        </button>
      </div>

      {open && (
        <div className="animate-fade-in border-t border-sand-200 bg-sand-50 md:hidden">
          <nav className="container-page flex flex-col gap-1 py-4">
            {site.nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-base font-medium text-forest-800 transition-colors hover:bg-sand-100"
              >
                {item.label}
              </NavLink>
            ))}
            <Link
              to="/tours"
              onClick={() => setOpen(false)}
              className="btn btn-primary mt-3 w-full"
            >
              Plan a trip
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
