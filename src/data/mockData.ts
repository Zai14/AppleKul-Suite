import type { User, Field, DashboardStats } from '../types';

export const mockUser: User = {
  id: '',
  name: '',
  email: '',
  phone: '',
  farmName: '',
  khasraNumber: '',
  khataNumber: '',
};

export const mockFields: Field[] = [];

export const mockDashboardStats: DashboardStats = {
  totalFields: 0,
  healthyTrees: 0,
  alerts: 0,
  weather: 'N/A',
};