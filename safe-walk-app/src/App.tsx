import React, { useState, useEffect, useRef, type ReactNode } from 'react';
import { 
  Shield, Map as MapIcon, Users, AlertTriangle, Settings, 
  LogOut, Menu, X, Navigation, 
  Bell, CheckCircle, AlertCircle, PhoneCall, UserPlus,
  Moon, Sun, Trash2, Loader2, MapPin, 
  ArrowRight, CornerUpRight, Phone, WifiOff, Download,
  Car, Bike, Bus, Footprints, Mic, History, Globe, Signal, SignalZero, Locate,
  Sparkles, PhoneForwarded, Siren, Zap
} from 'lucide-react';
import { MOCK_INCIDENTS } from './mockData';
import type { Incident, Route, User, Page, AppSettings } from './types';

// Fallback Key for TomTom if backend fails (Keep for search, but use OSM for tiles)
const TOMTOM_API_KEY = 'YhsCKeh4g9fRkS2YEta9Isj3KH3pkttI';
const API_BASE_URL = 'https://safewalk-10oe.onrender.com'; 

// --- Translation Data ---
type Language = 'en' | 'hi' | 'es';

const translations = {
  en: {
    welcome: "Welcome Back",
    signinSubtitle: "Sign in to access your safe routes",
    createAccount: "Create Account",
    signupSubtitle: "Join the community keeping everyone safe",
    email: "Email Address",
    password: "Password",
    fullName: "Full Name",
    phone: "Phone Number",
    signinBtn: "Sign In",
    signupBtn: "Sign Up",
    noAccount: "New to SafeWalk?",
    hasAccount: "Already have an account?",
    create: "Create account",
    signin: "Sign in",
    backHome: "Back to Home",
    guest: "Continue as Guest",
    emailPlaceholder: "you@example.com",
    passwordPlaceholder: "••••••••",
    namePlaceholder: "John Doe",
    phonePlaceholder: "+1 555 000 0000",
  },
  hi: {
    welcome: "वापसी पर स्वागत है",
    signinSubtitle: "अपने सुरक्षित मार्ग देखने के लिए साइन इन करें",
    createAccount: "खाता बनाएं",
    signupSubtitle: "समुदाय में शामिल हों, सुरक्षित रहें",
    email: "ईमेल पता",
    password: "पासवर्ड",
    fullName: "पूरा नाम",
    phone: "फ़ोन नंबर",
    signinBtn: "साइन इन करें",
    signupBtn: "साइन अप करें",
    noAccount: "सेफवॉक पर नए हैं?",
    hasAccount: "क्या आपके पास पहले से एक खाता मौजूद है?",
    create: "खाता बनाएं",
    signin: "साइन इन करें",
    backHome: "मुखपृष्ठ पर वापस",
    guest: "अतिथि के रूप में जारी रखें",
    emailPlaceholder: "आप@example.com",
    passwordPlaceholder: "••••••••",
    namePlaceholder: "जॉन डो",
    phonePlaceholder: "+91 98765 43210",
  },
  es: {
    welcome: "Bienvenido de nuevo",
    signinSubtitle: "Inicia sesión para ver tus rutas seguras",
    createAccount: "Crear una cuenta",
    signupSubtitle: "Únete a la comunidad que nos mantiene seguros",
    email: "Correo electrónico",
    password: "Contraseña",
    fullName: "Nombre completo",
    phone: "Número de teléfono",
    signinBtn: "Iniciar sesión",
    signupBtn: "Regístrate",
    noAccount: "¿Nuevo en SafeWalk?",
    hasAccount: "¿Ya tienes una cuenta?",
    create: "Crear cuenta",
    signin: "Iniciar sesión",
    backHome: "Volver al inicio",
    guest: "Continuar como invitado",
    emailPlaceholder: "tu@ejemplo.com",
    passwordPlaceholder: "••••••••",
    namePlaceholder: "Juan Pérez",
    phonePlaceholder: "+1 555 000 0000",
  }
};

// --- Helper: Text to Speech ---
const speak = (text: string) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  }
};

// --- Storage Helper ---
const storage = {
  saveRoutes: (routes: Route[]) => localStorage.setItem('offline_routes', JSON.stringify(routes)),
  getRoutes: (): Route[] => JSON.parse(localStorage.getItem('offline_routes') || '[]'),
  
  saveToken: (token: string) => localStorage.setItem('auth_token', token),
  getToken: () => localStorage.getItem('auth_token'),
  
  saveUser: (user: User) => localStorage.setItem('cached_user', JSON.stringify(user)),
  getUser: (): User | null => JSON.parse(localStorage.getItem('cached_user') || 'null'),
  
  saveHistory: (history: string[]) => localStorage.setItem('search_history', JSON.stringify(history)),
  getHistory: (): string[] => JSON.parse(localStorage.getItem('search_history') || '[]'),
  
  // Pending Incidents for Offline Sync
  savePendingIncident: (incident: Incident) => {
    const pending = JSON.parse(localStorage.getItem('pending_incidents') || '[]');
    pending.push(incident);
    localStorage.setItem('pending_incidents', JSON.stringify(pending));
  },
  getPendingIncidents: (): Incident[] => JSON.parse(localStorage.getItem('pending_incidents') || '[]'),
  clearPendingIncidents: () => localStorage.removeItem('pending_incidents'),

  clear: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('cached_user');
    localStorage.removeItem('offline_routes');
    localStorage.removeItem('search_history');
    localStorage.removeItem('trip_history');
    localStorage.removeItem('pending_incidents');
  }
};
// --- API Service Layer (Robust with Offline Fallback) ---
// --- API Service Layer ---
const apiService = {
  
  // Register: Create Account
  register: async (name: string, email: string, _phone: string, password: string): Promise<boolean> => {
    if (!navigator.onLine) throw new Error("No internet connection.");
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password }) // Sending core fields
        });
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Registration failed');
        }
        return true;
    } catch (e: any) {
        throw new Error(e.message || 'Registration failed');
    }
  },

  // Login: Get Token -> Get User Profile
  login: async (email: string, password: string): Promise<User> => {
    if (!navigator.onLine) {
       // Offline: Check if cached user matches
       const cached = storage.getUser();
       if (cached && cached.email === email) return cached;
       throw new Error("No internet connection. Cannot log in.");
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Invalid credentials');
      }
      
      // Save Token
      if (data.token) {
          storage.saveToken(data.token);
          // Fetch full user details with the new token
          return await apiService.fetchUserProfile();
      } else {
          throw new Error("No access token received");
      }
    } catch (e: any) {
      console.error('Login API error:', e);
      throw e;
    }
  },

  updateContacts: async (contacts: any[]) => {
    const user = storage.getUser();
    if (!user || !user.id) return;

    try {
      const response = await fetch(`http:localhost:5000/auth/contacts`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.id, 
          contacts: contacts 
        })
      });
      
      if(response.ok) {
          console.log("Contacts synced to DB");
          // Update local cache so it persists on refresh immediately
          storage.saveUser({ ...user, emergencyContacts: contacts });
      }
      
    } catch (e) {
      console.error("Failed to sync contacts:", e);
    }
  },

  // Helper: Fetch Profile
  fetchUserProfile: async (): Promise<User> => {
      const token = storage.getToken();
      if (!token) throw new Error("No token found");

      const response = await fetch(`${API_BASE_URL}/auth/me`, {
          method: 'GET',
          headers: { 
              'Authorization': `Bearer ${token}` 
          }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch profile");

      const backendUser = data.user;
      
      // Map Backend User to Frontend Interface
      // Backend uses _id, frontend uses id. Backend might miss some fields like emergencyContacts initially.
      const fullUser: User = {
        id: backendUser._id || Date.now(),
        name: backendUser.name || 'User',
        email: backendUser.email || '',
        // phone: backendUser.phone || '', 
        // avatar: 'https://i.pravatar.cc/150?img=12',
        emergencyContacts: backendUser.emergencyContacts || [],
        userType: ''
      };

      storage.saveUser(fullUser);
      return fullUser;
  },

  getIncidents: async (): Promise<Incident[]> => {
    if (!navigator.onLine) {
        return [...MOCK_INCIDENTS, ...storage.getPendingIncidents()];
    }
    
    try {
      // Using NYC coordinates (40.7580, -73.9855) as default center to match app default view
      // Radius set to 50km to capture wide area
      const response = await fetch(`${API_BASE_URL}/incident/nearby?lat=40.7580&lon=-73.9855&radius=50000`);
      const data = await response.json();
      
      // Backend returns { incidents: [...] }
      // Return incidents from backend, or fallback to mock if empty/unavailable for demo continuity
      return (data.incidents && data.incidents.length > 0) ? data.incidents : MOCK_INCIDENTS;
    } catch (e) {
      console.error('Incidents API error, using mock:', e);
      return MOCK_INCIDENTS;
    }
  },

  reportIncident: async (incident: Incident): Promise<boolean> => {
    if (!navigator.onLine) {
        const offlineIncident = { ...incident, pendingSync: true };
        storage.savePendingIncident(offlineIncident);
        return true; 
    }
    
    // Get current user ID from storage for the backend
    const currentUser = storage.getUser();
    const userId = currentUser ? currentUser.id : 'anonymous';

    try {
      const response = await fetch(`${API_BASE_URL}/incident/report`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${storage.getToken()}`
        },
         body: JSON.stringify({
            userId: userId,
            type: incident.type,
            description: incident.description,
            // Backend expects 'lon', Frontend uses 'lng'
            lat: incident.lat,
            lon: incident.lng 
        })
      });

      if (response.ok) {
          // The backend returns { status: "ok", incidentId: "..." }
          // We assume success if status is 200 OK
          return true;
      } else {
          console.error("Failed to report incident:", response.statusText);
          return false;
      }
    } catch (e) {
      console.error('Report incident network error:', e);
      // Fallback: If network fails but browser is "online", we might still want to queue it
      // For now, return false to indicate failure to UI
      return false; 
    }
  },
  calculateRoute: async (startCoords: [number, number], endCoords: [number, number], mode: string): Promise<any> => {
    if (!navigator.onLine) {
        throw new Error("Cannot calculate new routes while offline. Please use saved routes.");
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/routes/safe`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${storage.getToken()}`
        },
        body: JSON.stringify({ 
          start: { lat: startCoords[0], lng: startCoords[1] },
          end: { lat: endCoords[0], lng: endCoords[1] },
          mode 
        })
      });
      
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (e) {
      console.error('Route calculation error:', e);
      return null;
    }
  },
  
  triggerSOS: async (location: {lat: number, lng: number}) => {
    try {
      await fetch(`${API_BASE_URL}/incident/report`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${storage.getToken()}`
        },
        body: JSON.stringify({ location })
      });
      console.log("SOS Signal sent to backend at", location);
    } catch (e) {
      console.error('SOS trigger error:', e);
    }
  },

  syncPendingData: async () => {
     if (!navigator.onLine) return;
     const pending = storage.getPendingIncidents();
     if (pending.length === 0) return;

     try {
       await fetch(`${API_BASE_URL}/sync/offline`, {
         method: 'POST',
         headers: { 
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${storage.getToken()}`
         },
         body: JSON.stringify({ incidents: pending })
       });
       storage.clearPendingIncidents();
       console.log("Successfully synced offline data");
       return true;
     } catch (e) {
       console.error('Sync error:', e);
       return false;
     }
  }
};

const getSuggestions = async (query: string) => {
  if (!navigator.onLine || query.length < 3) return [];
  try {
    const response = await fetch(
      `https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json?key=${TOMTOM_API_KEY}&typeahead=true&limit=5`
    );
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    return [];
  }
};

const resolveAddressToCoords = async (query: string): Promise<{lat: number, lon: number, address: string} | null> => {
  if(!navigator.onLine) return null;
  try {
    const results = await getSuggestions(query);
    if (results && results.length > 0) {
      return {
        lat: results[0].position.lat,
        lon: results[0].position.lon,
        address: results[0].address.freeformAddress
      };
    }
    return null;
  } catch (e) {
    return null;
  }
};

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const getSafetyColor = (score: number) => {
  if (score >= 80) return 'text-green-700 bg-green-50 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
  if (score >= 60) return 'text-yellow-700 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800';
  return 'text-red-700 bg-red-50 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
};

// --- Reusable UI Components ---

const AmbientBackground = () => (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-400 dark:bg-purple-900/30 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-96 h-96 bg-blue-400 dark:bg-blue-900/30 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-400 dark:bg-pink-900/30 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>
    </div>
);

const LanguageSwitcher = ({ lang, setLang }: { lang: Language, setLang: (l: Language) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const languages: {code: Language, label: string, flag: string}[] = [
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'hi', label: 'Hindi', flag: '🇮🇳' },
    { code: 'es', label: 'Spanish', flag: '🇪🇸' },
  ];

  return (
    <div className="relative z-50" ref={wrapperRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full border border-white/20 text-slate-700 dark:text-white transition"
      >
        <Globe size={18} />
        <span className="uppercase font-bold text-sm">{lang}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 bg-white dark:bg-navy-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden w-40 animate-in fade-in zoom-in-95 duration-200">
           {languages.map(l => (
             <button
               key={l.code}
               onClick={() => { setLang(l.code); setIsOpen(false); }}
               className={`w-full text-left px-4 py-3 text-sm font-medium flex items-center gap-3 hover:bg-blue-50 dark:hover:bg-slate-700 transition ${lang === l.code ? 'bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'}`}
             >
               <span className="text-lg">{l.flag}</span> {l.label}
             </button>
           ))}
        </div>
      )}
    </div>
  );
};


// 1. Location Autocomplete Component
interface LocationSearchInputProps {
  value: string;
  onChange: (val: string) => void;
  onSelect: (coords: [number, number] | null) => void;
  placeholder: string;
  icon: React.ReactNode;
  history?: string[];
  onUseCurrentLocation?: () => void;
}

const LocationSearchInput = ({ 
  value, 
  onChange, 
  onSelect, 
  placeholder, 
  icon,
  history = [],
  onUseCurrentLocation
}: LocationSearchInputProps) => {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (value.length > 2) {
        setIsLoading(true);
        const results = await getSuggestions(value);
        setSuggestions(results);
        setIsLoading(false);
        setShowDropdown(true);
      } else {
        setSuggestions([]);
      }
    };
    
    const timer = setTimeout(fetchSuggestions, 400); 
    return () => clearTimeout(timer);
  }, [value]);

  const handleSelect = (result: any) => {
    onChange(result.address.freeformAddress);
    onSelect([result.position.lat, result.position.lon]);
    setShowDropdown(false);
  };

  const handleHistorySelect = async (address: string) => {
      onChange(address);
      setShowDropdown(false);
      const res = await resolveAddressToCoords(address);
      if(res) onSelect([res.lat, res.lon]);
  };

  const handleClear = () => {
    onChange('');
    onSelect(null);
  };

  const startVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert("Voice search is not supported in this browser.");
        return;
    }
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);
    
    try {
        recognition.start();
    } catch (e) {
        console.warn("Speech recognition already active or error:", e);
        return;
    }

    recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onChange(transcript);
        setIsListening(false);
    };

    recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech') {
            console.warn("Speech recognition error", event.error);
        }
        setIsListening(false);
    };

    recognition.onend = () => {
        setIsListening(false);
    };
  };

  return (
    <div ref={wrapperRef} className="relative group w-full">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 transition-colors group-focus-within:text-blue-500 z-10">
        {isLoading ? <Loader2 size={18} className="animate-spin" /> : icon}
      </div>
      
      <input 
        type="text" 
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          onSelect(null); 
        }}
        onFocus={() => setShowDropdown(true)}
        placeholder={isListening ? "Listening..." : placeholder}
        autoComplete="off"
        className={`w-full pl-10 pr-24 py-4 bg-white/50 dark:bg-navy-900/50 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none hover:border-blue-300 relative z-0 ${isListening ? 'ring-2 ring-red-400 border-red-400 animate-pulse' : ''}`}
      />

      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 z-10">
        {value && (
            <button 
            type="button"
            onClick={handleClear}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            aria-label="Clear input"
            >
            <X size={16} />
            </button>
        )}
        
        {onUseCurrentLocation && (
             <button
                type="button"
                onClick={onUseCurrentLocation}
                className="text-slate-400 hover:text-blue-600 p-1.5 rounded-full hover:bg-blue-50 dark:hover:bg-slate-700 transition"
                title="Use Current Location"
             >
                <Locate size={18} />
             </button>
        )}

        <button 
            type="button"
            onClick={startVoiceSearch}
            className={`p-1.5 rounded-full transition ${isListening ? 'bg-red-100 text-red-600' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700'}`}
            title="Voice Search"
            aria-label="Start voice input"
        >
            <Mic size={18} />
        </button>
      </div>
      
      {showDropdown && (suggestions.length > 0 || (history.length > 0 && value.length < 3)) && (
        <div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-white/95 dark:bg-navy-800/95 backdrop-blur-sm rounded-xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden max-h-64 overflow-y-auto z-[100] animate-in fade-in slide-in-from-top-2 duration-200 ring-1 ring-black/5 custom-scrollbar">
          
          {/* History Items */}
          {value.length < 3 && history.length > 0 && (
            <div className="border-b border-slate-100 dark:border-slate-700">
                <div className="px-3.5 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Recent</div>
                {history.map((item, idx) => (
                    <div 
                        key={`hist-${idx}`}
                        onClick={() => handleHistorySelect(item)}
                        className="px-3.5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer flex items-center gap-3 transition-colors text-slate-600 dark:text-slate-300"
                    >
                        <History size={16} className="text-slate-400" />
                        <span className="text-sm font-medium truncate">{item}</span>
                    </div>
                ))}
            </div>
          )}

          {/* Suggestions */}
          {suggestions.map((item: any) => (
            <div 
              key={item.id}
              onClick={() => handleSelect(item)}
              className="p-3.5 hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-50 dark:border-slate-700 last:border-0 flex items-start gap-3 transition-colors"
            >
              <MapPin size={16} className="mt-0.5 text-slate-400 shrink-0" />
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-200 text-sm leading-tight">{item.address.freeformAddress}</p>
                <p className="text-xs text-slate-500 mt-0.5">{item.address.country}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// 2. Map Component
const LeafletMap = ({ 
  incidents, 
  selectedRoute, 
  isNavigating,
  currentPosition,
  interactive = true,
  heatmapMode = false
}: { 
  incidents: Incident[], 
  selectedRoute: Route | null,
  isNavigating: boolean,
  currentPosition?: [number, number] | null,
  interactive?: boolean,
  heatmapMode?: boolean
}) => {
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const routeLayerGroupRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const heatLayerRef = useRef<any>(null);

  useEffect(() => {
    // FIX: Leaflet Default Icon Issue - Run once
    if (typeof window !== 'undefined' && (window as any).L) {
       const L = (window as any).L;
       delete L.Icon.Default.prototype._getIconUrl;
       L.Icon.Default.mergeOptions({
           iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
           iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
           shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
       });
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      boxZoom: interactive,
      keyboard: interactive,
    }).setView([40.7580, -73.9855], 13);

    // Use OpenStreetMap Tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    if (interactive && !isNavigating) {
      L.control.zoom({ position: 'bottomright' }).addTo(map);
    }

    mapRef.current = map;
    
    // Invalidate size to ensure map renders correctly if container resizes
    setTimeout(() => {
        map.invalidateSize();
    }, 100);

    return () => {
      map.off();
      map.remove();
      mapRef.current = null;
    };
  }, [interactive]); 

  // Heatmap Effect
  useEffect(() => {
    const map = mapRef.current;
    const L = (window as any).L;
    if (!map || !L) return;

    if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
    }
    
    map.eachLayer((layer: any) => {
       if(layer.options && layer.options.isHeatmapCircle) {
           map.removeLayer(layer);
       }
    });

    if (heatmapMode) {
        if (L.heatLayer) {
            const heatPoints = incidents.map(i => [
                i.lat, 
                i.lng, 
                i.severity === 'high' ? 1.0 : i.severity === 'medium' ? 0.6 : 0.3
            ]);
            heatLayerRef.current = L.heatLayer(heatPoints, {
                radius: 25,
                blur: 15,
                maxZoom: 17,
            }).addTo(map);
        } else {
            const group = L.layerGroup().addTo(map);
            heatLayerRef.current = group;
            incidents.forEach(inc => {
                 L.circle([inc.lat, inc.lng], {
                     radius: 300,
                     fillColor: inc.severity === 'high' ? 'red' : 'orange',
                     fillOpacity: 0.15,
                     stroke: false,
                     isHeatmapCircle: true
                 }).addTo(group);
            });
        }
    }
  }, [heatmapMode, incidents]);

  // Handle interaction enabling/disabling during navigation
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    
    if (isNavigating) {
        map.dragging.disable();
        map.touchZoom.disable();
        map.doubleClickZoom.disable();
        map.scrollWheelZoom.disable();
        if (map.zoomControl) map.zoomControl.remove();
    } else {
        map.dragging.enable();
        map.touchZoom.enable();
        map.doubleClickZoom.enable();
        map.scrollWheelZoom.enable();
    }
  }, [isNavigating]);

  // Handle navigation updates (Current Position Marker & Camera)
  useEffect(() => {
    const map = mapRef.current;
    const L = (window as any).L;
    if (!map || !L) return;

    if (isNavigating && currentPosition) {
        if (!userMarkerRef.current) {
            const icon = L.divIcon({
                className: 'bg-transparent',
                html: `<div class="w-12 h-12 bg-blue-600/30 rounded-full flex items-center justify-center animate-pulse">
                        <div class="w-6 h-6 bg-blue-600 rounded-full border-2 border-white shadow-xl flex items-center justify-center transform transition-transform duration-500">
                          <div class="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[8px] border-b-white transform -translate-y-0.5"></div>
                        </div>
                       </div>`,
                iconSize: [48, 48],
                iconAnchor: [24, 24]
            });
            userMarkerRef.current = L.marker(currentPosition, { icon, zIndexOffset: 1000 }).addTo(map);
        } else {
            userMarkerRef.current.setLatLng(currentPosition);
        }
        
        // ZOOM 18 for Navigation
        map.setView(currentPosition, 18, { animate: true, duration: 1.5, easeLinearity: 0.25 });
    } else {
        if (userMarkerRef.current) {
            map.removeLayer(userMarkerRef.current);
            userMarkerRef.current = null;
        }
    }
  }, [isNavigating, currentPosition]);

  // Normal Mode Markers (Only if NOT heatmap mode)
  useEffect(() => {
    if (heatmapMode) return;

    const map = mapRef.current;
    const L = (window as any).L;
    if (!map || !L) return;

    map.eachLayer((layer: any) => {
      if (layer instanceof L.CircleMarker && layer !== userMarkerRef.current && !layer.options.isHeatmapCircle) {
        map.removeLayer(layer);
      }
    });

    if (routeLayerGroupRef.current) {
      map.removeLayer(routeLayerGroupRef.current);
      routeLayerGroupRef.current = null;
    }

    incidents.forEach((inc: any)=> {
      // ---------------------------------------------------------
      // 🛠 FIX START: Handle both Backend Data & Local Data
      // ---------------------------------------------------------
      let lat, lng;

      if (inc.location && inc.location.coordinates) {
        // Backend (MongoDB) sends [Longitude, Latitude]
        lng = inc.location.coordinates[0];
        lat = inc.location.coordinates[1];
      } else {
        // Local/Legacy data uses simple lat/lng
        lat = inc.lat;
        lng = inc.lng || inc.lon;
      }

      // 🛡 CRITICAL: If data is missing/bad, skip this marker so app doesn't crash
      if (!lat || !lng) return; 
      // ---------------------------------------------------------
      // 🛠 FIX END
      // ---------------------------------------------------------

      const color = inc.severity === 'high' ? '#ef4444' : inc.severity === 'medium' ? '#f59e0b' : '#3b82f6';
      
      // Use the new variables 'lat' and 'lng' here
      const marker = L.circleMarker([lat, lng], {
        radius: 8,
        fillColor: color,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
      }).addTo(map);

      if (interactive) {
        marker.bindPopup(`
            <div class="p-3 min-w-[200px]">
            <div class="flex items-center gap-2 mb-1">
                <span class="w-2 h-2 rounded-full" style="background:${color}"></span>
                <strong class="block text-sm font-bold text-gray-900">${inc.type}</strong>
            </div>
            <span class="text-xs text-gray-500 block mb-2">${inc.timestamp || 'Just now'}</span>
            <p class="text-xs text-gray-700 leading-relaxed">${inc.description}</p>
            ${inc.pendingSync ? '<span class="text-[10px] text-orange-500 font-bold uppercase mt-2 block">Pending Sync</span>' : ''}
            </div>
        `);
      }
    });
    if (selectedRoute && selectedRoute.coordinates.length > 0) {
      const group = L.layerGroup().addTo(map);
      routeLayerGroupRef.current = group;

      L.polyline(selectedRoute.coordinates, {
        color: '#ffffff',
        weight: 10,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(group);

      L.polyline(selectedRoute.coordinates, {
        color: selectedRoute.color,
        weight: 6,
        opacity: 1,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(group);
      
      if (!isNavigating) {
        const bounds = L.latLngBounds(selectedRoute.coordinates);
        map.fitBounds(bounds, { padding: [50, 50] });
      }

      const startPoint = selectedRoute.coordinates[0];
      const endPoint = selectedRoute.coordinates[selectedRoute.coordinates.length - 1];

      L.marker(startPoint).addTo(group).bindPopup(`<div class="p-2 text-center"><b>Start</b><br>${selectedRoute.start}</div>`);
      L.marker(endPoint).addTo(group).bindPopup(`<div class="p-2 text-center"><b>Destination</b><br>${selectedRoute.end}</div>`);
    } else if (incidents.length > 0 && !interactive) {
        const latLngs = incidents.map(i => [i.lat, i.lng] as [number, number]);
        const bounds = L.latLngBounds(latLngs);
        map.fitBounds(bounds, { padding: [30, 30] });
    }

  }, [incidents, selectedRoute, isNavigating, interactive, heatmapMode]);

  return (
    <div className="w-full h-full relative map-perspective-container overflow-hidden">
        <div ref={containerRef} className={`w-full h-full z-0 outline-none ${isNavigating ? 'map-3d-view' : 'map-standard-view'}`} />
    </div>
  );
};

// --- Page Components ---

interface LandingViewProps { setCurrentPage: (page: Page) => void; setDarkMode: (val: boolean) => void; darkMode: boolean; }
const LandingView = ({ setCurrentPage, setDarkMode }: LandingViewProps) => {
  useEffect(() => { setDarkMode(true); }, []);
  return (
  <div className="min-h-screen bg-navy-900 text-white font-sans selection:bg-blue-500/30 relative overflow-x-hidden">
    
    {/* 3D Animated Mesh Gradient Background */}
    <div className="fixed inset-0 z-0">
        <div className="absolute top-0 left-0 w-[50%] h-[60%] bg-blue-600/20 rounded-full blur-[120px] animate-blob"></div>
        <div className="absolute top-20 right-0 w-[40%] h-[50%] bg-purple-600/20 rounded-full blur-[100px] animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-20 w-[60%] h-[40%] bg-cyan-600/20 rounded-full blur-[120px] animate-blob animation-delay-4000"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
    </div>

    {/* Navbar */}
    <nav className="p-6 flex justify-between items-center max-w-7xl mx-auto w-full animate-in slide-in-from-top-4 duration-500 relative z-20">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Shield size={32} className="text-blue-500 fill-blue-500/20" />
          <div className="absolute inset-0 bg-blue-500/50 blur-lg rounded-full -z-10"></div>
        </div>
        <span className="text-2xl font-bold tracking-tight text-white">SafeWalk</span>
      </div>
      <div className="flex gap-4">
        <button onClick={() => setCurrentPage('login')} className="px-6 py-2.5 text-slate-300 font-medium hover:text-white transition glass-panel rounded-full hover:bg-white/10">Sign In</button>
        <button onClick={() => setCurrentPage('signup')} className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full font-bold hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] transition transform hover:-translate-y-0.5">Get Started</button>
      </div>
    </nav>

    {/* Hero Section */}
    <div className="relative z-10 max-w-7xl mx-auto px-6 pt-10 pb-20 flex flex-col md:flex-row items-center gap-12">
        <div className="flex-1 space-y-8 animate-in slide-in-from-left-8 duration-700">
             <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel border-blue-500/30 text-blue-300 text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                <Sparkles size={12} className="text-blue-400" /> Next Gen Safety
             </div>
             <h1 className="text-5xl md:text-7xl font-extrabold leading-tight">Navigate with <br/><span className="text-gradient">Absolute Confidence</span></h1>
             <p className="text-lg text-slate-400 max-w-xl leading-relaxed">Experience the future of personal safety. AI-driven routing, real-time community intelligence, and 3D navigation in one premium interface.</p>
             <div className="flex flex-col sm:flex-row gap-5">
                <button onClick={() => setCurrentPage('signup')} className="px-8 py-4 bg-white text-navy-900 rounded-2xl font-bold text-lg hover:bg-blue-50 transition shadow-[0_0_30px_rgba(255,255,255,0.3)] flex items-center justify-center gap-2 transform hover:scale-105 duration-200">Start Your Journey <ArrowRight size={20} /></button>
                <button className="px-8 py-4 glass-panel text-white rounded-2xl font-bold text-lg hover:bg-white/10 transition flex items-center justify-center gap-2 backdrop-blur-md" onClick={() => alert("Demo Video coming soon!")}>Watch Demo</button>
             </div>
        </div>

        {/* 3D Composition Right Side */}
        <div className="flex-1 w-full h-[500px] relative scene-3d animate-in zoom-in-95 duration-1000 delay-200">
             <div className="absolute inset-0 object-3d animate-float">
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-96 bg-navy-800/80 rounded-[40px] border border-blue-500/30 transform -rotate-y-12 rotate-x-12 translate-z-0 shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col">
                    <div className="h-full w-full bg-gradient-to-b from-navy-800 to-navy-900 relative">
                        {/* Improved Placeholder Background */}
                        <div className="absolute inset-0 opacity-40 bg-slate-800 flex items-center justify-center border border-slate-700">
                             <div className="text-slate-600 font-bold text-xs uppercase tracking-widest rotate-[-12deg]">Secure Map View</div>
                        </div>
                        <svg className="absolute inset-0 w-full h-full pointer-events-none drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]"><path d="M 80 400 Q 150 300 120 200 T 250 100" stroke="#10b981" strokeWidth="4" fill="none" strokeDasharray="10 5" className="animate-pulse" /><circle cx="80" cy="400" r="6" fill="#10b981" /><circle cx="250" cy="100" r="6" fill="#3b82f6" /></svg>
                        <div className="absolute top-6 left-6 right-6 p-3 glass-panel rounded-xl flex items-center gap-3 transform translate-z-10 shadow-lg"><div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center"><Shield size={16} className="text-white"/></div><div><div className="h-2 w-20 bg-slate-200/20 rounded mb-1"></div><div className="h-2 w-12 bg-slate-200/10 rounded"></div></div></div>
                        <div className="absolute bottom-6 left-6 right-6 p-4 bg-navy-900/90 rounded-2xl border border-blue-500/30 transform translate-z-20 shadow-xl"><div className="flex justify-between items-center mb-2"><span className="text-xs font-bold text-green-400">SAFEST ROUTE</span><span className="text-xs font-bold text-white">12 min</span></div><button className="w-full py-2 bg-blue-600 rounded-lg text-xs font-bold text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]">Start Navigation</button></div>
                    </div>
                 </div>
                 <div className="absolute top-20 right-10 p-4 glass-panel rounded-2xl animate-float-delayed transform translate-z-30 shadow-[0_10px_40px_rgba(0,0,0,0.5)] border-l-4 border-green-500"><div className="flex items-center gap-3"><div className="p-2 bg-green-500/20 rounded-lg text-green-400"><CheckCircle size={20} /></div><div><p className="text-xs font-bold text-slate-300">Safety Score</p><p className="text-xl font-bold text-white">98%</p></div></div></div>
                 <div className="absolute bottom-40 -left-10 p-4 glass-panel rounded-2xl animate-float transform translate-z-20 shadow-[0_10px_40px_rgba(0,0,0,0.5)] border-l-4 border-red-500"><div className="flex items-center gap-3"><div className="p-2 bg-red-500/20 rounded-lg text-red-400"><AlertTriangle size={20} /></div><div><p className="text-xs font-bold text-slate-300">Incident Reported</p><p className="text-xs text-red-400">2 mins ago</p></div></div></div>
             </div>
        </div>
    </div>
    
    {/* Features Bento Grid */}
    <div className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16"><h2 className="text-3xl md:text-5xl font-bold mb-4">Everything you need to <span className="text-gradient">stay safe</span></h2><p className="text-slate-400 max-w-2xl mx-auto">Advanced technology meets community power to provide the ultimate personal safety companion.</p></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-auto md:h-[600px]">
             <div className="md:col-span-2 md:row-span-2 glass-panel rounded-3xl p-8 relative overflow-hidden group glass-card-hover">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition duration-500"></div>
                <div className="relative z-10"><div className="w-12 h-12 rounded-2xl bg-blue-600/20 flex items-center justify-center text-blue-400 mb-6"><MapIcon size={24} /></div><h3 className="text-2xl font-bold mb-3">Smart Route Intelligence</h3><p className="text-slate-400 mb-6 max-w-md">Our AI analyzes millions of data points including lighting, crime stats, and crowd density to generate the safest path for you, not just the fastest.</p>
                    <div className="w-full h-64 bg-navy-800 rounded-xl overflow-hidden relative border border-slate-700 group-hover:border-blue-500/50 transition">
                         {/* Replaced TomTom static with abstract map representation */}
                         <div className="absolute inset-0 bg-slate-900 flex items-center justify-center"><div className="grid grid-cols-6 grid-rows-6 gap-2 w-full h-full opacity-20 transform rotate-12 scale-150"><div className="bg-slate-700 rounded col-span-2"></div><div className="bg-slate-700 rounded col-span-3"></div><div className="bg-slate-700 rounded"></div><div className="bg-slate-700 rounded col-span-4"></div><div className="bg-slate-700 rounded col-span-2"></div><div className="bg-slate-700 rounded col-span-1"></div><div className="bg-slate-700 rounded col-span-5"></div></div></div>
                         <svg className="absolute inset-0 w-full h-full"><path d="M 50 200 Q 200 150 400 200 T 700 150" fill="none" stroke="#3b82f6" strokeWidth="4" className="drop-shadow-[0_0_8px_#3b82f6]" /></svg>
                         <div className="absolute top-4 right-4 bg-navy-900/80 px-3 py-1 rounded-lg border border-slate-700 text-xs font-mono text-green-400">LIVE ANALYSIS</div>
                    </div>
                </div>
             </div>
             <div className="glass-panel rounded-3xl p-8 relative overflow-hidden group glass-card-hover"><div className="relative z-10"><div className="w-12 h-12 rounded-2xl bg-red-600/20 flex items-center justify-center text-red-400 mb-6"><Zap size={24} /></div><h3 className="text-xl font-bold mb-2">Instant SOS</h3><p className="text-slate-400 text-sm">One-tap alert system that notifies emergency contacts and authorities with your live location.</p></div><div className="absolute -bottom-10 -right-10 w-32 h-32 bg-red-600/20 rounded-full blur-3xl group-hover:bg-red-600/30 transition"></div></div>
             <div className="glass-panel rounded-3xl p-8 relative overflow-hidden group glass-card-hover"><div className="relative z-10"><div className="w-12 h-12 rounded-2xl bg-purple-600/20 flex items-center justify-center text-purple-400 mb-6"><Users size={24} /></div><h3 className="text-xl font-bold mb-2">Community Powered</h3><p className="text-slate-400 text-sm">Real-time reports from trusted community members about lighting issues or suspicious activity.</p></div><div className="absolute -bottom-10 -right-10 w-32 h-32 bg-purple-600/20 rounded-full blur-3xl group-hover:bg-purple-600/30 transition"></div></div>
        </div>
    </div>
    <div className="relative z-10 py-24 text-center"><div className="absolute inset-0 bg-gradient-to-t from-blue-900/20 to-transparent pointer-events-none"></div><h2 className="text-4xl font-bold mb-8">Ready to walk without worry?</h2><button onClick={() => setCurrentPage('signup')} className="px-12 py-5 bg-white text-navy-900 rounded-full font-bold text-xl hover:bg-slate-200 transition shadow-[0_0_40px_rgba(255,255,255,0.2)] transform hover:scale-105 duration-200">Join SafeWalk Now</button></div>
  </div>
)};

interface LoginViewProps {
  setCurrentPage: (page: Page) => void;
  setUser: (user: User) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  lang: Language;
  setLang: (l: Language) => void;
}
const LoginView = ({ setCurrentPage, setUser, showToast, lang, setLang }: LoginViewProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast("Please fill in all fields.", "error");
      return;
    }
    if (!isValidEmail(email)) {
      showToast("Please enter a valid email address.", "error");
      return;
    }

    setIsLoading(true);
    
    try {
        const user = await apiService.login(email, password);
        storage.saveToken('mock_token_123');
        setUser(user); 
        setCurrentPage('map'); 
        showToast('Welcome back!', 'success');
    } catch (err: any) {
        showToast(err.message || 'Login failed', 'error');
    } finally {
        setIsLoading(false);
    }
  };

  const t = translations[lang];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-navy-900 relative overflow-hidden transition-colors duration-300">
       <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-[10%] left-[20%] w-[300px] h-[300px] bg-purple-600/30 rounded-full mix-blend-screen filter blur-3xl opacity-60 animate-blob"></div>
          <div className="absolute top-[20%] right-[20%] w-[350px] h-[350px] bg-blue-600/30 rounded-full mix-blend-screen filter blur-3xl opacity-60 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-[20%] left-[30%] w-[400px] h-[400px] bg-cyan-600/30 rounded-full mix-blend-screen filter blur-3xl opacity-60 animate-blob animation-delay-4000"></div>
       </div>

      <div className="absolute top-6 right-6 z-50">
          <LanguageSwitcher lang={lang} setLang={setLang} />
      </div>

      <div className="glass-panel backdrop-blur-2xl p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-500 relative z-10">
        <div className="flex justify-center mb-6">
          <div className="p-3 bg-blue-500/20 rounded-2xl text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)] border border-blue-500/30">
            <Shield size={40} className="fill-blue-500/20 text-white" />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-center mb-2 text-white tracking-tight">{t.welcome}</h2>
        <p className="text-center text-slate-300 mb-8 font-medium">{t.signinSubtitle}</p>
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-200 mb-2 ml-1">{t.email}</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.emailPlaceholder} 
              className="w-full px-5 py-3.5 rounded-xl border border-slate-600 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-navy-800/50 focus:bg-navy-800 text-white placeholder-slate-500" 
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-200 mb-2 ml-1">{t.password}</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.passwordPlaceholder} 
              className="w-full px-5 py-3.5 rounded-xl border border-slate-600 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-navy-800/50 focus:bg-navy-800 text-white placeholder-slate-500" 
            />
          </div>
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] transition flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transform hover:scale-[1.02] duration-200"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : t.signinBtn}
          </button>
        </form>
        <div className="mt-8 pt-6 border-t border-slate-700/50 text-center">
          <p className="text-sm text-slate-300 mb-4">
            {t.noAccount} <button onClick={() => setCurrentPage('signup')} className="text-blue-400 font-bold hover:underline hover:text-blue-300 transition">{t.create}</button>
          </p>
          <button onClick={() => setCurrentPage('landing')} className="text-xs text-slate-400 hover:text-slate-200 font-medium hover:underline transition">{t.backHome}</button>
        </div>
      </div>
    </div>
  );
};

interface SignupViewProps {
  setCurrentPage: (page: Page) => void;
  setUser: (user: User) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const SignupView = ({ setCurrentPage, showToast }: SignupViewProps) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // ------------------------------------------------------------------
  // ✅ CORRECTED LOGIC: Connects to Real Backend
  // ------------------------------------------------------------------
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validation
    if (!name.trim() || !email.trim() || !password.trim() || !phone.trim()) {
      showToast("All fields are required.", "error");
      return;
    }
    if (!isValidEmail(email)) {
      showToast("Please enter a valid email address.", "error");
      return;
    }
    if (password.length < 6) {
        showToast("Password must be at least 6 characters.", "error");
        return;
    }

    setIsLoading(true);

    try {
        // 2. Call the Real API
        // Ensure your apiService.register accepts these 4 arguments!
        await apiService.register(name, email, phone, password);
        
        showToast('Account created successfully! Please Log In.', 'success');
        
        // 3. Redirect to Login Page
        setCurrentPage('login');

    } catch (err: any) {
        console.error("Signup Error:", err);
        showToast(err.message || 'Registration failed', 'error');
    } finally {
        setIsLoading(false);
    }
  };
  // ------------------------------------------------------------------


  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-navy-900 relative overflow-hidden transition-colors duration-300">
       <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-purple-600/30 rounded-full blur-[100px] opacity-50"></div>
          <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-600/30 rounded-full blur-[100px] opacity-50"></div>
       </div>

      <div className="glass-panel backdrop-blur-xl p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-500 relative z-10 my-10">
        <div className="flex justify-center mb-6">
           <div className="p-3 bg-purple-500/20 rounded-2xl text-purple-400 shadow-inner border border-purple-500/30">
            <UserPlus size={40} />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-center mb-2 text-white tracking-tight">Create Account</h2>
        <p className="text-center text-slate-300 mb-8 font-medium">Join the community keeping everyone safe</p>
        
        <form onSubmit={handleSignup} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2 ml-1">Full Name <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe" 
              className="w-full px-5 py-3.5 rounded-xl border border-slate-600 focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all bg-navy-800/50 focus:bg-navy-800 text-white placeholder-slate-500" 
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2 ml-1">Email <span className="text-red-500">*</span></label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" 
              className="w-full px-5 py-3.5 rounded-xl border border-slate-600 focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all bg-navy-800/50 focus:bg-navy-800 text-white placeholder-slate-500" 
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2 ml-1">Phone Number <span className="text-red-500">*</span></label>
            <input 
              type="tel" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 000 0000" 
              className="w-full px-5 py-3.5 rounded-xl border border-slate-600 focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all bg-navy-800/50 focus:bg-navy-800 text-white placeholder-slate-500" 
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2 ml-1">Password <span className="text-red-500">*</span></label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password" 
              className="w-full px-5 py-3.5 rounded-xl border border-slate-600 focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all bg-navy-800/50 focus:bg-navy-800 text-white placeholder-slate-500" 
            />
          </div>
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold hover:shadow-[0_0_20px_rgba(139,92,246,0.5)] transition flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transform hover:scale-[1.02] duration-200"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : "Sign Up"}
          </button>
        </form>
        <div className="mt-8 pt-6 border-t border-slate-700/50 text-center">
          <p className="text-sm text-slate-300 mb-4">
            Already have an account? <button onClick={() => setCurrentPage('login')} className="text-purple-400 font-bold hover:underline hover:text-purple-300 transition">Sign in</button>
          </p>
          <button onClick={() => setCurrentPage('landing')} className="text-xs text-slate-400 hover:text-slate-200 font-medium hover:underline transition">Back to Home</button>
        </div>
      </div>
    </div>
  );
};

// --- Functional Components for Dashboard Pages ---

interface SafetyHubViewProps { incidents: Incident[]; setIncidents: (incidents: Incident[]) => void; showToast: any; }
const SafetyHubView = ({ incidents, setIncidents, showToast }: SafetyHubViewProps) => {
  const [reportType, setReportType] = useState('Suspicious Activity');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description) { showToast("Please describe the incident.", "error"); return; }
    setIsSubmitting(true);
    const newIncident: Incident = { id: Date.now(), type: reportType as any, severity: 'medium', name: reportType, location: 'Current Location', lat: 40.7580, lng: -73.9855, timestamp: 'Just now', description: description };
    await apiService.reportIncident(newIncident);
    setIncidents([newIncident, ...incidents]);
    setIsSubmitting(false);
    setDescription('');
    showToast("Incident reported.", "success");
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden relative z-10">
        <h1 className="text-3xl font-bold mb-6 dark:text-white flex items-center gap-2"><AlertTriangle className="text-red-600"/> Safety Hub</h1>
        <div className="grid lg:grid-cols-2 gap-8 h-full overflow-hidden">
             <div className="flex flex-col gap-4 overflow-y-auto">
                 <div onClick={() => setShowHeatmap(true)} className="bg-navy-800 p-6 rounded-2xl text-white cursor-pointer hover:bg-navy-700 transition"><h3 className="font-bold text-xl mb-2 flex items-center gap-2"><MapIcon/> View Safety Heatmap</h3><p className="text-sm opacity-70">Click to visualize high-risk zones</p></div>
                 <div className="glass-panel p-6 rounded-2xl"><h2 className="font-bold mb-4 dark:text-white">Report Incident</h2><form onSubmit={handleReportSubmit} className="space-y-4"><select value={reportType} onChange={e=>setReportType(e.target.value)} className="w-full p-3 rounded-xl border dark:bg-navy-900 dark:text-white"><option>Suspicious Activity</option><option>Lighting Issue</option><option>Harassment</option></select><textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Describe..." className="w-full p-3 rounded-xl border dark:bg-navy-900 dark:text-white h-24"></textarea><button type="submit" disabled={isSubmitting} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold">Submit</button></form></div>
             </div>
             <div className="glass-panel p-6 rounded-2xl flex flex-col overflow-hidden"><h2 className="font-bold mb-4 dark:text-white">Live Feed</h2><div className="flex-1 overflow-y-auto space-y-3">{incidents.map(inc => <div key={inc.id} className="p-4 bg-white/50 dark:bg-navy-800/50 rounded-xl border dark:border-slate-700"><h3 className="font-bold dark:text-white">{inc.name}</h3><p className="text-sm dark:text-slate-300">{inc.description}</p></div>)}</div></div>
        </div>
        {showHeatmap && <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-10"><div className="bg-white w-full h-full rounded-3xl overflow-hidden relative"><button onClick={() => setShowHeatmap(false)} className="absolute top-4 right-4 z-50 p-2 bg-white rounded-full"><X/></button><LeafletMap incidents={incidents} selectedRoute={null} isNavigating={false} interactive={true} heatmapMode={true} /></div></div>}
    </div>
  );
};

interface ContactsViewProps { user: User | null; setUser: (user: User) => void; showToast: any; onSOSClick: () => void; }
const ContactsView = ({ user, setUser, showToast, onSOSClick }: ContactsViewProps) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newContact, setNewContact] = useState({ name: '', phone: '', relationship: 'Family' });

    const handleAddContact = async () => {
        if (!newContact.name || !newContact.phone) { 
            showToast("Please enter a name and phone number.", "error"); 
            return; 
        }
        if (user) {
            const contact = { 
                id: Date.now().toString(), 
                name: newContact.name, 
                phone: newContact.phone, 
                relationship: newContact.relationship 
            };
            const updatedContacts = [...(user.emergencyContacts || []), contact];
            // const updatedUser = { ...user, emergencyContacts: updatedContacts };
            const updatedUser = { 
               ...user, 
               emergencyContacts: updatedContacts as any 
            };
            setUser(updatedUser);

            
            try {
                // await apiService.updateProfile({ emergencyContacts: updatedContacts });
                const updatedUser = { ...user, emergencyContacts: updatedContacts };
                // setUser(updatedUser); 
                localStorage.setItem('cached_user', JSON.stringify(updatedUser));
                showToast("Emergency contact saved.", "success"); 
                setIsAdding(false); 
                setNewContact({ name: '', phone: '', relationship: 'Family' });
            } catch (e: any) { 
                console.error("Failed to save contact", e); 
                showToast("Failed to save contact to server.", "error"); 
            }
            await apiService.updateContacts(updatedContacts);
        }
    };

    const handleDeleteContact = async (id: number | string) => {
        if (user) {
             const updatedContacts = user.emergencyContacts.filter(c => c.id !== id);
             try {
                //  await apiService.updateProfile({ emergencyContacts: updatedContacts });
                 const updatedUser = { ...user, emergencyContacts: updatedContacts };
                 setUser(updatedUser); 
                 localStorage.setItem('cached_user', JSON.stringify(updatedUser));
                 showToast("Contact removed.", "info");
             } catch (e: any) { 
                 console.error("Failed to delete contact", e); 
                 showToast("Failed to remove contact from server.", "error"); 
             }
             await apiService.updateContacts(updatedContacts);
        }
    }

    return (
        <div className="p-6 md:p-10 max-w-5xl mx-auto h-full overflow-y-auto">
            {/* SOS Banner */}
            <div className="glass-panel mb-8 !bg-red-600 text-white p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-red-500/30 rounded-2xl">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm animate-pulse">
                        <Phone size={32} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">Emergency SOS</h2>
                        <p className="text-red-100">One-tap connection to local authorities</p>
                    </div>
                </div>
                <button onClick={onSOSClick} className="w-full md:w-auto px-8 py-4 bg-white text-red-600 font-bold text-lg rounded-xl hover:bg-red-50 transition shadow-lg flex items-center justify-center gap-2">
                    <PhoneCall size={24} /> Call 112 / 911
                </button>
            </div>
            
            {/* Header + Add Button */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold dark:text-white">Emergency Contacts</h1>
                <button 
                    onClick={() => setIsAdding(!isAdding)} 
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 transition"
                >
                    {isAdding ? <X size={20} /> : <UserPlus size={20} />} 
                    {isAdding ? 'Cancel' : 'Add Contact'}
                </button>
            </div>

            {/* Add Contact Form */}
            {isAdding && (
                <div className="glass-panel p-6 rounded-2xl mb-8 animate-in slide-in-from-top-4 border border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold text-lg mb-4 dark:text-white">New Contact Details</h3>
                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                        <input 
                            type="text" 
                            placeholder="Full Name" 
                            value={newContact.name} 
                            onChange={(e) => setNewContact({...newContact, name: e.target.value})} 
                            className="p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-navy-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" 
                        />
                        <input 
                            type="tel" 
                            placeholder="Phone Number" 
                            value={newContact.phone} 
                            onChange={(e) => setNewContact({...newContact, phone: e.target.value})} 
                            className="p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-navy-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" 
                        />
                        <select 
                            value={newContact.relationship} 
                            onChange={(e) => setNewContact({...newContact, relationship: e.target.value})} 
                            className="p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-navy-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option>Family</option>
                            <option>Friend</option>
                            <option>Partner</option>
                            <option>Work</option>
                            <option>Other</option>
                        </select>
                    </div>
                    <button 
                        onClick={handleAddContact} 
                        className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition"
                    >
                        Save Contact
                    </button>
                </div>
            )}

            {/* Contact List */}
            <div className="grid md:grid-cols-2 gap-6">
                {(!user?.emergencyContacts || user.emergencyContacts.length === 0) && !isAdding && (
                    <div className="col-span-2 text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl">
                        <Users size={48} className="mx-auto text-slate-300 mb-4" />
                        <p className="text-slate-500 dark:text-slate-400 font-medium">No emergency contacts added yet.</p>
                        <button onClick={() => setIsAdding(true)} className="text-blue-600 font-bold mt-2 hover:underline">Add one now</button>
                    </div>
                )}
                {user?.emergencyContacts?.map(c => (
                    <div key={c.id} className="glass-panel p-6 rounded-2xl relative group border border-slate-100 dark:border-slate-700">
                        <button 
                            onClick={() => handleDeleteContact(c.id)} 
                            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition"
                            title="Delete Contact"
                        >
                            <Trash2 size={18} />
                        </button>
                        <div className="flex items-center gap-4 mb-3">
                            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xl">
                                {c.name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-bold text-xl dark:text-white">{c.name}</h3>
                                <p className="text-xs font-bold uppercase text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded inline-block mt-1">
                                    {c.relationship}
                                </p>
                            </div>
                        </div>
                        <p className="text-slate-500 dark:text-slate-300 text-lg font-mono bg-slate-50 dark:bg-navy-900/50 p-3 rounded-xl text-center tracking-wider">
                            {c.phone}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};

interface OfflineViewProps { savedRoutes: Route[]; showToast: any; setSelectedRoute: any; setCurrentPage: any; }
const OfflineView = ({ savedRoutes, showToast, setSelectedRoute, setCurrentPage }: OfflineViewProps) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isMapAvailable, setIsMapAvailable] = useState(false);
  
  useEffect(() => {
    const hasMap = localStorage.getItem('offline_map_data');
    if (hasMap) setIsMapAvailable(true);
  }, []);

  const handleDownloadMap = () => {
    if (!navigator.onLine) { showToast("You need an internet connection to download maps.", "error"); return; }
    setIsDownloading(true); setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) { clearInterval(interval); setIsDownloading(false); setIsMapAvailable(true); localStorage.setItem('offline_map_data', 'true'); showToast("Region map downloaded successfully.", "success"); return 100; }
        return prev + 5;
      });
    }, 100);
  };

  const handleDeleteMap = () => { localStorage.removeItem('offline_map_data'); setIsMapAvailable(false); showToast("Offline map data removed.", "info"); };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto h-full overflow-y-auto">
      <div className="mb-8"><h1 className="text-3xl font-bold dark:text-white flex items-center gap-3"><WifiOff className="text-slate-400" /> <span className="text-gradient">Offline Mode</span></h1><p className="text-slate-500 ml-10 mt-1">Access maps and routes without internet</p></div>
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <div className="glass-panel p-6 rounded-2xl">
            <h2 className="text-lg font-bold dark:text-white mb-4">Offline Status</h2>
            <div className="space-y-3">
              <div className={`flex items-center gap-3 font-medium p-3 rounded-xl border ${isMapAvailable ? 'text-green-600 bg-green-50 border-green-100' : 'text-slate-500 bg-slate-50 border-slate-200'}`}>{isMapAvailable ? <CheckCircle size={20} /> : <AlertCircle size={20} />}{isMapAvailable ? 'Maps Installed' : 'Maps Not Installed'}</div>
              <div className="flex items-center gap-3 text-blue-600 font-medium bg-blue-50 p-3 rounded-xl border border-blue-100"><CheckCircle size={20} /> {savedRoutes.length} Routes Cached</div>
            </div>
            <div className="mt-6 pt-6 border-t border-slate-200">
              {isDownloading ? (<div className="space-y-2"><div className="flex justify-between text-xs font-bold text-slate-500"><span>Downloading...</span><span>{progress}%</span></div><div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }}></div></div></div>) : isMapAvailable ? (<button onClick={handleDeleteMap} className="w-full py-3 bg-red-50 text-red-600 font-bold rounded-xl flex items-center justify-center gap-2 border border-red-200"><Trash2 size={18} /> Delete Map Data</button>) : (<button onClick={handleDownloadMap} className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl flex items-center justify-center gap-2"><Download size={18} /> Download Region Map</button>)}
            </div>
          </div>
        </div>
        <div className="md:col-span-2">
          <h2 className="text-xl font-bold dark:text-white mb-4">Saved Routes</h2>
          <div className="space-y-4">
            {savedRoutes.length > 0 ? (savedRoutes.map(route => (<div key={route.id} className="glass-panel p-5 flex justify-between items-center rounded-2xl group"><div><h3 className="font-bold text-lg dark:text-white">{route.name}</h3><div className="flex gap-3 mt-2 text-xs font-medium text-slate-400"><span>{route.distance}</span><span>•</span><span>{route.duration}</span></div></div><button onClick={() => { setSelectedRoute(route); setCurrentPage('map'); showToast("Loaded offline route", "success"); }} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm flex items-center gap-2"><Navigation size={16} /> Navigate</button></div>))) : (<div className="text-center py-12 bg-white/30 backdrop-blur-sm rounded-3xl border-2 border-dashed border-slate-200"><WifiOff size={48} className="mx-auto text-slate-300 mb-3" /><p className="text-slate-500 font-medium">No saved routes yet</p></div>)}
          </div>
        </div>
      </div>
    </div>
  );
};

interface SettingsViewProps { user: User | null; settings: AppSettings; setSettings: (s: AppSettings) => void; updateUser: (u: Partial<User>) => void; showToast: any; }
const SettingsView = ({ user, settings, setSettings, updateUser, showToast }: SettingsViewProps) => {
  const [formData, setFormData] = useState({ name: user?.name || '', email: user?.email || '' });
  useEffect(() => { if (user) setFormData({ name: user.name, email: user.email }); }, [user]);
  const handleSave = () => { updateUser({ name: formData.name, email: formData.email }); showToast("Profile updated successfully", "success"); };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-8 lg:p-12 max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 dark:text-white flex items-center gap-3"><Settings className="text-slate-400" /> <span className="text-gradient">Settings</span></h1>
        <div className="space-y-8">
            <div className="glass-panel p-8 rounded-2xl">
                <h2 className="text-xl font-bold mb-6 dark:text-white">Profile Information</h2>
                <div className="grid md:grid-cols-2 gap-6">
                    <div><label className="block text-sm font-semibold mb-2 dark:text-white">Full Name</label><input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border dark:bg-navy-900 dark:text-white"/></div>
                    <div><label className="block text-sm font-semibold mb-2 dark:text-white">Email Address</label><input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 rounded-xl border dark:bg-navy-900 dark:text-white"/></div>
                </div>
            </div>
            <div className="glass-panel p-8 rounded-2xl">
                <h2 className="text-xl font-bold mb-6 dark:text-white">Route Safety</h2>
                <div className="space-y-6">
                    <div className="p-4 bg-slate-50/50 rounded-xl border dark:border-slate-700"><div className="flex justify-between mb-3"><label className="font-semibold dark:text-white">Minimum Safety Score</label><span className="text-blue-600 font-bold">{settings.minSafetyScore}%</span></div><input type="range" min="0" max="100" value={settings.minSafetyScore} onChange={(e) => setSettings({...settings, minSafetyScore: parseInt(e.target.value)})} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"/></div>
                    <div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><Moon size={18} /></div><div><span className="font-semibold block dark:text-white">Avoid Unlit Areas</span></div></div><input type="checkbox" checked={settings.avoidUnlitAreas} onChange={(e) => setSettings({...settings, avoidUnlitAreas: e.target.checked})} className="w-5 h-5"/></div>
                    <div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="p-2 bg-purple-50 rounded-lg text-purple-600"><Users size={18} /></div><div><span className="font-semibold block dark:text-white">Avoid Crowds</span></div></div><input type="checkbox" checked={settings.avoidCrowds} onChange={(e) => setSettings({...settings, avoidCrowds: e.target.checked})} className="w-5 h-5"/></div>
                </div>
            </div>
            <div className="flex justify-end gap-4 pb-10"><button onClick={handleSave} className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition">Save Changes</button></div>
        </div>
    </div>
  );
};


interface MapDashboardProps {
  startAddress: string;
  setStartAddress: (val: string) => void;
  setStartCoords: (coords: [number, number] | null) => void;
  endAddress: string;
  setEndAddress: (val: string) => void;
  setEndCoords: (coords: [number, number] | null) => void;
  handleRouteSearch: () => void;
  isSearching: boolean;
  foundRoutes: Route[];
  selectedRoute: Route | null;
  setSelectedRoute: (route: Route | null) => void;
  incidents: Incident[];
  settings: AppSettings;
  addSavedRoute: (route: Route) => void;
  isNavigating: boolean;
  handleStartNavigation: () => void;
  handleEndNavigation: () => void;
  currentUserPosition: [number, number] | null;
  transportMode: string;
  setTransportMode: (mode: string) => void;
  isLocating: boolean;
  handleUseCurrentLocation: () => void; 
}
const MapDashboard = ({
  startAddress, setStartAddress, setStartCoords,
  endAddress, setEndAddress, setEndCoords,
  handleRouteSearch, isSearching, foundRoutes,
  selectedRoute, setSelectedRoute, incidents,
  addSavedRoute, isNavigating, handleStartNavigation, handleEndNavigation, currentUserPosition,
  transportMode, setTransportMode, isLocating, handleUseCurrentLocation
}: MapDashboardProps) => {

  const transportModes = [
    { id: 'walking', icon: <Footprints size={18} />, label: 'Walk' },
    { id: 'bike', icon: <Bike size={18} />, label: 'Bike' },
    { id: 'car', icon: <Car size={18} />, label: 'Car' },
    { id: 'transit', icon: <Bus size={18} />, label: 'Transit' },
  ];

  return (
    <div className="h-full flex flex-col md:flex-row overflow-hidden relative z-10">
      
      {/* Sidebar */}
      <div className={`
          w-full md:w-[420px] bg-white/80 dark:bg-navy-900/90 backdrop-blur-xl border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700 
          flex flex-col h-[55%] md:h-full z-10 shadow-2xl transition-all duration-500 
          ${isNavigating ? 'hidden md:flex md:-translate-x-full md:absolute' : 'relative'}
      `}>
        <div className="shrink-0 p-6 md:p-8 border-b border-slate-100 dark:border-slate-700 bg-white/50 dark:bg-navy-900/50 z-20">
          <h2 className="text-2xl font-bold mb-4 md:mb-6 text-slate-900 dark:text-white">Plan Your Route</h2>
          <div className="space-y-3 relative">
            <div className="absolute left-[19px] top-[40px] bottom-[110px] w-0.5 bg-slate-200 dark:bg-slate-700 z-0 border-l-2 border-dashed border-slate-200 dark:border-slate-700"></div>

            <div className="relative z-30">
              <LocationSearchInput 
                  value={startAddress}
                  onChange={setStartAddress}
                  onSelect={setStartCoords}
                  placeholder="Starting Location"
                  icon={<div className="w-4 h-4 rounded-full border-[3px] border-slate-400 bg-white dark:bg-navy-800"></div>}
                  onUseCurrentLocation={handleUseCurrentLocation}
              />
            </div>

            <div className="relative z-20">
              <LocationSearchInput 
                  value={endAddress}
                  onChange={setEndAddress}
                  onSelect={setEndCoords}
                  placeholder="Destination"
                  icon={<MapPin size={20} className="text-blue-600 dark:text-blue-400 fill-blue-100 dark:fill-blue-900" />}
              />
            </div>
            
            <div className="grid grid-cols-4 gap-2 pt-2 relative z-10">
                {transportModes.map((mode) => (
                    <button key={mode.id} onClick={() => setTransportMode(mode.id)} className={`flex flex-col items-center justify-center py-2 rounded-xl border transition backdrop-blur-sm ${transportMode === mode.id ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-500 text-blue-700 dark:text-blue-300' : 'bg-white/50 dark:bg-navy-800/50 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-navy-800 text-slate-600 dark:text-slate-400'}`}>
                        {mode.icon}
                        <span className="text-[10px] font-bold mt-1 uppercase">{mode.label}</span>
                    </button>
                ))}
            </div>

            <div className="pt-2 relative z-10">
              <button onClick={handleRouteSearch} disabled={isSearching} className={`w-full py-3 bg-navy-900 dark:bg-blue-600 text-white rounded-xl text-base font-bold hover:bg-slate-800 dark:hover:bg-blue-700 transition shadow-lg shadow-slate-200 dark:shadow-none flex items-center justify-center gap-2 ${isSearching ? 'opacity-80 cursor-not-allowed' : ''}`}>
                {isSearching ? <><Loader2 className="animate-spin" size={20} /> Calculating Safe Path...</> : 'Find Safe Route'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-4 bg-slate-50/30 dark:bg-navy-900/30 custom-scrollbar relative">
          {foundRoutes.length > 0 ? (
            <>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 sticky top-0 bg-slate-50/95 dark:bg-navy-900/95 p-2 z-10 backdrop-blur">Recommended Routes</h3>
              {foundRoutes.map(route => (
                <div key={route.id} onClick={() => setSelectedRoute(route)} className={`group p-5 rounded-2xl border cursor-pointer transition-all shadow-sm hover:shadow-md relative overflow-hidden backdrop-blur-sm ${selectedRoute?.id === route.id ? 'bg-white/90 dark:bg-navy-800/90 border-blue-500 ring-1 ring-blue-500' : 'bg-white/70 dark:bg-navy-800/70 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500'}`}>
                  <div className={`absolute top-0 right-0 px-4 py-1.5 rounded-bl-2xl text-xs font-bold border-b border-l ${getSafetyColor(route.safetyScore)}`}>{route.safetyScore}% Safety Score</div>
                  <div className="mb-3 pr-20"><h3 className="font-bold text-lg text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{route.name}</h3></div>
                  <div className="flex items-center gap-6 text-sm text-slate-600 dark:text-slate-400 mb-3"><span className="flex items-center gap-1.5 font-medium"><div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600"></div> {route.distance}</span><span className="flex items-center gap-1.5 font-medium"><div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600"></div> {route.duration}</span></div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50/50 dark:bg-navy-900/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700">{route.description}</p>
                  {selectedRoute?.id === route.id && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 animate-in fade-in flex gap-2">
                        <button onClick={(e) => { e.stopPropagation(); handleStartNavigation(); }} disabled={isLocating} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-200 dark:shadow-none disabled:opacity-70 disabled:cursor-not-allowed">
                            {isLocating ? <Loader2 className="animate-spin" size={18} /> : <Navigation size={18} />} {isLocating ? 'Locating...' : 'Start Navigation'}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); addSavedRoute(route); }} className="px-4 py-3 bg-slate-100 dark:bg-navy-700 text-slate-600 dark:text-slate-200 rounded-xl font-bold flex items-center justify-center hover:bg-slate-200 dark:hover:bg-navy-600 transition" title="Download for Offline Use"><Download size={18} /></button>
                    </div>
                  )}
                </div>
              ))}
              <div className="h-12 md:hidden"></div>
            </>
          ) : (
            <div className="text-center text-slate-400 mt-12"><div className="w-20 h-20 bg-slate-100/50 dark:bg-navy-800/50 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm"><Navigation className="opacity-20 text-slate-600 dark:text-slate-300" size={40} /></div><p className="font-medium text-slate-500 dark:text-slate-400">Enter locations to find safe paths.</p></div>
          )}
        </div>
      </div>
      
      {/* Map Area */}
      <div className="flex-1 relative h-[45%] md:h-full bg-slate-100 dark:bg-slate-900 border-t md:border-t-0 border-slate-200 dark:border-slate-700">
          <LeafletMap incidents={incidents} selectedRoute={selectedRoute} isNavigating={isNavigating} currentPosition={currentUserPosition} />
          {isNavigating && selectedRoute && (
            <div className="absolute top-0 left-0 right-0 z-[500] p-4 animate-in slide-in-from-top-4 pointer-events-none">
                <div className="bg-navy-900/90 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between max-w-2xl mx-auto border border-slate-700 pointer-events-auto">
                    <div className="flex items-center gap-4"><div className="bg-green-500 p-3 rounded-xl"><CornerUpRight size={32} className="text-white" /></div><div><p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-0.5">Next Turn</p><h3 className="text-xl font-bold">Head Northeast</h3><p className="text-sm text-slate-300 mt-1">Then turn right in 200m</p></div></div>
                    <button onClick={handleEndNavigation} className="ml-4 px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/50 rounded-lg font-bold text-sm hover:bg-red-500/30 transition">End Trip</button>
                </div>
            </div>
          )}
          {!isNavigating && (<div className="absolute top-4 right-4 z-[400] flex flex-col gap-2"><button onClick={handleUseCurrentLocation} className="p-3 bg-white/90 dark:bg-navy-800/90 backdrop-blur-sm rounded-xl shadow-xl text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-navy-700 hover:text-blue-600 dark:hover:text-blue-400 transition" title="Locate Me">{isLocating ? <Loader2 className="animate-spin" size={20} /> : <Locate size={20} />}</button></div>)}
      </div>
    </div>
  );
};

// --- Dashboard Layout Wrapper ---
const DashboardLayout = ({ 
  children, currentPage, setCurrentPage, setSidebarOpen, sidebarOpen, handleLogout, darkMode, toggleTheme, isOnline, onSOSClick
}: { 
  children?: ReactNode, currentPage: Page, setCurrentPage: (p: Page) => void, setSidebarOpen: (o: boolean) => void, sidebarOpen: boolean, handleLogout: () => void, darkMode: boolean, toggleTheme: () => void, isOnline: boolean, incidents: Incident[], user: User | null, onSOSClick: () => void
}) => {
    return (
  <div className="flex h-screen bg-slate-50 dark:bg-navy-900 overflow-hidden font-sans transition-colors duration-300 relative">
    <AmbientBackground />
    <aside className={`fixed md:static inset-y-0 left-0 z-50 w-72 bg-white/90 dark:bg-navy-900/90 backdrop-blur-xl text-slate-900 dark:text-white transform transition-transform duration-300 ease-in-out shadow-2xl border-r border-slate-200/50 dark:border-white/5 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
      <div className="p-8 flex items-center justify-between"><div className="flex items-center gap-2.5 font-bold text-2xl tracking-tight"><Shield className="fill-blue-600 text-blue-600 dark:text-white" size={28} /> SafeWalk</div><button onClick={() => setSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white"><X /></button></div>
      <nav className="px-4 space-y-2 mt-4">
        {['map', 'safety_hub', 'offline', 'contacts', 'settings'].map(page => (
            <button key={page} onClick={() => {setCurrentPage(page as Page); setSidebarOpen(false)}} className={`w-full flex items-center gap-3.5 px-5 py-4 rounded-xl transition font-medium text-sm capitalize group ${currentPage === page ? 'bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-600/30 shadow' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'}`}>
                {page === 'map' && <MapIcon size={20}/>}{page === 'safety_hub' && <AlertTriangle size={20}/>}{page === 'offline' && <WifiOff size={20}/>}{page === 'contacts' && <Users size={20}/>}{page === 'settings' && <Settings size={20}/>} {page.replace('_', ' ')}
            </button>
        ))}
      </nav>
      <div className="absolute bottom-0 left-0 right-0 p-6 space-y-4 bg-gradient-to-t from-white dark:from-navy-900 via-white/80 dark:via-navy-900/80 to-transparent">
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${isOnline ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/30' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/30'}`}><div className="relative">{isOnline ? <Signal size={18} className="text-emerald-600 dark:text-emerald-400"/> : <SignalZero size={18} className="text-red-600 dark:text-red-400"/>}</div><div><p className={`text-xs font-bold uppercase tracking-wider ${isOnline ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>{isOnline ? 'System Online' : 'Offline Mode'}</p></div></div>
        <button onClick={toggleTheme} className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-navy-700 transition"><span className="text-sm font-medium flex items-center gap-2">{darkMode ? <Moon size={16}/> : <Sun size={16}/>} {darkMode ? 'Dark Mode' : 'Light Mode'}</span><div className={`w-10 h-5 rounded-full relative transition-colors ${darkMode ? 'bg-blue-600' : 'bg-slate-300'}`}><div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform duration-300 ${darkMode ? 'left-6' : 'left-1'}`}></div></div></button>
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition font-medium text-sm"><LogOut size={18} /> Sign Out</button>
      </div>
    </aside>
    <main className="flex-1 relative h-full overflow-hidden flex flex-col">
      <div className="md:hidden flex items-center justify-between p-4 bg-white/80 dark:bg-navy-900/80 backdrop-blur-md z-40 border-b border-slate-200 dark:border-white/5"><div className="flex items-center gap-2 font-bold text-xl text-slate-900 dark:text-white"><Shield className="fill-blue-600 text-blue-600 dark:text-white" size={24} /> SafeWalk</div><button onClick={() => setSidebarOpen(true)} className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg"><Menu size={24} /></button></div>
      <div className="flex-1 relative overflow-hidden">{children}</div>
      <div className="fixed bottom-6 right-6 z-50"><button onClick={onSOSClick} className="w-20 h-20 bg-red-600 rounded-full shadow-[0_0_30px_rgba(220,38,38,0.6)] flex items-center justify-center text-white font-bold animate-pulse hover:scale-110 transition duration-300 group overflow-hidden relative"><div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div><span className="relative z-10 text-xl font-black group-hover:hidden">SOS</span><PhoneCall className="relative z-10 hidden group-hover:block" size={32} /></button></div>
    </main>
  </div>
    );
};

const App = () => {
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [user, setUser] = useState<User | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [lang, setLang] = useState<Language>('en');

  // SOS STATE
  const [sosState, setSosState] = useState<'idle' | 'counting' | 'active'>('idle');
  const [countdown, setCountdown] = useState(5);
  const [simulatedCallIndex, setSimulatedCallIndex] = useState(0);

  // Data State
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [savedRoutes, setSavedRoutes] = useState<Route[]>([]);
  const [isNavigating, setIsNavigating] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({ minSafetyScore: 70, avoidUnlitAreas: true, avoidCrowds: false, travelMode: 'walking', notifications: { push: true, sms: true, email: false } });
  
  // Map State
  const [startAddress, setStartAddress] = useState('');
  const [startCoords, setStartCoords] = useState<[number, number] | null>(null);
  const [endAddress, setEndAddress] = useState('');
  const [endCoords, setEndCoords] = useState<[number, number] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [foundRoutes, setFoundRoutes] = useState<Route[]>([]);
  const [currentUserPosition, setCurrentUserPosition] = useState<[number, number] | null>([40.7580, -73.9855]);
  const [transportMode, setTransportMode] = useState('walking');
  const [isLocating, setIsLocating] = useState(false);

  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error' | 'info', visible: boolean}>({ msg: '', type: 'info', visible: false });
  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => { setToast({ msg, type, visible: true }); setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000); };

  useEffect(() => {
    const token = storage.getToken();
    if (token) { apiService.login('saved', 'user').then(u => { setUser(u); setCurrentPage('map'); }).catch(() => storage.clear()); }
    const saved = storage.getRoutes();
    if (saved.length > 0) setSavedRoutes(saved);
    apiService.getIncidents().then(setIncidents);
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) setDarkMode(true);
    if (navigator.geolocation) { navigator.geolocation.getCurrentPosition((pos) => { const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude]; setCurrentUserPosition(coords); setStartCoords(coords); setStartAddress("Current Location"); }, (_err) => console.log("Location access not granted on load")); }
    const handleOnline = () => { apiService.syncPendingData().then(success => { if(success) showToast("Offline data synced with server", "success"); }); };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  useEffect(() => { if (darkMode) document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark'); }, [darkMode]);

  // SOS Countdown Logic
  useEffect(() => {
    let timer: any;
    if (sosState === 'counting') {
        if (countdown > 0) {
            timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        } else {
            handleTriggerSOS();
        }
    }
    return () => clearTimeout(timer);
  }, [sosState, countdown]);

  useEffect(() => {
      if (sosState === 'active') {
          const interval = setInterval(() => { setSimulatedCallIndex(prev => prev + 1); }, 2000);
          return () => clearInterval(interval);
      }
  }, [sosState]);

  const handleSOSClick = () => { setSosState('counting'); setCountdown(5); };
  const handleTriggerSOS = () => { setSosState('active'); apiService.triggerSOS({ lat: currentUserPosition?.[0] || 0, lng: currentUserPosition?.[1] || 0 }); speak("Emergency alert sent. Calling emergency contacts."); };
  const handleCancelSOS = () => { setSosState('idle'); setCountdown(5); setSimulatedCallIndex(0); speak("Emergency cancelled."); };

const handleLocateMe = () => {
    setIsLocating(true);
    if (!navigator.geolocation) { showToast("Geolocation not supported", "error"); setIsLocating(false); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        let addressText = "Current Location";
        if (navigator.onLine) {
            try {
                const res = await fetch(`https://api.tomtom.com/search/2/reverseGeocode/${coords[0]},${coords[1]}.json?key=${TOMTOM_API_KEY}`);
                const data = await res.json();
                if (data.addresses && data.addresses.length > 0) addressText = data.addresses[0].address.freeformAddress;
            } catch (e) { console.error("Reverse geocoding error", e); }
        }
        setCurrentUserPosition(coords); setIsLocating(false); setStartAddress(addressText); setStartCoords(coords); showToast("Location updated: " + addressText, "success");
      },
      () => { showToast("Location access denied", "error"); setIsLocating(false); }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleRouteSearch = async () => {
    if (!startCoords || !endCoords) { showToast("Please select valid start and end locations.", "error"); return; }
    setIsSearching(true);
    
    try {
        if (!navigator.onLine) {
             setIsSearching(false); 
             showToast("Offline: Cannot calculate new routes.", "error"); 
             return;
        }

        // Map transport mode to TomTom API mode
        const modeMap: {[key: string]: string} = {
            'walking': 'pedestrian',
            'bike': 'bicycle',
            'car': 'car',
            'transit': 'bus' // Fallback for transit
        };
        const tomTomMode = modeMap[transportMode] || 'pedestrian';

        // Construct API URL
        const baseUrl = `https://api.tomtom.com/routing/1/calculateRoute/${startCoords[0]},${startCoords[1]}:${endCoords[0]},${endCoords[1]}/json`;
        const params = new URLSearchParams({
            key: TOMTOM_API_KEY,
            travelMode: tomTomMode,
            traffic: 'true',
            // computeBestOrder: 'true',
            routeRepresentation: 'polyline',
            sectionType: 'traffic',
            maxAlternatives: '2' // Get main + 2 alternatives
        });

        const response = await fetch(`${baseUrl}?${params.toString()}`);
        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
            const newRoutes: Route[] = data.routes.map((r: any, index: number) => {
                // Decode coordinates
                const coords = r.legs[0].points.map((p: any) => [p.latitude, p.longitude] as [number, number]);
                
                // Calculate distance/duration
                const meters = r.summary.lengthInMeters;
                const seconds = r.summary.travelTimeInSeconds;
                
                const distanceStr = meters > 1000 ? `${(meters/1000).toFixed(1)} km` : `${meters} m`;
                const durationStr = seconds > 3600 
                    ? `${Math.floor(seconds/3600)}h ${Math.floor((seconds%3600)/60)}m` 
                    : `${Math.floor(seconds/60)} min`;

                // Simulate Safety Score (Base + Variation)
                const baseScore = 85 + (index === 0 ? 5 : -5) + Math.floor(Math.random() * 10); 

                return {
                    id: `tomtom-${Date.now()}-${index}`,
                    name: index === 0 ? 'Fastest & Safest' : `Alternative Route ${index}`,
                    distance: distanceStr,
                    duration: durationStr,
                    safetyScore: Math.min(100, Math.max(0, baseScore)),
                    description: index === 0 ? "Optimal path with good lighting and traffic data." : "Alternative path, slightly longer.",
                    coordinates: coords,
                    start: startAddress,
                    end: endAddress,
                    color: index === 0 ? '#3b82f6' : '#94a3b8' // Blue for primary, gray for others
                };
            });

            setFoundRoutes(newRoutes);
            setSelectedRoute(newRoutes[0]); // Auto-select first route
            showToast(`Found ${newRoutes.length} routes.`, "success");
        } else {
            showToast("No routes found for this location.", "error");
        }

    } catch (e) { 
        console.error(e);
        setIsSearching(false); 
        showToast("Error calculating routes", "error"); 
    } finally {
        setIsSearching(false);
    }
  };

  const handleStartNavigation = () => { if (!selectedRoute) return; setIsNavigating(true); showToast("Navigation started. Stay safe!", "success"); speak(`Starting navigation to ${selectedRoute.end}. Head north.`); };
  const handleEndNavigation = () => { setIsNavigating(false); showToast("Navigation ended.", "info"); speak("You have arrived at your destination."); };
  const handleLogout = () => { storage.clear(); setUser(null); setCurrentPage('landing'); setSidebarOpen(false); };

  const renderPage = () => {
    switch(currentPage) {
      case 'landing': return <LandingView setCurrentPage={setCurrentPage} setDarkMode={setDarkMode} darkMode={darkMode} />;
      case 'login': return <LoginView setCurrentPage={setCurrentPage} setUser={setUser} showToast={showToast} lang={lang} setLang={setLang} />;
      case 'signup': return <SignupView setCurrentPage={setCurrentPage} setUser={setUser} showToast={showToast} />;
      default:
        return (
          <DashboardLayout currentPage={currentPage} setCurrentPage={setCurrentPage} setSidebarOpen={setSidebarOpen} sidebarOpen={isSidebarOpen} handleLogout={handleLogout} darkMode={darkMode} toggleTheme={() => setDarkMode(!darkMode)} isOnline={navigator.onLine} incidents={incidents} user={user} onSOSClick={handleSOSClick}>
            {currentPage === 'map' && (
               <MapDashboard startAddress={startAddress} setStartAddress={setStartAddress} setStartCoords={setStartCoords} endAddress={endAddress} setEndAddress={setEndAddress} setEndCoords={setEndCoords} handleRouteSearch={handleRouteSearch} isSearching={isSearching} foundRoutes={foundRoutes} selectedRoute={selectedRoute} setSelectedRoute={setSelectedRoute} incidents={incidents} settings={settings} addSavedRoute={(r) => { const newRoutes = [...savedRoutes, r]; setSavedRoutes(newRoutes); storage.saveRoutes(newRoutes); showToast("Route saved for offline use", "success"); }} isNavigating={isNavigating} handleStartNavigation={handleStartNavigation} handleEndNavigation={handleEndNavigation} currentUserPosition={currentUserPosition} transportMode={transportMode} setTransportMode={setTransportMode} isLocating={isLocating} handleUseCurrentLocation={handleLocateMe} />
            )}
            {currentPage === 'safety_hub' && <SafetyHubView incidents={incidents} setIncidents={setIncidents} showToast={showToast} />}
            {currentPage === 'offline' && <OfflineView savedRoutes={savedRoutes} showToast={showToast} setSelectedRoute={setSelectedRoute} setCurrentPage={setCurrentPage} />}
            {currentPage === 'contacts' && <ContactsView user={user} setUser={setUser} showToast={showToast} onSOSClick={handleSOSClick} />}
            {currentPage === 'settings' && <SettingsView user={user} settings={settings} setSettings={setSettings} updateUser={(u) => setUser(prev => prev ? ({...prev, ...u}) : null)} showToast={showToast} />}
          </DashboardLayout>
        );
    }
  };

  return (
    <>
      {renderPage()}
      {sosState !== 'idle' && (
          <div className="fixed inset-0 z-[9999] bg-red-600 text-white flex flex-col items-center justify-center animate-in fade-in duration-300 overflow-hidden">
             <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vmax] h-[100vmax] bg-red-500 rounded-full animate-ping opacity-20 duration-1000"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vmax] h-[80vmax] bg-red-500 rounded-full animate-ping delay-75 opacity-20 duration-1000"></div>
             </div>
             <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-6">
                 {sosState === 'counting' ? (
                     <>
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <h2 className="text-3xl font-bold uppercase tracking-widest opacity-80 mb-8 animate-pulse">Emergency Alert In</h2>
                            <div className="relative">
                                <span className="text-[12rem] md:text-[16rem] font-black leading-none tabular-nums tracking-tighter drop-shadow-2xl">
                                    {countdown}
                                </span>
                            </div>
                        </div>
                        <div className="w-full max-w-md mb-12">
                            <button onClick={handleCancelSOS} className="w-full py-6 bg-white text-red-600 rounded-3xl font-black text-2xl hover:bg-slate-100 transition shadow-[0_10px_40px_rgba(0,0,0,0.3)] transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3">
                                <X size={32} strokeWidth={3} /> CANCEL
                            </button>
                        </div>
                     </>
                 ) : (
                     <>
                        <div className="w-40 h-40 bg-white rounded-full flex items-center justify-center text-red-600 mb-8 animate-bounce shadow-2xl"><Siren size={80} /></div>
                        <h1 className="text-5xl md:text-6xl font-black mb-4 tracking-tighter text-center">SOS SENT</h1>
                        <p className="text-xl md:text-2xl opacity-90 mb-12 text-center max-w-2xl">Broadcasting live location to emergency services & contacts</p>
                        <div className="w-full max-w-2xl bg-red-800/40 backdrop-blur-xl rounded-3xl p-6 border border-white/20 mb-8 space-y-4 shadow-2xl">
                             {user?.emergencyContacts.map((contact, idx) => {
                                 const isCalling = idx === (simulatedCallIndex % (user.emergencyContacts.length || 1));
                                 return (
                                     <div key={contact.id} className={`flex items-center justify-between p-5 rounded-2xl transition-all duration-500 ${isCalling ? 'bg-white text-red-600 scale-105 shadow-xl' : 'bg-red-900/40 text-white/70'}`}>
                                         <div className="flex items-center gap-4"><div className={`p-3 rounded-full ${isCalling ? 'bg-red-100 text-red-600' : 'bg-red-900/50'}`}><PhoneForwarded size={24} className={isCalling ? 'animate-pulse' : ''}/></div><div className="text-left"><p className="font-bold text-lg">{contact.name}</p><p className="text-sm opacity-80">{contact.relationship}</p></div></div><span className="text-sm font-bold uppercase tracking-wider">{isCalling ? 'Calling...' : idx < simulatedCallIndex ? 'Notified' : 'Pending'}</span>
                                     </div>
                                 )
                             })}
                             {(!user || user.emergencyContacts.length === 0) && <div className="text-center p-6"><p className="font-bold text-xl">Calling Local Authorities (911)...</p></div>}
                        </div>
                        <button onClick={handleCancelSOS} className="px-10 py-4 bg-red-800 hover:bg-red-900 text-white rounded-2xl font-bold text-lg transition border-2 border-red-400/50 hover:border-white/50 shadow-xl">I AM SAFE - CANCEL ALERT</button>
                     </>
                 )}
             </div>
          </div>
      )}
      {toast.visible && (<div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[1000] px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${toast.type === 'success' ? 'bg-emerald-500 text-white' : toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-navy-800 text-white'}`}>{toast.type === 'success' ? <CheckCircle size={18} /> : toast.type === 'error' ? <AlertTriangle size={18} /> : <Bell size={18} />}<span className="font-bold text-sm">{toast.msg}</span></div>)}
    </>
  );
};

export default App;