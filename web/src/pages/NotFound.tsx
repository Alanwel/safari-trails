import { Link } from 'react-router-dom';

import { Icon } from '../components/Icon';

export function NotFound() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
      <span className="font-display text-7xl font-semibold text-forest-200">404</span>
      <h1 className="mt-4 font-display text-3xl font-semibold">This trail goes nowhere</h1>
      <p className="mt-3 max-w-md text-forest-700/70">
        The page you were looking for has been moved, renamed, or never existed. Let us point
        you back to the trailhead.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link to="/" className="btn btn-primary">
          <Icon name="arrow-left" className="h-4 w-4" />
          Back to home
        </Link>
        <Link to="/tours" className="btn btn-ghost">
          Browse all tours
        </Link>
      </div>
    </div>
  );
}
