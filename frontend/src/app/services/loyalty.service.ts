import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class LoyaltyService {
  constructor(private http: HttpClient) {}

  /**
   * Get current user loyalty info
   */
  getLoyalty(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/loyalty/${this.getCurrentUserId()}`);
  }

  /**
   * Redeem loyalty points for discount
   * @param pointsToRedeem Number of points (multiples of 10)
   * @param orderId Optional order ID
   */
  redeemPoints(pointsToRedeem: number, orderId?: string): Observable<any> {
    const body = {
      pointsToRedeem,
      orderId
    };
    return this.http.post(`${environment.apiUrl}/loyalty/redeem`, body).pipe(
      map((response: any) => ({
        success: response.success,
        discount: response.discount,
        remainingPoints: response.newPoints
      }))
    );
  }

  /**
   * Get max redeemable discount based on points (₹ amount)
   */
  getMaxRedeemableDiscount(points: number): number {
    return Math.floor(points / 10);
  }

  /**
   * Get points required for ₹ discount
   */
  getPointsForDiscount(amount: number): number {
    return Math.ceil(amount * 10);
  }

  private getCurrentUserId(): string {
    // Will be set by auth interceptor - fallback
    return localStorage.getItem('userId') || '';
  }
}

