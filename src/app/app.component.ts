import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { LinkService, ShortLink } from './link.service';

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  title = 'snip-frontend';
  readonly urlInput = signal('');
  readonly links = signal<ShortLink[]>([]);
  readonly createdLink = signal<ShortLink | null>(null);
  readonly error = signal('');
  readonly linksError = signal('');
  readonly submitting = signal(false);
  readonly loadingLinks = signal(false);

  private readonly linkService = inject(LinkService);

  constructor() {
    this.loadLinks();
  }

  submit(event: SubmitEvent): void {
    event.preventDefault();
    this.error.set('');
    this.createdLink.set(null);

    const url = this.urlInput().trim();
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      this.error.set('Enter a valid HTTP or HTTPS URL.');
      return;
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      this.error.set('Enter a valid HTTP or HTTPS URL.');
      return;
    }

    this.submitting.set(true);
    this.linkService.createLink(url).subscribe({
      next: (link) => {
        this.createdLink.set(link);
        this.urlInput.set('');
        this.loadLinks();
      },
      error: (requestError: unknown) => {
        this.error.set(this.errorMessage(requestError, 'Could not create the short link.'));
        this.submitting.set(false);
      },
      complete: () => this.submitting.set(false),
    });
  }

  private loadLinks(): void {
    this.loadingLinks.set(true);
    this.linksError.set('');
    this.linkService.listLinks().subscribe({
      next: (links) => this.links.set(links),
      error: (requestError: unknown) => {
        this.linksError.set(this.errorMessage(requestError, 'Could not load links.'));
        this.loadingLinks.set(false);
      },
      complete: () => this.loadingLinks.set(false),
    });
  }

  private errorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const message = error.error?.error;
      if (typeof message === 'string') return message;
      if (error.status === 0) return 'Cannot reach the Snip API at localhost:3000.';
    }
    return fallback;
  }
}
