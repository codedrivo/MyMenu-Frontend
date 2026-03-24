import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DemoVideoComponent } from './demo-video.component';

describe('DemoVideoComponent', () => {
  let component: DemoVideoComponent;
  let fixture: ComponentFixture<DemoVideoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DemoVideoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DemoVideoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
