/**
 * The three pages a publisher is expected to have.
 *
 * Google AdSense asks for these before it reviews an application: a page
 * that says who runs the site, a privacy policy that explains what happens
 * to a visitor's data, and the terms that apply to using the site. Without
 * them an application stalls in "site not ready" and you never find out
 * whether the real problem was something else.
 *
 * They live in one file because they share a layout and change together.
 */
import { useSeo } from '../seo/useSeo';
import { Icon } from '../components/Icon';

const CONTACT = {
  phone: '+256 730 293 345',
  email: 'hello@safaritrails.com',
  address: 'Plot 7, Kampala Road, Kampala, Uganda',
  hours: 'Monday to Saturday, 08:00–18:00 EAT',
};

function LegalLayout({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <div className="container-page py-14 md:py-20">
      <div className="max-w-3xl">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-2 font-display text-3xl font-semibold md:text-4xl">{title}</h1>
        <p className="mt-4 text-lg text-forest-700/75">{intro}</p>
        <div className="prose-seo mt-10 space-y-6 text-forest-800/85">{children}</div>
      </div>
    </div>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-xl font-semibold text-forest-900">{children}</h2>;
}

export function About() {
  useSeo({
    title: 'About Safari Trails — who we are and how we work',
    description:
      'Safari Trails is a Kampala-based tour operator running small-group gorilla trekking, Nile rafting and Rift Valley safaris across Uganda. We answer our own phone.',
    path: '/about',
  });

  return (
    <LegalLayout
      eyebrow="About us"
      title="We are the people who live here"
      intro="Safari Trails is a small Kampala tour operator. We are not a marketplace of anonymous sellers — the trips on this site are the ones we run ourselves, with guides we employ and camps we have stayed in ourselves."
    >
      <p>
        We started because so many safaris in Uganda are sold by people who have never
        been on them. Ours are small-group, they are run by local guides, and the
        phone number at the top of every page is answered by a human in Kampala.
      </p>

      <H2>What we do</H2>
      <p>
        Gorilla trekking in Bwindi Impenetrable Forest, Queen Elizabeth National Park,
        Murchison Falls, Lake Bunyonyi, the Rwenzori Mountains and Jinja on the
        Nile. We plan the routes, we brief the guides, and we answer for the day
        when something goes sideways — which, on a 5:00 a.m. gorilla trek, it
        sometimes does.
      </p>

      <H2>How a booking works</H2>
      <p>
        You pick a tour, send us a booking request with your dates, and we come back
        within one working day with a confirmed price and whether we can seat you.
        Nothing is charged online; we take payment by mobile money or bank transfer
        once the trip is confirmed.
      </p>

      <H2>Getting in touch</H2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Phone: {CONTACT.phone}</li>
        <li>Email: {CONTACT.email}</li>
        <li>Office: {CONTACT.address}</li>
        <li>Open: {CONTACT.hours}</li>
      </ul>

      <H2>Photography</H2>
      <p>
        Photography on this site comes from Wikimedia Commons under Creative Commons
        licences, with the photographer credited on each page. Our own photographs
        are of our own trips.
      </p>
    </LegalLayout>
  );
}

export function Privacy() {
  useSeo({
    title: 'Privacy policy — Safari Trails',
    description:
      'What Safari Trails collects, why we collect it, how long we keep it, and how to have it deleted. Written in plain English, not legal fog.',
    path: '/privacy',
  });

  return (
    <LegalLayout
      eyebrow="Legal"
      title="Privacy policy"
      intro="This is a short, honest policy. If something here is unclear, email us and we will explain it."
    >
      <p>
        Last updated: 10 November 2026. Safari Trails is operated from Kampala, Uganda.
      </p>

      <H2>What we collect</H2>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>Booking requests.</strong> Your name, email, phone number, the tour,
          your dates and how many travellers. We need this to run the trip.
        </li>
        <li>
          <strong>Enquiries from the contact form.</strong> Your name, email and message.
        </li>
        <li>
          <strong>Server logs.</strong> Like every website, our host keeps short-lived
          logs of IP addresses and page requests for security and troubleshooting.
        </li>
      </ul>

      <H2>What we do not collect</H2>
      <p>
        We do not sell your details. We do not run tracking pixels, we do not build
        advertising profiles of you, and we do not share your information with third
        parties for their marketing.
      </p>

      <H2>Who else sees it</H2>
      <p>
        Only the people who need it to run your trip — the guide, the lodge, the park
        authority where a permit requires it. Our hosting provider (Vercel) and our
        database provider (Supabase) store the data on our behalf.
      </p>

      <H2>How long we keep it</H2>
      <p>
        Booking records are kept for two years for accounting and permit purposes.
        Enquiries that do not become bookings are deleted after six months. Enquiries
        that do become bookings are kept under the booking rule.
      </p>

      <H2>Cookies</H2>
      <p>
        The site sets no advertising cookies. It uses one functional cookie to keep
        you signed in to the operator dashboard, and the browser's local storage to
        remember that you are signed in. That is all.
      </p>

      <H2>Your rights</H2>
      <p>
        Ask us for a copy of what we hold, ask us to correct it, or ask us to delete
        it. Email{' '}
        <a href={`mailto:${CONTACT.email}`} className="text-brand-700 underline">
          {CONTACT.email}
        </a>{' '}
        and we will deal with it. If you are in the EU or UK you also have the legal
        rights to complain to your data protection authority, and we would rather you
        told us first.
      </p>

      <H2>Contact</H2>
      <p>
        {CONTACT.address}. {CONTACT.phone}. {CONTACT.email}.
      </p>
    </LegalLayout>
  );
}

export function Terms() {
  useSeo({
    title: 'Terms of use — Safari Trails',
    description:
      'The terms that apply when you use the Safari Trails website and book a tour with us: prices, deposits, cancellations, and what we ask of you.',
    path: '/terms',
  });

  return (
    <LegalLayout
      eyebrow="Legal"
      title="Terms of use"
      intro="The plain-English version of the rules for booking a trip with us."
    >
      <H2>Using this site</H2>
      <p>
        The content on this site is provided for information. Prices and availability
        can change, and a booking request is not a confirmed booking — we confirm by
        email or phone, and a trip is only confirmed once we have replied and taken
        payment.
      </p>

      <H2>Prices and payment</H2>
      <p>
        Prices are shown in the currency on the tour page and include the park
        permits and the services listed under "included". They do not include
        international flights, travel insurance, visas, or anything listed under "not
        included". Payment is taken by mobile money or bank transfer; we do not take
        card details on this website.
      </p>

      <H2>Deposits and cancellation</H2>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          A deposit of 30% confirms your place; the balance is due 14 days before
          the tour starts.
        </li>
        <li>
          Cancel more than 30 days before and the deposit is refunded, less the
          cost of permits already bought, which cannot be refunded.
        </li>
        <li>
          Cancel inside 30 days and the deposit is not refundable, because the
          permits and the lodge are already paid for.
        </li>
        <li>
          If we have to cancel — a park closure, a permit refusal, weather that makes
          the trip unsafe — you get everything back, including the deposit.
        </li>
      </ul>

      <H2>Your responsibilities</H2>
      <p>
        Tell us about anything that could affect your trip: medical conditions,
        allergies, mobility limits, dietary needs, or a passport that expires before
        the tour. Carry the travel insurance we ask for. Follow park rules. Do not
        approach the wildlife. If you break a rule that puts you or someone else at
        risk, we may have to end your trip, and we would not refund the remainder.
      </p>

      <H2>Images and text</H2>
      <p>
        Photography from Wikimedia Commons is used under its Creative Commons
        licence and credited. Our own text and photographs belong to us. You may
        quote us with a link back.
      </p>

      <H2>Liability</H2>
      <p>
        Safari Tours acts as the booking agent for the trips listed. We are liable
        for our own acts and omissions and for the acts and omissions of the
        suppliers we use, so far as the law allows us to be. We are not liable for
        events outside our control such as weather, government decisions, border
        closures, or illness.
      </p>

      <H2>Governing law</H2>
      <p>
        These terms are governed by the laws of Uganda, and the courts of Uganda have
        jurisdiction over any dispute.
      </p>

      <H2>Questions</H2>
      <p>
        <Icon name="mail" className="h-4 w-4" />{' '}
        <a href={`mailto:${CONTACT.email}`} className="text-brand-700 underline">
          {CONTACT.email}
        </a>{' '}
        or {CONTACT.phone}, {CONTACT.hours}.
      </p>
    </LegalLayout>
  );
}
