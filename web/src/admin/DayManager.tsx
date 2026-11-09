/**
 * Itinerary editor — the day-by-day breakdown of a tour.
 *
 * ---------------------------------------------------------------------------
 * The renumbering problem
 * ---------------------------------------------------------------------------
 * `tour_days` has a UNIQUE constraint on (tour_id, day_number). That is a
 * good constraint: two days cannot both be "Day 3". But it means you cannot
 * simply swap two numbers in one step — the first UPDATE would collide with
 * the row still holding that number.
 *
 * So a move is three steps:
 *   1. move the row being dragged to a scratch number far out of the way
 *   2. move the row it is swapping with into the gap
 *   3. move the first row into its final place
 *
 * The scratch number must still satisfy `day_number > 0`, so it cannot be 0.
 */
import { useState } from 'react';

import { ApiClientError, request } from '../api/client';
import type { TourDay } from '../api/types';
import { Icon } from '../components/Icon';

type Props = {
  token: string;
  tourId: number;
  days: TourDay[];
  onChanged: () => void;
};

/** A day number that cannot clash with a real one (the table allows up to 365). */
const SCRATCH_DAY_NUMBER = 999;

export function DayManager({ token, tourId, days, onChanged }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newDay, setNewDay] = useState({ dayNumber: '', title: '', description: '' });

  const auth = { Authorization: `Bearer ${token}` };

  const fail = (err: unknown, fallback: string) => {
    setError(err instanceof ApiClientError ? err.message : fallback);
  };

  const addDay = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy('add');
    setError(null);
    try {
      await request(`/api/admin/tours/${tourId}/days`, {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({
          dayNumber: Number(newDay.dayNumber),
          title: newDay.title,
          description: newDay.description,
        }),
      });
      setNewDay({ dayNumber: '', title: '', description: '' });
      onChanged();
    } catch (err) {
      fail(err, 'Could not add that day.');
    } finally {
      setBusy(null);
    }
  };

  const updateDay = async (day: TourDay, patch: Record<string, unknown>) => {
    setBusy(`day-${day.id}`);
    setError(null);
    try {
      await request(`/api/admin/tours/${tourId}/days/${day.id}`, {
        method: 'PATCH',
        headers: auth,
        body: JSON.stringify(patch),
      });
      onChanged();
    } catch (err) {
      fail(err, 'Could not save that day.');
    } finally {
      setBusy(null);
    }
  };

  const removeDay = async (day: TourDay) => {
    if (!window.confirm(`Remove Day ${day.dayNumber}?`)) return;
    setBusy(`day-${day.id}`);
    setError(null);
    try {
      await request(`/api/admin/tours/${tourId}/days/${day.id}`, {
        method: 'DELETE',
        headers: auth,
      });
      onChanged();
    } catch (err) {
      fail(err, 'Could not remove that day.');
    } finally {
      setBusy(null);
    }
  };

  /** Swap a day with its neighbour, using the scratch-number dance. */
  const moveDay = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= days.length) return;

    const current = days[index];
    const other = days[target];

    setBusy(`day-${current.id}`);
    setError(null);
    try {
      await request(`/api/admin/tours/${tourId}/days/${current.id}`, {
        method: 'PATCH',
        headers: auth,
        body: JSON.stringify({ dayNumber: SCRATCH_DAY_NUMBER }),
      });
      await request(`/api/admin/tours/${tourId}/days/${other.id}`, {
        method: 'PATCH',
        headers: auth,
        body: JSON.stringify({ dayNumber: current.dayNumber }),
      });
      await request(`/api/admin/tours/${tourId}/days/${current.id}`, {
        method: 'PATCH',
        headers: auth,
        body: JSON.stringify({ dayNumber: other.dayNumber }),
      });
      onChanged();
    } catch (err) {
      fail(err, 'Could not move that day.');
      onChanged();
    } finally {
      setBusy(null);
    }
  };

  const nextDayNumber = days.length ? Math.max(...days.map((d) => d.dayNumber)) + 1 : 1;

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-forest-900">
            Itinerary
          </h3>
          <p className="mt-0.5 text-sm text-forest-700/60">
            {days.length} {days.length === 1 ? 'day' : 'days'} planned
            {days.length !== 0 && days.length !== nextDayNumber - 1 && (
              <> · the tour says {nextDayNumber - 1} days, so check the numbers line up</>
            )}
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-clay-500/10 px-4 py-3 text-sm text-clay-600">
          <Icon name="alert" className="mt-0.5 h-4.5 w-4.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {days.length > 0 && (
        <ol className="mt-5 space-y-3">
          {days.map((day, index) => (
            <li key={day.id} className="rounded-xl border border-sand-200 bg-sand-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest-700 font-display text-sm font-semibold text-sand-50">
                    {day.dayNumber}
                  </span>
                  <div className="min-w-0 flex-1">
                    <input
                      type="text"
                      defaultValue={day.title}
                      onBlur={(e) => {
                        if (e.target.value !== day.title) {
                          void updateDay(day, { title: e.target.value });
                        }
                      }}
                      className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 font-medium text-forest-900 hover:border-sand-300 focus:border-forest-600 focus:outline-none"
                      placeholder="What happens on this day?"
                    />
                    <textarea
                      defaultValue={day.description}
                      onBlur={(e) => {
                        if (e.target.value !== day.description) {
                          void updateDay(day, { description: e.target.value });
                        }
                      }}
                      rows={2}
                      className="mt-1 w-full resize-y rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm text-forest-700/75 hover:border-sand-300 focus:border-forest-600 focus:outline-none"
                      placeholder="Describe the day"
                    />
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => void moveDay(index, -1)}
                    disabled={index === 0 || busy !== null}
                    className="btn btn-ghost px-2 py-1 text-xs"
                    title="Move up"
                  >
                    <Icon name="arrow-right" className="h-3.5 w-3.5 -rotate-90" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void moveDay(index, 1)}
                    disabled={index === days.length - 1 || busy !== null}
                    className="btn btn-ghost px-2 py-1 text-xs"
                    title="Move down"
                  >
                    <Icon name="arrow-right" className="h-3.5 w-3.5 rotate-90" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeDay(day)}
                    disabled={busy !== null}
                    className="btn btn-ghost px-2 py-1 text-xs text-clay-600"
                    title="Remove day"
                  >
                    <Icon name="close" className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      {/* Add a day ------------------------------------------------------ */}
      <form onSubmit={addDay} className="mt-5 rounded-xl border border-dashed border-sand-300 bg-sand-50 p-4">
        <h4 className="text-sm font-semibold text-forest-900">Add a day</h4>
        <div className="mt-3 grid gap-3 sm:grid-cols-[100px_1fr]">
          <div>
            <label className="field-label" htmlFor="new-day-number">
              Day
            </label>
            <input
              id="new-day-number"
              type="number"
              min={1}
              max={365}
              required
              value={newDay.dayNumber}
              onChange={(e) => setNewDay({ ...newDay, dayNumber: e.target.value })}
              className="field"
              placeholder={String(nextDayNumber)}
            />
          </div>
          <div className="space-y-3">
            <input
              type="text"
              required
              value={newDay.title}
              onChange={(e) => setNewDay({ ...newDay, title: e.target.value })}
              className="field"
              placeholder="Title — e.g. Arrival in Entebbe"
            />
            <textarea
              required
              rows={2}
              value={newDay.description}
              onChange={(e) => setNewDay({ ...newDay, description: e.target.value })}
              className="field"
              placeholder="What happens on this day?"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={busy !== null}
          className="btn btn-primary mt-3"
        >
          {busy === 'add' ? 'Adding…' : 'Add day'}
        </button>
      </form>
    </div>
  );
}
