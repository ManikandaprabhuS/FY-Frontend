import React, { useEffect, useState } from 'react';

/** Messages shown in turn above the navbar. */
const MESSAGES = [
  { full: 'Shipping across India' },
  { full: 'Get 5% off on your first order — By Sign In ' },
];

/** How long each message stays. */
const MESSAGE_MS = 4500;
/** How long the outgoing message stays mounted while it rolls away. */
const ROLL_MS = 700;

type Message = (typeof MESSAGES)[number];

const MessageText: React.FC<{ message: Message; state: 'in' | 'out' | 'still' }> = ({ message, state }) => (
  <p className="fy-announce__text" data-state={state} aria-hidden={state === 'out' || undefined}>
    <span className="fy-announce__full">{message.full}</span>
  </p>
);

/**
 * A slim black bar above the navbar that rotates its messages. Each change rolls the line
 * like a shop sign: the old message lifts up and out while the new one rises into place,
 * its letter spacing settling as it arrives. It sits in the page flow, so it scrolls away
 * as the page moves and the sticky navbar takes the top.
 */
const AnnouncementBar: React.FC = () => {
  const [index, setIndex] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setIndex((current) => {
        setPrevious(current);
        return (current + 1) % MESSAGES.length;
      });
    }, MESSAGE_MS);
    return () => window.clearInterval(timer);
  }, [paused]);

  // Unmount the outgoing message once it has rolled away.
  useEffect(() => {
    if (previous === null) return;
    const timer = window.setTimeout(() => setPrevious(null), ROLL_MS);
    return () => window.clearTimeout(timer);
  }, [previous, index]);

  return (
    <div
      className="fy-announce"
      role="region"
      aria-label="Announcements"
      onPointerEnter={(event) => { if (event.pointerType === 'mouse') setPaused(true); }}
      onPointerLeave={(event) => { if (event.pointerType === 'mouse') setPaused(false); }}
    >
      <div className="fy-announce__line">
        {previous !== null && <MessageText key={`out-${previous}-${index}`} message={MESSAGES[previous]} state="out" />}
        <MessageText key={`in-${index}`} message={MESSAGES[index]} state={previous === null && index === 0 ? 'still' : 'in'} />
      </div>
    </div>
  );
};

export default AnnouncementBar;
