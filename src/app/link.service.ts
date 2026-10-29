import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface ShortLink {
  code: string;
  url: string;
  shortUrl: string;
  hits: number;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class LinkService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = 'http://localhost:3000/api/links';

  listLinks(): Observable<ShortLink[]> {
    return this.http.get<ShortLink[]>(this.endpoint);
  }

  createLink(url: string): Observable<ShortLink> {
    return this.http.post<ShortLink>(this.endpoint, { url });
  }
}