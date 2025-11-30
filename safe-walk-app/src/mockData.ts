
import type { Incident, Route, User } from './types';

export const MOCK_USER: User = {
  id: 'user_001',
  name: 'Sarah Johnson',
  email: 'sarah.j@example.com',
  // phone: '+1-555-0123', // Added phone number
  userType: 'Student',
  emergencyContacts: [
    { id: 1, name: 'Mom', phone: '+1-555-0001', relationship: 'Family', isPrimary: true, verified: true },
    { id: 2, name: 'Campus Security', phone: '+1-555-9999', relationship: 'Security', isPrimary: false, verified: true },
    { id: 3, name: 'Jessica (Roommate)', phone: '+1-555-0192', relationship: 'Friend', isPrimary: false, verified: true },
  ]
};

export const MOCK_INCIDENTS: Incident[] = [
  { id: 1, type: 'Crime', severity: 'high', name: 'Suspicious Activity', location: '5th St & Park Ave', lat: 40.7614, lng: -73.9776, timestamp: '2h ago', description: 'Group of individuals following pedestrians.' },
  { id: 2, type: 'Accident', severity: 'medium', name: 'Vehicle Collision', location: 'Main Street', lat: 40.7505, lng: -73.9934, timestamp: '1h ago', description: 'Road blocked due to minor collision.' },
  { id: 3, type: 'Lighting', severity: 'low', name: 'Street Light Down', location: 'Pine Street', lat: 40.7549, lng: -73.9840, timestamp: '3h ago', description: 'Very dark area, multiple lights out.' },
  { id: 4, type: 'Harassment', severity: 'medium', name: 'Verbal Harassment', location: '7th Avenue', lat: 40.7600, lng: -73.9850, timestamp: '6h ago', description: 'Catcalling reported near the subway entrance.' },
];

export const MOCK_ROUTES: Route[] = [
  {
    id: 1,
    name: 'Safest Route',
    start: 'State University',
    end: 'Downtown Station',
    distance: '3.2 km',
    duration: '22 min',
    safetyScore: 92,
    lighting: 95,
    traffic: 45,
    crowd: 75,
    incidents: 0,
    color: '#10B981', // green
    description: 'Well-lit main avenues with security patrols.',
    coordinates: [
        [40.7580, -73.9855], 
        [40.7590, -73.9850],
        [40.7600, -73.9840],
        [40.7610, -73.9820], 
        [40.7625, -73.9815],
        [40.7640, -73.9810],
        [40.7650, -73.9800]
    ],
    instructions: [
        "Head northeast towards Broadway",
        "Continue straight past the library",
        "Keep right at the fork",
        "Turn slightly left onto Main Ave",
        "Continue for 200m",
        "Destination is on your right"
    ]
  },
  {
    id: 2,
    name: 'Balanced Route',
    start: 'State University',
    end: 'Downtown Station',
    distance: '2.8 km',
    duration: '18 min',
    safetyScore: 75,
    lighting: 65,
    traffic: 70,
    crowd: 50,
    incidents: 2,
    color: '#F59E0B', // yellow
    description: 'Shorter but passes through some dimmer side streets.',
    coordinates: [
        [40.7580, -73.9855], 
        [40.7585, -73.9870],
        [40.7590, -73.9900], 
        [40.7605, -73.9910],
        [40.7620, -73.9920]
    ],
    instructions: [
        "Head west on Campus Dr",
        "Turn right onto 7th Ave",
        "Continue straight for 3 blocks",
        "Turn left onto W 42nd St",
        "Arrive at destination"
    ]
  },
  {
    id: 3,
    name: 'Fastest Route',
    start: 'State University',
    end: 'Downtown Station',
    distance: '2.1 km',
    duration: '14 min',
    safetyScore: 45,
    lighting: 30,
    traffic: 85,
    crowd: 15,
    incidents: 5,
    color: '#EF4444', // red
    description: 'Quickest path but crosses high-crime alleyways.',
    coordinates: [
        [40.7580, -73.9855], 
        [40.7565, -73.9852],
        [40.7550, -73.9850], 
        [40.7525, -73.9875],
        [40.7500, -73.9900]
    ],
    instructions: [
        "Head south towards the alley",
        "Take the shortcut through the park",
        "Caution: Low lighting area",
        "Turn right onto backstreet",
        "Arrive at destination"
    ]
  }
];
