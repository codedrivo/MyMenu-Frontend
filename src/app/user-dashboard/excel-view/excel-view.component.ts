import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-excel-view',
  template: `
    <div class="p-4">
      <h2 class="text-2xl font-bold mb-4">Report for {{ month }} - {{ restaurantName }}</h2>
      <table class="w-full table-auto border-collapse border border-gray-300">
        <thead>
          <tr>
            <th *ngFor="let header of headers" class="border px-4 py-2">
              {{ header }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let row of excelData">
            <td *ngFor="let header of headers" class="border px-4 py-2">
              {{ row[header] }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `
})
export class ExcelViewComponent implements OnInit {
  excelData: any[] = [];
  headers: string[] = [];
  month: string = '';
  restaurantName: string = '';

  constructor(private router: Router) {
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state) {
      this.excelData = navigation.extras.state['excelData'];
      this.month = navigation.extras.state['month'];
      this.restaurantName = navigation.extras.state['restaurantName'];
      
      // Extract headers dynamically
      this.headers = this.excelData.length > 0 
        ? Object.keys(this.excelData[0]) 
        : [];
    }
  }

  ngOnInit(): void {}
}