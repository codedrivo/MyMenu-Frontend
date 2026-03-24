import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { IRole } from '../../../../model/interface/role';
import { RoleService } from '../../../../role.service';

@Component({
  selector: 'app-displayformone',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './displayformone.component.html',
  styleUrls: ['./displayformone.component.css']
})
export class DisplayformoneComponent implements OnInit {
  rolelist: IRole[] = [];
  pagedList: IRole[] = [];
  currentPage: number = 1;
  itemsPerPage: number = 20;
  isLoading: boolean = false;
  error: string = '';

  Math = Math;

  zipcode: string = '';
  section: string = '';
  menuname: string = '';
  description: string = '';
  price: string = '';
  style: string = '';
  restaurant_type: string = '';
  cuisine_type: string = '';
  distance_from_restaurant: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private roleService: RoleService
  ) {
    this.route.queryParams.subscribe(params => {
      this.zipcode = params['zipcode'] || '';
      this.section = params['section'] || '';
      this.description = params['description'] || '';
      this.menuname = params['menuname'] || ''; // Ensure multi-word values are preserved
      this.price = params['price'] || '';
      this.distance_from_restaurant = params['distance_from_restaurant'] || '';
      this.style = params['restaurantStyle'] || '';
      this.cuisine_type = params['menuCategory'] || '';

      // console.log('Query params received:', {
      //   zipcode: this.zipcode,
      //   menuname: this.menuname,
      //   style: this.style,
      //   price: this.price,
      //   description: this.description,
      //   cuisine_type: this.cuisine_type
      // });
    });
  }

  ngOnInit(): void {
    this.fetchSearchResults();
  }

  private fetchSearchResults(): void {
    this.isLoading = true;
    this.error = '';
    this.rolelist = [];
    this.pagedList = [];

    const menunameSafe = this.menuname || '';
    const zipcodeSafe = this.zipcode || '';
    const styleSafe = this.style || '';
    const priceNum = this.price ? parseFloat(this.price) : undefined;
    const descriptionSafe = this.description || '';
    const categorySafe = this.cuisine_type || '';

    // console.log('Sending search parameters:', {
    //   menuname: menunameSafe,
    //   zipcode: zipcodeSafe,
    //   style: styleSafe,
    //   price: priceNum,
    //   description: descriptionSafe,
    //   category: categorySafe
    // });

    this.roleService.getForm1(
      menunameSafe,
      zipcodeSafe,
      styleSafe,
      priceNum,
      descriptionSafe,
      categorySafe
    ).subscribe({
      next: (res: IRole[]) => {
        // console.log('Search results received:', res);
        this.rolelist = res || [];
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

  formatPrice(price: number | string | undefined): string {
    if (!price && price !== 0) return 'N/A';
    return Number(price).toFixed(2);
  }

  formatDistance(distance: number | string | undefined): string {
    if (!distance && distance !== 0) return 'N/A';
    return Number(distance).toFixed(2);
  }

  updatePagedList(): void {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.pagedList = this.rolelist.slice(start, end);
  }

  changePage(page: number): void {
    const maxPage = this.getTotalPages();
    if (page > 0 && page <= maxPage) {
      this.currentPage = page;
      this.updatePagedList();
    }
  }

  navigateHome(): void {
    this.router.navigate(['/letsstart']);
  }

  getTotalPages(): number {
    return Math.ceil(this.rolelist.length / this.itemsPerPage) || 1;
  }

  getPageNumbers(): number[] {
    return Array.from({ length: this.getTotalPages() }, (_, i) => i + 1);
  }
}