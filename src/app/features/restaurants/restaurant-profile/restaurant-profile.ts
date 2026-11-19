import { Component, DestroyRef, afterNextRender, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { isApiError } from '../../../core/models/api-error.model';
import { Review } from '../../../core/models/profile.model';
import { OpenJob, Restaurant } from '../../../core/models/restaurant.model';
import { ProfileService } from '../../../core/services/profile.service';
import { RestaurantsService } from '../../../core/services/restaurants.service';
import { describeError } from '../../../core/utils/http-error';
import { formatRating, starFills } from '../../../core/utils/rating';
import { initials } from '../../../core/utils/text';

type PageState = 'loading' | 'error' | 'not-found' | 'ready';
type SectionState = 'loading' | 'error' | 'ready';

export function formatLocation(restaurant: Restaurant): string | null {
  return [restaurant.city, restaurant.state].filter(Boolean).join(', ') || null;
}

@Component({
  selector: 'app-restaurant-profile',
  imports: [RouterLink],
  templateUrl: './restaurant-profile.html',
  styleUrl: './restaurant-profile.scss',
})
export class RestaurantProfile {
  private readonly route = inject(ActivatedRoute);
  private readonly restaurants = inject(RestaurantsService);
  private readonly profiles = inject(ProfileService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly formatRating = formatRating;
  protected readonly starFills = starFills;
  protected readonly initials = initials;

  // TODO API: a lista de avaliacoes nao traz o autor; rotulo fixo ate o back-end enviar o nome.
  protected readonly reviewerLabel = 'Profissional';

  private slug = '';

  protected readonly state = signal<PageState>('loading');
  protected readonly errorMessage = signal('');
  protected readonly restaurant = signal<Restaurant | null>(null);

  protected readonly jobsState = signal<SectionState>('loading');
  protected readonly jobs = signal<OpenJob[]>([]);

  protected readonly reviewsState = signal<SectionState>('loading');
  protected readonly reviews = signal<Review[]>([]);

  protected readonly location = computed(() => {
    const restaurant = this.restaurant();
    return restaurant ? formatLocation(restaurant) : null;
  });

  constructor() {
    // A chamada so roda no browser; e o paramMap (e nao o snapshot) recarrega ao trocar de restaurante sem sair da rota.
    afterNextRender(() => {
      this.route.paramMap
        .pipe(
          map((params) => params.get('slug') ?? ''),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe((slug) => {
          this.slug = slug;
          this.load();
        });
    });
  }

  protected load(): void {
    this.state.set('loading');
    this.restaurant.set(null);

    this.restaurants
      .getBySlug(this.slug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (restaurant) => {
          this.restaurant.set(restaurant);
          this.state.set('ready');
          this.loadJobs();
          this.loadReviews();
        },
        error: (error: unknown) => {
          if (isApiError(error) && error.status === 404) {
            this.state.set('not-found');
            return;
          }
          this.errorMessage.set(describeError(error, 'o perfil do restaurante'));
          this.state.set('error');
        },
      });
  }

  protected loadJobs(): void {
    this.jobsState.set('loading');

    this.restaurants
      .listOpenJobs(this.slug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (jobs) => {
          this.jobs.set(jobs);
          this.jobsState.set('ready');
        },
        error: () => this.jobsState.set('error'),
      });
  }

  protected loadReviews(): void {
    const restaurant = this.restaurant();
    if (!restaurant) {
      return;
    }

    this.reviewsState.set('loading');

    this.profiles
      .listReviews(restaurant.userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (reviews) => {
          this.reviews.set(reviews.filter((review) => !!review.comment));
          this.reviewsState.set('ready');
        },
        error: () => this.reviewsState.set('error'),
      });
  }
}
