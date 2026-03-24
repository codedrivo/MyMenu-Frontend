import { Component, ElementRef, ViewChild, AfterViewInit,Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IRole } from '../../../../model/interface/role';
import { OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RoleService } from '../../../../role.service';
import { Router } from '@angular/router';
@Component({
  selector: 'app-display-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './display-page.component.html',
  styleUrls: ['./display-page.component.css'] // Fixed typo from styleUrl to styleUrls
})
export class DisplayPageComponent implements OnInit,AfterViewInit{
  rolelist: IRole[] = [];
  pagedList: IRole[] = [];  // This will hold the items for the current page
  currentPage: number = 1;  // Start with page 1
  itemsPerPage: number = 20;  // Show 20 items per page

  Math=Math;


  ngOnInit(): void {
  
    const menunameSafe = this.menuname ?? '';
    const zipcodeSafe = this.zipcode ?? '';
    const distanceSafe =this.distance ?? '';

   

    this.roleService.getForm2(menunameSafe, zipcodeSafe,distanceSafe).subscribe((res: IRole[]) => {
      // console.log('Filtered response:', res);
      this.rolelist = res;
      this.updatePagedList();  // Update the list for the current page
    });
  }

  // Update the list of items to show for the current page
  updatePagedList(): void {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.pagedList = this.rolelist.slice(start, end);
  }

  // Function to change the page
  changePage(page: number): void {
    if (page > 0 && page <= Math.ceil(this.rolelist.length / this.itemsPerPage)) {
      this.currentPage = page;
      this.updatePagedList();
    }
  }

  restaurantname: string | null = '';
  restaurantaddress: string | null = '';
  zipcode: string | null = '';
  category: string | null = '';
  menuname: string | null = '';
  description: string | null = '';
  price: string | null = '';
  distance:string | null='';

  constructor(private route: ActivatedRoute,private roleService: RoleService, private router: Router) {


    this.route.queryParams.subscribe(params => {
      this.restaurantname = params['restaurantname'] ?? '';
      this.restaurantaddress = params['restaurantaddress'] ?? '';
      this.zipcode = params['zipcode'] ?? '';
      this.category = params['category']?? '';
      this.description = params['description'] ?? '';
      this.menuname = params['menuname'] ?? ''; 
      this.price = params['price'] ?? '';
      this.distance=params['distance'] ?? '';
      
    });
  }



  formatDistance(distance: number): string {
    // Convert the distance to a float and format it to 2 decimal places
    return parseFloat(distance.toString()).toFixed(2);
  }

  @Input() item!: { description: string };
  isExpanded: boolean = false;
  showReadMore: boolean = false;
  
  ngAfterViewInit() {
    // Check if description length exceeds a certain threshold to show "Read More"
    this.showReadMore = this.item.description.length > 60;
  }
  
  toggleReadMore() {
    this.isExpanded = !this.isExpanded;
  }

  navigateHome() {
    this.router.navigate(['/letsstart']);
  }

  formatPrice(price: number | string): string {
    if (price === null || price === undefined) return '';
    
    // Convert to number and round to 2 decimal places
    const formattedPrice = Number(price).toFixed(2);
    
    return formattedPrice;
  }
  

  
}
