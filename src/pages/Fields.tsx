
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { kml as kmlToGeoJSON } from '@tmcw/togeojson';
import { Plus, Search, ListFilter as Filter, X } from 'lucide-react';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import type { Field } from '../types';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';



const soilOptions = [
  {
    name: 'Sandy',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&q=60',
  },
  {
    name: 'Sandy Clay',
    image: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=600&q=60',
  },
  {
    name: 'Sandy Loam',
    image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=600&q=60',
  },
  {
    name: 'Silt Loam',
    image: 'https://images.unsplash.com/photo-1476041800959-2f6bb412c8ce?auto=format&fit=crop&w=600&q=60',
  },
  {
    name: 'Heavy Clay',
    image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=600&q=60',
  },
  {
    name: 'Silt Clay',
    image: 'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?auto=format&fit=crop&w=600&q=60',
  },
];

const orchardTypes = ['High Density', 'Medium Density', 'Traditional', 'All'];
const KANAL_SQM = 505.857;

type AppleVariety = {
  name: string;
  role: 'pollinator' | 'main' | 'both';
  description: string;
};

const traditionalVarieties: AppleVariety[] = [
  { name: 'Red Delicious / Delicious', role: 'both', description: '🌸 Pollinator + Main variety' },
  { name: 'American Apple', role: 'main', description: '🌳 Main (needs pollinator)' },
  { name: 'Maharaji', role: 'main', description: '🌳 Main (needs pollinator)' },
  { name: 'Ambri', role: 'both', description: '🌸 Pollinator + Main variety' },
  { name: 'Kashmir Golden / Golden Delicious', role: 'pollinator', description: '🌸 Excellent Pollinator' },
  { name: 'Hazratbali', role: 'main', description: '🌳 Main (needs pollinator)' },
  { name: 'Razakwari / Chemora', role: 'main', description: '🌳 Main (needs pollinator)' },
  { name: 'Kullu Delicious', role: 'main', description: '🌳 Main (needs pollinator)' },
  { name: 'Kinnaur', role: 'main', description: '🌳 Main (needs pollinator)' },
];

const highDensityVarieties: AppleVariety[] = [
  { name: 'Jeromine', role: 'main', description: '🌳 Main (needs pollinator)' },
  { name: 'King Roat', role: 'main', description: '🌳 Main (needs pollinator)' },
  { name: 'Gala Scarlet / Redlum Gala', role: 'both', description: '🌸 Pollinator + Main variety' },
  { name: 'Red Velox', role: 'main', description: '🌳 Main (needs pollinator)' },
  { name: 'Scarlet Spur-II', role: 'pollinator', description: '🌸 Good Pollinator' },
  { name: 'Super Chief', role: 'both', description: '🌸 Pollinator + Main variety' },
  { name: 'Auvi Fuji', role: 'main', description: '🌳 Main (needs pollinator)' },
  { name: 'Pink Lady', role: 'main', description: '🌳 Main (needs pollinator)' },
];

type VarietyTreeRow = {
  variety: string;
  totalTrees: string;
  orchardType?: string;
};

type TreeTag = {
  id: string;
  name: string;
  variety: string;
  rowNumber: string;
  latitude: number;
  longitude: number;
};

type OrchardForm = {
  name: string;
  orchardType: string;
  areaKanal: string;
  totalTrees: string;
  numberOfRows: string;
  treesPerRow: string;
  ageYears: string;
  pollinatorType: string;
  varietyTrees: VarietyTreeRow[];
  rows: Array<{ rowId: string; varieties: Array<{ variety: string; trees: string }> }>;
  soilType: string;
  unknownSoil: boolean;
  pincode: string;
  district: string;
  tehsil: string;
  state: string;
  region: string;
  country: string;
  zone: string;
  fullAddress: string;
  latitude?: number;
  longitude?: number;
  boundaryPath: Array<{ lat: number; lng: number }>;
  mapAreaKanal?: number;
  treeTags: TreeTag[];
};

const createInitialForm = (): OrchardForm => ({
  name: '',
  orchardType: '',
  areaKanal: '',
  totalTrees: '',
  numberOfRows: '',
  treesPerRow: '',
  ageYears: '',
  pollinatorType: '',
  varietyTrees: [{ variety: '', totalTrees: '' }],
  rows: [],
  soilType: '',
  unknownSoil: false,
  pincode: '',
  district: '',
  tehsil: '',
  state: '',
  region: '',
  country: '',
  zone: '',
  fullAddress: '',
  latitude: undefined,
  longitude: undefined,
  boundaryPath: [],
  mapAreaKanal: undefined,
  treeTags: [],
});

const Fields = () => {
          // Row/variety handlers from Fields2
          const handleAddRow = () => {
            setFormData((prev) => ({
              ...prev,
              rows: [...(prev.rows || []), { rowId: String((prev.rows?.length || 0) + 1), varieties: [{ variety: '', trees: '' }] }],
            }));
          };

          const handleRemoveRow = (rowIndex: number) => {
            setFormData((prev) => ({
              ...prev,
              rows: (prev.rows || []).filter((_: any, idx: number) => idx !== rowIndex),
            }));
          };

          const handleAddVarietyToRow = (rowIndex: number) => {
            setFormData((prev) => ({
              ...prev,
              rows: (prev.rows || []).map((row: { rowId: string; varieties: Array<{ variety: string; trees: string }> }, idx: number) =>
                idx === rowIndex
                  ? { ...row, varieties: [...row.varieties, { variety: '', trees: '' }] }
                  : row
              ),
            }));
          };

          const handleRemoveVarietyFromRow = (rowIndex: number, varietyIndex: number) => {
            setFormData((prev) => ({
              ...prev,
              rows: (prev.rows || []).map((row: { rowId: string; varieties: Array<{ variety: string; trees: string }> }, idx: number) =>
                idx === rowIndex
                  ? { ...row, varieties: row.varieties.filter((_: any, vIdx: number) => vIdx !== varietyIndex) }
                  : row
              ),
            }));
          };

          const handleRowVarietyChange = (rowIndex: number, varietyIndex: number, field: 'variety' | 'trees', value: string) => {
            setFormData((prev) => ({
              ...prev,
              rows: (prev.rows || []).map((row: { rowId: string; varieties: Array<{ variety: string; trees: string }> }, rIdx: number) =>
                rIdx === rowIndex
                  ? {
                      ...row,
                      varieties: row.varieties.map((v: { variety: string; trees: string }, vIdx: number) =>
                        vIdx === varietyIndex ? { ...v, [field]: value } : v
                      ),
                    }
                  : row
              ),
            }));
          };
        // Edit logic integration
        const [editingFieldId, setEditingFieldId] = useState<string | null>(null);

        // Populate all form fields for edit, using details if present, else fallback to top-level field values
        const populateFormForEdit = (field: Field) => {
          const details = (field as any).details ?? null;
          if (details) {
            setFormData((prev) => ({
              ...prev,
              ...details,
              name: details.name || field.name || prev.name,
              orchardType: details.orchardType || prev.orchardType,
              areaKanal: details.areaKanal || field.area?.toString() || prev.areaKanal,
              ageYears: details.ageYears || prev.ageYears,
              pollinatorType: details.pollinatorType || prev.pollinatorType || '',
              varietyTrees: (details.varietyTrees && details.varietyTrees.length > 0) ? details.varietyTrees : (prev.varietyTrees && prev.varietyTrees.length > 0 ? prev.varietyTrees : [{ variety: '', totalTrees: '' }]),
              rows: (details.rows && details.rows.length > 0) ? details.rows : (prev.rows && prev.rows.length > 0 ? prev.rows : []),
              soilType: details.soilType || field.soilType || prev.soilType,
              unknownSoil: details.unknownSoil ?? prev.unknownSoil,
              pincode: details.pincode || prev.pincode,
              district: details.district || field.location || prev.district || '',
              tehsil: details.tehsil || prev.tehsil || '',
              state: details.state || prev.state || '',
              region: details.region || prev.region || '',
              country: details.country || prev.country || '',
              zone: details.zone || prev.zone || '',
              fullAddress: details.fullAddress || prev.fullAddress || '',
              latitude: details.latitude ?? field.latitude ?? prev.latitude,
              longitude: details.longitude ?? field.longitude ?? prev.longitude,
              boundaryPath: details.boundaryPath?.length ? details.boundaryPath : (field.boundaryPath ?? prev.boundaryPath),
              mapAreaKanal: details.mapAreaKanal ?? prev.mapAreaKanal,
              treeTags: (details.treeTags && details.treeTags.length > 0) ? details.treeTags : (prev.treeTags && prev.treeTags.length > 0 ? prev.treeTags : []),
            }));
          } else {
            setFormData((prev) => ({
              ...prev,
              name: field.name || prev.name,
              orchardType: prev.orchardType,
              areaKanal: field.area?.toString() ?? prev.areaKanal,
              ageYears: prev.ageYears,
              pollinatorType: prev.pollinatorType || '',
              varietyTrees: (prev.varietyTrees && prev.varietyTrees.length > 0) ? prev.varietyTrees : [{ variety: '', totalTrees: '' }],
              rows: (prev.rows && prev.rows.length > 0) ? prev.rows : [],
              soilType: field.soilType || prev.soilType,
              unknownSoil: prev.unknownSoil,
              pincode: prev.pincode,
              district: field.location || prev.district || '',
              tehsil: prev.tehsil || '',
              state: prev.state || '',
              region: prev.region || '',
              country: prev.country || '',
              zone: prev.zone || '',
              fullAddress: prev.fullAddress || '',
              latitude: field.latitude ?? prev.latitude,
              longitude: field.longitude ?? prev.longitude,
              boundaryPath: field.boundaryPath ?? prev.boundaryPath,
              mapAreaKanal: prev.mapAreaKanal,
              treeTags: (prev.treeTags && prev.treeTags.length > 0) ? prev.treeTags : [],
            }));
          }
        };

        const openWizardForEdit = (field: Field) => {
          setEditingFieldId(field.id);
          populateFormForEdit(field);
          setWizardOpen(true);
          setWizardStep(1);
        };

        const handleUpdateField = async () => {
          if (!session?.user || !editingFieldId) return;
          setFieldsError(null);
          let fieldLat = formData.latitude ?? 33.7782;
          let fieldLng = formData.longitude ?? 76.5762;
          if (formData.boundaryPath && formData.boundaryPath.length > 0) {
            let lat = 0, lng = 0;
            formData.boundaryPath.forEach(point => {
              lat += point.lat;
              lng += point.lng;
            });
            fieldLat = lat / formData.boundaryPath.length;
            fieldLng = lng / formData.boundaryPath.length;
          }
          const payload = {
            name: formData.name || 'Orchard',
            area: Number(formData.areaKanal) || 0,
            soil_type: formData.soilType || 'Unknown',
            crop_stage: 'Growing',
            health_status: 'Good',
            location: formData.district || formData.zone || 'Unknown',
            planted_date: new Date().toISOString().slice(0, 10),
            latitude: fieldLat,
            longitude: fieldLng,
            boundary_path: formData.boundaryPath.length > 0 ? formData.boundaryPath : null,
            details: formData,
          };
          const { data, error } = await supabase
            .from('fields')
            .update(payload)
            .eq('id', editingFieldId)
            .select('id, name, area, soil_type, crop_stage, health_status, location, planted_date, latitude, longitude, boundary_path, details')
            .single();
          if (error) {
            setFieldsError(error.message);
            return;
          }
          if (data) {
            const updated: Field = {
              id: data.id,
              name: data.name,
              area: data.area ?? 0,
              soilType: data.soil_type ?? 'Unknown',
              cropStage: data.crop_stage ?? 'Growing',
              healthStatus: data.health_status ?? 'Good',
              location: data.location ?? 'Unknown',
              plantedDate: data.planted_date ?? '',
              latitude: data.latitude ?? undefined,
              longitude: data.longitude ?? undefined,
              boundaryPath: data.boundary_path ?? undefined,
              details: formData,
            };
            setFields((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
          }
          resetWizard();
        };
      // Ensure toGeoJSON is loaded in the browser
      useEffect(() => {
        if (!(window as any).toGeoJSON) {
          const script = document.createElement('script');
          script.src = '/toGeoJSON.js';
          script.async = true;
          document.body.appendChild(script);
        }
      }, []);

    // Handler for deleting a field
    const handleDeleteField = async (field: Field) => {
      if (!window.confirm(`Are you sure you want to delete the field "${field.name}"?`)) return;
      const { error } = await supabase.from('fields').delete().eq('id', field.id);
      if (!error) {
        setFields((prev) => prev.filter((f) => f.id !== field.id));
      } else {
        alert('Failed to delete field.');
      }
    };
  const { session } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [fields, setFields] = useState<Field[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [fieldsError, setFieldsError] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [soilGuideOpen, setSoilGuideOpen] = useState(false);
  const [formData, setFormData] = useState<OrchardForm>(createInitialForm());
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeError, setPincodeError] = useState<string | null>(null);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [mapsError, setMapsError] = useState<string | null>(null);
  const [taggingMode, setTaggingMode] = useState(false);
  const [tagFormOpen, setTagFormOpen] = useState(false);
  const [pendingTagLocation, setPendingTagLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
  const [tagFormData, setTagFormData] = useState({
    name: '',
    variety: '',
    rowNumber: '',
  });

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const polygonRef = useRef<any>(null);
  const drawingManagerRef = useRef<any>(null);
  const kmlLayerRef = useRef<any>(null);
  const kmlObjectUrlRef = useRef<string | null>(null);
  const treeMarkersRef = useRef<any[]>([]);
  const taggingModeRef = useRef(false);

  const apiKey =
    (import.meta.env.VITE_GOOGLE_API_KEY as string | undefined) || '';

  const varietyPalette = ['#22c55e', '#f97316', '#3b82f6', '#e11d48', '#a855f7', '#14b8a6'];

  const getVarietyColor = (variety: string) => {
    if (!variety) {
      return '#6b7280';
    }

    const hash = variety.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return varietyPalette[hash % varietyPalette.length];
  };

  const getAvailableVarieties = (): AppleVariety[] => {
    if (!formData.orchardType) {
      return [...traditionalVarieties, ...highDensityVarieties];
    }
    if (formData.orchardType === 'Traditional') {
      return traditionalVarieties;
    }
    if (formData.orchardType === 'High Density') {
      return highDensityVarieties;
    }
    return [...traditionalVarieties, ...highDensityVarieties];
  };

  const getPollinatorsForOrchard = (): AppleVariety[] => {
    return getAvailableVarieties().filter((v) => v.role === 'pollinator' || v.role === 'both');
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'Excellent':
        return 'bg-green-100 text-green-800';
      case 'Good':
        return 'bg-blue-100 text-blue-800';
      case 'Fair':
        return 'bg-yellow-100 text-yellow-800';
      case 'Poor':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredFields = useMemo(() => {
    return fields.filter(
      (field) =>
        field.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        field.location.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [fields, searchTerm]);

  useEffect(() => {
    if (formData.unknownSoil) {
      setFormData((prev) => ({ ...prev, soilType: 'Unknown' }));
    }
  }, [formData.unknownSoil]);

  useEffect(() => {
    taggingModeRef.current = taggingMode;
  }, [taggingMode]);

  useEffect(() => {
    const loadFields = async () => {
      if (!session?.user) {
        setFields([]);
        setFieldsLoading(false);
        return;
      }

      setFieldsLoading(true);
      setFieldsError(null);

      const { data, error } = await supabase
        .from('fields')
        .select(
          'id, name, area, soil_type, crop_stage, health_status, location, planted_date, latitude, longitude, boundary_path, details'
        )
        .eq('user_id', session.user.id);

      if (error) {
        setFieldsError(error.message);
        setFieldsLoading(false);
        return;
      }

      const mappedFields: Field[] = (data ?? []).map((row: any) => ({
        id: row.id,
        name: row.name,
        area: row.area ?? 0,
        soilType: row.soil_type ?? 'Unknown',
        cropStage: row.crop_stage ?? 'Growing',
        healthStatus: row.health_status ?? 'Good',
        location: row.location ?? 'Unknown',
        plantedDate: row.planted_date ?? '',
        latitude: row.latitude ?? undefined,
        longitude: row.longitude ?? undefined,
        boundaryPath: row.boundary_path ?? undefined,
        details: row.details ?? undefined,
      }));

      setFields(mappedFields);
      setFieldsLoading(false);
    };

    loadFields();
  }, [session?.user]);

  useEffect(() => {
    if (formData.pincode.trim().length !== 6) {
      setPincodeError(null);
      return;
    }

    const controller = new AbortController();
    const loadDistrict = async () => {
      setPincodeLoading(true);
      setPincodeError(null);
      try {
        const response = await fetch(
          `https://api.postalpincode.in/pincode/${formData.pincode}`,
          { signal: controller.signal }
        );
        const data = await response.json();
        const postOffice = data?.[0]?.PostOffice?.[0];
        if (postOffice?.District) {
          setFormData((prev) => ({
            ...prev,
            district: postOffice.District ?? prev.district,
            state: postOffice.State ?? prev.state,
            country: postOffice.Country ?? prev.country,
            region: postOffice.Region ?? postOffice.Division ?? prev.region,
            tehsil: postOffice.Taluk ?? postOffice.Block ?? prev.tehsil,
            zone: postOffice.Circle ?? prev.zone,
          }));
        } else {
          setPincodeError('No district found for this pincode.');
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setPincodeError('Unable to fetch district.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setPincodeLoading(false);
        }
      }
    };

    loadDistrict();

    return () => controller.abort();
  }, [formData.pincode]);

  useEffect(() => {
    if (!wizardOpen || wizardStep !== 4 || mapsLoaded || mapsError) {
      return;
    }

    if (!apiKey) {
      setMapsError('Missing Google Maps API key.');
      return;
    }

    const existingScript = document.querySelector('script[data-google-maps]');
    if (existingScript) {
      if ((window as Window & { google?: any }).google?.maps) {
        setMapsLoaded(true);
      }
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=drawing,geometry`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = 'true';
    script.onload = () => setMapsLoaded(true);
    script.onerror = () => setMapsError('Failed to load Google Maps.');
    document.head.appendChild(script);
  }, [apiKey, mapsError, mapsLoaded, wizardOpen, wizardStep]);

  useEffect(() => {
    if (!wizardOpen || wizardStep !== 4 || !mapsLoaded || !mapContainerRef.current) {
      return;
    }

    if (mapInstanceRef.current) {
      return;
    }

    const googleMaps = (window as Window & { google?: any }).google;
    if (!googleMaps?.maps) {
      return;
    }

    const boundaryCenter = formData.boundaryPath[0];
    const center = boundaryCenter
      ? { lat: boundaryCenter.lat, lng: boundaryCenter.lng }
      : { lat: 33.7782, lng: 76.5762 };

    const map = new googleMaps.maps.Map(mapContainerRef.current, {
      center,
      zoom: 13,
      mapTypeControl: true,
      mapTypeControlOptions: {
        position: googleMaps.maps.ControlPosition.TOP_LEFT,
        mapTypeIds: ['roadmap', 'satellite'],
      },
      streetViewControl: false,
    });

    mapInstanceRef.current = map;

    map.addListener('click', (event: any) => {
      const position = event?.latLng;
      if (!position) {
        return;
      }

      // Debug: Log click position and boundary
      console.log('Map clicked at:', position.lat(), position.lng());
      console.log('Current boundaryPath:', formData.boundaryPath);
      // Draw a debug marker for every click
      new googleMaps.maps.Marker({
        position: { lat: position.lat(), lng: position.lng() },
        map: mapInstanceRef.current,
        icon: {
          path: googleMaps.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: '#f00',
          fillOpacity: 0.7,
          strokeWeight: 1,
          strokeColor: '#fff',
        },
      });
      // Tree tagging inside the boundary is now handled by the polygon click event
    });

    const drawingManager = new googleMaps.maps.drawing.DrawingManager({
      drawingMode: null,
      drawingControl: true,
      drawingControlOptions: {
        position: googleMaps.maps.ControlPosition.TOP_CENTER,
        drawingModes: ['polygon'],
      },
      polygonOptions: {
        fillColor: '#22c55e',
        fillOpacity: 0.2,
        strokeColor: '#16a34a',
        strokeWeight: 2,
        editable: true,
      },
    });

    drawingManager.setMap(map);
    drawingManagerRef.current = drawingManager;

    // Add Auto Detect Location custom control
    const autoDetectButton = document.createElement('button');
    autoDetectButton.textContent = 'Auto Detect';
    autoDetectButton.className = 'bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg shadow-md border border-gray-300 cursor-pointer m-2.5';
    autoDetectButton.onclick = () => {
      if (!navigator.geolocation) {
        return;
      }
      navigator.geolocation.getCurrentPosition((position) => {
        map.panTo({ lat: position.coords.latitude, lng: position.coords.longitude });
        map.setZoom(16);
      });
    };
    map.controls[googleMaps.maps.ControlPosition.TOP_RIGHT].push(autoDetectButton);

    googleMaps.maps.event.addListener(drawingManager, 'overlaycomplete', (event: any) => {
      if (event.type !== 'polygon') {
        return;
      }

      if (polygonRef.current) {
        polygonRef.current.setMap(null);
      }

      polygonRef.current = event.overlay;
      const path = event.overlay.getPath();
      const points: { lat: number; lng: number }[] = path.getArray().map((point: any) => ({
        lat: point.lat(),
        lng: point.lng(),
      }));

      const areaSqm = googleMaps.maps.geometry.spherical.computeArea(path);
      const areaKanal = areaSqm / KANAL_SQM;

      // --- Automatic tree tagging logic ---
      function pointInPolygon(point: { lat: number; lng: number }, polygon: { lat: number; lng: number }[]) {
        // Ray-casting algorithm
        let x = point.lng, y = point.lat;
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
          let xi = polygon[i].lng, yi = polygon[i].lat;
          let xj = polygon[j].lng, yj = polygon[j].lat;
          let intersect = ((yi > y) !== (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi + 0.0000001) + xi);
          if (intersect) inside = !inside;
        }
        return inside;
      }

      let autoTreeTags: any[] = [];
      const rows = (formData.rows && formData.rows.length > 0) ? formData.rows : [];
      if (rows.length > 0 && points.length > 2) {
        // Get bounding box
        let minLat = Math.min(...points.map((p) => p.lat));
        let maxLat = Math.max(...points.map((p) => p.lat));
        let minLng = Math.min(...points.map((p) => p.lng));
        let maxLng = Math.max(...points.map((p) => p.lng));
        // For each row, distribute trees evenly between minLng and maxLng, and rows between minLat and maxLat
        for (let r = 0; r < rows.length; r++) {
          const row = rows[r];
          const nTrees = row.varieties.reduce((sum, v) => sum + (parseInt(v.trees) || 0), 0);
          // For each variety in the row
          let treeIdx = 0;
          for (let vIdx = 0; vIdx < row.varieties.length; vIdx++) {
            const v = row.varieties[vIdx];
            const n = parseInt(v.trees) || 0;
            for (let t = 0; t < n; t++) {
              // Evenly space along the row (lat axis)
              const lat = minLat + (maxLat - minLat) * (r + 0.5) / rows.length;
              // Evenly space along the row (lng axis)
              const lng = minLng + (maxLng - minLng) * (treeIdx + 0.5) / nTrees;
              const pt = { lat, lng };
              if (pointInPolygon(pt, points)) {
                autoTreeTags.push({
                  id: `${Date.now()}-${Math.random()}`,
                  name: '',
                  variety: v.variety,
                  rowNumber: row.rowId,
                  latitude: lat,
                  longitude: lng,
                });
              }
              treeIdx++;
            }
          }
        }
      }

      setFormData((prev) => ({
        ...prev,
        boundaryPath: points,
        mapAreaKanal: Number(areaKanal.toFixed(2)),
        treeTags: autoTreeTags.length > 0 ? autoTreeTags : prev.treeTags,
      }));

      // Add click listener to polygon for tree tagging
      googleMaps.maps.event.addListener(event.overlay, 'click', (clickEvent: any) => {
        const position = clickEvent?.latLng;
        if (!position) return;
        if (taggingModeRef.current) {
          setPendingTagLocation({ lat: position.lat(), lng: position.lng() });
          setTagFormOpen(true);
        }
      });
    });

    if (kmlObjectUrlRef.current) {
      if (kmlLayerRef.current) {
        kmlLayerRef.current.setMap(null);
      }

      kmlLayerRef.current = new googleMaps.maps.KmlLayer({
        url: kmlObjectUrlRef.current,
        map,
        preserveViewport: false,
      });
    }
  }, [mapsLoaded, wizardOpen, wizardStep]);


  // Always show KML overlay when map or KML changes
  useEffect(() => {
    const googleMaps = (window as Window & { google?: any }).google;
    if (!googleMaps?.maps || !mapInstanceRef.current) return;
    if (kmlLayerRef.current) {
      kmlLayerRef.current.setMap(null);
      kmlLayerRef.current = null;
    }
    if (kmlObjectUrlRef.current) {
      kmlLayerRef.current = new googleMaps.maps.KmlLayer({
        url: kmlObjectUrlRef.current,
        map: mapInstanceRef.current,
        preserveViewport: false,
      });
    }
  }, [mapsLoaded, wizardOpen, wizardStep, kmlObjectUrlRef.current]);

  useEffect(() => {
    if (!mapInstanceRef.current) {
      return;
    }

    const googleMaps = (window as Window & { google?: any }).google;
    if (!googleMaps?.maps) {
      return;
    }

    treeMarkersRef.current.forEach((marker) => marker.setMap(null));
    let infoWindow: any = null;
    treeMarkersRef.current = formData.treeTags.map((tag) => {
      const color = getVarietyColor(tag.variety);
      const isSelected = selectedTreeId === tag.id;
      const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
        (isSelected ? `<circle cx="32" cy="32" r="30" fill="#fbbf24" opacity="0.5"/>` : '') +
        `<circle cx="32" cy="24" r="18" fill="${color}" ${isSelected ? 'stroke=\"#fbbf24\" stroke-width=\"3\"' : ''}/>` +
        `<rect x="28" y="36" width="8" height="18" fill="#8b5a2b"/>` +
        `</svg>`;
      const marker = new googleMaps.maps.Marker({
        position: { lat: tag.latitude, lng: tag.longitude },
        map: mapInstanceRef.current,
        title: tag.name || 'Tree',
        icon: {
          url: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
          scaledSize: new googleMaps.maps.Size(48, 48),
          anchor: new googleMaps.maps.Point(24, 48),
        },
      });

      // Add click listener to pan to tree location and show details
      marker.addListener('click', () => {
        mapInstanceRef.current?.panTo({ lat: tag.latitude, lng: tag.longitude });
        mapInstanceRef.current?.setZoom(18);
        setSelectedTreeId(tag.id);
        if (infoWindow) {
          infoWindow.close();
        }
        infoWindow = new googleMaps.maps.InfoWindow({
          content: `<div style='min-width:140px'>
            <div><strong>${tag.name || 'Tree'}</strong></div>
            <div>Row: ${tag.rowNumber || '-'}</div>
            <div>Variety: ${tag.variety || '-'}</div>
          </div>`
        });
        infoWindow.open(mapInstanceRef.current, marker);
      });

      return marker;
    });
  }, [formData.treeTags, selectedTreeId]);

  const resetWizard = () => {
    setWizardOpen(false);
    setWizardStep(1);
    setSoilGuideOpen(false);
    setFormData(createInitialForm());
    setEditingFieldId(null);
    setPincodeError(null);
    setMapsError(null);
    setMapsLoaded(false);
    setTaggingMode(false);
    setTagFormOpen(false);
    setPendingTagLocation(null);
    setSelectedTreeId(null);
    setTagFormData({
      name: '',
      variety: '',
      rowNumber: '',
    });
    mapInstanceRef.current = null;
    polygonRef.current = null;
    drawingManagerRef.current = null;
    if (kmlLayerRef.current) {
      kmlLayerRef.current.setMap(null);
      kmlLayerRef.current = null;
    }
    if (kmlObjectUrlRef.current) {
      URL.revokeObjectURL(kmlObjectUrlRef.current);
      kmlObjectUrlRef.current = null;
    }
    treeMarkersRef.current.forEach((marker) => marker.setMap(null));
    treeMarkersRef.current = [];
  };

  const openWizard = () => {
    setWizardOpen(true);
    setWizardStep(1);
  };

  const updateFormValue = <K extends keyof OrchardForm>(key: K, value: OrchardForm[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearBoundary = () => {
    if (polygonRef.current) {
      polygonRef.current.setMap(null);
      polygonRef.current = null;
    }

    setFormData((prev) => ({ ...prev, boundaryPath: [], mapAreaKanal: undefined }));
  };

  const handleMapAreaSave = () => {
    if (!formData.mapAreaKanal) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      areaKanal: prev.mapAreaKanal?.toString() ?? prev.areaKanal,
    }));
  };

  const handleCreateField = async () => {
    if (!session?.user) {
      return;
    }

    setFieldsError(null);

    const payload = {
      user_id: session.user.id,
      name: formData.name || 'New Orchard',
      area: Number(formData.areaKanal) || 0,
      soil_type: formData.soilType || 'Unknown',
      crop_stage: 'Growing',
      health_status: 'Good',
      location: formData.district || formData.zone || 'Unknown',
      planted_date: new Date().toISOString().slice(0, 10),
      latitude: null,
      longitude: null,
      boundary_path: formData.boundaryPath.length > 0 ? formData.boundaryPath : null,
      details: formData,
    };

    const { data, error } = await supabase
      .from('fields')
      .insert(payload)
      .select(
        'id, name, area, soil_type, crop_stage, health_status, location, planted_date, latitude, longitude, boundary_path'
      )
      .single();

    if (error) {
      setFieldsError(error.message);
      return;
    }

    if (data) {
      if (formData.treeTags.length > 0) {
        const tagPayload = formData.treeTags.map((tag) => ({
          user_id: session.user.id,
          field_id: data.id,
          name: tag.name || null,
          variety: tag.variety || null,
          row_number: tag.rowNumber ? parseInt(tag.rowNumber, 10) || null : null,
          latitude: tag.latitude,
          longitude: tag.longitude,
          health_status: 'Good',
        }));

        const { error: tagError } = await supabase
          .from('tree_tags')
          .insert(tagPayload);

        if (tagError) {
          setFieldsError(`Tree tags not saved: ${tagError.message}`);
        }
      }

      const newField: Field = {
        id: data.id,
        name: data.name,
        area: data.area ?? 0,
        soilType: data.soil_type ?? 'Unknown',
        cropStage: data.crop_stage ?? 'Growing',
        healthStatus: data.health_status ?? 'Good',
        location: data.location ?? 'Unknown',
        plantedDate: data.planted_date ?? '',
        latitude: data.latitude ?? undefined,
        longitude: data.longitude ?? undefined,
        boundaryPath: data.boundary_path ?? undefined,
        details: formData,
      };

      setFields((prev) => [newField, ...prev]);
    }

    resetWizard();
  };

  const navigate = useNavigate();
  const handleViewOnMap = (field: Field) => {
    // Pass field id or coordinates to dashboard via state or query params
    if (field.id) {
      navigate(`/dashboard?fieldId=${field.id}`);
    } else if (field.latitude && field.longitude) {
      navigate(`/dashboard?lat=${field.latitude}&lng=${field.longitude}`);
    } else {
      navigate('/dashboard');
    }
  };

  const handleGoToTree = (tag: TreeTag) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo({ lat: tag.latitude, lng: tag.longitude });
      mapInstanceRef.current.setZoom(18);
      setSelectedTreeId(tag.id);
    }
  };

  const handleAddVarietyRow = () => {
    setFormData((prev) => ({
      ...prev,
      varietyTrees: [...prev.varietyTrees, { variety: '', totalTrees: '' }],
    }));
  };

  const handleRemoveVarietyRow = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      varietyTrees: prev.varietyTrees.filter((_, rowIndex) => rowIndex !== index),
    }));
  };

  const handleVarietyRowChange = (index: number, key: keyof VarietyTreeRow, value: string) => {
    setFormData((prev) => ({
      ...prev,
      varietyTrees: prev.varietyTrees.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [key]: value } : row
      ),
    }));
  };

  const handleTagFormSubmit = () => {
    if (!pendingTagLocation) {
      return;
    }

    const newTag: TreeTag = {
      id:
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`,
      name: tagFormData.name.trim(),
      variety: tagFormData.variety.trim(),
      rowNumber: tagFormData.rowNumber.trim(),
      latitude: pendingTagLocation.lat,
      longitude: pendingTagLocation.lng,
    };

    setFormData((prev) => ({
      ...prev,
      treeTags: [...prev.treeTags, newTag],
    }));

    setTagFormOpen(false);
    setPendingTagLocation(null);
    setTagFormData({
      name: '',
      variety: '',
      rowNumber: '',
    });
  };

  const handleRemoveTreeTag = (tagId: string) => {
    setFormData((prev) => ({
      ...prev,
      treeTags: prev.treeTags.filter((tag) => tag.id !== tagId),
    }));
  };

  const handleKmlUpload = (file?: File | null) => {
    if (!file) {
      return;
    }

    if (kmlObjectUrlRef.current) {
      URL.revokeObjectURL(kmlObjectUrlRef.current);
    }

    const objectUrl = URL.createObjectURL(file);
    kmlObjectUrlRef.current = objectUrl;

    const googleMaps = (window as Window & { google?: any }).google;
    if (!googleMaps?.maps || !mapInstanceRef.current) {
      return;
    }

    if (kmlLayerRef.current) {
      kmlLayerRef.current.setMap(null);
    }

    kmlLayerRef.current = new googleMaps.maps.KmlLayer({
      url: objectUrl,
      map: mapInstanceRef.current,
      preserveViewport: false,
    });
  };

  // Orchard summary calculation (from Fields2.tsx)
  const getRowSummary = () => {
    const varietyTotals = new Map<string, number>();
    let totalTrees = 0;

    (formData.rows || []).forEach((row: { rowId: string; varieties: Array<{ variety: string; trees: string }> }) => {
      (row.varieties || []).forEach((v: { variety: string; trees: string }) => {
        if (v.variety) {
          const count = Number(v.trees) || 0;
          varietyTotals.set(v.variety, (varietyTotals.get(v.variety) || 0) + count);
          totalTrees += count;
        }
      });
    });

    return { varietyTotals, totalTrees };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Orchards</h1>
        <Button className="flex items-center space-x-2" onClick={openWizard}>
          <Plus className="w-4 h-4" />
          <span>Create Field</span>
        </Button>
      </div>

      {/* Search and Filter */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search fields..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <Button variant="outline" className="flex items-center space-x-2">
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </Button>
        </div>
      </Card>

      {fieldsError && (
        <Card className="p-4 border border-red-200 bg-red-50 text-sm text-red-700">
          {fieldsError}
        </Card>
      )}

      {/* Fields Grid */}
      {fieldsLoading ? (
        <Card className="p-12 text-center">
          <p className="text-sm text-gray-500">Loading fields...</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFields.map((field) => (
            <Card key={field.id} className="p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{field.name}</h3>
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    {field.location}
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getHealthStatusColor(field.healthStatus)}`}>
                  {field.healthStatus}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Area (kanal):</span>
                  <span className="text-sm font-medium text-gray-900">
                    {field.mapAreaKanal ?? field.areaKanal ?? field.area ?? '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Soil Type:</span>
                  <span className="text-sm font-medium text-gray-900">{field.soilType}</span>
                </div>
              </div>

              <div className="mt-6 flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleViewOnMap(field)}
                >
                  View on Map
                </Button>
                <Button size="sm" className="flex-1" onClick={() => openWizardForEdit(field)}>
                  Edit Field
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => handleDeleteField(field)}>
                  Delete
                </Button>
              </div>
            </Card>
            // ...existing code...
          ))}
        </div>
      )}

      {!fieldsLoading && filteredFields.length === 0 && (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">

          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No fields found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first field.'}
          </p>
          <Button onClick={openWizard}>Create Field</Button>
        </Card>
      )}

      {wizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={resetWizard} />
          <div className="relative bg-white w-full max-w-5xl mx-4 rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Field Creation</h2>
                <p className="text-sm text-gray-500">Step {wizardStep} of 4</p>
              </div>
              <button
                type="button"
                onClick={resetWizard}
                className="p-2 rounded-lg hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="px-6 py-4 border-b border-gray-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['Orchard Details', 'Soil Type', 'Location', 'Orchard Map'].map((label, index) => (
                  <div
                    key={label}
                    className={`rounded-lg px-3 py-2 text-xs font-medium ${
                      wizardStep === index + 1
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {index + 1}. {label}
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-6 max-h-[70vh] overflow-y-auto">
                {wizardStep === 1 && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Orchard Name</label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => updateFormValue('name', e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Orchard Type</label>
                        <select
                          value={formData.orchardType}
                          onChange={(e) => updateFormValue('orchardType', e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        >
                          <option value="">Select type</option>
                          {orchardTypes.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Orchard Area (kanal)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.areaKanal}
                          onChange={(e) => updateFormValue('areaKanal', e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Age of Orchard (years)</label>
                        <input
                          type="number"
                          min="0"
                          value={formData.ageYears}
                          onChange={(e) => updateFormValue('ageYears', e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Pollinator Type</label>
                        <select
                          value={formData.pollinatorType}
                          onChange={(e) => updateFormValue('pollinatorType', e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        >
                          <option value="">Select pollinator variety</option>
                          {getPollinatorsForOrchard().map((v) => (
                            <option key={v.name} value={v.name}>
                              {v.name} - {v.description}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-semibold text-gray-900">Row Configuration</h3>
                        <Button variant="outline" size="sm" onClick={handleAddRow}>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Row
                        </Button>
                      </div>

                      <div className="space-y-4">
                        {formData.rows && formData.rows.map((row, rowIndex) => (
                          <div key={`row-${rowIndex}`} className="rounded-lg border-2 border-gray-300 bg-gray-50 p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-semibold text-gray-900">Row {row.rowId}</h4>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAddVarietyToRow(rowIndex)}
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Add Variety
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRemoveRow(rowIndex)}
                                  disabled={formData.rows.length === 1}
                                  className="text-red-600"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>

                            <div className="space-y-2">
                              {row.varieties.map((varietyInRow, varietyIndex) => (
                                <div key={`row-${rowIndex}-variety-${varietyIndex}`} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end bg-white p-3 rounded border border-gray-200">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Variety</label>
                                    <select
                                      value={varietyInRow.variety}
                                      onChange={(e) => handleRowVarietyChange(rowIndex, varietyIndex, 'variety', e.target.value)}
                                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                                    >
                                      <option value="">Select variety</option>
                                      {getAvailableVarieties().map((v) => (
                                        <option key={v.name} value={v.name}>
                                          {v.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Trees</label>
                                    <input
                                      type="number"
                                      min="0"
                                      placeholder="Number"
                                      value={varietyInRow.trees}
                                      onChange={(e) => handleRowVarietyChange(rowIndex, varietyIndex, 'trees', e.target.value)}
                                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                                    />
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRemoveVarietyFromRow(rowIndex, varietyIndex)}
                                    disabled={row.varieties.length === 1}
                                    className="mb-1"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Total Trees summary */}
                    {/* Orchard Summary Table */}
                    <div className="mt-8 w-full">
                      <div className="rounded-xl border border-green-300 bg-green-50 shadow p-3 w-full">
                        <h3 className="text-lg font-bold mb-3 text-green-900 flex items-center gap-2 justify-center text-center">
                          <span role="img" aria-label="apple">🍏</span> Orchard Summary
                        </h3>
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-62.5 border-separate border-spacing-y-1">
                            <thead>
                              <tr className="bg-green-100">
                                <th className="px-3 py-2 text-left rounded-l-lg text-green-900">Variety</th>
                                <th className="px-3 py-2 text-left">Indicator</th>
                                <th className="px-3 py-2 text-left rounded-r-lg text-green-900">Total Trees</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[...getRowSummary().varietyTotals.entries()].map(([variety, count]) => (
                                <tr key={variety} className="bg-white hover:bg-green-100 transition rounded-lg">
                                  <td className="px-3 py-2 font-medium text-green-800 rounded-l-lg">{variety}</td>
                                  <td className="px-3 py-2">
                                    <span title={variety} className="inline-block align-middle">
                                      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <ellipse cx="11" cy="13" rx="7" ry="6" fill={getVarietyColor(variety)} />
                                        <rect x="9.5" y="4" width="3" height="5" rx="1.5" fill="#6b8e23" />
                                        <ellipse cx="11" cy="4.5" rx="1.5" ry="1" fill="#6b8e23" />
                                        <ellipse cx="8.5" cy="10" rx="1" ry="1.5" fill="#fff" fillOpacity=".25" />
                                      </svg>
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 font-bold text-green-700 rounded-r-lg">{count}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="font-bold bg-green-50">
                                <td className="px-3 py-2 text-green-900 rounded-l-lg" colSpan={2}>Total Trees</td>
                                <td className="px-3 py-2 text-green-900 rounded-r-lg">{getRowSummary().totalTrees}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              {wizardStep === 2 && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-gray-900">Select Soil Type</h3>
                    <button
                      type="button"
                      className="text-sm font-medium text-green-700 hover:text-green-800"
                      onClick={() => setSoilGuideOpen(true)}
                    >
                      Check Soil Guide
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {soilOptions.map((soil) => (
                      <button
                        key={soil.name}
                        type="button"
                        onClick={() => {
                          if (formData.unknownSoil) {
                            return;
                          }
                          updateFormValue('soilType', soil.name);
                        }}
                        className={`rounded-xl border overflow-hidden text-left transition ${
                          formData.soilType === soil.name
                            ? 'border-green-500 ring-2 ring-green-200'
                            : 'border-gray-200 hover:border-green-300'
                        } ${formData.unknownSoil ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <img src={soil.image} alt={soil.name} className="h-28 w-full object-cover" />
                        <div className="p-3">
                          <p className="text-sm font-medium text-gray-800">{soil.name}</p>
                        </div>
                      </button>
                    ))}
                  </div>

                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={formData.unknownSoil}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          unknownSoil: e.target.checked,
                          soilType: e.target.checked ? 'Unknown' : '',
                        }))
                      }
                      className="h-4 w-4 text-green-600 border-gray-300 rounded"
                    />
                    Can't determine soil type
                  </label>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                      <input
                        type="text"
                        value={formData.pincode}
                        onChange={(e) => updateFormValue('pincode', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      {pincodeLoading && <p className="text-xs text-gray-500 mt-1">Fetching location...</p>}
                      {pincodeError && <p className="text-xs text-red-500 mt-1">{pincodeError}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                      <input
                        type="text"
                        value={formData.district}
                        onChange={(e) => updateFormValue('district', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tehsil</label>
                      <input
                        type="text"
                        value={formData.tehsil}
                        onChange={(e) => updateFormValue('tehsil', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                      <input
                        type="text"
                        value={formData.region}
                        onChange={(e) => updateFormValue('region', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                      <input
                        type="text"
                        value={formData.state}
                        onChange={(e) => updateFormValue('state', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Zone</label>
                      <input
                        type="text"
                        value={formData.zone}
                        onChange={(e) => updateFormValue('zone', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                      <input
                        type="text"
                        value={formData.country}
                        onChange={(e) => updateFormValue('country', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Address</label>
                    <textarea
                      rows={3}
                      value={formData.fullAddress}
                      onChange={(e) => updateFormValue('fullAddress', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              {wizardStep === 4 && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Orchard Map</h3>
                      <p className="text-sm text-gray-500">Pin the location and draw the orchard boundary.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={taggingMode ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => setTaggingMode((prev) => !prev)}
                      >
                        {taggingMode ? 'Tagging On' : 'Tag Trees'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleClearBoundary} className="flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span className="text-red-500 font-medium">Clear</span>
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
                    {/* KML upload moved below the map */}
                    <div className="rounded-lg border border-gray-200 p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-500">Trees Tagged</span>
                        <span className="ml-auto text-base font-bold text-green-700">{formData.treeTags.length}</span>
                      </div>
                      {formData.treeTags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {[...new Set(formData.treeTags.map((tag) => tag.variety).filter(Boolean))].map((variety) => (
                            <div key={variety} className="flex items-center gap-1 text-xs text-gray-700 bg-green-50 border border-green-100 rounded-full px-2 py-0.5">
                              <span
                                className="inline-block h-2 w-2 rounded-full"
                                style={{ backgroundColor: getVarietyColor(variety) }}
                              />
                              {variety}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {mapsError ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      {mapsError} Add VITE_GOOGLE_API_KEY to your environment.
                    </div>
                  ) : (
                    <>
                      <div
                        ref={mapContainerRef}
                        className="h-96 w-full rounded-lg border border-gray-200 bg-gray-50"
                      />
                      <div className="mt-4 flex flex-col items-center justify-center">
                        <Button
                          className="mt-2"
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            // Create a file input dynamically
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = '.kml,application/vnd.google-earth.kml+xml';
                            input.onchange = async (e: any) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              // Read file as text
                              const text = await file.text();
                              // Create object URL for KML overlay
                              if (kmlObjectUrlRef.current) {
                                URL.revokeObjectURL(kmlObjectUrlRef.current);
                              }
                              const blob = new Blob([text], { type: 'application/vnd.google-earth.kml+xml' });
                              const objectUrl = URL.createObjectURL(blob);
                              kmlObjectUrlRef.current = objectUrl;
                              // Add KML overlay to map
                              const googleMaps = (window as Window & { google?: any }).google;
                              if (googleMaps?.maps && mapInstanceRef.current) {
                                if (kmlLayerRef.current) {
                                  kmlLayerRef.current.setMap(null);
                                }
                                kmlLayerRef.current = new googleMaps.maps.KmlLayer({
                                  url: objectUrl,
                                  map: mapInstanceRef.current,
                                  preserveViewport: false,
                                });
                              }
                              // Try to parse KML to GeoJSON and update boundaryPath
                              try {
                                const dom = new window.DOMParser().parseFromString(text, 'text/xml');
                                const geojson = kmlToGeoJSON(dom);
                                // Try Polygon first, then LineString
                                let coords = geojson.features?.find((f: any) => f.geometry?.type === 'Polygon')?.geometry?.coordinates?.[0];
                                let type = 'Polygon';
                                if (!coords) {
                                  coords = geojson.features?.find((f: any) => f.geometry?.type === 'LineString')?.geometry?.coordinates;
                                  type = 'LineString';
                                }
                                if (coords && Array.isArray(coords)) {
                                  const boundaryPath = coords.map(([lng, lat]: [number, number]) => ({ lat, lng }));
                                  // Calculate area in kanal using Google Maps geometry if available (only for Polygon)
                                  let mapAreaKanal = undefined;
                                  const googleMaps = (window as Window & { google?: any }).google;
                                  if (type === 'Polygon' && googleMaps?.maps?.geometry) {
                                    const path = boundaryPath.map(({ lat, lng }) => new googleMaps.maps.LatLng(lat, lng));
                                    const areaSqm = googleMaps.maps.geometry.spherical.computeArea(path);
                                    mapAreaKanal = Number((areaSqm / KANAL_SQM).toFixed(2));
                                  }
                                  setFormData(prev => ({
                                    ...prev,
                                    boundaryPath,
                                    mapAreaKanal,
                                  }));
                                  // Always center and fit map to new boundary after upload
                                  setTimeout(() => {
                                    if (googleMaps?.maps && mapInstanceRef.current && boundaryPath.length > 0) {
                                      const bounds = new googleMaps.maps.LatLngBounds();
                                      boundaryPath.forEach(({ lat, lng }) => bounds.extend(new googleMaps.maps.LatLng(lat, lng)));
                                      mapInstanceRef.current.fitBounds(bounds);
                                    }
                                  }, 200);
                                  setMapsError(null);
                                } else {
                                  setMapsError('No Polygon or LineString found in KML. Please upload a valid boundary KML.');
                                }
                              } catch (err) {
                                setMapsError('Failed to parse KML: ' + (err instanceof Error ? err.message : 'Unknown error'));
                              }
                            };
                            input.click();
                          }}
                        >
                          Update Map from KML
                        </Button>
                        {mapsError ? (
                          <p className="text-xs text-red-500 mt-1 text-center">{mapsError}</p>
                        ) : (
                          <p className="text-xs text-gray-500 mt-1 text-center">
                            Click to upload and update the map from a KML file. The boundary will be extracted if possible.
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-lg border border-gray-200 p-3">
                      <p className="text-xs text-gray-500">Boundary Points</p>
                      <p className="text-sm text-gray-800">
                        {formData.boundaryPath.length ? `${formData.boundaryPath.length} points` : 'Not drawn yet'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-3">
                      <p className="text-xs text-gray-500">Map Area (kanal)</p>
                      <p className="text-sm text-gray-800">
                        {formData.mapAreaKanal ? formData.mapAreaKanal : 'Draw boundary to calculate'}
                      </p>
                    </div>
                  </div>

                  {formData.boundaryPath.length > 0 && (
                    <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-green-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                        </svg>
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-green-900 mb-1">Boundary Saved Successfully</h4>
                          <p className="text-xs text-green-700">
                            Your orchard boundary with {formData.boundaryPath.length} points will be saved with the field. 
                            You can click on the boundary to view details.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.treeTags.length > 0 && (
                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-900">Tagged Trees ({formData.treeTags.length})</h4>
                        <p className="text-xs text-gray-500">
                          {selectedTreeId ? '✨ Tree selected - highlighted on map' : 'Click a tree to highlight it'}
                        </p>
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {formData.treeTags.map((tag) => (
                          <div 
                            key={tag.id} 
                            className={`flex items-center justify-between text-sm text-gray-700 p-2 rounded cursor-pointer transition-colors ${
                              selectedTreeId === tag.id 
                                ? 'bg-yellow-100 border-2 border-yellow-400' 
                                : 'hover:bg-gray-50 border-2 border-transparent'
                            }`}
                            onClick={() => handleGoToTree(tag)}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-block h-3 w-3 rounded-full"
                                style={{ backgroundColor: getVarietyColor(tag.variety) }}
                              />
                              <span>{tag.name || 'Unnamed Tree'}</span>
                              {tag.variety && <span className="text-xs text-gray-500">({tag.variety})</span>}
                              {tag.rowNumber && <span className="text-xs text-gray-500">Row {tag.rowNumber}</span>}
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveTreeTag(tag.id);
                              }}
                              className="text-xs text-red-500 hover:text-red-600"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setWizardStep((prev) => Math.max(1, prev - 1))}
                disabled={wizardStep === 1}
              >
                Back
              </Button>
              {wizardStep < 4 ? (
                <Button onClick={() => setWizardStep((prev) => Math.min(4, prev + 1))}>Next</Button>
              ) : (
                editingFieldId ? (
                  <Button onClick={handleUpdateField}>Update Field</Button>
                ) : (
                  <Button onClick={handleCreateField}>Create Field</Button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {soilGuideOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSoilGuideOpen(false)} />
          <div className="relative bg-white w-full max-w-lg mx-4 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Soil Guide</h3>
              <button
                type="button"
                onClick={() => setSoilGuideOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Use texture and moisture to identify soil type. Sandy soils feel gritty, while clay soils feel sticky.
            </p>
            <ul className="text-sm text-gray-700 space-y-2">
              <li>Sandy: Loose, fast-draining, low moisture retention.</li>
              <li>Sandy Loam: Balanced texture, good drainage and nutrients.</li>
              <li>Silt Loam: Smooth, holds moisture, fertile.</li>
              <li>Clay: Dense, holds water, slow drainage.</li>
            </ul>
          </div>
        </div>
      )}
      {tagFormOpen && pendingTagLocation && (
        <div className="fixed inset-0 z-70 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setTagFormOpen(false)} />
          <div className="relative bg-white w-full max-w-lg mx-4 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Tag Tree</h3>
              <button
                type="button"
                onClick={() => setTagFormOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tree Name</label>
                <input
                  type="text"
                  value={tagFormData.name}
                  onChange={(e) => setTagFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Variety</label>
                <select
                  value={tagFormData.variety}
                  onChange={(e) => setTagFormData((prev) => ({ ...prev, variety: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={!tagFormData.rowNumber}
                >
                  <option value="">Select variety</option>
                  {(() => {
                    // Show only varieties for the selected row
                    const selectedRow = (formData.rows || []).find((row) => row.rowId === tagFormData.rowNumber);
                    const rowVarieties = (selectedRow?.varieties || [])
                      .map((v) => v.variety)
                      .filter((v) => v && v.trim() !== '');
                    const uniqueVarieties = Array.from(new Set(rowVarieties));
                    return uniqueVarieties.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ));
                  })()}
                </select>
                {tagFormData.variety && (() => {
                  // Try to show description if available from getAvailableVarieties
                  const selectedVariety = getAvailableVarieties().find((v) => v.name === tagFormData.variety);
                  return selectedVariety ? (
                    <p className="text-xs text-gray-600 mt-1">{selectedVariety.description}</p>
                  ) : null;
                })()}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Row Number</label>
                <select
                  value={tagFormData.rowNumber}
                  onChange={(e) => setTagFormData((prev) => ({ ...prev, rowNumber: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Select row</option>
                  {formData.rows && formData.rows.map((row) => (
                    <option key={row.rowId} value={row.rowId}>Row {row.rowId}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setTagFormOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleTagFormSubmit}>Save Tag</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Fields;