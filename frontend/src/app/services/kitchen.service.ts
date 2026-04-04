import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';


export interface Kitchen {
  _id: string;
  name: string;
  ownerId: {
    _id: string;
    name: string;
    email: string;
  };
  locations: any[];
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class KitchenService {
  constructor(
    private http: HttpClient,
  ) {}

  getMyKitchens(): Observable<Kitchen[]> {
    return this.http.get<Kitchen[]>(`${environment.apiUrl}/kitchens`);
  }

  switchCurrentKitchen(kitchenId: string): Observable<any> {
    return this.http.patch(`${environment.apiUrl}/kitchens/${kitchenId}/switch`, {});
  }

  createKitchen(kitchenData: any): Observable<Kitchen> {
    return this.http.post<Kitchen>(`${environment.apiUrl}/kitchens`, kitchenData);
  }
}
