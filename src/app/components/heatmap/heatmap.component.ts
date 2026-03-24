import { Component, OnInit, AfterViewInit, Inject, PLATFORM_ID, ElementRef, ViewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import * as XLSX from 'xlsx';

interface LocationData {
  lat: number;
  lng: number;
  zipcode: string;
  state: string;
  city: string;
  population?: number;
}

@Component({
  selector: 'app-heatmap',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './heatmap.component.html',
  styleUrl: './heatmap.component.css'
})
export class HeatmapComponent implements OnInit, AfterViewInit {
  @ViewChild('mapContainer', { static: false }) mapContainer?: ElementRef;
  
  private map: any;
  private L: any;
  private coverageLayer: any;
  private isBrowser: boolean;
  private mapInitialized = false;
  private locationData: LocationData[] = [];
  private defaultFilePath = 'assets/components/heatmap/uszips.xlsx';
  private leafletLoaded = false;
  
  // State mapping to convert state IDs to full state names
  private stateMapping: {[key: string]: string} = {
    'AL': 'Alabama',
    'AK': 'Alaska',
    'AZ': 'Arizona',
    'AR': 'Arkansas',
    'CA': 'California',
    'CO': 'Colorado',
    'CT': 'Connecticut',
    'DE': 'Delaware',
    'FL': 'Florida',
    'GA': 'Georgia',
    'HI': 'Hawaii',
    'ID': 'Idaho',
    'IL': 'Illinois',
    'IN': 'Indiana',
    'IA': 'Iowa',
    'KS': 'Kansas',
    'KY': 'Kentucky',
    'LA': 'Louisiana',
    'ME': 'Maine',
    'MD': 'Maryland',
    'MA': 'Massachusetts',
    'MI': 'Michigan',
    'MN': 'Minnesota',
    'MS': 'Mississippi',
    'MO': 'Missouri',
    'MT': 'Montana',
    'NE': 'Nebraska',
    'NV': 'Nevada',
    'NH': 'New Hampshire',
    'NJ': 'New Jersey',
    'NM': 'New Mexico',
    'NY': 'New York',
    'NC': 'North Carolina',
    'ND': 'North Dakota',
    'OH': 'Ohio',
    'OK': 'Oklahoma',
    'OR': 'Oregon',
    'PA': 'Pennsylvania',
    'RI': 'Rhode Island',
    'SC': 'South Carolina',
    'SD': 'South Dakota',
    'TN': 'Tennessee',
    'TX': 'Texas',
    'UT': 'Utah',
    'VT': 'Vermont',
    'VA': 'Virginia',
    'WA': 'Washington',
    'WV': 'West Virginia',
    'WI': 'Wisconsin',
    'WY': 'Wyoming',
    'DC': 'District of Columbia',
    'AS': 'American Samoa',
    'GU': 'Guam',
    'MP': 'Northern Mariana Islands',
    'PR': 'Puerto Rico',
    'VI': 'U.S. Virgin Islands',
    // Canadian provinces
    'AB': 'Alberta',
    'BC': 'British Columbia',
    'MB': 'Manitoba',
    'NB': 'New Brunswick',
    'NL': 'Newfoundland and Labrador',
    'NS': 'Nova Scotia',
    'NT': 'Northwest Territories',
    'NU': 'Nunavut',
    'ON': 'Ontario',
    'PE': 'Prince Edward Island',
    'QC': 'Quebec',
    'SK': 'Saskatchewan',
    'YT': 'Yukon'
  };

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  async ngOnInit(): Promise<void> {
    if (!this.isBrowser) {
      // console.log('Not in browser environment, skipping Leaflet initialization');
      return;
    }
    
    try {
      // console.log('Loading Leaflet and plugins...');
      await this.loadLeafletDependencies();
      // console.log('Leaflet and plugins loaded successfully');
      
      // Load sample data first (faster than Excel loading)
      this.loadSampleData();
      
      // Then try to load Excel data
      this.loadDefaultData();
    } catch (error) {
      console.error('Error loading Leaflet or plugins:', error);
      // Load sample data as fallback
      this.loadSampleData();
    }
  }

  ngAfterViewInit(): void {
    // console.log('HeatmapComponent ngAfterViewInit called');
    if (this.isBrowser) {
      // Add a small delay to ensure DOM is fully rendered
      setTimeout(() => {
        this.initializeMapWhenReady();
      }, 100);
    }
  }

  private async loadLeafletDependencies(): Promise<void> {
    // Load Leaflet CSS first
    this.addLeafletStyles();
    
    // Load Leaflet library
    const leaflet = await import('leaflet');
    this.L = leaflet.default || leaflet;
    
    // Fix for default markers
    delete (this.L.Icon.Default.prototype as any)._getIconUrl;
    this.L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    });
    
    this.leafletLoaded = true;
  }



  private addLeafletStyles(): void {
    // Check if styles are already added
    if (document.querySelector('link[href*="leaflet.css"]')) {
      return;
    }
    
    const linkElement = document.createElement('link');
    linkElement.rel = 'stylesheet';
    linkElement.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    linkElement.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    linkElement.crossOrigin = '';
    document.head.appendChild(linkElement);
  }

  private initializeMapWhenReady(): void {
    if (!this.leafletLoaded) {
      // console.log('Waiting for Leaflet dependencies to load...');
      setTimeout(() => this.initializeMapWhenReady(), 100);
      return;
    }
    
    this.waitForMapContainerDimensions(() => {
      this.initializeMap();
    });
  }

  private waitForMapContainerDimensions(callback: () => void): void {
    const mapContainerElement = this.mapContainer?.nativeElement;
    if (!mapContainerElement) {
      console.error('Map container element not found');
      return;
    }

    const checkDimensions = () => {
      const containerWidth = mapContainerElement.offsetWidth;
      const containerHeight = mapContainerElement.offsetHeight;
      // console.log(`Map container dimensions: ${containerWidth}x${containerHeight}`);

      if (containerWidth > 0 && containerHeight > 0) {
        callback();
      } else {
        setTimeout(checkDimensions, 100);
      }
    };

    checkDimensions();
  }

  private initializeMap(): void {
    if (!this.L || !this.leafletLoaded) {
      console.error('Leaflet not loaded properly');
      return;
    }
    
    if (this.mapInitialized) {
      // console.log('Map already initialized');
      return;
    }
    
    const mapContainerId = 'map-container';
    const mapContainer = document.getElementById(mapContainerId);
    if (!mapContainer) {
      console.error('Map container not found');
      return;
    }
    
    const containerWidth = mapContainer.offsetWidth;
    const containerHeight = mapContainer.offsetHeight;
    // console.log(`Initializing map with dimensions: ${containerWidth}x${containerHeight}`);

    if (containerWidth === 0 || containerHeight === 0) {
      console.error('Map container has zero dimensions');
      return;
    }

    try {
      // Clear any existing content
      mapContainer.innerHTML = '';
      
      // Initialize the map
      this.map = this.L.map(mapContainerId, {
        preferCanvas: true,
        attributionControl: true,
        zoomControl: true
      }).setView([39.8283, -98.5795], 4);

      // Add OpenStreetMap tile layer
      this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map);

      // Set up event listeners
      this.map.on('load', () => {
        // console.log('Map loaded successfully');
      });
      
      // Network coverage circles don't need zoom-based radius updates
      
      // Force map to invalidate size after a short delay
      setTimeout(() => {
        if (this.map) {
          this.map.invalidateSize();
          // console.log('Map size invalidated');
        }
      }, 100);
      
      this.mapInitialized = true;
      
      // Add network coverage layer if data is available
      if (this.locationData.length > 0) {
        this.addNetworkCoverageLayer();
      }
      
      // console.log('Map initialization completed');
      
    } catch (error) {
      console.error('Error initializing map:', error);
      this.showErrorMessage('Failed to initialize map. Please refresh the page.');
    }
  }

  private showErrorMessage(message: string): void {
    const mapContainer = document.getElementById('map-container');
    if (mapContainer) {
      mapContainer.innerHTML = `
        <div class="flex items-center justify-center h-full bg-gray-100 text-gray-600">
          <div class="text-center">
            <p class="text-lg mb-2">${message}</p>
            <button onclick="location.reload()" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              Refresh Page
            </button>
          </div>
        </div>
      `;
    }
  }

  loadDefaultData(): void {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', this.defaultFilePath, true);
    xhr.responseType = 'arraybuffer';
    
    xhr.onload = (e) => {
      if (xhr.status === 200) {
        // console.log('Default data loaded successfully');
        const data = new Uint8Array(xhr.response);
        this.processExcelData(data);
      } else {
        console.warn('Failed to load default data file, using sample data');
      }
    };
    
    xhr.onerror = () => {
      console.warn('Error loading default data file, using sample data');
    };
    
    xhr.send();
  }

  private processExcelData(data: Uint8Array): void {
    try {
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      this.locationData = this.parseExcelData(jsonData);
      // console.log(`Processed ${this.locationData.length} locations from Excel`);
      
      this.updateDataCount();
      
      if (this.mapInitialized) {
        this.addNetworkCoverageLayer();
      }
    } catch (error) {
      console.error('Error processing Excel data:', error);
    }
  }

  private parseExcelData(jsonData: any[]): LocationData[] {
    const locations: LocationData[] = [];
    
    jsonData.forEach((row: any, index: number) => {
      try {
        let lat: number, lng: number, zipcode: string, state: string, city: string, population: number;
        
        // Try different field name variations
        if (row.lat && row.lng) {
          lat = parseFloat(row.lat);
          lng = parseFloat(row.lng);
          zipcode = row.zip?.toString() || row.zipcode?.toString() || '';
          state = row.state_id || row.state || '';
          city = row.city || '';
          population = row.population ? parseInt(row.population) : 1;
        } else if (row.latitude && row.longitude) {
          lat = parseFloat(row.latitude);
          lng = parseFloat(row.longitude);
          zipcode = row.zipcode?.toString() || row.zip_code?.toString() || '';
          state = row.state || row.state_code || '';
          city = row.city || row.city_name || '';
          population = row.population ? parseInt(row.population) : 1;
        } else {
          return; // Skip this row
        }
        
        // Validate coordinates
        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          console.warn(`Invalid coordinates at row ${index}: lat=${lat}, lng=${lng}`);
          return;
        }
        
        locations.push({
          lat,
          lng,
          zipcode,
          state,
          city,
          population
        });
      } catch (error) {
        console.warn(`Error parsing row ${index}:`, error);
      }
    });
    
    return locations;
  }

  private addNetworkCoverageLayer(): void {
    if (!this.L || !this.map) {
      console.warn('Cannot add network coverage layer: dependencies not ready');
      return;
    }
    
    if (this.locationData.length === 0) {
      console.warn('No location data available for network coverage');
      return;
    }
    
    // Remove existing coverage layer
    if (this.coverageLayer) {
      this.map.removeLayer(this.coverageLayer);
    }
    
    try {
      // Create layer group for coverage circles
      this.coverageLayer = this.L.layerGroup();
      
      // console.log(`Creating network coverage with ${this.locationData.length} data points`);
      
      // Create coverage circles for each location
      this.locationData.forEach(location => {
        const population = location.population || 0;
        
        // Determine coverage level based on population
        let coverageLevel: 'low' | 'medium' | 'high';
        let radius: number;
        let color: string;
        let opacity: number;
        
        if (population < 10000) {
          coverageLevel = 'low';
          radius = 8000; // 8km radius
          color = '#3B82F6'; // blue
          opacity = 0.6;
        } else if (population < 50000) {
          coverageLevel = 'medium';
          radius = 15000; // 15km radius
          color = '#10B981'; // green
          opacity = 0.7;
        } else {
          coverageLevel = 'high';
          radius = 25000; // 25km radius
          color = '#8B5CF6'; // purple
          opacity = 0.8;
        }
        
        // Create coverage circle
        const coverageCircle = this.L.circle([location.lat, location.lng], {
          radius: radius,
          fillColor: color,
          color: color,
          weight: 2,
          opacity: opacity,
          fillOpacity: 0.3
        });
        
        // Add popup with location info
        const popupContent = `
          <div class="p-2">
            <h3 class="font-bold text-lg">${location.city}, ${this.getFullStateName(location.state)}</h3>
            <p><strong>Zipcode:</strong> ${location.zipcode}</p>
            <p><strong>Population:</strong> ${population.toLocaleString()}</p>
            <p><strong>Coverage Level:</strong> <span class="capitalize">${coverageLevel}</span></p>
            <p><strong>Service Radius:</strong> ${(radius / 1000).toFixed(1)} km</p>
          </div>
        `;
        
        coverageCircle.bindPopup(popupContent);
        
        // Add to layer group
        this.coverageLayer.addLayer(coverageCircle);
      });
      
      // Add layer group to map
      this.coverageLayer.addTo(this.map);
      
      this.addMapClickHandler();
      
      // console.log('Network coverage layer added successfully');
      
    } catch (error) {
      console.error('Error creating network coverage layer:', error);
    }
  }

  // Helper method to get full state name
  private getFullStateName(stateCode: string): string {
    if (!stateCode) return '';
    
    // Normalize state code to uppercase
    const normalizedCode = stateCode.toUpperCase();
    
    // Return full state name if found, otherwise return the original code
    return this.stateMapping[normalizedCode] || stateCode;
  }

  private addMapClickHandler(): void {
    if (!this.map) return;
    
    this.map.on('click', (e: any) => {
      const latlng = e.latlng;
      const closest = this.findClosestLocation(latlng.lat, latlng.lng);
      
      if (closest) {
        const popup = this.L.popup()
          .setLatLng([closest.lat, closest.lng])
          .setContent(`
            <div class="popup-content">
              <strong>City:</strong> ${closest.city}<br>
              <strong>State:</strong> ${this.getFullStateName(closest.state)}<br>
              <strong>Zipcode:</strong> ${closest.zipcode}<br>
              ${closest.population ? `<strong>Population:</strong> ${closest.population.toLocaleString()}<br>` : ''}
            </div>
          `)
          .openOn(this.map);
      }
    });
  }

  private findClosestLocation(lat: number, lng: number): LocationData | null {
    if (this.locationData.length === 0) return null;
    
    let closest = this.locationData[0];
    let closestDistance = this.calculateDistance(lat, lng, closest.lat, closest.lng);
    
    for (let i = 1; i < this.locationData.length; i++) {
      const location = this.locationData[i];
      const distance = this.calculateDistance(lat, lng, location.lat, location.lng);
      
      if (distance < closestDistance) {
        closest = location;
        closestDistance = distance;
      }
    }
    
    return closest;
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLng = this.deg2rad(lng2 - lng1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  private updateDataCount(): void {
    const dataCountElement = document.getElementById('dataCount');
    if (dataCountElement) {
      dataCountElement.textContent = this.locationData.length.toString();
    }
  }

  private loadSampleData(): void {
    this.locationData = [
      // US East Coast
      { lat: 40.7128, lng: -74.0060, zipcode: '10001', state: 'NY', city: 'New York', population: 8336817 },
      { lat: 42.3601, lng: -71.0589, zipcode: '02108', state: 'MA', city: 'Boston', population: 694583 },
      { lat: 39.9526, lng: -75.1652, zipcode: '19101', state: 'PA', city: 'Philadelphia', population: 1584064 },
      { lat: 38.9072, lng: -77.0369, zipcode: '20001', state: 'DC', city: 'Washington DC', population: 702455 },
      { lat: 33.7490, lng: -84.3880, zipcode: '30301', state: 'GA', city: 'Atlanta', population: 498715 },
      { lat: 25.7617, lng: -80.1918, zipcode: '33101', state: 'FL', city: 'Miami', population: 463347 },
      
      // US Midwest
      { lat: 41.8781, lng: -87.6298, zipcode: '60601', state: 'IL', city: 'Chicago', population: 2746388 },
      { lat: 42.3314, lng: -83.0458, zipcode: '48201', state: 'MI', city: 'Detroit', population: 672662 },
      { lat: 44.9778, lng: -93.2650, zipcode: '55401', state: 'MN', city: 'Minneapolis', population: 429954 },
      
      // US South
      { lat: 29.7604, lng: -95.3698, zipcode: '77001', state: 'TX', city: 'Houston', population: 2320268 },
      { lat: 32.7767, lng: -96.7970, zipcode: '75201', state: 'TX', city: 'Dallas', population: 1345047 },
      { lat: 30.2672, lng: -97.7431, zipcode: '78701', state: 'TX', city: 'Austin', population: 964254 },
      
      // US West Coast
      { lat: 37.7749, lng: -122.4194, zipcode: '94101', state: 'CA', city: 'San Francisco', population: 883305 },
      { lat: 34.0522, lng: -118.2437, zipcode: '90001', state: 'CA', city: 'Los Angeles', population: 3990456 },
      { lat: 47.6062, lng: -122.3321, zipcode: '98101', state: 'WA', city: 'Seattle', population: 744955 },
      
      // Canada
      { lat: 43.6532, lng: -79.3832, zipcode: 'M5A', state: 'ON', city: 'Toronto', population: 2930000 },
      { lat: 45.5017, lng: -73.5673, zipcode: 'H2Y', state: 'QC', city: 'Montreal', population: 1780000 },
      { lat: 49.2827, lng: -123.1207, zipcode: 'V6B', state: 'BC', city: 'Vancouver', population: 675218 },
    ];
    
    // console.log(`Loaded ${this.locationData.length} sample locations`);
    this.updateDataCount();
    
    if (this.mapInitialized) {
      this.addNetworkCoverageLayer();
    }
  }
}