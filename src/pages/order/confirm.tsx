import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { useSession } from "next-auth/react";
import { Layout } from "~/components/Layout";
import { api } from "~/utils/api";
import { type Capacity } from "@prisma/client";

const capacityLabels: Record<Capacity, string> = {
  TEN_G: "10G",
  HUNDRED_G: "100G",
  FOUR_HUNDRED_G: "400G",
};

interface OrderItem {
  routeId: string;
  routeCapacityId: string;
  quantity: number;
  route: {
    id: string;
    name: string;
    aEnd: { name: string; city: string; region: string };
    bEnd: { name: string; city: string; region: string };
  };
  routeCapacity: {
    id: string;
    capacity: Capacity;
    pricePerUnit: number;
  };
}

interface EditingOrderData {
  isEditing: boolean;
  orderId: string;
  items: OrderItem[];
}

export default function OrderConfirm() {
  const router = useRouter();
  const { data: session } = useSession();
  const [quantity, setQuantity] = useState(1);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [editingOrderData, setEditingOrderData] = useState<EditingOrderData | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const { routeId, capacityId, editing } = router.query;

  const { data: routes } = api.route.getAll.useQuery();
  const { data: capacities } = api.capacity.getByRoute.useQuery(
    { routeId: routeId as string },
    { enabled: !!routeId && !isEditing }
  );

  const createOrder = api.order.create.useMutation({
    onSuccess: (order) => {
      // Clear session storage if this was an editing operation
      if (isEditing) {
        sessionStorage.removeItem('orderData');
        sessionStorage.removeItem('editingOrder');
      }
      router.push(`/order/payment?orderId=${order.id}`);
    },
  });

  const updateOrder = api.order.updateOrder.useMutation({
    onSuccess: (order) => {
      // Clear session storage after successful update
      sessionStorage.removeItem('orderData');
      sessionStorage.removeItem('editingOrder');
      router.push(`/order/payment?orderId=${order.id}`);
    },
    onError: (error) => {
      alert(`Error updating order: ${error.message}`);
    },
  });

  useEffect(() => {
    console.log("🔍 Order confirm page - session check:", { 
      hasSession: !!session, 
      sessionUser: session?.user?.email,
      routeId, 
      capacityId,
      editing 
    });
    
    if (!session) {
      console.log("❌ No session in order confirm, redirecting to home");
      router.push("/");
      return;
    }

    // Check if this is an editing operation
    if (editing === 'true') {
      const orderData = sessionStorage.getItem('orderData');
      if (orderData) {
        const parsed = JSON.parse(orderData) as EditingOrderData;
        setEditingOrderData(parsed);
        setIsEditing(true);
        console.log("🔧 Editing mode detected:", parsed);
      }
    }
  }, [session, router, routeId, capacityId, editing]);

  if (!session) {
    return null;
  }

  // Handle editing mode vs normal mode
  if (isEditing && editingOrderData) {
    // Editing mode - we have all the data from sessionStorage
    const totalPrice = editingOrderData.items.reduce((sum, item) => 
      sum + (item.routeCapacity.pricePerUnit * item.quantity), 0
    );

    const handleSubmitEditedOrder = () => {
      if (!acceptedTerms) {
        alert("Please accept the terms and conditions to proceed.");
        return;
      }

      updateOrder.mutate({
        orderId: editingOrderData.orderId,
        items: editingOrderData.items.map(item => ({
          routeId: item.routeId,
          routeCapacityId: item.routeCapacityId,
          quantity: item.quantity,
        })),
      });
    };

    return (
      <Layout>
        <Head>
          <title>Order Confirmation - PathDrive Console</title>
        </Head>

        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Order Confirmation</h1>
            <p className="text-gray-600 mt-2">
              Review your updated order details before proceeding to payment.
            </p>
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-amber-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="text-amber-800 font-medium">
                  Editing Order #{editingOrderData.orderId.slice(-8)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Order Details */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Order Items</h2>
                
                <div className="space-y-6">
                  {editingOrderData.items.map((item, index) => (
                    <div key={index} className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0">
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-medium text-gray-900">{item.route.name}</h3>
                          <div className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">{item.route.aEnd.name}</span>
                            <span className="mx-2">→</span>
                            <span className="font-medium">{item.route.bEnd.name}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {item.route.aEnd.city}, {item.route.aEnd.region} → {item.route.bEnd.city}, {item.route.bEnd.region}
                          </div>
                        </div>

                        <div className="flex justify-between items-center bg-gray-50 p-3 rounded">
                          <div>
                            <div className="font-medium text-gray-900">
                              Capacity: {capacityLabels[item.routeCapacity.capacity]}
                            </div>
                            <div className="text-sm text-gray-600">
                              Quantity: {item.quantity} units × ${item.routeCapacity.pricePerUnit.toFixed(2)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-gray-900">
                              ${(item.routeCapacity.pricePerUnit * item.quantity).toFixed(2)}
                            </div>
                            <div className="text-sm text-gray-500">per month</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Terms and Conditions</h2>
                
                <div className="prose prose-sm text-gray-600 max-h-60 overflow-y-auto border border-gray-200 rounded p-4 mb-4">
                  <h4>Dedicated Ethernet Service Terms</h4>
                  
                  <p><strong>1. Service Level Agreement</strong></p>
                  <p>The Provider guarantees 99.9% uptime for the dedicated ethernet service. Service credits will be applied for any downtime exceeding this threshold.</p>
                  
                  <p><strong>2. Billing Terms</strong></p>
                  <p>Service is billed monthly in advance. Payment is due within 30 days of invoice date. Late payments may result in service suspension.</p>
                  
                  <p><strong>3. Installation and Setup</strong></p>
                  <p>Installation typically takes 30-90 business days depending on location and capacity requirements. Customer will be notified of any delays.</p>
                  
                  <p><strong>4. Cancellation Policy</strong></p>
                  <p>Service may be cancelled with 30 days written notice. Early termination fees may apply for contracts under 12 months.</p>
                  
                  <p><strong>5. Technical Support</strong></p>
                  <p>24/7 technical support is included with all dedicated ethernet services. Support requests can be submitted via portal or phone.</p>
                  
                  <p><strong>6. Acceptable Use</strong></p>
                  <p>Service must be used in compliance with all applicable laws and regulations. Prohibited uses include illegal activities, spam, or network abuse.</p>
                  
                  <p><strong>7. Limitation of Liability</strong></p>
                  <p>Provider's liability is limited to the monthly service fee. Provider is not liable for indirect, incidental, or consequential damages.</p>
                </div>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    I have read and agree to the terms and conditions
                  </span>
                </label>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white shadow rounded-lg p-6 sticky top-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h2>
                
                <div className="space-y-3">
                  {editingOrderData.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <div>
                        <div className="font-medium text-gray-900">
                          {capacityLabels[item.routeCapacity.capacity]} × {item.quantity}
                        </div>
                        <div className="text-gray-600">{item.route.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-900">
                          ${(item.routeCapacity.pricePerUnit * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <div className="border-t pt-3">
                    <div className="flex justify-between">
                      <span className="text-base font-medium text-gray-900">Total</span>
                      <span className="text-base font-medium text-gray-900">
                        ${totalPrice.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Monthly recurring charge</div>
                  </div>
                </div>

                <button
                  onClick={handleSubmitEditedOrder}
                  disabled={!acceptedTerms || updateOrder.isPending}
                  className="w-full mt-6 bg-red-800 text-white py-2 px-4 rounded-md font-medium hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updateOrder.isPending ? "Processing..." : "Update Order & Proceed to Payment"}
                </button>

                <button
                  onClick={() => router.push('/?edit=true')}
                  className="w-full mt-2 bg-gray-100 text-gray-700 py-2 px-4 rounded-md font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Back to Edit Order
                </button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Normal mode - single item order
  if (!routeId || !capacityId) {
    return (
      <Layout>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Order</h1>
          <p className="text-gray-600">Missing required parameters. Please go back and select a route.</p>
        </div>
      </Layout>
    );
  }

  const route = routes?.find(r => r.id === routeId);
  const capacity = capacities?.find(c => c.id === capacityId);

  if (!route || !capacity) {
    return (
      <Layout>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading order details...</p>
        </div>
      </Layout>
    );
  }

  const unitPrice = capacity.pricePerUnit;
  const totalPrice = unitPrice * quantity;

  const handleSubmitOrder = () => {
    if (!acceptedTerms) {
      alert("Please accept the terms and conditions to proceed.");
      return;
    }

    if (quantity > capacity.availableUnits) {
      alert(`Only ${capacity.availableUnits} units are available.`);
      return;
    }

    createOrder.mutate({
      items: [{
        routeId: route.id,
        routeCapacityId: capacity.id,
        quantity: quantity,
      }],
    });
  };

  return (
    <Layout>
      <Head>
        <title>Order Confirmation - PathDrive Console</title>
      </Head>

      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Order Confirmation</h1>
          <p className="text-gray-600 mt-2">
            Review your order details before proceeding to payment.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Route Details</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900">{route.name}</h3>
                  <div className="text-sm text-gray-600 mt-1">
                    <span className="font-medium">{route.aEnd.name}</span>
                    <span className="mx-2">→</span>
                    <span className="font-medium">{route.bEnd.name}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {route.aEnd.city}, {route.aEnd.region} → {route.bEnd.city}, {route.bEnd.region}
                  </div>
                  {route.distance && (
                    <div className="text-xs text-gray-500 mt-1">
                      Distance: {route.distance} km
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-gray-900">
                        Capacity: {capacityLabels[capacity.capacity]}
                      </div>
                      <div className="text-sm text-gray-600">
                        ${capacity.pricePerUnit.toFixed(2)} per unit
                      </div>
                      <div className="text-sm text-gray-600">
                        {capacity.availableUnits} units available
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity
                  </label>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={capacity.availableUnits}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Math.min(capacity.availableUnits, parseInt(e.target.value) || 1)))}
                      className="block w-20 px-3 py-2 border border-gray-300 rounded-md text-center focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <button
                      onClick={() => setQuantity(Math.min(capacity.availableUnits, quantity + 1))}
                      className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      +
                    </button>
                    <span className="text-sm text-gray-500">
                      (max: {capacity.availableUnits})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Terms and Conditions</h2>
              
              <div className="prose prose-sm text-gray-600 max-h-60 overflow-y-auto border border-gray-200 rounded p-4 mb-4">
                <h4>Dedicated Ethernet Service Terms</h4>
                
                <p><strong>1. Service Level Agreement</strong></p>
                <p>The Provider guarantees 99.9% uptime for the dedicated ethernet service. Service credits will be applied for any downtime exceeding this threshold.</p>
                
                <p><strong>2. Billing Terms</strong></p>
                <p>Service is billed monthly in advance. Payment is due within 30 days of invoice date. Late payments may result in service suspension.</p>
                
                <p><strong>3. Installation and Setup</strong></p>
                <p>Installation typically takes 30-90 business days depending on location and capacity requirements. Customer will be notified of any delays.</p>
                
                <p><strong>4. Cancellation Policy</strong></p>
                <p>Service may be cancelled with 30 days written notice. Early termination fees may apply for contracts under 12 months.</p>
                
                <p><strong>5. Technical Support</strong></p>
                <p>24/7 technical support is included with all dedicated ethernet services. Support requests can be submitted via portal or phone.</p>
                
                <p><strong>6. Acceptable Use</strong></p>
                <p>Service must be used in compliance with all applicable laws and regulations. Prohibited uses include illegal activities, spam, or network abuse.</p>
                
                <p><strong>7. Limitation of Liability</strong></p>
                <p>Provider's liability is limited to the monthly service fee. Provider is not liable for indirect, incidental, or consequential damages.</p>
              </div>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  I have read and agree to the terms and conditions
                </span>
              </label>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg p-6 sticky top-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Service</span>
                  <span className="text-sm font-medium text-gray-900">
                    {capacityLabels[capacity.capacity]} Ethernet
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Quantity</span>
                  <span className="text-sm font-medium text-gray-900">{quantity} units</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Unit Price</span>
                  <span className="text-sm font-medium text-gray-900">
                    ${unitPrice.toFixed(2)}
                  </span>
                </div>
                
                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="text-base font-medium text-gray-900">Total</span>
                    <span className="text-base font-medium text-gray-900">
                      ${totalPrice.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Monthly recurring charge</div>
                </div>
              </div>

              <button
                onClick={handleSubmitOrder}
                disabled={!acceptedTerms || createOrder.isPending}
                className="w-full mt-6 bg-red-800 text-white py-2 px-4 rounded-md font-medium hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createOrder.isPending ? "Processing..." : "Proceed to Payment"}
              </button>

              <button
                onClick={() => router.back()}
                className="w-full mt-2 bg-gray-100 text-gray-700 py-2 px-4 rounded-md font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Back to Route Selection
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}