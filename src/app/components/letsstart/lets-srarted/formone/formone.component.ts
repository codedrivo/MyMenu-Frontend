// Add this import at the top of the file with the other imports
import { Component, inject, ViewChild, OnInit, HostListener, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { IRole } from '../../../../model/interface/role';
import { RoleService } from '../../../../role.service';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

@Component({
  selector: 'app-formone',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './formone.component.html',
  styleUrl: './formone.component.css'
})

export class FormoneComponent implements OnInit {
  myForm: FormGroup;
  
  // Search results data
  rolelist: IRole[] = [];
  pagedList: IRole[] = [];
  currentPage: number = 1;
  itemsPerPage: number = 10;
  isLoading: boolean = false;
  error: string = '';
  hasSearched: boolean = false;

  showSortMenu: boolean = false;
currentSort: string = 'distance_asc'; 
  
  // Add this property to fix the error
  showExportMenu: boolean = false;
  
  // Add properties for price and distance filters
  priceRange: { min: number; max: number } = { min: 0, max: 100 };
  distanceRange: { min: number; max: number } = { min: 0, max: 5 };
  
  // Original unfiltered results
  originalResults: IRole[] = [];
  
  Math = Math;

  constructor(
    private fb: FormBuilder, 
    private router: Router,
    private roleService: RoleService
  ) {
    this.myForm = this.fb.group({
      menuname: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9.,()' \s]*$/)]],
      description: [''],
      price: [''],
      zipcode: ['', [Validators.required, this.usZipCodeValidator]],
      restaurantStyle: [''],
      // Add these new form controls for multiple restaurant type selection
      casualDining: [false],
      qsr: [false],
      fineDining: [false],
      menuCategory: [''],
      // Add form controls for price and distance ranges
      minPrice: [0],
      maxPrice: [100],
      minDistance: [0],
      maxDistance: [5]
    });
  }

  ngOnInit(): void {
    // Component initialization
  }

  onSubmit() {
    // console.log('Form validity:', this.myForm.valid, 'Form value:', this.myForm.value);
    if (this.myForm.valid) {
      const formValue = this.myForm.value;
      const menunameTrimmed = formValue.menuname.trim().replace(/\s+/g, ' ');

      if (!menunameTrimmed) {
        // console.log('Menu name is empty after trimming');
        return;
      }

      this.hasSearched = true;
      this.fetchSearchResults(formValue);
    } else {
      this.myForm.markAllAsTouched();
    }
  }

  // Toggle sort menu visibility
toggleSortMenu(): void {
  this.showSortMenu = !this.showSortMenu;
}

// Get the label for the current sort option
getSortLabel(): string {
  switch (this.currentSort) {
    case 'price_asc': return 'Price (Low to High)';
    case 'price_desc': return 'Price (High to Low)';
    case 'distance_asc': return 'Distance (Nearest)';
    case 'distance_desc': return 'Distance (Farthest)';
    case 'name_asc': return 'Name (A-Z)';
    case 'name_desc': return 'Name (Z-A)';
    default: return 'Distance (Nearest)';
  }
}

// Sort the results based on the selected option
sortResults(sortOption: string): void {
  this.currentSort = sortOption;
  this.showSortMenu = false; // Close the menu after selection
  
  // Sort the rolelist array based on the selected option
  this.rolelist.sort((a, b) => {
    // Handle null/undefined values
    const aPrice = a.price ?? Number.MAX_VALUE;
    const bPrice = b.price ?? Number.MAX_VALUE;
    const aDistance = a.distance_from_zipcode ?? Number.MAX_VALUE;
    const bDistance = b.distance_from_zipcode ?? Number.MAX_VALUE;
    const aName = a.restaurant_name?.toLowerCase() ?? '';
    const bName = b.restaurant_name?.toLowerCase() ?? '';
    
    switch (sortOption) {
      case 'price_asc':
        return aPrice - bPrice;
      case 'price_desc':
        return bPrice - aPrice;
      case 'distance_asc':
        return aDistance - bDistance;
      case 'distance_desc':
        return bDistance - aDistance;
      case 'name_asc':
        return aName.localeCompare(bName);
      case 'name_desc':
        return bName.localeCompare(aName);
      default:
        return aDistance - bDistance; // Default to distance ascending
    }
  });
  
  // Update the paged list to reflect the new sort order
  this.updatePagedList();
}

  private fetchSearchResults(formValue: any): void {
    this.isLoading = true;
    this.error = '';
    this.rolelist = [];
    this.pagedList = [];
    this.currentPage = 1;

    const menunameSafe = formValue.menuname?.trim() || '';
    const zipcodeSafe = formValue.zipcode || '';
    
    // Get selected restaurant types
    const selectedTypes: string[] = [];
    if (formValue.casualDining) selectedTypes.push('Casual Dining');
    if (formValue.qsr) selectedTypes.push('QSR');
    if (formValue.fineDining) selectedTypes.push('Fine Dining');
    
    const priceNum = formValue.price ? parseFloat(formValue.price) : undefined;
    const descriptionSafe = formValue.description || '';
    const categorySafe = formValue.menuCategory || '';

    // console.log('Sending search parameters:', {
    //   menuname: menunameSafe,
    //   zipcode: zipcodeSafe,
    //   selectedTypes,
    //   price: priceNum,
    //   description: descriptionSafe,
    //   category: categorySafe
    // });

    // Pass empty string for style as we'll handle filtering for multiple types after
    this.roleService.getForm1(
      menunameSafe,
      zipcodeSafe,
      '',  // Empty style parameter
      priceNum,
      descriptionSafe,
      categorySafe
    ).subscribe({
      next: (res: IRole[]) => {
        // console.log('Search results received:', res);
        
        // Store original results for filtering
        this.originalResults = res || [];
        
        // Initialize price and distance ranges based on results
        this.initializeRanges(this.originalResults);
        
        // Filter by selected restaurant types if any are selected
        if (selectedTypes.length > 0) {
          this.rolelist = this.originalResults.filter(item => {
            const itemStyle = item.restaurant_type?.trim() || '';
            return selectedTypes.some(type => itemStyle === type);
          });
        } else {
          // If no types selected, show all results
          this.rolelist = [...this.originalResults];
        }
        
        // Apply initial price and distance filters
        this.applyFilters();
        
        this.updatePagedList();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching results:', error);
        this.error = error.message || 'No results found. Try refining your search.';
        this.isLoading = false;
        this.rolelist = [];
        this.updatePagedList();
      }
    });
  }

  // Initialize price and distance ranges based on results
  initializeRanges(results: IRole[]): void {
    if (results.length === 0) {
      // console.log('No results to initialize ranges');
      return;
    }
    
    // console.log('Initializing ranges with', results.length, 'results');
    
    // Find min and max prices
    const prices = results
      .map(item => item.price)
      .filter(price => price !== undefined && price !== null) as number[];
    
    if (prices.length > 0) {
      const minPrice = Math.floor(Math.min(...prices));
      const maxPrice = Math.ceil(Math.max(...prices));
      
      this.priceRange = { min: minPrice, max: maxPrice };
      this.myForm.patchValue({
        minPrice: minPrice,
        maxPrice: maxPrice
      });
      
      // console.log('Price range initialized:', this.priceRange);
    } else {
      // console.log('No valid prices found in results');
    }
    
    // Find min and max distances
    const distances = results
      .map(item => item.distance_from_zipcode)
      .filter(distance => distance !== undefined && distance !== null) as number[];
    
    if (distances.length > 0) {
      const minDistance = 0; // Always start from 0
      const maxDistance = Math.ceil(Math.max(...distances));
      
      this.distanceRange = { min: minDistance, max: maxDistance };
      this.myForm.patchValue({
        minDistance: minDistance,
        maxDistance: maxDistance
      });
      
      // console.log('Distance range initialized:', this.distanceRange);
    } else {
      // console.log('No valid distances found in results');
    }
  }

  // Apply price and distance filters
  applyFilters(): void {
    if (!this.originalResults.length) {
      // console.log('No original results to filter');
      return;
    }
    
    const minPrice = this.myForm.get('minPrice')?.value;
    const maxPrice = this.myForm.get('maxPrice')?.value;
    const minDistance = this.myForm.get('minDistance')?.value;
    const maxDistance = this.myForm.get('maxDistance')?.value;
    
    // console.log('Applying filters with:', {
    //   priceRange: [minPrice, maxPrice],
    //   distanceRange: [minDistance, maxDistance],
    //   originalResultsCount: this.originalResults.length
    // });
    
    // Get selected restaurant types
    const selectedTypes: string[] = [];
    if (this.myForm.get('casualDining')?.value) selectedTypes.push('Casual Dining');
    if (this.myForm.get('qsr')?.value) selectedTypes.push('QSR');
    if (this.myForm.get('fineDining')?.value) selectedTypes.push('Fine Dining');
    
    // Filter results based on price and distance ranges
    this.rolelist = this.originalResults.filter(item => {
      // Filter by restaurant type if any selected
      const passesTypeFilter = selectedTypes.length === 0 || 
        (item.restaurant_type && selectedTypes.includes(item.restaurant_type.trim()));
      
      // Filter by price
      const price = item.price;
      const passesPrice = price === undefined || price === null || 
        (price >= minPrice && price <= maxPrice);
      
      // Filter by distance
      const distance = item.distance_from_zipcode;
      const passesDistance = distance === undefined || distance === null || 
        (distance >= minDistance && distance <= maxDistance);
      
      return passesTypeFilter && passesPrice && passesDistance;
    });
    
    // console.log('Filtered results count:', this.rolelist.length);
    
    // Reset to first page and update display
    this.currentPage = 1;
    this.updatePagedList();
    this.sortResults(this.currentSort);
  }

  // Handle slider changes
  onPriceRangeChange(): void {
    // console.log('Price range changed:', {
    //   min: this.myForm.get('minPrice')?.value,
    //   max: this.myForm.get('maxPrice')?.value
    // });
    this.applyFilters();
  }

  onDistanceRangeChange(): void {
    // console.log('Distance range changed:', {
    //   min: this.myForm.get('minDistance')?.value,
    //   max: this.myForm.get('maxDistance')?.value
    // });
    this.applyFilters();
  }

  clearSearch(): void {
    this.myForm.reset();
    this.rolelist = [];
    this.pagedList = [];
    this.hasSearched = false;
    this.error = '';
    this.currentPage = 1;
  }

  formatPrice(price: number | string | undefined): string {
    if (!price && price !== 0) return 'N/A';
    const formattedPrice = '$' + Number(price).toFixed(2);
    // console.log('Formatting price:', price, 'to:', formattedPrice);
    return formattedPrice;
  }

  formatDistance(distance: number | string | undefined): string {
    if (!distance && distance !== 0) return 'N/A';
    const formattedDistance = Number(distance).toFixed(2) + ' miles';
    // console.log('Formatting distance:', distance, 'to:', formattedDistance);
    return formattedDistance;
  }

  updatePagedList(): void {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.pagedList = this.rolelist.slice(start, end);
    
    // Reset expanded rows when changing pages
    this.expandedRows = new Array(this.pagedList.length).fill(false);
    this.areAllRowsExpanded = false;
  }

  changePage(page: number): void {
    const maxPage = this.getTotalPages();
    if (page > 0 && page <= maxPage) {
      this.currentPage = page;
      this.updatePagedList();
    }
  }

  getTotalPages(): number {
    return Math.ceil(this.rolelist.length / this.itemsPerPage) || 1;
  }

  getPageNumbers(): number[] {
    return Array.from({ length: this.getTotalPages() }, (_, i) => i + 1);
  }

  usZipCodeValidator(control: any): { [key: string]: boolean } | null {
    const zipCodeRegex = /^\d{5}(-\d{4})?$/;
    if (control.value && !zipCodeRegex.test(control.value)) {
      return { invalidZipCode: true };
    }
    return null;
  }

  openVideoInNewTab(): void {
    window.open('assets/letstart-demovideo.mp4', '_blank');
  }
  
  expandedRows: boolean[] = [];
  
  toggleExpand(index: number): void {
    this.expandedRows[index] = !this.expandedRows[index];
  }
  
  getDistanceClass(distance: number): string {
    if (distance <= 1) return 'bg-green-100 text-green-800';
    if (distance <= 3) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  }
  
  // Add these properties to your class
  areAllRowsExpanded: boolean = false;
  
  // Add these methods to your class
  toggleAllRows(): void {
    this.areAllRowsExpanded = !this.areAllRowsExpanded;
    this.expandedRows = new Array(this.pagedList.length).fill(this.areAllRowsExpanded);
  }
  
  // Fix the HostListener implementation
  @HostListener('document:click', ['$event'])
clickOutside(event: Event): void {
  const target = event.target as HTMLElement;
  // Close the export menu when clicking outside
  if (this.showExportMenu && !target.closest('.relative.inline-block:has(button[class*="bg-blue-600"])')) {
    this.showExportMenu = false;
  }
  // Close the sort menu when clicking outside
  if (this.showSortMenu && !target.closest('.relative.inline-block:has(button[class*="bg-gray-100"])')) {
    this.showSortMenu = false;
  }
}
  
  toggleExportMenu(): void {
    this.showExportMenu = !this.showExportMenu;
  }
  
  // Fix the type for the cell parameter
  exportData(format: 'csv' | 'xlsx' | 'pdf'): void {
    if (!this.rolelist.length) return;
    
    this.showExportMenu = false; // Close the menu after selection
    
    // Define the headers and data (same for all formats)
    const headers = [
      'Restaurant Name',
      'Menu Item',
      'Price',
      'Distance',
      'Description',
      'Menu Section',
      'Restaurant Type',
      'Cuisine Type',
      'ZIP Code'
    ];
    
    const data = this.rolelist.map(item => [
      item.restaurant_name || 'N/A',
      item.menu_item_name || 'N/A',
      this.formatPrice(item.price), // Use formatPrice instead of raw value
      this.formatDistance(item.distance_from_zipcode), // Use formatDistance instead of raw value
      item.description || 'N/A',
      item.menu_section || 'N/A',
      item.restaurant_type || 'N/A',
      Array.isArray(item.cuisine_type) ? item.cuisine_type.join(', ') : 'N/A',
      item.zip_or_postal_code || 'N/A'
    ]);
    
    const fileName = `menu-price-comparison-${new Date().toISOString().slice(0, 10)}`;
    
    switch (format) {
      case 'csv':
        this.exportToCSV(headers, data, fileName);
        break;
      case 'xlsx':
        this.exportToXLSX(headers, data, fileName);
        break;
      case 'pdf':
        this.exportToPDF(headers, data, fileName);
        break;
    }
  }
  
  // Modified CSV export to use the common data format
  private exportToCSV(headers: string[], data: any[][], fileName: string): void {
    // Combine headers and data
    const csvContent = [
      headers.join(','),
      ...data.map(row => row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  // New method for XLSX export
  private exportToXLSX(headers: string[], data: any[][], fileName: string): void {
    // For XLSX export, we'll need to dynamically load the xlsx library
    // This approach avoids adding it as a permanent dependency if it's not frequently used
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    script.async = true;
    script.onload = () => {
      // Once the library is loaded, we can use it
      const XLSX = (window as any).XLSX;
      
      // Prepare worksheet data with headers
      const ws_data = [headers, ...data];
      const ws = XLSX.utils.aoa_to_sheet(ws_data);
      
      // Create workbook and add the worksheet
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Menu Comparison');
      
      // Generate and download the file
      XLSX.writeFile(wb, `${fileName}.xlsx`);
    };
    
    script.onerror = () => {
      alert('Failed to load Excel export library. Please try CSV format instead.');
    };
    
    document.body.appendChild(script);
  }
  
  // New method for PDF export
  private exportToPDF(headers: string[], data: any[][], fileName: string): void {
    // For PDF export, we'll need to dynamically load the jspdf and jspdf-autotable libraries
    const jsPDFScript = document.createElement('script');
    jsPDFScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    jsPDFScript.async = true;
    
    jsPDFScript.onload = () => {
      const autoTableScript = document.createElement('script');
      autoTableScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js';
      autoTableScript.async = true;
      
      autoTableScript.onload = () => {
        // Once both libraries are loaded, we can use them
        const { jsPDF } = (window as any).jspdf;
        
        // Create a new PDF document
        const doc = new jsPDF();
        
        // Add title
        doc.setFontSize(16);
        doc.text('Menu Price Comparison', 14, 15);
        doc.setFontSize(10);
        doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 22);
        
        // Add the table
        (doc as any).autoTable({
          head: [headers],
          body: data,
          startY: 30,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [66, 139, 202], textColor: 255 },
          columnStyles: { 2: { halign: 'right' } } // Price column right-aligned
        });
        
        // Save the PDF
        doc.save(`${fileName}.pdf`);
      };
      
      autoTableScript.onerror = () => {
        alert('Failed to load PDF export library. Please try CSV format instead.');
      };
      
      document.body.appendChild(autoTableScript);
    };
    
    jsPDFScript.onerror = () => {
      alert('Failed to load PDF export library. Please try CSV format instead.');
    };
    
    document.body.appendChild(jsPDFScript);
  }
}
