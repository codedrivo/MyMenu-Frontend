import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LetsstartComponent } from './letsstart.component';

describe('LetsstartComponent', () => {
  let component: LetsstartComponent;
  let fixture: ComponentFixture<LetsstartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LetsstartComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LetsstartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
