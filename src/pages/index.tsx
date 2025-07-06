import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useSession, signIn } from "next-auth/react";
import { Layout } from "~/components/Layout";
import { RouteSelector } from "~/components/RouteSelector";
import { RouteResults } from "~/components/RouteResults";
import { RouteMap } from "~/components/RouteMap";
import { api } from "~/utils/api";
import { type Route, type Location, type RouteCapacity } from "@prisma/client";

interface RouteWithDetails extends Route {
  aEnd: Location;
  bEnd: Location;
  capacities: RouteCapacity[];
}

interface RouteFilters {
  aEndRegion: string;
  aEndCity: string;
  aEndId: string;
  bEndRegion: string;
  bEndCity: string;
  bEndId: string;
  capacity: string;
}

export default function Home() {
  const router = useRouter();
  const { data: session } = useSession();
  const { logout, edit } = router.query;
  const [filters, setFilters] = useState<RouteFilters>({
    aEndRegion: "",
    aEndCity: "",
    aEndId: "",
    bEndRegion: "",
    bEndCity: "",
    bEndId: "",
    capacity: "",
  });
  const [searchTriggered, setSearchTriggered] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [editingCart, setEditingCart] = useState<any[]>([]);
  const [selectedAEndLocation, setSelectedAEndLocation] = useState<Location | null>(null);
  const [selectedBEndLocation, setSelectedBEndLocation] = useState<Location | null>(null);

  const { data: routes, isLoading } = api.route.getFilteredRoutes.useQuery(
    {
      aEndRegion: filters.aEndRegion || undefined,
      aEndCity: filters.aEndCity || undefined,
      aEndId: filters.aEndId || undefined,
      bEndRegion: filters.bEndRegion || undefined,
      bEndCity: filters.bEndCity || undefined,
      bEndId: filters.bEndId || undefined,
      capacity: filters.capacity ? (filters.capacity as any) : undefined,
    },
    { enabled: searchTriggered }
  );

  // Get location details for map visualization
  const { data: aEndLocationData } = api.location.getById.useQuery(
    { id: filters.aEndId },
    { enabled: !!filters.aEndId }
  );

  const { data: bEndLocationData } = api.location.getById.useQuery(
    { id: filters.bEndId },
    { enabled: !!filters.bEndId }
  );

  const updateOrderMutation = api.order.updateOrder.useMutation({
    onSuccess: (data) => {
      sessionStorage.removeItem('editingOrder');
      router.push(`/order/success?orderId=${data.id}`);
    },
    onError: (error) => {
      alert(`Error updating order: ${error.message}`);
    },
  });

  // Load editing order data when in edit mode
  useEffect(() => {
    if (edit === 'true' && session) {
      const orderData = sessionStorage.getItem('editingOrder');
      if (orderData) {
        const parsed = JSON.parse(orderData);
        setEditingOrder(parsed);
        setEditingCart(parsed.items);
      }
    }
  }, [edit, session]);

  // Update location data for map visualization
  useEffect(() => {
    if (aEndLocationData) {
      setSelectedAEndLocation(aEndLocationData);
    }
  }, [aEndLocationData]);

  useEffect(() => {
    if (bEndLocationData) {
      setSelectedBEndLocation(bEndLocationData);
    }
  }, [bEndLocationData]);

  const handleFiltersChange = (newFilters: RouteFilters) => {
    setFilters(newFilters);
    setSearchTriggered(false);
  };

  const handleSearch = () => {
    setSearchTriggered(true);
  };

  const handleSelectRoute = (route: RouteWithDetails, capacity: RouteCapacity) => {
    console.log("🚀 handleSelectRoute called with:", { 
      routeId: route.id, 
      capacityId: capacity.id, 
      session: !!session,
      routeName: route.name,
      editMode: !!editingOrder
    });
    
    if (!session) {
      console.log("❌ No session, showing alert");
      alert("Please sign in to place an order");
      return;
    }
    
    if (editingOrder) {
      // In edit mode - add to cart or modify existing cart
      const existingItemIndex = editingCart.findIndex(item => 
        item.routeId === route.id && item.routeCapacityId === capacity.id
      );
      
      if (existingItemIndex >= 0) {
        // Update existing item quantity
        const newCart = [...editingCart];
        newCart[existingItemIndex].quantity += 1;
        setEditingCart(newCart);
      } else {
        // Add new item to cart
        const newItem = {
          routeId: route.id,
          routeCapacityId: capacity.id,
          quantity: 1,
          route,
          routeCapacity: capacity,
        };
        setEditingCart([...editingCart, newItem]);
      }
    } else {
      // Normal order flow
      const params = new URLSearchParams({
        routeId: route.id,
        capacityId: capacity.id,
      });
      
      const redirectUrl = `/order/confirm?${params.toString()}`;
      console.log("🎯 Redirecting to:", redirectUrl);
      
      try {
        console.log("🎯 Using router.push for navigation");
        router.push(redirectUrl);
      } catch (error) {
        console.error("❌ Redirect failed:", error);
      }
    }
  };

  const handleProceedToConfirm = () => {
    if (!editingOrder || editingCart.length === 0) {
      alert("Please add at least one service to your order");
      return;
    }

    // Store the updated cart data for the order confirmation page
    const orderData = {
      isEditing: true,
      orderId: editingOrder.orderId,
      items: editingCart.map(item => ({
        routeId: item.routeId,
        routeCapacityId: item.routeCapacityId,
        quantity: item.quantity,
        route: item.route,
        routeCapacity: item.routeCapacity,
      })),
    };
    
    sessionStorage.setItem('orderData', JSON.stringify(orderData));
    
    // Generate URL params for the confirmation page (using first item as primary)
    const firstItem = editingCart[0];
    const params = new URLSearchParams({
      routeId: firstItem.routeId,
      capacityId: firstItem.routeCapacityId,
      editing: 'true',
    });
    
    router.push(`/order/confirm?${params.toString()}`);
  };

  const handleRemoveFromCart = (index: number) => {
    const newCart = [...editingCart];
    newCart.splice(index, 1);
    setEditingCart(newCart);
  };

  const handleUpdateQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFromCart(index);
      return;
    }
    
    const newCart = [...editingCart];
    newCart[index].quantity = quantity;
    setEditingCart(newCart);
  };

  if (!session) {
    return (
      <Layout>
        <Head>
          <title>PathDrive Console - Dedicated Ethernet Pricing</title>
          <meta name="description" content="Find and compare dedicated ethernet routes and pricing" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 opacity-70"></div>
          <div className="relative">
            <div className="text-center py-16 sm:py-20">
              <div className="max-w-4xl mx-auto px-4">
                {logout ? (
                  <div className="mb-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full mb-6">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
                      You've been 
                      <span className="bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent"> logged out</span>
                    </h1>
                    <p className="text-xl text-gray-600 mb-8">
                      Please sign in to view your dashboard and continue using PathDrive Console.
                    </p>
                  </div>
                ) : (
                  <div className="mb-12">
                    <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 mb-6">
                      Welcome to<br/>
                      <span className="bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
                        <span className="text-5xl sm:text-7xl text-red-900">P</span>ath<span className="text-5xl sm:text-7xl text-red-900">D</span>rive<span className="text-5xl sm:text-7xl text-red-900">C</span>onsole
                      </span>
                    </h1>
                    <p className="text-xl sm:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
                      Your dedicated ethernet pricing and ordering platform.<br/>
                      <span className="font-semibold text-gray-700">Sign in to start exploring routes and pricing.</span>
                    </p>
                  </div>
                )}

                {/* Feature Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center mb-4">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Search Routes</h3>
                    <p className="text-gray-600 text-sm">Find available ethernet routes between any two locations</p>
                  </div>

                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mb-4">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Compare Pricing</h3>
                    <p className="text-gray-600 text-sm">View transparent pricing across different capacities</p>
                  </div>

                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-4">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Interactive Maps</h3>
                    <p className="text-gray-600 text-sm">Visualize route details with our interactive mapping</p>
                  </div>

                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center mb-4">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Orders</h3>
                    <p className="text-gray-600 text-sm">Place and track your ethernet service orders</p>
                  </div>
                </div>

                {/* CTA Section */}
                <div className="bg-gradient-to-r from-red-600 to-rose-600 rounded-2xl p-8 text-white">
                  <h2 className="text-2xl font-bold mb-4">Ready to get started?</h2>
                  <p className="text-red-100 mb-6 max-w-2xl mx-auto">
                    Join thousands of businesses who trust PathDrive Console for their dedicated ethernet needs.
                  </p>
                  <button
                    onClick={() => signIn()}
                    className="bg-white text-red-600 px-8 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    Sign In to Continue
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>PathDrive Console - Route Search</title>
        <meta name="description" content="Search and compare dedicated ethernet routes" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <div className="space-y-8">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-red-600 to-rose-600 rounded-2xl p-8 text-white">
          <div className="max-w-4xl">
            <h1 className="text-3xl sm:text-4xl font-bold mb-4">
              Dedicated Ethernet Route Search
            </h1>
            <p className="text-red-100 text-lg sm:text-xl max-w-3xl">
              Find and compare pricing for dedicated ethernet connections between any two locations. 
              Get instant quotes and place orders in minutes.
            </p>
          </div>
        </div>

        {/* Search Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Search Filters */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm">
              <RouteSelector
                onFiltersChange={handleFiltersChange}
                onSearch={handleSearch}
              />
            </div>

          </div>
          
          {/* Results Area */}
          <div className="lg:col-span-2">
            {editingOrder && (
              <div className="mb-6 bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-200 rounded-2xl p-6">
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-amber-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <div>
                    <h3 className="text-lg font-bold text-amber-800">Editing Order #{editingOrder.orderId.slice(-8)}</h3>
                    <p className="text-amber-700">Search for routes and click "Select" to add them to your order, or modify quantities in the cart.</p>
                  </div>
                </div>
              </div>
            )}

            {searchTriggered ? (
              <>
                {isLoading ? (
                  <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm p-8">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-100 to-red-200 rounded-full mb-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-600 border-t-transparent"></div>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Searching Routes</h3>
                      <p className="text-gray-600">Finding the best ethernet routes for your requirements...</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm">
                    <RouteResults
                      routes={routes || []}
                      onSelectRoute={handleSelectRoute}
                    />
                  </div>
                )}
              </>
            ) : editingOrder ? (
              <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm">
                <div className="p-6 border-b border-gray-200/50">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center">
                    <svg className="w-6 h-6 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5-6m0 0h14M7 13v8a1 1 0 001 1h8a1 1 0 001-1v-8M7 13H3" />
                    </svg>
                    Current Order Items ({editingCart.length})
                  </h3>
                  <p className="text-gray-600 mt-1">Review and modify your order items below, or search for additional routes to add.</p>
                </div>
                
                {editingCart.length > 0 ? (
                  <div className="p-6">
                    <div className="space-y-4 mb-6">
                      {editingCart.map((item, index) => (
                        <div key={index} className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="text-lg font-bold text-gray-900 mb-2">{item.route.name}</h4>
                              <div className="space-y-2 text-sm text-gray-600">
                                <div className="flex items-center">
                                  <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  </svg>
                                  {item.route.aEnd.name} → {item.route.bEnd.name}
                                </div>
                                <div className="flex items-center">
                                  <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                                  </svg>
                                  {item.route.aEnd.city}, {item.route.aEnd.region} → {item.route.bEnd.city}, {item.route.bEnd.region}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveFromCart(index)}
                              className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                          <div className="flex items-center justify-between bg-white rounded-lg p-4 border border-gray-200">
                            <div className="flex items-center space-x-4">
                              <label className="text-sm font-medium text-gray-700">Quantity:</label>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleUpdateQuantity(index, parseInt(e.target.value) || 1)}
                                className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                              <span className="text-sm text-gray-600">× ${item.routeCapacity.pricePerUnit.toFixed(2)}/month</span>
                            </div>
                            <span className="text-lg font-bold text-indigo-600">
                              ${(item.routeCapacity.pricePerUnit * item.quantity).toFixed(2)}/month
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="border-t border-gray-200 pt-6">
                      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-xl font-bold text-gray-900">Total Monthly Cost:</span>
                          <span className="text-3xl font-bold text-indigo-600">
                            ${editingCart.reduce((sum, item) => sum + (item.routeCapacity.pricePerUnit * item.quantity), 0).toFixed(2)}
                          </span>
                        </div>
                        <button
                          onClick={handleProceedToConfirm}
                          disabled={editingCart.length === 0}
                          className="w-full bg-gradient-to-r from-red-800 to-red-900 text-white px-6 py-4 rounded-xl font-semibold hover:from-red-900 hover:to-red-950 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Proceed to Confirm Updated Order
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full mb-6">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5-6m0 0h14M7 13v8a1 1 0 001 1h8a1 1 0 001-1v-8M7 13H3" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">No Items in Order</h3>
                    <p className="text-gray-600 mb-6">Search for routes above to add services to your order.</p>
                  </div>
                )}
              </div>
            ) : (
              <RouteMap 
                aEndLocation={selectedAEndLocation || undefined}
                bEndLocation={selectedBEndLocation || undefined}
              />
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
