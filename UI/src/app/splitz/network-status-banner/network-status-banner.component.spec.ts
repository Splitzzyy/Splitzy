import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NetworkStatusBannerComponent } from './network-status-banner.component';

describe('NetworkStatusBannerComponent', () => {
  let component: NetworkStatusBannerComponent;
  let fixture: ComponentFixture<NetworkStatusBannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NetworkStatusBannerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NetworkStatusBannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
