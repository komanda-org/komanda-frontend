import { TestBed } from '@angular/core/testing';
import { ProfessionalPreferencesService } from './professional-preferences.service';

describe('ProfessionalPreferencesService', () => {
  let service: ProfessionalPreferencesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProfessionalPreferencesService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns no preferences when local storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(service.getForEmail('person@example.com')).toBeNull();
  });
});
