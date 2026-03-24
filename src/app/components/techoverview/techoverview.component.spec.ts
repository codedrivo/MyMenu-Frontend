import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TechoverviewComponent } from './techoverview.component';

describe('TechoverviewComponent', () => {
  let component: TechoverviewComponent;
  let fixture: ComponentFixture<TechoverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TechoverviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TechoverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
