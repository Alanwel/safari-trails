/** Types mirroring the API response shapes. */

export type ImageCredit = {
  title: string;
  artist: string;
  license: string;
  sourceUrl: string;
};

export type Difficulty = 'easy' | 'moderate' | 'challenging';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export type DestinationSummary = {
  id: number;
  slug: string;
  name: string;
  region: string;
  tagline: string;
  description: string;
  coverImage: string | null;
  imageCredit: ImageCredit | null;
  highlights: string[];
  bestSeason: string | null;
  averageDays: number | null;
  tourCount: number;
};

export type Destination = Omit<DestinationSummary, 'tourCount'> & {
  tours: TourSummary[];
};

export type TourSummary = {
  id: number;
  slug: string;
  title: string;
  summary: string;
  priceCents: number;
  currency: string;
  durationDays: number;
  difficulty: Difficulty;
  groupSizeMax: number;
  rating: number;
  reviewCount: number;
  featured: boolean;
  coverImage: string | null;
  imageCredit: ImageCredit | null;
  highlights: string[];
  destination: {
    id: number;
    slug: string;
    name: string;
    region: string;
  };
};

export type TourDay = {
  id: number;
  dayNumber: number;
  title: string;
  description: string;
  accommodation: string | null;
  meals: string | null;
  image: string | null;
};

export type TourImage = {
  id: number;
  url: string;
  alt: string;
  imageCredit: ImageCredit | null;
  position: number;
};

export type Review = {
  id: number;
  authorName: string;
  authorCountry: string | null;
  rating: number;
  comment: string;
  createdAt: string;
};

export type TourDetail = Omit<TourSummary, 'imageCredit'> & {
  description: string;
  imageCredit: ImageCredit | null;
  included: string[];
  excluded: string[];
  destination: DestinationSummary;
  days: TourDay[];
  images: TourImage[];
  reviews: Review[];
  related: {
    slug: string;
    title: string;
    priceCents: number;
    currency: string;
    durationDays: number;
    coverImage: string | null;
    rating: number;
    reviewCount: number;
    destination: {
      id: number;
      slug: string;
      name: string;
      region: string;
    };
  }[];
};

export type TourMeta = {
  priceRange: { min: number; max: number };
  durationRange: { min: number; max: number };
  difficultyCounts: Record<string, number>;
  destinations: {
    slug: string;
    name: string;
    region: string;
    tourCount: number;
  }[];
};

export type PageMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  sort?: string;
};

export type Booking = {
  id: number;
  reference: string;
  tourId: number;
  tourSlug: string;
  tourTitle: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  travellers: number;
  startDate: string;
  message: string | null;
  status: BookingStatus;
  totalCents: number;
  createdAt: string;
};

export type AdminStats = {
  byStatus: Record<BookingStatus, number>;
  totalBookings: number;
  confirmedRevenueCents: number;
  travellers: number;
  openInquiries: number;
};
