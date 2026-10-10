import { SampleDataset } from '../types/ui';

// High-fidelity SVG data URLs simulating optical satellite imagery for Stage 1 visual demonstration
const generateSampleSvg = (isAfter: boolean, isFlood: boolean = false) => {
  const bg = isFlood ? '#1e293b' : '#14231b';
  const urbanColor = isAfter ? '#94a3b8' : '#334155';
  const vegColor = isAfter && !isFlood ? '#2d4a22' : '#1e3a1e';
  const waterColor = isFlood && isAfter ? '#1e3a8a' : '#0f172a';

  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
    <rect width="800" height="600" fill="${bg}"/>
    
    <!-- Agricultural plots / terrain texture -->
    <path d="M 0,0 L 400,0 L 350,300 L 0,250 Z" fill="${vegColor}" opacity="0.8"/>
    <path d="M 400,0 L 800,0 L 800,350 L 450,280 Z" fill="${isAfter ? '#3b4252' : '#2e4428'}" opacity="0.9"/>
    <path d="M 0,250 L 350,300 L 300,600 L 0,600 Z" fill="${vegColor}" opacity="0.7"/>
    <path d="M 300,600 L 800,350 L 800,600 Z" fill="${isAfter ? '#475569' : '#22381e'}" opacity="0.85"/>
    
    <!-- Road corridor network -->
    <path d="M 0,280 Q 400,310 800,260" stroke="#64748b" stroke-width="8" fill="none"/>
    <path d="M 380,0 L 320,600" stroke="#64748b" stroke-width="6" fill="none"/>
    
    ${isAfter && !isFlood ? `
      <!-- Urban Expansion Clusters in T2 -->
      <rect x="180" y="140" width="110" height="80" fill="${urbanColor}" rx="4"/>
      <rect x="200" y="155" width="30" height="25" fill="#cbd5e1"/>
      <rect x="245" y="155" width="30" height="25" fill="#cbd5e1"/>
      <rect x="210" y="190" width="60" height="20" fill="#cbd5e1"/>

      <rect x="460" y="320" width="160" height="100" fill="${urbanColor}" rx="4"/>
      <circle cx="530" cy="370" r="25" fill="#cbd5e1"/>
      <rect x="570" y="340" width="35" height="60" fill="#cbd5e1"/>
    ` : ''}

    ${isFlood && isAfter ? `
      <!-- Inundation Water Body Expansion in T2 -->
      <path d="M 0,200 Q 300,280 450,450 Q 600,550 800,520 L 800,600 L 0,600 Z" fill="${waterColor}" opacity="0.85"/>
    ` : ''}

    <!-- Grid Coordinate Marks -->
    <line x1="200" y1="0" x2="200" y2="600" stroke="#334155" stroke-width="0.5" stroke-dasharray="4,4"/>
    <line x1="400" y1="0" x2="400" y2="600" stroke="#334155" stroke-width="0.5" stroke-dasharray="4,4"/>
    <line x1="600" y1="0" x2="600" y2="600" stroke="#334155" stroke-width="0.5" stroke-dasharray="4,4"/>
    <line x1="0" y1="200" x2="800" y2="200" stroke="#334155" stroke-width="0.5" stroke-dasharray="4,4"/>
    <line x1="0" y1="400" x2="800" y2="400" stroke="#334155" stroke-width="0.5" stroke-dasharray="4,4"/>

    <text x="20" y="30" fill="#94a3b8" font-size="11" font-family="monospace">
      ${isAfter ? 'ACQUISITION T2: POST-EVENT' : 'ACQUISITION T1: PRE-EVENT'}
    </text>
  </svg>`;
};

export const SAMPLE_DATASETS: SampleDataset[] = [
  {
    id: 'urban-encroachment-01',
    name: 'Sector 49 Urban Expansion',
    category: 'Urban Encroachment',
    description: 'Rapid residential and commercial structure development over former agricultural land parcels.',
    beforeDate: '2023-04-12 UTC',
    afterDate: '2026-02-18 UTC',
    beforeImage: generateSampleSvg(false, false),
    afterImage: generateSampleSvg(true, false),
    demoRegions: [
      {
        region_id: 'reg_001',
        geometry: null,
        area_m2: 24500,
        magnitude: 0.88,
        severity: 'high',
        priority: 'urgent',
        review_status: 'unreviewed',
        centroid_lon: null,
        centroid_lat: null,
      },
      {
        region_id: 'reg_002',
        geometry: null,
        area_m2: 18200,
        magnitude: 0.74,
        severity: 'medium',
        priority: 'high',
        review_status: 'needs_inspection',
        centroid_lon: null,
        centroid_lat: null,
      },
    ],
  },
  {
    id: 'disaster-flood-02',
    name: 'River Basin Inundation Zone',
    category: 'Disaster Impact',
    description: 'Post-flood inundation mapping and critical transport corridor disruption.',
    beforeDate: '2025-09-01 UTC',
    afterDate: '2026-01-15 UTC',
    beforeImage: generateSampleSvg(false, true),
    afterImage: generateSampleSvg(true, true),
    demoRegions: [
      {
        region_id: 'reg_flood_01',
        geometry: null,
        area_m2: 68400,
        magnitude: 0.94,
        severity: 'critical',
        priority: 'urgent',
        review_status: 'unreviewed',
        centroid_lon: null,
        centroid_lat: null,
      },
    ],
  },
];
