import React, { FormEvent, useState } from 'react';
import axios from 'axios';
import { BriefcaseBusiness, Camera, LucideIcon, Mail, MapPin, Phone, Send, Share2 } from 'lucide-react';
import footerCraftsmanship from '../../../assets/footer-craftsmanship.png';
import { newsletterService } from '../../../services/newsletter.service';

interface SocialLink {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface ContactItem {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
}

const socialLinks: SocialLink[] = [
  { name: 'Facebook', href: 'https://facebook.com', icon: Share2 },
  { name: 'Instagram', href: 'https://instagram.com', icon: Camera },
  { name: 'LinkedIn', href: 'https://linkedin.com', icon: BriefcaseBusiness },
];

const contactItems: ContactItem[] = [
  { label: 'Phone', value: '+91 98765 43210', icon: Phone },
  { label: 'Email', value: 'hello@frameyaad.com', icon: Mail },
  {
    label: 'Address',
    value: (
      <>
        FrameYaad
        <br />
        Oddanchatram, Tamil Nadu
        <br />
        India
      </>
    ),
    icon: MapPin,
  },
];

const quickLinks = ['Privacy Policy', 'Terms & Conditions', 'Refund Policy'];

const FooterIllustration: React.FC = () => (
  <div className="relative overflow-hidden bg-white">
    <img
      src={footerCraftsmanship}
      alt="FrameYaad handcrafted framing process illustration"
      loading="lazy"
      className="block h-[150px] w-full object-cover object-bottom sm:h-[190px] md:h-[220px] lg:h-auto"
    />
    <div className="sr-only">
      <span>FrameYaad craftsmanship process: frame crafting, photo framing, quality inspection, and packaging.</span>
    </div>
  </div>
);

const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubscribe = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setMessage({ type: 'error', text: 'Email address is required.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setMessage({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const result = await newsletterService.subscribe(normalizedEmail);
      setMessage({
        type: 'success',
        text: result.resubscribed
          ? "Welcome back! You're subscribed to our newsletter again."
          : "You're subscribed to our newsletter!",
      });
      setEmail('');
    } catch (error) {
      const code = axios.isAxiosError(error) ? error.response?.data?.error?.code : undefined;
      setMessage({
        type: code === 'ALREADY_SUBSCRIBED' ? 'success' : 'error',
        text: code === 'ALREADY_SUBSCRIBED'
          ? "You're already subscribed to our newsletter."
          : 'Unable to subscribe right now. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="animate-fade-in bg-white">
      <FooterIllustration />

      <div className="relative -mt-2 bg-[#090909] text-white">
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-5 sm:px-6 sm:pb-12 sm:pt-6 lg:px-8 lg:pb-16 lg:pt-8">
          <div className="grid gap-9 sm:gap-10 md:grid-cols-3 md:gap-6 lg:gap-14">
            <section aria-labelledby="newsletter-heading">
              <h2 id="newsletter-heading" className="text-xl font-black sm:text-2xl">Subscribe to our Newsletter</h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-white/60">
                Get updates on new frame collections, exclusive offers, and product launches.
              </p>
              <form onSubmit={handleSubscribe} className="mt-5 flex flex-col gap-3 xl:flex-row">
                <label htmlFor="footer-newsletter-email" className="sr-only">Email address</label>
                <input
                  id="footer-newsletter-email"
                  type="email"
                  value={email}
                  onChange={(event) => { setEmail(event.target.value); setMessage(null); }}
                  placeholder="Enter your email"
                  disabled={submitting}
                  aria-invalid={message?.type === 'error'}
                  aria-describedby={message ? 'footer-newsletter-message' : undefined}
                  className="min-h-12 w-full rounded-xl border border-white/15 bg-white/8 px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#c07d42] focus:bg-white/12 focus:ring-4 focus:ring-[#c07d42]/15"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-black text-[#111827] transition hover:-translate-y-0.5 hover:bg-[#f7f3ef] hover:shadow-[0_18px_40px_rgba(255,255,255,0.12)] disabled:cursor-wait disabled:opacity-60 xl:w-auto"
                >
                  {submitting ? 'Subscribing...' : 'Subscribe'} <Send className="h-4 w-4" aria-hidden="true" />
                </button>
              </form>
              {message && (
                <p id="footer-newsletter-message" role={message.type === 'error' ? 'alert' : 'status'} className={`mt-3 text-sm font-semibold ${message.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
                  {message.text}
                </p>
              )}
            </section>

            <section aria-labelledby="follow-heading">
              <h2 id="follow-heading" className="text-xl font-black sm:text-2xl">Follow Us</h2>
              <p className="mt-3 text-sm leading-6 text-white/60">Stay close to our latest handcrafted frame stories.</p>
              <div className="mt-6 flex gap-3">
                {socialLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <a
                      key={link.name}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/8 text-white transition hover:scale-110 hover:border-[#c07d42] hover:bg-[#c07d42] hover:shadow-[0_16px_36px_rgba(192,125,66,0.24)]"
                      aria-label={`Follow FrameYaad on ${link.name}`}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </a>
                  );
                })}
              </div>
            </section>

            <section aria-labelledby="contact-heading">
              <h2 id="contact-heading" className="text-xl font-black sm:text-2xl">Contact Us</h2>
              <div className="mt-6 space-y-5">
                {contactItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/8 text-[#c07d42]">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-white/35">{item.label}</p>
                        <p className="mt-1 text-sm leading-6 text-white/75">{item.value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="mt-10 border-t border-white/10 pt-6 sm:mt-12">
            <div className="flex flex-col gap-5 text-sm text-white/55 md:flex-row md:items-center md:justify-between">
              <p>© 2026 FrameYaad. All Rights Reserved.</p>
              <nav className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6" aria-label="Footer quick links">
                {quickLinks.map((link) => (
                  <a key={link} href="#" className="transition hover:text-white">
                    {link}
                  </a>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
