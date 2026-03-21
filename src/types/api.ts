export type UserRole = 'tourist' | 'establishment' | 'lgu_admin';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  avatarUrl?: string | null;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: 'Bearer';
  user: AuthUser;
}

export type EstablishmentCategory =
  | 'tourist_spot'
  | 'restaurant'
  | 'clinic_hospital'
  | 'mall'
  | 'other';

export type ListingStatus = 'pending' | 'verified' | 'rejected';
export type BusinessStatus = 'open' | 'closed' | 'temporarily_closed';

export interface Establishment {
  id: string;
  ownerUserId: string | null;
  city: string;
  name: string;
  category: EstablishmentCategory;
  address: string;
  description: string | null;
  services: string | null;
  contactNumber: string | null;
  email: string | null;
  opensAt: string | null;
  closesAt: string | null;
  isOpenNow: boolean;
  coverPhotoUrl: string | null;
  listingStatus: ListingStatus;
  businessStatus: BusinessStatus;
  statusNote: string | null;
  verifiedByUserId: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Announcement {
  id: string;
  city: string;
  title: string;
  content: string;
  publishedByUserId: string;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ConversationSummary {
  conversationKey: string;
  establishmentId: string;
  guestFullName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  lastMessage: string;
  lastSenderRole: 'tourist' | 'establishment';
  lastMessageAt: string;
  messageCount: number;
}

export interface MessageItem {
  id: string;
  establishmentId: string;
  senderRole: 'tourist' | 'establishment';
  userId: string | null;
  guestFullName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  message: string;
  createdAt: string;
}

export interface GuestConversationResponse extends PaginatedResponse<MessageItem> {}

export interface ChatMessageSentPayload {
  clientRequestId?: string | null;
  message: MessageItem;
}

export interface ChatMessageFailedPayload {
  clientRequestId?: string | null;
  establishmentId: string;
  guestEmail?: string | null;
  guestPhone?: string | null;
  reason: string;
  at: string;
}
