import { ArrowRight, BadgeCheck, CalendarDays, House, Layers, Ruler, Timer } from 'lucide-react';
import { Link } from 'react-router-dom';
import plant from '../../../assets/collection-plant-classic.webp';
import '../styles/mobile-customize.css';

const features = [
  { label: 'Custom Sizes', Icon: Ruler },
  { label: 'Bulk Pricing', Icon: Layers },
  { label: 'On-time Delivery', Icon: Timer },
  { label: 'Premium Quality', Icon: BadgeCheck },
];

export default function MobileCustomizeSection() {
  return (
    <section className="fy-custom-mobile" aria-labelledby="customize-mobile-title">
      <div className="fy-custom-mobile__hero">
        <div className="fy-custom-mobile__scene" role="img" aria-label="Black, brown and grey frames with white mats leaning on a shelf beside a green potted plant">
          <span className="fy-custom-mobile__shelf" />
          <span className="fy-custom-mobile__frame fy-custom-mobile__frame--black"><span /></span>
          <img src={plant} width="400" height="600" loading="lazy" decoding="async" alt="Green leafy plant in a light vase" />
          <span className="fy-custom-mobile__frame fy-custom-mobile__frame--brown"><span /></span>
          <span className="fy-custom-mobile__frame fy-custom-mobile__frame--grey"><span /></span>
        </div>
        <div className="fy-custom-mobile__copy">
          <h1 id="customize-mobile-title">Customize Your<br />Frame</h1>
          <span className="fy-custom-mobile__underline" aria-hidden="true" />
          <p>Get a frame made just for you or place a bulk order for your home, office, events, or gifting.</p>
        </div>
      </div>
      <Link className="fy-custom-mobile__appointment" to="/book-appointment#appointment-form" aria-label="Enquiry now: book an appointment for custom frames or bulk orders">
        <span className="fy-custom-mobile__calendar"><CalendarDays aria-hidden="true" /></span>
        <span className="fy-custom-mobile__appointment-copy"><strong>Book an Appointment</strong><span>For Custom Frames or Bulk Orders</span></span>
        <span className="fy-custom-mobile__cta">Enquiry Now <ArrowRight size={14} aria-hidden="true" /></span>
      </Link>
      <p className="fy-custom-mobile__note"><House size={17} aria-hidden="true" /><span>Ordering in bulk? We visit your home or workspace, check the space, and give you design and layout advice. Free for bulk bookings.</span></p>
      <ul className="fy-custom-mobile__features" aria-label="Custom framing benefits">
        {features.map(({ label, Icon }) => <li key={label}><Icon size={20} strokeWidth={1.7} aria-hidden="true" /><span>{label}</span></li>)}
      </ul>
    </section>
  );
}
