import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExcelComponentComponent } from './excel-view.component';

describe('ExcelComponentComponent', () => {
  let component: ExcelComponentComponent;
  let fixture: ComponentFixture<ExcelComponentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExcelComponentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExcelComponentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
