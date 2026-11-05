import api from './api';
import { User } from '../types';
import type { ApiEnvelope } from './contracts';

type BackendUser = User & {
  city?: string | null;
  state?: string | null;
  country?: string | null;
};

type AuthData = {
  user: BackendUser;
  accessToken: string;
  authentication: 'httpOnlyCookie';
  expiresInSeconds: number;
};

export type CustomerRegistrationInput = {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
  gender: 'MALE' | 'FEMALE';
};

export type CustomerRegistrationData = {
  user: BackendUser;
  emailConfirmationRequired: boolean;
  authentication: 'httpOnlyCookie' | 'emailConfirmationRequired';
};

const normalizeUser = (user: BackendUser): User => ({
  ...user,
  cityName: user.city ?? user.cityName ?? null,
  stateName: user.state ?? user.stateName ?? null,
  countryName: user.country ?? user.countryName ?? null,
});

export const authService = {
  login: async (email: string, password: string) => {
  const response = await api.post<ApiEnvelope<AuthData>>('/auth/staff/login', {
    email,   
    password,
  });

return { ...response.data.data, user: normalizeUser(response.data.data.user) };
},

  customerLogin: async (email: string, password: string) => {
    const response = await api.post<ApiEnvelope<AuthData>>('/auth/customer/login', {
      email,
      password,
    });
    return { ...response.data.data, user: normalizeUser(response.data.data.user) };
  },

  registerCustomer: async (input: CustomerRegistrationInput) => {
    const response = await api.post<ApiEnvelope<CustomerRegistrationData>>('/auth/customer/register', input);
    return {
      ...response.data.data,
      user: normalizeUser(response.data.data.user),
    };
  },

 me: async (): Promise<User> => {
  const response = await api.get<ApiEnvelope<{ user: BackendUser }>>("/auth/me");
  return normalizeUser(response.data.data.user);
},

  updateProfile: async (
  profileData: Partial<User>
): Promise<User> => {

  const payload = {
    ...(profileData.name === undefined ? {} : { name: profileData.name }),
    ...(profileData.phoneNumber === undefined ? {} : { phoneNumber: profileData.phoneNumber || null }),
    ...(profileData.addressLine === undefined ? {} : { addressLine: profileData.addressLine || null }),
    ...(profileData.postalCode === undefined ? {} : { postalCode: profileData.postalCode || null }),
    ...(profileData.cityName === undefined ? {} : { city: profileData.cityName || null }),
    ...(profileData.stateName === undefined ? {} : { state: profileData.stateName || null }),
    ...(profileData.countryName === undefined ? {} : { country: profileData.countryName || null }),
  };
  const response =
    await api.patch<ApiEnvelope<{ user: BackendUser }>>(
      "/auth/profile",
      payload
    );

  return normalizeUser(response.data.data.user);
},

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await api.post('/auth/change-password', { currentPassword, newPassword });
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
    sessionStorage.removeItem('fy_auth_token');
    localStorage.removeItem('fy_auth_token');
  },
};
