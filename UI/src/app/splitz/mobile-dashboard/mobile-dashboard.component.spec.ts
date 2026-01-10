import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MobileDashboardComponent } from './mobile-dashboard.component';

describe('MobileDashboardComponent', () => {
  let component: MobileDashboardComponent;
  let fixture: ComponentFixture<MobileDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobileDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MobileDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
