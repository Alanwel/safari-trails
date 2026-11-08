/**
 * Everything brand-related lives here.
 *
 * Rebranding the site (new name, new contact details, new colour direction)
 * should not require touching a single component — this file is the single
 * place where that copy lives.
 *
 * NOTE: the contact details below are placeholders. Replace them with the
 * operator's real phone number, email and address before going live.
 */
export const site = {
  brand: 'Safari Trails',
  shortBrand: 'Safari Trails',
  tagline: 'Uganda, told slowly.',
  description:
    'Small-group gorilla trekking, Nile rafting and Rift Valley safaris — planned by people who live here, and run by people who answer the phone.',

  contact: {
    phone: '+256 700 123 456',
    whatsapp: '256700123456',
    email: 'hello@safaritrails.com',
    address: 'Plot 7, Kampala Road, Kampala, Uganda',
    hours: 'Monday to Saturday, 08:00 – 18:00 EAT',
  },

  nav: [
    { label: 'Tours', to: '/tours' },
    { label: 'Destinations', to: '/destinations' },
    { label: 'About', to: '/#about' },
    { label: 'Contact', to: '/contact' },
  ],

  /** Numbers used on the home page. */
  stats: [
    { value: '12 yrs', label: 'Guiding in the parks' },
    { value: '4.9/5', label: 'Average guest rating' },
    { value: '8 max', label: 'Travellers per departure' },
    { value: '2,400+', label: 'Guests since 2014' },
  ],

  /** Why-us cards on the home page. */
  pillars: [
    {
      title: 'Small groups, always',
      body: 'Six to eight travellers per departure. You are not a coachload, and your guide knows every name on the trip.',
      icon: 'group',
    },
    {
      title: 'Permits booked for you',
      body: 'Gorilla permits are released in limited numbers and sell out months ahead. We hold allocations, so your dates are confirmed.',
      icon: 'ticket',
    },
    {
      title: 'Local guides, real salaries',
      body: 'Every guide is Ugandan, trained and certified. Porter and camp staff are paid directly, not through a chain of sub-contractors.',
      icon: 'compass',
    },
    {
      title: 'Honest itineraries',
      body: 'If a road is bad we say so. If the rains are early we say so. The itinerary you read is the itinerary you get.',
      icon: 'shield',
    },
  ],

  /** Home-page testimonials — quotes from the seeded review data. */
  testimonials: [
    {
      quote:
        'We had one hour with the gorilla family and it felt like a whole afternoon. Our guide was extraordinary — patient with every question and completely honest about what we were seeing.',
      author: 'Marta K.',
      origin: 'Spain',
      trip: 'Mountain Gorilla Trekking in Bwindi',
    },
    {
      quote:
        'After three days of early game drives I needed this. The sunrise canoe on Lake Bunyonyi was worth the early alarm, and the water is unbelievably clear.',
      author: 'Sarah L.',
      origin: 'Ireland',
      trip: 'Lake Bunyonyi Island Hopping',
    },
    {
      quote:
        'We saw a leopard in a tree in Ishasha on our second morning, which is the sighting everyone waits for. The Kazinga boat is a proper wildlife experience.',
      author: 'Anna B.',
      origin: 'Germany',
      trip: 'Queen Elizabeth Safari',
    },
  ],

  /** FAQ entries — also rendered on the contact page. */
  faq: [
    {
      q: 'How far ahead should I book?',
      a: 'Gorilla trekking is usually six to nine months ahead, because permits are released in limited numbers each season. Everything else can often be arranged in two to three weeks — although the dry season fills first.',
    },
    {
      q: 'Is Uganda safe for tourists?',
      a: 'Yes. Uganda is one of the safest countries to visit in East Africa, our guides travel with you throughout, and every park we work in has a well-established tourist security record.',
    },
    {
      q: 'What is included in the price?',
      a: 'Park entry fees, permits, accommodation as described, all meals, transport in a private vehicle, and the services of your guide. Flights, visas and insurance are not included — each tour lists exactly what is excluded.',
    },
    {
      q: 'Can you arrange a private departure?',
      a: 'Almost always. Private departures can be arranged for couples, families and small private groups, including single travellers who would rather not join a scheduled group.',
    },
  ],
};

export type Site = typeof site;
