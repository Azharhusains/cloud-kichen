import { Injectable, NgZone } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket;
  private readonly URL = environment.apiUrl.replace('/api', '');
  
  // Subject to emit visibility change events
  private visibilityChangeSubject = new Subject<boolean>();
  public visibilityChange$ = this.visibilityChangeSubject.asObservable();
  
  // Track if admin room is joined
  private isAdminRoomJoined = false;

  constructor(private ngZone: NgZone) {
    console.log('SocketService: Connecting to', this.URL);
    
    this.socket = io(this.URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('SocketService: Connected with ID:', this.socket.id);
      // Rejoin admin room on connect if it was previously joined
      if (this.isAdminRoomJoined) {
        this.joinAdminRoom();
      }
    });

    this.socket.on('disconnect', () => {
      console.log('SocketService: Disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('SocketService: Connection error:', error);
    });
    
    // Handle socket reconnection
    this.socket.on('reconnect', () => {
      console.log('SocketService: Reconnected with ID:', this.socket.id);
      // Rejoin admin room on reconnect
      if (this.isAdminRoomJoined) {
        this.joinAdminRoom();
      }
    });
    
    // Set up Page Visibility API handling
    this.setupVisibilityHandling();
  }
  
  private setupVisibilityHandling(): void {
    // Run outside Angular zone to avoid change detection issues
    this.ngZone.runOutsideAngular(() => {
      document.addEventListener('visibilitychange', () => {
        console.log('SocketService: Visibility changed:', document.visibilityState);
        
        if (document.visibilityState === 'visible') {
          console.log('SocketService: Tab is now visible');
          
          // Check if socket is connected, if not it will auto-reconnect
          if (this.socket.connected) {
            console.log('SocketService: Socket is connected, rejoining admin room');
            // Rejoin admin room when tab becomes visible
            if (this.isAdminRoomJoined) {
              this.joinAdminRoom();
            }
          } else {
            console.log('SocketService: Socket is not connected, will reconnect');
          }
          
          // Emit visibility change event for components
          this.ngZone.run(() => {
            this.visibilityChangeSubject.next(true);
          });
        }
      });
    });
  }

  // Join admin room to receive all order updates (idempotent)
  joinAdminRoom(): void {
    if (this.isAdminRoomJoined) {
      console.log('SocketService: Already in admin room, skipping');
      return;
    }
    console.log('SocketService: Joining admin room');
    this.isAdminRoomJoined = true;
    this.socket.emit('joinAdmin');
  }

  // Join specific order room to receive status updates
  joinOrderRoom(orderId: string): void {
    console.log('SocketService: Joining order room:', orderId);
    this.socket.emit('joinOrder', orderId);
  }

  // Listen for new orders (admin)
  onNewOrder(): Observable<any> {
    console.log('SocketService: Listening for newOrder events');
    return new Observable(observer => {
      this.socket.on('newOrder', (data) => {
        console.log('SocketService: Received newOrder:', data);
        observer.next(data);
      });
    });
  }

  // Listen for order updates (admin)
  onOrderUpdated(): Observable<any> {
    console.log('SocketService: Listening for orderUpdated events');
    return new Observable(observer => {
      this.socket.on('orderUpdated', (data) => {
        console.log('SocketService: Received orderUpdated:', data);
        observer.next(data);
      });
    });
  }

  // Listen for order status changes (customer - via room)
  onOrderStatusChanged(): Observable<any> {
    console.log('SocketService: Listening for orderStatusChanged events');
    return new Observable(observer => {
      this.socket.on('orderStatusChanged', (data) => {
        console.log('SocketService: Received orderStatusChanged:', data);
        observer.next(data);
      });
    });
  }

  // Listen for order status broadcast (fallback - receives all status changes)
  onOrderStatusBroadcast(): Observable<any> {
    console.log('SocketService: Listening for orderStatusBroadcast events');
    return new Observable(observer => {
      this.socket.on('orderStatusBroadcast', (data) => {
        console.log('SocketService: Received orderStatusBroadcast:', data);
        observer.next(data);
      });
    });
  }

  // Listen for order cancellation (admin)
  onOrderCancelled(): Observable<any> {
    console.log('SocketService: Listening for orderCancelled events');
    return new Observable(observer => {
      this.socket.on('orderCancelled', (data) => {
        console.log('SocketService: Received orderCancelled:', data);
        observer.next(data);
      });
    });
  }

  // Listen for order cancellation broadcast (fallback)
  onOrderCancelledBroadcast(): Observable<any> {
    console.log('SocketService: Listening for orderCancelledBroadcast events');
    return new Observable(observer => {
      this.socket.on('orderCancelledBroadcast', (data) => {
        console.log('SocketService: Received orderCancelledBroadcast:', data);
        observer.next(data);
      });
    });
  }

  // Disconnect socket
  disconnect(): void {
    console.log('SocketService: Disconnecting');
    this.socket.disconnect();
  }

  // Listen for table status changes (admin room)
  onTableStatusChanged(): Observable<any> {
    console.log('SocketService: Listening for tableStatusChanged events');
    return new Observable(observer => {
      this.socket.on('tableStatusChanged', (data) => {
        console.log('SocketService: Received tableStatusChanged:', data);
        observer.next(data);
      });
    });
  }

  // Listen for table status broadcast (fallback - receives all status changes)
  onTableStatusBroadcast(): Observable<any> {
    console.log('SocketService: Listening for tableStatusBroadcast events');
    return new Observable(observer => {
      this.socket.on('tableStatusBroadcast', (data) => {
        console.log('SocketService: Received tableStatusBroadcast:', data);
        observer.next(data);
      });
    });
  }

// Listen for revenue updates (admin)
  onRevenueUpdated(): Observable<any> {
    console.log('SocketService: Listening for revenueUpdated events');
    return new Observable(observer => {
      this.socket.on('revenueUpdated', (data) => {
        console.log('SocketService: Received revenueUpdated:', data);
        observer.next(data);
      });
    });
  }

  // Listen for table updates (general)
  onTableUpdated(): Observable<any> {
    console.log('SocketService: Listening for tableUpdated events');
    return new Observable(observer => {
      this.socket.on('tableUpdated', (data) => {
        console.log('SocketService: Received tableUpdated:', data);
        observer.next(data);
      });
    });
  }
}

