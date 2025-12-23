import { TestBed } from '@angular/core/testing';

import { SplitzService } from './splitz.service';

describe('SplitzService', () => {
  let service: SplitzService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SplitzService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
