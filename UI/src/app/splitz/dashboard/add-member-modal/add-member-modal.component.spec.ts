import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddMemberModalComponent } from './add-member-modal.component';

describe('AddMemberModalComponent', () => {
  let component: AddMemberModalComponent;
  let fixture: ComponentFixture<AddMemberModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddMemberModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddMemberModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
