import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';

import { Footer } from './components/Footer';
import { Navbar } from './components/Navbar';
import { Admin } from './pages/Admin';
import { Contact } from './pages/Contact';
import { DestinationDetail } from './pages/DestinationDetail';
import { Destinations } from './pages/Destinations';
import { Home } from './pages/Home';
import { NotFound } from './pages/NotFound';
import { TourDetail } from './pages/TourDetail';
import { Tours } from './pages/Tours';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}

export function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tours" element={<Tours />} />
          <Route path="/tours/:slug" element={<TourDetail />} />
          <Route path="/destinations" element={<Destinations />} />
          <Route path="/destinations/:slug" element={<DestinationDetail />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
