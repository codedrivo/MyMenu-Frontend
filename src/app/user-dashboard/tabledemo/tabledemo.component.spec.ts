import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableDemoComponent } from './tabledemo.component';

describe('TabledemoComponent', () => {
  let component: TableDemoComponent;
  let fixture: ComponentFixture<TableDemoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableDemoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TableDemoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
