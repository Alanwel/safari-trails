/**
 * Catalogue content.
 *
 * This is the seed data that makes the site feel like a real tour operator
 * rather than lorem ipsum. All names, places, prices and itineraries refer to
 * real Uganda — swap the copy for a different country and the whole site
 * follows.
 *
 * Images are NOT stored here. They are fetched from Wikimedia Commons by
 * `npm run images` into `web/public/images/`, and the resulting manifest
 * (`assets/images.json`) is merged in at seed time by `seed.ts`.
 */

export type SeedImage = {
  file: string;
  alt: string;
  credit: {
    title: string;
    artist: string;
    license: string;
    sourceUrl: string;
  };
};

export type SeedDestination = {
  slug: string;
  name: string;
  region: string;
  tagline: string;
  description: string;
  bestSeason: string;
  averageDays: number;
  highlights: string[];
};

export type SeedTourDay = {
  title: string;
  description: string;
  accommodation: string;
  meals: string;
};

export type SeedReview = {
  authorName: string;
  authorCountry: string;
  rating: number;
  comment: string;
};

export type SeedTour = {
  slug: string;
  title: string;
  destinationSlug: string;
  summary: string;
  description: string;
  priceCents: number;
  durationDays: number;
  difficulty: 'easy' | 'moderate' | 'challenging';
  groupSizeMax: number;
  rating: number;
  reviewCount: number;
  featured: boolean;
  highlights: string[];
  included: string[];
  excluded: string[];
  days: SeedTourDay[];
  reviews: SeedReview[];
};

export const destinations: SeedDestination[] = [
  {
    slug: 'bwindi-impenetrable-forest',
    name: 'Bwindi Impenetrable Forest',
    region: 'South West Uganda',
    tagline: 'Where half the world’s mountain gorillas live',
    description:
      'Bwindi is older than the Alps, older than the Great Lakes, and about one third of the entire global mountain gorilla population calls it home. The forest climbs from 1,160 m to 3,000 m across barely 40 km, so a single morning can take you from subtropical bamboo to open montane grassland — and a habituated family will walk past you while you eat your packed lunch.',
    bestSeason: 'June–September and December–February',
    averageDays: 3,
    highlights: [
      'Four habituated gorilla groups, each with a different character',
      'Ruhija and Muyo forest sectors, both open all year',
      'Eleven neighbouring forest nations in one drive',
      'The Ruhija waterfall trail and the Kyagula overlook',
    ],
  },
  {
    slug: 'queen-elizabeth-national-park',
    name: 'Queen Elizabeth National Park',
    region: 'Western Uganda',
    tagline: 'Uganda’s oldest park, and its best big-cat country',
    description:
      'The park straddles Lake George and Lake Edward, and it is one of the very few places in Africa where you can watch a leopard climb a tree. Ishasha sector is legendary for tree-climbing lions, the Kazinga Channel reliably produces hippo, buffalo and elephant crossings, and the remote Kyambura gorge hides chimpanzees and a second, spectacular waterfall.',
    bestSeason: 'June–September and December–February',
    averageDays: 3,
    highlights: [
      'Tree-climbing lions of Ishasha',
      'Boat safaris on the Kazinga Channel',
      'Mweya safari drive and the Ishasha escarpment',
      'Night drives for leopard and honey badger',
    ],
  },
  {
    slug: 'murchison-falls-national-park',
    name: 'Murchison Falls National Park',
    region: 'Northern Uganda',
    tagline: 'The Nile squeezes through a seven-metre gap',
    description:
      'Murchison is where the Nile stops being a river and becomes an event: the whole Victoria Nile is forced through a seven-metre cleft in the rock and drops 45 metres in a single, deafening surge. Around it lies the largest savanna in Uganda, with elephant herds that number in the hundreds, plus Karuma and Paraa islands and a bird list of over 1,000 species.',
    bestSeason: 'June–September and December–February',
    averageDays: 3,
    highlights: [
      'The falls themselves — by boat, by foot, or from the top',
      'Hundreds of elephants on the savanna plains',
      'Nesting shoebill storks on the Nile',
      'The rafting section from Paraa to the falls',
    ],
  },
  {
    slug: 'lake-bunyonyi',
    name: 'Lake Bunyonyi',
    region: 'South West Uganda',
    tagline: 'Africa’s most beautiful lake, island by island',
    description:
      'Twenty-nine islands scattered across a lake so deep it has no known outflow and no crocodiles. Bunyonyi is the counterpoint to the big parks: slow, green and unhurried. You reach the islands by dugout canoe, the temperature barely moves, and the view from Mukano Island at sunrise — islands floating in mist — is the single most photographed thing in southwestern Uganda.',
    bestSeason: 'All year round',
    averageDays: 2,
    highlights: [
      'Dugout canoe hops between 29 islands',
      'Mukano Island sunrise and the "Bunagala" sacred cave',
      'Birding with the Rwenzori mountain ranges behind you',
      'Fishing, swimming and doing absolutely nothing',
    ],
  },
  {
    slug: 'jinja-and-the-source-of-the-nile',
    name: 'Jinja & the Source of the Nile',
    region: 'Central Uganda',
    tagline: 'Where the Nile begins, and the rafting begins',
    description:
      'Jinja sits where the Nile leaves Lake Victoria and begins its 6,650 km run to the Mediterranean. It is Uganda’s adventure capital: Grade IV and Grade V white water an hour from town, the source itself an hour further on, the Jinja Nile Bridge to walk across, and the Semei Falls where the river thins to a single thread of water.',
    bestSeason: 'All year round — the river never stops',
    averageDays: 4,
    highlights: [
      'Grade IV–V rafting on the white-water section',
      'The Source of the Nile and Semei Falls',
      'Source of the Nile Hotel and the Jinja Nile Bridge',
      'Bujagali Falls, a short drive from town',
    ],
  },
  {
    slug: 'rwenzori-mountains',
    name: 'Rwenzori Mountains',
    region: 'Western Uganda',
    tagline: 'The Mountains of the Moon — glaciers at the equator',
    description:
      'The Rwenzori range is the strangest-looking landscape in Uganda: enormous, drab, ice-capped mountains rising straight out of the equator, draped in bog and giant lobelia. It is Africa’s third-highest summit (Mount Stanley, 5,109 m) and one of the last places on Earth where glaciers survive near the tropics. The Margherita Hut at 4,306 m is the highest hut in Africa.',
    bestSeason: 'December–February and June–September',
    averageDays: 5,
    highlights: [
      'The Margherita Hut at 4,306 m — Africa’s highest',
      'Giant groundsel and Lobelia forests',
      'The Kilembe and Ruhija trailheads',
      'Ice, scree and the "Mountains of the Moon" summit ridge',
    ],
  },
  {
    slug: 'kampala-and-the-cultural-heartland',
    name: 'Kampala & the Cultural Heartland',
    region: 'Central Uganda',
    tagline: 'The city that grew around seven hills',
    description:
      'Kampala is one of the greenest capitals in Africa — a city of red earth roads, jacaranda and the endless traffic that everybody complains about and everybody joins. Around it sits the cultural heartland: the source of the Nile, the Kasubi Tombs, the Imbiro drumming village, and the Buganda kingdom that still has a kabaka in place.',
    bestSeason: 'All year round',
    averageDays: 1,
    highlights: [
      'The Kasubi Tombs and the Buganda kingdom',
      'The Uganda Museum and the craft market',
      'Nakasero market and the street food scene',
      'Boda-boda ride to the seven hills',
    ],
  },
];

export const tours: SeedTour[] = [
  {
    slug: 'mountain-gorilla-trekking-bwindi',
    title: 'Mountain Gorilla Trekking in Bwindi',
    destinationSlug: 'bwindi-impenetrable-forest',
    summary:
      'Three days with habituated mountain gorillas in the oldest forest in Uganda — including a full day of trekking and a second, gentler forest walk.',
    description:
      'This is the trip most people picture when they think of Uganda. You will spend a full morning on the forest trail with a habituated gorilla family, sitting metres away while they feed, play and settle down for the afternoon. We use Ruhija and Muyo sectors, both of which habituate different families, so your guide matches the group’s fitness and your patience for steep, muddy ground. Because permits are limited by law to four trekkers per gorilla group, this is one of the few places where scarcity is a good thing: the experience is quiet, unhurried and protected.',
    priceCents: 95000,
    durationDays: 3,
    difficulty: 'moderate',
    groupSizeMax: 4,
    rating: 4.9,
    reviewCount: 128,
    featured: true,
    highlights: [
      'One hour with a habituated gorilla family',
      'A second, relaxed forest walk with a local tracker',
      'Ruhija sector, with a 90% sighting success rate',
      'Batwa village visit and local lunch',
    ],
    included: [
      'Two gorilla permits (Ruhija sector)',
      'All meals and local drinks',
      'Certified guide, tracker and porters',
      'Batwa cultural village visit',
      'Park entry fees',
      'Private 4x4 with driver',
    ],
    excluded: [
      'International flights',
      'Visa and travel insurance',
      'Personal spending money and gratuities',
      'Optional 4th day gorilla permit (available on request)',
    ],
    days: [
      {
        title: 'Arrival and transfer to Ruhija',
        description:
          'We collect you from Kampala or Entebbe and drive west through the tea estates of Mbarara, stopping at the Mutolere overlook for photographs of the Virunga volcanoes on the horizon. You arrive at your lodge in the afternoon, meet your guide team, and eat a hot dinner before an early night.',
        accommodation: 'Comfortable lodge near the Ruhija trailhead',
        meals: 'Dinner',
      },
      {
        title: 'Gorilla trekking in Ruhija',
        description:
          'Breakfast at 6:00, then the walk into the forest. The trail can take two to four hours depending on where the family is. You will have one hour with the gorillas, and your guide will explain everything you see — silverback behaviour, feeding habits, the difference between a mature and a juvenile. You are free to photograph with a wide-angle lens or a phone; the rule is no flash and no cameras on tripods.',
        accommodation: 'Same lodge',
        meals: 'Breakfast and lunch',
      },
      {
        title: 'Forest walk and departure',
        description:
          'A gentler second morning: a walk through the bamboo and lower forest with a tracker who grew up in the surrounding villages, plus time in the local Batwa community. We drive back to Kampala in the afternoon, or continue on to Lake Bunyonyi or Queen Elizabeth if you have booked a longer safari.',
        accommodation: '—',
        meals: 'Breakfast and lunch',
      },
    ],
    reviews: [
      {
        authorName: 'Marta K.',
        authorCountry: 'Spain',
        rating: 5,
        comment:
          'We had one hour with the family and it felt like a whole afternoon. Our guide Ben was extraordinary — patient with our questions and completely honest about what we were seeing. The second forest walk was the part I did not expect to love as much.',
      },
      {
        authorName: 'Daniel O.',
        authorCountry: 'United Kingdom',
        rating: 5,
        comment:
          'The permit system sounds frustrating until you actually meet them. Only four of us, and the silverback sat 8 metres away chewing eucalyptus. Take proper hiking boots — the mud is real.',
      },
    ],
  },
  {
    slug: 'bwindi-forest-walk-batwa-village',
    title: 'Bwindi Forest Walk & Batwa Village Experience',
    destinationSlug: 'bwindi-impenetrable-forest',
    summary:
      'A gentler half-day in Bwindi: a guided walk through lower forest, medicinal plant gardens and a community visit with the Batwa people.',
    description:
      'Not everyone wants (or can) do a full gorilla trek. This four-hour walk uses the lower forest where the terrain is kinder, and it adds something different: the Batwa community visit, which is one of the most affecting experiences in the southwest. The Batwa were displaced from the forest when it was made a national park in 1992 and many still live on its edge. The visit is run by the community itself — the fee goes to them, not to us.',
    priceCents: 9500,
    durationDays: 1,
    difficulty: 'easy',
    groupSizeMax: 10,
    rating: 4.7,
    reviewCount: 64,
    featured: false,
    highlights: [
      'Four hours on a moderate lower-forest trail',
      'Batwa community visit with music and dance',
      'Medicinal plant garden with a local herbalist',
      'Perfect add-on to a gorilla trek',
    ],
    included: [
      'Local guide and forest ranger',
      'Batwa village visit and entry fees',
      'Lunch and local drinks',
      'Hotel pick-up and drop-off in Kampala',
    ],
    excluded: [
      'Gorilla permit (this tour does not include trekking)',
      'International flights and insurance',
      'Personal expenses',
    ],
    days: [
      {
        title: 'Forest walk and community visit',
        description:
          'Depart Kampala early and reach the trailhead by mid-morning. Walk for two hours through lower forest with your guide and a ranger, then join the herbalist for a walk through the medicinal plant garden. Lunch is served in the village, followed by the Batwa welcome — song, dance and a lot of questions about how they live at the edge of a national park.',
        accommodation: '—',
        meals: 'Breakfast and lunch',
      },
    ],
    reviews: [
      {
        authorName: 'Grace N.',
        authorCountry: 'Kenya',
        rating: 5,
        comment:
          'I am not a hiker and this was the right call for me. The village visit was the strongest hour of our whole Uganda trip — genuinely moving, and clearly run by the people themselves.',
      },
      {
        authorName: 'Tom H.',
        authorCountry: 'Australia',
        rating: 4,
        comment:
          'Easy walking, well organised, and the herbalist was fascinating. The forest road out of Kampala is rough, so hold on tight.',
      },
    ],
  },
  {
    slug: 'queen-elizabeth-royal-tour',
    title: 'Queen Elizabeth Safari: Ishasha, Kazinga & Crater Lakes',
    destinationSlug: 'queen-elizabeth-national-park',
    summary:
      'Three days of game drives, a Kazinga Channel boat safari and a walking safari in the Kyambura gorge — Uganda’s most complete big-cat itinerary.',
    description:
      'Queen Elizabeth rewards slow travel. This three-day circuit takes in all four of the park’s distinct worlds: the open savanna of Mweya, the riverine forest of the Kazinga Channel, the Ishasha sector where lions climb marula trees, and the crater lakes and gorge of Kyambura. We use a boat on the Channel, a walking safari in the gorge (on foot, with an armed ranger, tracking chimpanzee and colobus), and four-wheel-drive safaris at both ends of the day.',
    priceCents: 72000,
    durationDays: 3,
    difficulty: 'easy',
    groupSizeMax: 6,
    rating: 4.8,
    reviewCount: 96,
    featured: true,
    highlights: [
      'Tree-climbing lions in Ishasha',
      'Kazinga Channel boat safari among hippo and elephant',
      'Walking safari in Kyambura gorge with an armed ranger',
      'Explanatory drives with a specialist guide',
    ],
    included: [
      'Two nights at a mid-range lodge on the lake',
      'All meals and local drinks',
      'Park entry fees and boat safari',
      'Driver-guide and 4x4 with pop-up roof',
      'Walking safari permit',
    ],
    excluded: [
      'International flights',
      'Visa and travel insurance',
      'Drinks outside the included list',
      'Gratuities',
    ],
    days: [
      {
        title: 'Kampala to Mweya and the Ishasha sector',
        description:
          'Leave Kampala after breakfast for the long drive west, stopping at the Equator monument for the obligatory photograph. Reach Mweya in the afternoon for your first game drive, then continue to Ishasha at the far end of the park where the escarpment falls away to the Kazinga Channel below.',
        accommodation: 'Lodge overlooking Lake Edward',
        meals: 'Breakfast and dinner',
      },
      {
        title: 'Kazinga Channel boat safari and Kyambura gorge',
        description:
          'Morning game drive through Ishasha, then an afternoon on the Kazinga Channel by boat — hippo pods, elephant herds crossing, and the birdlife along the channel walls. The next morning, a walking safari into the Kyambura gorge with an armed ranger and tracker.',
        accommodation: 'Same lodge',
        meals: 'Breakfast, lunch and dinner',
      },
      {
        title: 'Explosion crater and return to Kampala',
        description:
          'A final morning drive past the Explosion Crater, where a swallowed lake throws its water underground every 30 years or so. On the drive back we stop at the royal palace at Mbarara, then continue to Kampala or Entebbe for your flight.',
        accommodation: '—',
        meals: 'Breakfast and lunch',
      },
    ],
    reviews: [
      {
        authorName: 'Anna B.',
        authorCountry: 'Germany',
        rating: 5,
        comment:
          'We saw a leopard in a tree in Ishasha on our second morning, which is the sighting everyone waits for. The Kazinga boat is a proper wildlife experience, not just a scenic cruise.',
      },
      {
        authorName: 'Joseph M.',
        authorCountry: 'United States',
        rating: 5,
        comment:
          'Our guide Richard knew exactly where the lions were and never rushed us. The Kyambura walk is a different kind of safari and I would not have wanted to miss it.',
      },
    ],
  },
  {
    slug: 'murchison-falls-nile-safari',
    title: 'Murchison Falls: Nile Boat Safari, Game Drive & the Falls',
    destinationSlug: 'murchison-falls-national-park',
    summary:
      'Three days at Uganda’s largest park: boat to the base of the falls, a savanna game drive among elephant herds, and birding for shoebill storks.',
    description:
      'Murchison is the park to choose if you only have one northern trip. The boat trip from Paraa to the falls is the centrepiece — 45 minutes up the Nile with the volume of the water rising as you approach, ending in the seven-metre gap itself. The savanna around the park holds enormous elephant herds and, if you are lucky, a rare encounter with the Vulnerable giant otter. The falls viewpoint at the top is a short but steep 45-minute climb.',
    priceCents: 68000,
    durationDays: 3,
    difficulty: 'moderate',
    groupSizeMax: 8,
    rating: 4.7,
    reviewCount: 81,
    featured: true,
    highlights: [
      'Boat safari to the base of the falls',
      'Large elephant herds on the savanna plains',
      'Shoebill storks and over 1,000 bird species',
      'Karuma Island and the hippo pools',
    ],
    included: [
      'Two nights at a lakeside lodge',
      'All meals and local drinks',
      'Park entry fees',
      'Nile boat safari and game drives',
      'Driver-guide and 4x4',
    ],
    excluded: [
      'International flights',
      'Visa and travel insurance',
      'Optional helicopter flight over the falls',
      'Gratuities and personal expenses',
    ],
    days: [
      {
        title: 'Kampala to the northern park',
        description:
          'The drive north takes around six hours with a stop at the Ziwa Rhino Sanctuary, where you can get out of the vehicle and meet the last wild rhinos in Uganda on foot. Arrive at the lodge on the lake in the late afternoon for a game drive as the light goes.',
        accommodation: 'Lodge on the banks of Lake Victoria',
        meals: 'Breakfast and dinner',
      },
      {
        title: 'The boat safari to the falls',
        description:
          'Early breakfast, then board the boat for the run upriver to Murchison Falls. Hippo graze the shallows, eagles patrol the banks, and the roar of the water builds steadily. At the base, the boat stops and you can photograph the Nile as it is forced through the rock — and see the rainbow that forms in the spray.',
        accommodation: 'Same lodge',
        meals: 'Breakfast, lunch and dinner',
      },
      {
        title: 'Game drive and the falls viewpoint',
        description:
          'A morning drive across the savanna in search of elephant, giraffe, kob and the park’s rich birdlife, then the optional walk to the top viewpoint — 45 minutes of steep, rocky path for a view straight down into the falls. Return to Kampala in the afternoon.',
        accommodation: '—',
        meals: 'Breakfast and lunch',
      },
    ],
    reviews: [
      {
        authorName: 'Erik S.',
        authorCountry: 'Sweden',
        rating: 5,
        comment:
          'The boat trip is the thing. Bring a rain jacket — you will get soaked by the spray at the base of the falls, and you will be glad you had one.',
      },
      {
        authorName: 'Linda W.',
        authorCountry: 'Canada',
        rating: 4,
        comment:
          'Great park, wonderful birding, and the elephant herds are astonishing in number. The drive up from Kampala is long, so book the Ziwa stop rather than rushing it.',
      },
    ],
  },
  {
    slug: 'murchison-falls-helicopter-bush-dinner',
    title: 'Murchison Falls Helicopter Flight & Bush Dinner',
    destinationSlug: 'murchison-falls-national-park',
    summary:
      'Two days of pure indulgence: a helicopter flight over the falls and the Nile, a bush dinner under a lantern-lit acacia, and a night in a private tent.',
    description:
      'This is the version of Murchison for a special occasion. A private helicopter flies the length of the park, over the falls and along the Nile to Paraa and back — a viewpoint that simply does not exist from the ground. The bush dinner is served at a lantern-lit table in the wilderness, with the sounds of the bush around you and the light of a fire.',
    priceCents: 118000,
    durationDays: 2,
    difficulty: 'easy',
    groupSizeMax: 4,
    rating: 4.9,
    reviewCount: 27,
    featured: false,
    highlights: [
      'Private 45-minute helicopter flight over the falls',
      'Lantern-lit bush dinner in the wilderness',
      'Night drive with a spotlight for nocturnal wildlife',
      'Tented camp on the lake shore',
    ],
    included: [
      'Private helicopter charter (45 minutes)',
      'One night in a luxury tented camp',
      'All meals, including the bush dinner',
      'Sunset and night game drives',
      'Professional photographer for the flight',
    ],
    excluded: [
      'International flights',
      'Visa and travel insurance',
      'Wine and premium spirits at dinner',
      'Gratuities',
    ],
    days: [
      {
        title: 'Arrival, afternoon drive and the bush dinner',
        description:
          'Transfer from Kampala to the camp, with a walk to the lake edge and a sunset game drive. Dinner is served in the bush at a dressed table — a fire, lanterns, a chef, and the sounds of the park. Afterwards, a spotlight drive for leopard, civet, and the occasional elephant after dark.',
        accommodation: 'Luxury tented camp, Lake Victoria shore',
        meals: 'Lunch, bush dinner and drinks',
      },
      {
        title: 'Helicopter flight over the falls',
        description:
          'Breakfast, then the helicopter. You lift off from the strip near the camp, bank over the lake and follow the Nile upstream, climbing as you reach the falls for the view from above that no viewpoint can match. The flight ends with a low pass over the river before returning to camp. Transfer back to Kampala in the afternoon.',
        accommodation: '—',
        meals: 'Breakfast and lunch',
      },
    ],
    reviews: [
      {
        authorName: 'Priya S.',
        authorCountry: 'Singapore',
        rating: 5,
        comment:
          'We proposed here and the bush dinner under the lanterns was the single most romantic evening of our lives. The helicopter over the falls is unreal.',
      },
    ],
  },
  {
    slug: 'lake-bunyonyi-island-hopping',
    title: 'Lake Bunyonyi Island Hopping & Canoeing',
    destinationSlug: 'lake-bunyonyi',
    summary:
      'Two slow days on Africa’s most beautiful lake — dugout canoe between islands, sunrise from Mukano, and swimming in water that is startlingly clean.',
    description:
      'Bunyonyi is where you go to slow down. You will move between islands in dugout canoes, walk the terraced hillsides, swim in water with no bilharzia and no crocodiles, and watch the sun come up over the Rwenzori from the ridge at Mukano Island. There is no big game here and no need for it — this is a landscape trip, and it is the counterweight to a week of safari.',
    priceCents: 38000,
    durationDays: 2,
    difficulty: 'easy',
    groupSizeMax: 10,
    rating: 4.8,
    reviewCount: 74,
    featured: true,
    highlights: [
      'Dugout canoe hopping between 29 islands',
      'Sunrise from Mukano Island',
      'Swimming in the cleanest water in Uganda',
      'Guided walk to the Bunagala sacred cave',
    ],
    included: [
      'One night on a lakeside island lodge',
      'All meals and local drinks',
      'Canoe excursions with a local guide',
      'Mukano sunrise and the Bunagala cave walk',
      'Transfer from Kampala',
    ],
    excluded: [
      'International flights',
      'Visa and travel insurance',
      'Optional zipline and canopy walk',
      'Gratuities',
    ],
    days: [
      {
        title: 'Kampala to Bunyonyi and the first islands',
        description:
          'A four-hour drive through the highlands past Kabale, with a stop for a hot lunch. Cross the lake by dugout to your island lodge in the afternoon — the boat ride alone is worth it. Swim off the jetty before dinner, which is served on the terrace with the lake going dark in front of you.',
        accommodation: 'Island lodge on Lake Bunyonyi',
        meals: 'Lunch and dinner',
      },
      {
        title: 'Sunrise at Mukano and the sacred cave',
        description:
          'A pre-dawn canoe to Mukano Island and a climb to the viewpoint for sunrise over the islands and the Rwenzori behind them. Back down for breakfast, then a walk through the villages to the Bunagala cave, a site of real spiritual significance to the local Batwa and a good place to end a quiet trip.',
        accommodation: '—',
        meals: 'Breakfast and lunch',
      },
    ],
    reviews: [
      {
        authorName: 'Sarah L.',
        authorCountry: 'Ireland',
        rating: 5,
        comment:
          'After three days of early game drives I needed this. The sunrise canoe on day two was worth the early alarm. Take a jumper — it is genuinely cold on the lake before dawn.',
      },
      {
        authorName: 'Marco F.',
        authorCountry: 'Italy',
        rating: 5,
        comment:
          'The water is unbelievably clear. We swam twice and never saw a single mosquito. Half the island is terraced farmland and the paths between them are beautiful to walk.',
      },
    ],
  },
  {
    slug: 'jinja-nile-rafting-ziwa-rhino',
    title: 'Jinja: Source of the Nile, Rafting & Ziwa Rhino',
    destinationSlug: 'jinja-and-the-source-of-the-nile',
    summary:
      'Four days of adventure in Uganda’s second city: Grade IV–V rafting, the source of the Nile, the Jinja Nile Bridge, and walking among rhinos.',
    description:
      'Jinja is where Uganda gets its energy. You will raft the white-water section of the Nile at Grade IV and V, walk to the source where the river leaves Lake Victoria as a trickle you could step across, cross the famous suspension bridge on foot, and spend a morning with the rhinos at Ziwa — the only place in Uganda where you can walk among them without a vehicle.',
    priceCents: 89000,
    durationDays: 4,
    difficulty: 'moderate',
    groupSizeMax: 8,
    rating: 4.8,
    reviewCount: 112,
    featured: false,
    highlights: [
      'Grade IV–V white-water rafting on the Nile',
      'The Source of the Nile and Semei Falls',
      'Walking with rhinos at Ziwa Rhino Sanctuary',
      'Sunset on the Jinja Nile Bridge',
    ],
    included: [
      'Three nights at a riverside lodge',
      'All meals and local drinks',
      'Full-day rafting with all equipment and instruction',
      'Ziwa rhino sanctuary entry and guided walk',
      'All transfers and local transport',
    ],
    excluded: [
      'International flights',
      'Visa and travel insurance',
      'Optional bungee jump and zipline',
      'Gratuities',
    ],
    days: [
      {
        title: 'Arrival in Jinja and the Source of the Nile',
        description:
          'Transfer from Kampala to Jinja, and a short drive to the source of the Nile where the river squeezes out of Lake Victoria in a barely ankle-deep trickle. Continue to Semei Falls — the Nile at its narrowest — and back to the lodge for the evening. Most travellers walk the Jinja Nile Bridge at sunset.',
        accommodation: 'Riverside lodge in Jinja',
        meals: 'Lunch and dinner',
      },
      {
        title: 'White-water rafting on the Nile',
        description:
          'A full day on the river: safety briefing, paddle practice on the calm water, then the Grade IV and V sections — including a grade-five stopper. Our guides are certified and the boat carries a full safety team with throw bags and spare oars. You do not need any prior experience.',
        accommodation: 'Same lodge',
        meals: 'Breakfast, lunch and dinner',
      },
      {
        title: 'Ziwa Rhino Sanctuary',
        description:
          'Drive north to Ziwa, the only place in Uganda with wild rhino you can meet on foot. You walk with a keeper and his rhinos, feed them, and in the afternoon ride out into the sanctuary on the back of a rhino — a conservation programme you are directly supporting with your visit fee.',
        accommodation: 'Same lodge',
        meals: 'Breakfast, lunch and dinner',
      },
      {
        title: 'Bujagali Falls and return',
        description:
          'A last morning at Bujagali Falls, 45 minutes north of Jinja — a wide, powerful curtain of water with a walk behind it. Return to Kampala in the afternoon, or continue on to Murchison Falls if your itinerary includes the north.',
        accommodation: '—',
        meals: 'Breakfast and lunch',
      },
    ],
    reviews: [
      {
        authorName: 'Ben T.',
        authorCountry: 'New Zealand',
        rating: 5,
        comment:
          'I have rafted in a lot of places and the grade five was the real deal. The guide had us laughing through the whole thing. Ziwa with the rhinos was unexpected and wonderful.',
      },
      {
        authorName: 'Nadia R.',
        authorCountry: 'France',
        rating: 5,
        comment:
          'Great trip and very well organised. The source of the Nile looks like nothing at all, which is the point, and our guide explained it brilliantly.',
      },
    ],
  },
  {
    slug: 'white-water-rafting-nile-jinja',
    title: 'White Water Rafting on the Nile',
    destinationSlug: 'jinja-and-the-source-of-the-nile',
    summary:
      'One full day on the Nile’s white-water section — Grade IV and V rapids, an optional grade-V stopper, and a riverside lunch in between.',
    description:
      'A single, properly full day on the most reliable white water in East Africa. The Nile section below Jinja runs at grade III to V, and our boats work their way down through Jinja’s famous rapids — the “Big” and the “Small” — before the optional grade-five stopper that teams call the “Money Maker”. No experience required, but you will need to be comfortable getting wet.',
    priceCents: 9500,
    durationDays: 1,
    difficulty: 'moderate',
    groupSizeMax: 8,
    rating: 4.9,
    reviewCount: 203,
    featured: false,
    highlights: [
      'Grade IV and V rapids on the Nile',
      'Optional grade-V "Money Maker" stopper',
      'Full safety team and certified guides',
      'Riverside lunch and transport from Kampala',
    ],
    included: [
      'Full-day rafting with all equipment',
      'Certified guide, safety kayakers and safety boat',
      'Lunch and soft drinks',
      'Transport from Kampala',
    ],
    excluded: [
      'International flights and insurance',
      'Photos and videos (available to buy on the day)',
      'Gratuities',
    ],
    days: [
      {
        title: 'Rafting day',
        description:
          'Collect you from Kampala at 6:30am for the two-hour drive to the put-in point. Safety briefing, paddle practice on the flat water, and then the river itself: several grade-IV rapids through the run of the day, a riverside lunch, and the grade-five stopper for anyone who wants it. Back in Kampala by late afternoon, exhausted and very wet.',
        accommodation: '—',
        meals: 'Breakfast and lunch',
      },
    ],
    reviews: [
      {
        authorName: 'Chris D.',
        authorCountry: 'South Africa',
        rating: 5,
        comment:
          'Best value adventure day in Africa. The guides are professionals — they spot you, they coach you, and they make the grade five optional in exactly the right way.',
      },
      {
        authorName: 'Yuki M.',
        authorCountry: 'Japan',
        rating: 5,
        comment:
          'I was terrified and it was the best day of my trip. The safety team was impeccable and the river is genuinely beautiful between rapids.',
      },
    ],
  },
  {
    slug: 'rwenzori-mountains-margherita-hut-trek',
    title: 'Rwenzori Trek: Mulago Hut to the Margherita Hut',
    destinationSlug: 'rwenzori-mountains',
    summary:
      'Five days to Africa’s highest hut at 4,306 m — bog, giant lobelia, scree, snow and the Mountains of the Moon.',
    description:
      'This is a serious trek in a serious landscape. The Rwenzori are unlike any other mountain in Africa: equatorial, enormous and strangely drab, draped in giant groundsel forests and thigh-deep bog, with glaciers at the summit despite sitting on the equator. Over five days you walk from Kilembe through Afro-alpine moorland to the Margherita Hut — the highest hut on the African continent — and on a good day to the summit of Mount Stanley.',
    priceCents: 145000,
    durationDays: 5,
    difficulty: 'challenging',
    groupSizeMax: 8,
    rating: 4.8,
    reviewCount: 42,
    featured: false,
    highlights: [
      'Sleep at 4,306 m — Africa’s highest hut',
      'Giant groundsel and Lobelia forests',
      'Optional summit push on Mount Stanley',
      'Afro-alpine moorland and glacial valleys',
    ],
    included: [
      'Four nights of mountain huts and one lodge',
      'All meals on the mountain, porter carry',
      'Certified mountain guide and NPS ranger',
      'National park entry and hut fees',
      'Porters, cook and camp equipment',
    ],
    excluded: [
      'International flights',
      'Visa and travel insurance',
      'Personal climbing gear (we rent boots, jackets and raincoats)',
      'Gratuities for the porters and guides',
    ],
    days: [
      {
        title: 'Kilembe to the trailhead',
        description:
          'Meet at the park headquarters in Kilembe, where the ranger checks your permit and the porters load up. Walk an easy two hours through farmland and pine forest to the first camp at 3,000 m. Dinner, and an early night — the altitude begins tomorrow.',
        accommodation: 'Basic mountain hut at 3,000 m',
        meals: 'Lunch and dinner',
      },
      {
        title: 'Into the moorland',
        description:
          'A long, steady day through dense rainforest that thins into bamboo, then into the open moorland above 3,600 m. The landscape changes completely: giant groundsel and lobelia towers, tussocks, and the first patches of ice. Camp at 3,875 m.',
        accommodation: 'Mountain hut at 3,875 m',
        meals: 'Breakfast, lunch and dinner',
      },
      {
        title: 'Bog valley to Mulago Hut',
        description:
          'The hardest walking day — a glacial valley crossed on bog boards, up and over a 4,150 m pass, and down to Mulago Hut at 3,700 m. Slow, heavy going, and completely worth it.',
        accommodation: 'Mulago Hut at 3,700 m',
        meals: 'Breakfast, lunch and dinner',
      },
      {
        title: 'The Margherita Hut',
        description:
          'A 600-metre climb to the summit ridge and the Margherita Hut at 4,306 m, Africa’s highest. If the weather allows, continue to the 5,109 m summit of Mount Stanley. The descent the next day is fast and you will feel every step of it.',
        accommodation: 'Margherita Hut at 4,306 m',
        meals: 'Breakfast, lunch and dinner',
      },
      {
        title: 'Descent to Kilembe',
        description:
          'Drop back down through the moorland to the forest and out to Kilembe, a long but gentle day with the lower camp reached well before dusk. A hot meal, a shower, and a very well-earned rest.',
        accommodation: '—',
        meals: 'Breakfast and lunch',
      },
    ],
    reviews: [
      {
        authorName: 'Hugo R.',
        authorCountry: 'Switzerland',
        rating: 5,
        comment:
          'Harder than I expected and better for it. The bog on day three is brutal, but the summit ridge is the most strange and beautiful place I have ever stood.',
      },
      {
        authorName: 'Amara O.',
        authorCountry: 'Nigeria',
        rating: 4,
        comment:
          'Take the acclimatisation seriously — I got a headache on day two and the guide adjusted our pace. The porters were wonderful and the food above the treeline was surprisingly good.',
      },
    ],
  },
  {
    slug: 'kampala-city-cultural-tour',
    title: 'Kampala City & Cultural Heritage Tour',
    destinationSlug: 'kampala-and-the-cultural-heartland',
    summary:
      'A full day in Uganda’s capital — the Kasubi Tombs, the Uganda Museum, Nakasero market, the Imbiro drumming village and the seven hills.',
    description:
      'Before the parks and the Nile, there is Kampala: a hilly, chaotic, green capital with a royal history and one of the most vibrant craft scenes in East Africa. This full-day tour covers the Kasubi Tombs of the Buganda kings, the Uganda Museum, Nakasero’s market and food stalls, and ends with the Imbiro cultural village, where the drums are still played the way they have been for generations.',
    priceCents: 12000,
    durationDays: 1,
    difficulty: 'easy',
    groupSizeMax: 12,
    rating: 4.6,
    reviewCount: 58,
    featured: false,
    highlights: [
      'The Kasubi Tombs of the Buganda kingdom',
      'Uganda Museum and the archaeological collection',
      'Nakasero market and street food',
      'Imbiro drumming village and dance',
    ],
    included: [
      'All entry fees and permits',
      'Lunch at a local restaurant',
      'Guide and private vehicle with driver',
      'Hotel pick-up and drop-off',
    ],
    excluded: [
      'International flights and insurance',
      'Craft purchases (unless you want them)',
      'Gratuities',
    ],
    days: [
      {
        title: 'Royal Kampala and the cultural heartland',
        description:
          'Start at the Kasubi Tombs, the burial ground of four Buganda kings, then the Uganda Museum and its archaeological collection. After lunch in the city centre, walk through Nakasero market — textiles, fruit, and the best street food in Kampala — before the drive out to the Imbiro village for drumming and dance as the sun goes down.',
        accommodation: '—',
        meals: 'Lunch',
      },
    ],
    reviews: [
      {
        authorName: 'Alex J.',
        authorCountry: 'Germany',
        rating: 5,
        comment:
          'A great first day. The Imbiro drummers at the end are worth the whole tour on their own — we stayed an extra hour.',
      },
    ],
  },
];

export const adminUser = {
  email: 'admin@safaritrails.com',
  name: 'Safari Trails Admin',
  role: 'admin',
};
