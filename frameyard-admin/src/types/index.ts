export interface User {
  id: string;
  name: string;
  email: string;
  isEmailVerified: boolean;
  phoneNumber: string;
  addressLine?: string | null;
  postalCode?: string | null;
  cityName?: string | null;
  stateName?: string | null;
  countryName?: string | null;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | null;
  role: 'CUSTOMER' | 'ADMIN' | 'EMPLOYEE';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  avatarUrl?: string;
}

export interface UserAddress {
  id: string;
  userId: string;
  addressLine: string;
  postCode?: string | null;
  city: string;
  state: string;
  country: string;
  contactPerson?: string | null;
  contactNumber?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ProductStatus = 'active' | 'draft';

export interface ProductVariant {
  id: string;
  productId: string;
  color?: string | null;
  frameSize: string;
  mountType: string;
  glassType: string;
  isActive?: boolean;
  createdBy?: string | null;
  mrp?: number | null;
  price: number;
  offerPrice?: number | null;
  stockQuantity: number;
  priceValidUntil?: string | null;
  createdAt: string;
  updatedAt?: string;
}
export interface ProductImage {
  id: string;
  productId: string;
  productIdentifier?: string | null;
  imageUrl: string;
  isPrimary?: boolean;
  displayOrder: number;
}
export interface Product {
  id: string;
  materialId?: string | null;
  variantId?: string | null;
  productIdentifier?: string | null;
  productName?: string | null;
  name: string;
  description?: string;
  brandName: string;
  material: string;
  availableColors: string[];
  createdBy?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  variants: ProductVariant[];
  images?: ProductImage[];
  discounts?: ProductDiscount[];
}

export type CouponType =
  | 'LIMITED_COUNT'
  | 'ONE_PER_USER'
  | 'ORDER_PRICE_ABOVE'
  | 'NEW_USER'
  | 'FESTIVE_DAYS'
  | 'BUY_1_GET_1'
  | 'BUY_2_GET_1'
  | 'PERCENT_OFFER';

export type DiscountType =
  | 'FLAT_OFFER'
  | 'PERCENTAGE_OFFER';

export interface Coupon {
  id: string;
  couponType?: CouponType | null;
  discountType?: DiscountType | null;
  description?: string | null;
  couponCode: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  expiresAt?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  discountValue?: number | null;
}

export interface ProductDiscount {
  id: string;
  productId: string;
  couponId?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
  coupon?: Coupon | null;
}
export type OrderStatus =
  | 'PLACED'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'READY_TO_SHIP'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export interface OrderItem {
  id: string;
  orderId: string;
  orderNumber: string;
  productId?: string | null;
  productIdentifier?: string | null;
  variantId?: string | null;
  productName: string;
  frameSize: string;
  mountType: string;
  glassType: string;
  quantity: number;
  price: number;
  subtotal: number;
  imageUrl?: string | null;
}

export interface Order {
  id: string;
  userId: string;
  userAddressId?: string | null;
  couponId?: string | null;
  orderNumber: string;
  totalAmount: number;
  orderStatus: OrderStatus;
  phoneNumber: string;
  addressLine: string;
  cityName: string;
  stateName: string;
  countryName: string;
  postalCode: string;
  remark?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: Pick<User, 'name' | 'email' | 'phoneNumber'>;
  userAddress?: UserAddress | null;
  coupon?: Coupon | null;
  orderItems: OrderItem[];
  incidents?: CustomerIncident[];
}

export type IncidentStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CLOSED';

export type IncidentPriority =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'URGENT';

export interface CustomerIncident {
  id: string;
  userId?: string | null;
  orderId?: string | null;
  title: string;
  description?: string | null;
  status: IncidentStatus;
  priority: IncidentPriority;
  createdBy?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: Pick<User, 'id' | 'name' | 'email' | 'phoneNumber'> | null;
  order?: Pick<Order, 'id' | 'orderNumber' | 'orderStatus'> | null;
}

export type CustomerStatus = 'active' | 'new' | 'inactive';

export interface CustomerOrder {
  id: string;
  orderStatus: string;
  totalAmount: number;
  createdAt: string;
}

export interface Customer {
  id: string;
  role?: 'CUSTOMER';
  name: string;
  email: string;
  phoneNumber: string;
  isPhoneNumberVerified?: boolean;
  addressLine?: string | null;
  postalCode?: string | null;
  cityName?: string | null;
  stateName?: string | null;
  countryName?: string | null;
  addresses?: UserAddress[];
  isEmailVerified: boolean;
  isActive: boolean;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  orders: CustomerOrder[];
  customerIncidents?: CustomerIncident[];
}

export type NotificationType = 'ACCOUNT_CREATED' | 'ORDER_PLACED';

export interface NotificationReader {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'EMPLOYEE' | 'CUSTOMER';
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  readBy?: NotificationReader | null;
  date: string;
}
