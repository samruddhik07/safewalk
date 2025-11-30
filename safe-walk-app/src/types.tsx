
export interface Incident {
  id: number;
  type: 'Crime' | 'Accident' | 'Lighting' | 'Harassment' | 'Other';
  severity: 'high' | 'medium' | 'low';
  name: string;
  location: string;
  lat: number;
  lng: number;
  timestamp: string;
  description: string;
  pendingSync?: boolean; // New field to track offline status
}

export interface Route {
  instructions: any;
  id: number;
  name: string;
  start: string;
  end: string;
  distance: string; // "3.2 km"
  duration: string; // "15 min"
  safetyScore: number;
  lighting: number;
  traffic: number;
  crowd: number;
  incidents: number;
  color: string;
  description: string;
  coordinates: [number, number][]; // [lat, lng]
}


export interface Trip {
  id: number;
  route: Route;
  startTime: string;
  endTime: string;
  completed: boolean;
}

export interface Contact {
  id: number;
  name: string;
  phone: string;
  relationship: string;
  isPrimary: boolean;
  verified: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  userType: string;
  emergencyContacts: Contact[];
}

export interface AppSettings {
  minSafetyScore: number;
  avoidUnlitAreas: boolean;
  avoidCrowds: boolean;
  travelMode: 'walking' | 'bike' | 'car' | 'transit';
  notifications: {
    push: boolean;
    sms: boolean;
    email: boolean;
  }
}

export type Page = 'landing' | 'login' | 'signup' | 'map' | 'safety_hub' | 'offline' | 'contacts' | 'profile' | 'settings' | 'history';
