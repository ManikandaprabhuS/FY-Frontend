import type { CSSProperties } from "react";
import { CircleCheck, Clock, Info, MapPin, Package, PackageCheck, Truck, Wallet, XCircle } from "lucide-react";

import { useOrderFlow } from "../../../store/orderFlowStore";
import type { Order } from "../../../types";
import { trackerSteps } from "../../../utils/order-tracker";
import { customerRefundMessage } from "../../../utils/refund-message";
import { day, money, statusText, valid } from "../utils/orderDisplay";
import CancelOrder from "../../../components/orders/CancelOrder";
import OrderPhotoDownload from "../../../components/orders/OrderPhotoDownload";
import OrderItemReview from "../../../components/reviews/OrderItemReview";
import "../styles/orders.css";

/*
 * The order detail shared by My Orders (beside the list, or full screen on phones) and the
 * order page (/orders/:id, opened from Profile → View Details): status, delivered moment,
 * shipment timeline, items with reviews, address, payment, totals, photo and cancellation.
 */
const stampFmt = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });


const statusIcon = (status: string) =>
  status === 'DELIVERED' ? <PackageCheck aria-hidden="true" />
  : status === 'SHIPPED' || status === 'OUT_FOR_DELIVERY' ? <Truck aria-hidden="true" />
  : status === 'CANCELLED' ? <XCircle aria-hidden="true" />
  : status === 'CONFIRMED' ? <CircleCheck aria-hidden="true" />
  : status === 'PLACED' ? <Clock aria-hidden="true" />
  : <Package aria-hidden="true" />;

/** A colour-coded status badge: each status has its own tone, and an icon so colour is never the only cue. */
export const StatusTag = ({ status }: { status: string }) =>
  <span className="fy-oh-tag" data-status={status}>{statusIcon(status)}{statusText(status)}</span>;

/** The open order: tracker, items, delivery and payment, and the totals. */
const OrderDetailView = ({ order, onChanged }: { order: Order; onChanged: (order: Order) => void }) => {
  const { flow } = useOrderFlow();
  // The store's own rule decides when cancelling is closed (ready to ship or shipped); this only words it.
  const cancelClosed = Boolean(flow?.cancellationMessageStatuses.includes(order.orderStatus));
  const subtotal = order.subtotal ?? order.orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const offer = order.couponTitle ?? order.coupon?.couponCode ?? null;
  const contact = order.userAddress?.contactPerson ?? order.user?.name;
  return (
    <article className="fy-oh-detail" aria-labelledby={'order-' + order.id}>
      <header className="fy-oh-detail__head">
        <div>
          <p className="fy-oh-detail__kicker">Placed {day(order.createdAt)}</p>
          <h2 id={'order-' + order.id}>Order {order.orderNumber}</h2>
        </div>
        <StatusTag status={order.orderStatus} />
      </header>

      {order.orderStatus === 'DELIVERED' && <DeliveredMoment order={order} />}
      <Timeline order={order} />

      <section className="fy-oh-block" aria-label="Items">
        <h3>Items</h3>
        <ul className="fy-oh-items">
          {order.orderItems.map(item => (
            <li key={item.id}>
              <span className="fy-oh-items__img">{item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" decoding="async" /> : <Package aria-hidden="true" />}</span>
              <span className="fy-oh-items__info">
                <strong>{item.productName}</strong>
                <span>{[item.frameSize, item.material].filter(v => v && !/^(not specified|undefined|null|-)$/i.test(v)).join(' · ')}</span>
                {(item.colorName || item.colorHex) && <span className="fy-oh-items__color">{item.colorHex && /^#[a-f0-9]{6}$/i.test(item.colorHex) && <i style={{ backgroundColor: item.colorHex }} aria-hidden="true" />}{item.colorName && !item.colorName.startsWith('#') ? item.colorName : 'Color'}</span>}
                <span>Qty {item.quantity} × {money(item.price)}</span>
                {item.productId && item.productId !== '-' && <OrderItemReview productId={item.productId} productName={item.productName} productImage={item.imageUrl} className="fy-oh-items__review" />}
              </span>
              <span className="fy-oh-items__price">{money(item.price * item.quantity)}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="fy-oh-pair">
        <section className="fy-oh-block" aria-label="Delivery address">
          <h3><MapPin aria-hidden="true" />Delivery address</h3>
          <address>
            {contact && <strong>{contact}</strong>}
            <span>{order.addressLine}</span>
            <span>{[order.cityName, order.stateName, order.postalCode].filter(Boolean).join(', ')}</span>
            <span>{order.countryName}</span>
            {(order.userAddress?.contactNumber || order.phoneNumber) && <span>{order.userAddress?.contactNumber || order.phoneNumber}</span>}
          </address>
        </section>
        <section className="fy-oh-block" aria-label="Payment and delivery">
          <h3><Wallet aria-hidden="true" />Payment</h3>
          <p className="fy-oh-plain">Cash on delivery</p>
          <h3 className="fy-oh-block__sub"><Truck aria-hidden="true" />Delivery</h3>
          <p className="fy-oh-plain">Standard delivery · Free</p>
        </section>
      </div>

      <section className="fy-oh-block" aria-label="Order summary">
        <h3>Summary</h3>
        <dl className="fy-oh-sum">
          <div><dt>Subtotal</dt><dd>{money(subtotal)}</dd></div>
          {offer && <div><dt>{offer}{order.discountPercent ? ` (${order.discountPercent}%)` : ''}</dt><dd>−{money(order.discountAmount ?? 0)}</dd></div>}
          <div><dt>Delivery</dt><dd>Free</dd></div>
          <div className="fy-oh-sum__total"><dt>Total</dt><dd>{money(order.totalAmount)}</dd></div>
        </dl>
      </section>

      <div className="fy-oh-photo"><OrderPhotoDownload order={order} /></div>

      <footer className="fy-oh-detail__foot">
        {cancelClosed ? (
          <p className="fy-oh-notice" role="note"><Info aria-hidden="true" /><span>Sorry, your order is ready to ship or has already been shipped, so it can't be cancelled.</span></p>
        ) : <CancelOrder order={order} onChanged={onChanged} />}
      </footer>
    </article>
  );
};

/**
 * Delivered: the first frame of the order is hung on a nail and swings gently to rest, the
 * way it would on the customer's wall. It plays once when a delivered order is opened.
 */
const DeliveredMoment = ({ order }: { order: Order }) => {
  const picture = order.orderItems.find(item => item.imageUrl)?.imageUrl;
  const delivered = [...(order.statusHistory ?? [])].reverse().find(entry => entry.status === 'DELIVERED')?.changedAt;
  return (
    <div className="fy-oh-hung">
      <div className="fy-oh-hung__wall" aria-hidden="true">
        <span className="fy-oh-hung__nail" />
        <span className="fy-oh-hung__swing">
          <svg className="fy-oh-hung__wire" viewBox="0 0 100 30" preserveAspectRatio="none"><path d="M6 30 L50 1 L94 30" /></svg>
          <span className="fy-oh-hung__frame">{picture ? <img src={picture} alt="" decoding="async" /> : <Package />}</span>
        </span>
      </div>
      <div className="fy-oh-hung__text">
        <p className="fy-oh-hung__title">Delivered{valid(delivered) ? ' on ' + day(delivered) : ''}</p>
        <p>We hope it looks perfect on your wall.</p>
      </div>
    </div>
  );
};

/**
 * The shipment timeline, from the store's own status flow. The line draws down to the current
 * step and each mark lands in turn; any note the store added at a step (a courier name, a
 * tracking number) is shown under that step.
 */
const Timeline = ({ order }: { order: Order }) => {
  const { flow, error, retry } = useOrderFlow();
  if (!flow) return <div className="fy-oh-track fy-oh-track--wait" role="status">{error ? <button type="button" className="fy-oh-link" onClick={() => void retry()}>Retry loading order tracker</button> : 'Loading order tracker…'}</div>;
  const steps = trackerSteps(order, flow);
  const history = order.statusHistory ?? [];
  const cancel = [...history].reverse().find(entry => entry.status === 'CANCELLED');
  const done = steps.filter(step => step.done).length;
  const current = steps.find(step => step.current);
  return (
    <section className="fy-oh-track" data-status={order.orderStatus} aria-label="Shipment timeline" style={{ '--p': steps.length > 1 ? Math.max(0, done - 1) / (steps.length - 1) : 1 } as CSSProperties}>
      <h3 className="fy-oh-track__title">{order.orderStatus === 'CANCELLED' ? 'Order cancelled' : current ? statusText(current.status) : 'Shipment'}</h3>
      {current?.description && order.orderStatus !== 'DELIVERED' && <p className="fy-oh-track__lede">{current.description}</p>}
      <ol>
        {steps.map((step, index) => {
          const notes = history.filter(entry => (entry.status === step.status || (flow.legacyDisplay[entry.status] === step.status)) && entry.note?.trim());
          return (
            <li key={step.status} data-done={step.done || undefined} data-link={steps[index + 1]?.done || undefined} aria-current={step.current ? 'step' : undefined} style={{ '--i': index } as CSSProperties}>
              <span className="fy-oh-track__mark" aria-hidden="true" />
              <span className="fy-oh-track__row">
                <span className="fy-oh-track__label">{statusText(step.status)}<span className="sr-only">{step.current ? ', current step' : step.done ? ', completed' : ', upcoming'}</span></span>
                {step.done && valid(step.timestamp) && <time dateTime={step.timestamp}>{stampFmt.format(new Date(step.timestamp!))}</time>}
              </span>
              {notes.map(entry => <p key={entry.changedAt + (entry.note ?? '')} className="fy-oh-track__update"><span>Update from FrameYaad</span>{entry.note}</p>)}
            </li>
          );
        })}
      </ol>
      {order.orderStatus === 'CANCELLED' && (
        <div className="fy-oh-cancelled">
          <p><XCircle aria-hidden="true" />Cancelled{valid(cancel?.changedAt) ? ' on ' + stampFmt.format(new Date(cancel!.changedAt)) : ''}{cancel?.changedBy.role === 'CUSTOMER' ? ' by you' : cancel?.changedBy.role ? ' by the store' : ''}</p>
          <p>{customerRefundMessage(order)}</p>
          {order.refundStatus && <p>Refund: {order.refundStatus.toLowerCase()}</p>}
          {cancel?.note && <p className="fy-oh-cancelled__note">{cancel.note}</p>}
        </div>
      )}
    </section>
  );
};

export default OrderDetailView;
