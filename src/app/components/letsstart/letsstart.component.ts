import { Component } from '@angular/core';
import { RegistrationComponent } from "./lets-srarted/registration/registration.component";
import { RouterModule } from '@angular/router';


@Component({
  selector: 'app-letsstart',
  standalone: true,
  imports: [RegistrationComponent,RouterModule],
  templateUrl: './letsstart.component.html',
  styleUrl: './letsstart.component.css'
})
export class LetsstartComponent {

  

}
