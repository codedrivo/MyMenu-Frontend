import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DisplayformoneComponent } from './displayformone.component';

describe('DisplayformoneComponent', () => {
  let component: DisplayformoneComponent;
  let fixture: ComponentFixture<DisplayformoneComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisplayformoneComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DisplayformoneComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
