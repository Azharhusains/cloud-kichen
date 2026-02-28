import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket;
  private readonly URL = environment.apiUrl.replace('/api', '');

  constructor() {
    console.log('SocketService: Connecting to', this.URL);
    
    this.socket = io(this.URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('SocketService: Connected with ID:', this.socket.id);
    });

    this.socket.on('disconnect', () => {
      console.log('SocketService: Disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('SocketService: Connection error:', error);
    });
  }

  // Join admin room to receive all order updates
  joinAdminRoom(): void {
    console.log('SocketService: Joining admin room');
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

  // Disconnect socket
  disconnect(): void {
    console.log('SocketService: Disconnecting');
    this.socket.disconnect();
  }
}
