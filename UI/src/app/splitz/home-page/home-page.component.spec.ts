import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HomePageComponent } from './home-page.component';

describe('HomePageComponent', () => {
  let component: HomePageComponent;
  let fixture: ComponentFixture<HomePageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ HomePageComponent ],
      imports: [ RouterTestingModule ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should navigate to login', () => {
    const navigateSpy = spyOn(component['router'], 'navigate');
    component.navigateToLogin();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });

  it('should navigate to register', () => {
    const navigateSpy = spyOn(component['router'], 'navigate');
    component.navigateToRegister();
    expect(navigateSpy).toHaveBeenCalledWith(['/register']);
  });
});