import React, { useState, useEffect, useRef } from 'react';
import { MapPin, TreePine, TriangleAlert as AlertTriangle, Cloud, TrendingUp, Calendar, UserCircle, CheckCircle2, ExternalLink, Navigation } from 'lucide-react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import type { User, Field } from '../types';

interface OutletContext {
  mapsLoaded: boolean;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { mapsLoaded } = useOutletContext<OutletContext>();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [user, setUser] = useState<User>({
    id: '',
    name: '',
    email: '',
    phone: '',
    farmName: '',
  });

  const calculateProfileCompletion = (user: User): number => {
    let completed = 0;
    const totalFields = 7;

    // Required fields (4)
    if (user.name?.trim()) completed++;
    if (user.email?.trim()) completed++;
    if (user.phone?.trim()) completed++;
    if (user.farmName?.trim()) completed++;

    // Optional fields (3)
    if (user.avatar?.trim()) completed++;
    if (user.khasraNumber?.trim()) completed++;
    if (user.khataNumber?.trim()) completed++;

    return Math.round((completed / totalFields) * 100);
  };

  const profileCompletion = calculateProfileCompletion(user);

  useEffect(() => {
    if (!mapsLoaded || !mapRef.current || fields.length === 0) {
      return;
    }

    const googleMaps = (window as any).google;
    if (!googleMaps?.maps) {
      return;
    }

    // Calculate center based on all fields
    const fieldsWithCoords = fields.filter(f => f.latitude && f.longitude);
    if (fieldsWithCoords.length === 0) {
      return;
    }

    const avgLat = fieldsWithCoords.reduce((sum, f) => sum + (f.latitude || 0), 0) / fieldsWithCoords.length;
    const avgLng = fieldsWithCoords.reduce((sum, f) => sum + (f.longitude || 0), 0) / fieldsWithCoords.length;

    const map = new googleMaps.maps.Map(mapRef.current, {
      center: { lat: avgLat, lng: avgLng },
      zoom: 12,
      mapTypeId: 'satellite',
    });

    mapInstanceRef.current = map;

    // Add markers for all fields
    fieldsWithCoords.forEach((field) => {
      const marker = new googleMaps.maps.Marker({
        position: { lat: field.latitude!, lng: field.longitude! },
        map,
        title: field.name,
        label: {
          text: field.name.charAt(0),
          color: 'white',
          fontSize: '14px',
          fontWeight: 'bold',
        },
      });

      const infoWindow = new googleMaps.maps.InfoWindow({
        content: `
          <div style="padding: 8px;">
            <h3 style="font-weight: 600; margin-bottom: 4px;">${field.name}</h3>
            <p style="font-size: 12px; color: #666;">Area: ${field.area} kanal</p>
            <p style="font-size: 12px; color: #666;">Status: ${field.healthStatus}</p>
          </div>
        `,
      });

      marker.addListener('click', () => {
        setSelectedFieldId(field.id);
        infoWindow.open(map, marker);
      });
    });
  }, [mapsLoaded, fields]);

  const handleViewField = (field: Field) => {
    if (field.latitude && field.longitude && mapInstanceRef.current) {
      mapInstanceRef.current.panTo({ lat: field.latitude, lng: field.longitude });
      mapInstanceRef.current.setZoom(16);
      setSelectedFieldId(field.id);
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'Excellent':
        return 'text-green-600 bg-green-50';
      case 'Good':
        return 'text-blue-600 bg-blue-50';
      case 'Fair':
        return 'text-yellow-600 bg-yellow-50';
      case 'Poor':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const stats = [
    {
      title: 'Total Fields',
      value: fields.length,
      icon: MapPin,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Healthy Trees',
      value: '0',
      icon: TreePine,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Active Alerts',
      value: 0,
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Weather',
      value: 'N/A',
      icon: Cloud,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Calendar className="w-4 h-4" />
          <span>{new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</span>
        </div>
      </div>

      {/* Orchard Map Overview - First Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Orchard Map Overview</h2>
            <p className="text-sm text-gray-500">All saved fields and locations</p>
          </div>
          <Button onClick={() => navigate('/fields')} size="sm" variant="outline">
            <MapPin className="w-4 h-4 mr-2" />
            View All Fields
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Section */}
          <div className="lg:col-span-2 relative">
            {fields.length === 0 ? (
              <div className="w-full h-96 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No Orchards Mapped Yet</h3>
                  <p className="text-sm text-gray-500 mb-4">Your saved orchards will appear here on the map</p>
                  <Button onClick={() => navigate('/fields')} size="sm">
                    <MapPin className="w-4 h-4 mr-2" />
                    Create Your First Orchard
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div
                  ref={mapRef}
                  className="w-full h-96 rounded-lg border border-gray-200 bg-gray-100"
                />
                {!import.meta.env.VITE_GOOGLE_API_KEY && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                    <p className="text-sm text-gray-500">Map requires Google Maps API key</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Fields List */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            <h3 className="text-sm font-semibold text-gray-700 sticky top-0 bg-white pb-2">
              Saved Fields ({fields.length})
            </h3>
            {fields.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MapPin className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-600 mb-1">No fields saved yet</p>
                <p className="text-xs text-gray-500 mb-4">Create your first orchard to see it here</p>
                <Button onClick={() => navigate('/fields')} size="sm">
                  Create Field
                </Button>
              </div>
            ) : (
              fields.map((field) => (
              <div
                key={field.id}
                className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                  selectedFieldId === field.id
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-green-300 bg-white'
                }`}
                onClick={() => handleViewField(field)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-gray-900 text-sm">{field.name}</h4>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getHealthStatusColor(field.healthStatus)}`}>
                    {field.healthStatus}
                  </span>
                </div>
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3" />
                    <span>{field.location}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Area: {field.area} kanal</span>
                    <span>{field.cropStage}</span>
                  </div>
                  {field.latitude && field.longitude && (
                    <div className="flex items-center gap-1 text-blue-600">
                      <Navigation className="w-3 h-3" />
                      <span>{field.latitude.toFixed(4)}, {field.longitude.toFixed(4)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
            )}
          </div>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Profile Completion Card */}
      {profileCompletion < 100 && (
        <Card className="p-6 bg-linear-to-r from-green-50 to-blue-50 border-2 border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-start space-x-4 flex-1">
              <div className="p-3 bg-white rounded-lg shadow-sm">
                <UserCircle className="w-8 h-8 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-gray-900">Complete Your Profile</h3>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                    {profileCompletion}% Complete
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  {profileCompletion < 100 
                    ? 'Add more information to unlock all features and get personalized recommendations.'
                    : 'Your profile is complete!'}
                </p>
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Profile Progress</span>
                    <span className="font-medium">{profileCompletion}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-linear-to-r from-green-500 to-blue-500 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${profileCompletion}%` }}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {user.name && <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="w-3 h-3" /> Name</span>}
                  {user.email && <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="w-3 h-3" /> Email</span>}
                  {user.phone && <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="w-3 h-3" /> Phone</span>}
                  {user.farmName && <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="w-3 h-3" /> Farm Name</span>}
                  {user.avatar && <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="w-3 h-3" /> Photo</span>}
                  {user.khasraNumber && <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="w-3 h-3" /> Khasra</span>}
                  {user.khataNumber && <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="w-3 h-3" /> Khata</span>}
                  {!user.avatar && <span className="text-gray-400">Photo</span>}
                  {!user.khasraNumber && <span className="text-gray-400">Khasra</span>}
                  {!user.khataNumber && <span className="text-gray-400">Khata</span>}
                </div>
              </div>
            </div>
            <div>
              <Button 
                onClick={() => navigate('/profile')}
                size="sm"
                className="whitespace-nowrap"
              >
                Complete Profile
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Production Overview</h3>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-gray-600">Production Chart</p>
              <p className="text-sm text-gray-500">Chart visualization would go here</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Growth Analytics</h3>
            <TreePine className="w-5 h-5 text-green-600" />
          </div>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TreePine className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-gray-600">Growth Analytics</p>
              <p className="text-sm text-gray-500">Analytics visualization would go here</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">North Orchard irrigation completed</p>
              <p className="text-xs text-gray-500">2 hours ago</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Pest control alert in East Field</p>
              <p className="text-xs text-gray-500">4 hours ago</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Weather forecast updated</p>
              <p className="text-xs text-gray-500">6 hours ago</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;