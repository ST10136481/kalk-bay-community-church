export interface Event {
  id: string;
  title: string;
  time: string;
  date?: string;
  description: string;
  imageUrl: string;
  type: 'regular' | 'special';
  recurrence?: {
    dayOfWeek: number; // 0 = Sunday, 3 = Wednesday
    frequency: 'weekly';
  };
  isPermanent?: boolean;
}

export interface Sermon {
  id: string;
  title: string;
  date: string;
  audioUrl: string;
  description: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
}