import { useApi } from '../api/hooks';
import type { DestinationSummary } from '../api/types';
import { DestinationCard } from '../components/DestinationCard';
import { Reveal } from '../components/Reveal';
import { ErrorState, SectionHeading } from '../components/States';

export function Destinations() {
  const { data, loading, error, refetch } = useApi<DestinationSummary[]>('/api/destinations');

  return (
    <div className="container-page py-14 md:py-20">
      <SectionHeading
        eyebrow="Where we go"
        title="Destinations"
        lede="Seven places across Uganda, each with its own guide team, its own lodges and its own reason to go."
      />

      {loading && (
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton h-80 rounded-2xl" />
          ))}
        </div>
      )}

      {error && (
        <div className="mt-12">
          <ErrorState message={error} onRetry={refetch} />
        </div>
      )}

      {data && (
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((destination, index) => (
            <Reveal key={destination.slug} delay={index * 60}>
              <div className="h-full">
                <DestinationCard destination={destination} />
              </div>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
