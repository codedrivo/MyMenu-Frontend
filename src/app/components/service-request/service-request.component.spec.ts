import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ServiceRequestComponent } from './service-request.component';

describe('ServiceRequestComponent', () => {
  let component: ServiceRequestComponent;
  let fixture: ComponentFixture<ServiceRequestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceRequestComponent, ReactiveFormsModule]
    }).compileComponents();
    
    fixture = TestBed.createComponent(ServiceRequestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('form should be invalid when empty', () => {
    expect(component.ticketForm.valid).toBeFalsy();
  });

  it('should validate required fields', () => {
    const titleControl = component.ticketForm.get('title');
    const descriptionControl = component.ticketForm.get('description');
    const reportedByControl = component.ticketForm.get('reportedBy');
    
    expect(titleControl?.valid).toBeFalsy();
    expect(descriptionControl?.valid).toBeFalsy();
    expect(reportedByControl?.valid).toBeFalsy();
  });
});