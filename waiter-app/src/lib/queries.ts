// GraphQL documents used by the waiter app. All served by /backend (existing API).

const USER = 'id name role avatarUrl';

const ITEM = 'id name quantity price subtotal modifiers notes seat course status voidReason productId createdAt';

export const ORDER = `
  id orderNumber ticketNumber status paymentStatus orderType
  subtotal taxAmount discountAmount discountReason serviceCharge tipAmount roundingAmount total paidAmount balanceDue
  guestCount notes tableId tableSessionId createdAt
  table { id name }
  items { ${ITEM} }
  payments { id type method amount tip change createdAt }
`;

export const Q = {
  // ---- pairing & sign-in
  PAIR: `mutation Pair($email: String!, $password: String!, $deviceName: String!, $locationId: ID) {
    pairHandheld(email: $email, password: $password, deviceName: $deviceName, locationId: $locationId) {
      deviceKey organizationName device { id name } location { id name city }
    }
  }`,
  STAFF: `query Staff($deviceKey: String!) { handheldStaff(deviceKey: $deviceKey) { ${USER} } }`,
  LOGIN: `mutation Login($deviceKey: String!, $pin: String!, $userId: ID) {
    handheldLogin(deviceKey: $deviceKey, pin: $pin, userId: $userId) { token user { ${USER} } }
  }`,
  UNPAIR: `mutation Unpair($deviceKey: String!) { unpairHandheld(deviceKey: $deviceKey) }`,
  CONFIG: `query Config { handheldConfig }`,

  // ---- live
  SYNC: `query Sync { syncState { revision myReadyItems myOpenTables permissionsHash serverTime } }`,

  // ---- floor
  FLOOR: `query Floor($locationId: ID!) {
    zones(locationId: $locationId) {
      id name
      tables {
        id name capacity shape status
        activeSession { id guestCount startTime serverUserId server { id name } readyItemCount }
      }
    }
  }`,
  MY_TABLES: `query MyTables { myTables { id guestCount startTime tableId readyItemCount table { id name status capacity } orders { id ticketNumber total balanceDue status items { id status } } } }`,
  SEAT: `mutation Seat($id: ID!, $guestCount: Int!) { seatTable(id: $id, guestCount: $guestCount) { id } }`,
  TABLE_STATUS: `mutation TableStatus($id: ID!, $status: TableStatus!) { updateTableStatus(id: $id, status: $status) { id status } }`,
  CHECKOUT_TABLE: `mutation CheckoutTable($id: ID!) { checkoutTable(id: $id) { id status } }`,
  TABLE_ORDER: `query TableOrder($tableId: ID!) { tableOrder(tableId: $tableId) { ${ORDER} } }`,
  SERVERS: `query Servers { servers(onDutyOnly: false) { user { id name role } clockedInAt openTables } }`,
  ASSIGN: `mutation Assign($tableId: ID!, $serverUserId: ID!, $approverPin: String) {
    assignTable(tableId: $tableId, serverUserId: $serverUserId, approverPin: $approverPin) { id }
  }`,

  // ---- menu
  MENU: `query Menu {
    categories { id name color icon sortOrder }
    products(isActive: true, channel: "POS") {
      id name description price imageUrl color isOpenPrice trackStock dietary categoryId prepMinutes priceOverrides
      inventory { quantity locationId }
      modifierGroups { id name minSelect maxSelect isActive modifiers { id name price isDefault isActive } }
    }
  }`,

  // ---- orders
  OPEN_ORDERS: `query OpenOrders { openOrders { id ticketNumber orderType total balanceDue status paymentStatus guestCount createdAt table { id name } items { id status quantity } } }`,
  PICKUP: `query Pickup { openOrders { id ticketNumber orderType guestCount table { id name } items { id name quantity status seat course notes modifiers } } }`,
  ORDER: `query Order($id: ID!) { order(id: $id) { ${ORDER} } }`,
  CREATE_ORDER: `mutation CreateOrder($input: OrderInput!) { createOrder(input: $input) { ${ORDER} } }`,
  ADD_ITEMS: `mutation AddItems($orderId: ID!, $items: [OrderItemInput!]!, $fire: Boolean) { addOrderItems(orderId: $orderId, items: $items, fire: $fire) { ${ORDER} } }`,
  FIRE: `mutation Fire($orderId: ID!, $course: Int) { fireOrder(orderId: $orderId, course: $course) { ${ORDER} } }`,
  BILL: `mutation Bill($orderId: ID!) { requestBill(orderId: $orderId) { id } }`,
  VOID_ITEM: `mutation Void($itemId: ID!, $reason: String!, $approverPin: String) { voidOrderItem(itemId: $itemId, reason: $reason, approverPin: $approverPin) { ${ORDER} } }`,
  CANCEL: `mutation Cancel($orderId: ID!, $reason: String!, $approverPin: String) { cancelOrder(orderId: $orderId, reason: $reason, approverPin: $approverPin) { id status } }`,
  SPLIT: `mutation Split($orderId: ID!, $itemIds: [ID!]!) { splitOrder(orderId: $orderId, itemIds: $itemIds) { id } }`,
  TRANSFER: `mutation Transfer($orderId: ID!, $tableId: ID!) { transferOrder(orderId: $orderId, tableId: $tableId) { id } }`,
  UPDATE_ORDER: `mutation UpdateOrder($orderId: ID!, $input: OrderUpdateInput!) { updateOrder(orderId: $orderId, input: $input) { ${ORDER} } }`,
  DISCOUNT: `mutation Discount($orderId: ID!, $discount: DiscountInput!) { applyDiscount(orderId: $orderId, discount: $discount) { ${ORDER} } }`,
  REMOVE_DISCOUNT: `mutation RemoveDiscount($orderId: ID!) { removeDiscount(orderId: $orderId) { ${ORDER} } }`,
  PAY: `mutation Pay($orderId: ID!, $payment: PaymentInput!) { addPayment(orderId: $orderId, payment: $payment) { ${ORDER} } }`,
  SERVED: `mutation Served($itemIds: [ID!]!) { markItemsServed(itemIds: $itemIds) { id status } }`,

  // ---- me
  SUMMARY: `query Summary { myShiftSummary { from openTables openChecks openBalance closedChecks covers sales tips averageCheck } }`,
  CLOCK_IN: `mutation ClockIn { clockIn { id clockIn } }`,
  CLOCK_OUT: `mutation ClockOut($breakMinutes: Int) { clockOut(breakMinutes: $breakMinutes) { id clockOut hours } }`,
};
