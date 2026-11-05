import api from './api';

export const appointmentLocations = ['ODDANCHATRAM', 'COIMBATORE'] as const;
export const appointmentStatuses = ['PENDING', 'CONFIRMED', 'RESCHEDULED', 'CANCELLED', 'COMPLETED'] as const;
export const appointmentFrameTypes = [
  'PHOTOGRAPHS',
  'ARTWORK_PHYSICAL_PHOTO',
  'DOCUMENT_PAPER',
  'JERSEY_TEXTILES',
  'OBJECTS_WITH_DEPTH',
  'GALLERY_WALLS',
  'OTHERS',
] as const;

export type AppointmentLocation = typeof appointmentLocations[number];
export type AppointmentStatus = typeof appointmentStatuses[number];
export type AppointmentFrameType = typeof appointmentFrameTypes[number];
export type AppointmentEmailStatus = 'PENDING' | 'SENT' | 'FAILED';

export interface Appointment {
  id: string;
  firstName: string;
  email: string;
  phoneNumber: string;
  originalBookingDate: string;
  bookingDate: string;
  location: AppointmentLocation;
  frameTypes: AppointmentFrameType[];
  otherFrameType: string | null;
  status: AppointmentStatus;
  rescheduleReason: string | null;
  cancellationReason: string | null;
  emailStatus: AppointmentEmailStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppointmentInput {
  firstName: string;
  email: string;
  phoneNumber: string;
  bookingDate: string;
  location: AppointmentLocation;
  frameTypes: AppointmentFrameType[];
  otherFrameType?: string;
}

export interface AppointmentListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: AppointmentStatus;
  location?: AppointmentLocation;
  date?: string;
}

export interface AppointmentPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

type ApiAppointmentResponse = { data: { appointment: Appointment } };
type ApiAppointmentListResponse = {
  data: { appointments: Appointment[]; pagination: AppointmentPagination };
};

export const appointmentService = {
  async create(input: CreateAppointmentInput) {
    const response = await api.post<ApiAppointmentResponse>('/appointments', input);
    return response.data.data.appointment;
  },

  async list(params: AppointmentListParams) {
    const response = await api.get<ApiAppointmentListResponse>('/appointments', { params });
    return response.data.data;
  },

  async getById(id: string) {
    const response = await api.get<ApiAppointmentResponse>(`/appointments/${id}`);
    return response.data.data.appointment;
  },

  async updateStatus(
    id: string,
    input:
      | { status: 'CONFIRMED' | 'COMPLETED' }
      | { status: 'RESCHEDULED'; bookingDate: string; rescheduleReason?: string }
      | { status: 'CANCELLED'; cancellationReason?: string },
  ) {
    const response = await api.patch<ApiAppointmentResponse>(`/appointments/${id}/status`, input);
    return response.data.data.appointment;
  },
};

export const appointmentFrameTypeLabels: Record<AppointmentFrameType, string> = {
  PHOTOGRAPHS: 'Photographs',
  ARTWORK_PHYSICAL_PHOTO: 'Artwork / Physical Photo',
  DOCUMENT_PAPER: 'Document / Paper',
  JERSEY_TEXTILES: 'Jersey / Textiles',
  OBJECTS_WITH_DEPTH: 'Objects With Depth',
  GALLERY_WALLS: 'Gallery Walls',
  OTHERS: 'Others',
};

export const appointmentLocationLabels: Record<AppointmentLocation, string> = {
  ODDANCHATRAM: 'Oddanchatram',
  COIMBATORE: 'Coimbatore',
};
