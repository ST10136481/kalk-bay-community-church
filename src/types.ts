export interface Event {
  id: string;
  title: string;
  time: string;
  date?: string;
  description: string;
  imageUrl: string;
  isPermanent?: boolean;
  type?: 'regular' | 'special';
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