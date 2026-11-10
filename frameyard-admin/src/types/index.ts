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
  imageUrl?: string | null;
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
  color?: string | null;
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

}

export interface LegacyCoupon { id: string; couponCode: string; }
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
  colorName?: string | null;
  colorHex?: string | null;
  material?: string | null;
  frameSize: string;
  mountType: string;
  glassType: string;
  quantity: number;
  price: number;
  subtotal: number;
  imageUrl?: string | null;
}

export interface OrderStatusHistoryEntry {status:string;changedAt:string;changedBy:{id:string;role:string};note?:string;previousStatus?:string}
export interface Order {
  statusHistory?: OrderStatusHistoryEntry[];
  id: string;
  userId: string;
  userAddressId?: string | null;
  couponId?: string | null;
  couponCode?: string | null;
  couponTitle?: string | null;
  exportCoupon?: string;
  discount?: number;
  discountPercent?: number | null;
  discountAmount?: number | null;
  subtotal?: number;
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
  coupon?: LegacyCoupon | null;
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
  actionUrl?: string;
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  readBy?: NotificationReader | null;
  date: string;
}
