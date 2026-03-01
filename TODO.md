# TODO - Fix Socket Update Issue on Tab Visibility

## Task
Fix socket not updating dashboard and order management when admin returns to the tab after being away.

## Plan

### Step 1: Update SocketService
- [x] Add reconnect event handling to rejoin admin room
- [x] Add Page Visibility API handling to detect when tab becomes visible
- [x] Emit visibility change event for components to refresh data

### Step 2: Update DashboardComponent
- [x] Add visibility change listener to refresh data when tab becomes visible
- [x] Subscribe to socket visibility event

### Step 3: Update OrderManagementComponent  
- [x] Add visibility change listener to refresh data when tab becomes visible
- [x] Subscribe to socket visibility event

## Implementation Notes
- When tab becomes visible, socket should rejoin admin room
- Components should also refresh data from server to get any missed orders
