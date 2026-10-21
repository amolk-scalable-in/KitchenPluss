import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Flame } from 'lucide-react';
import {
  ticketsApi,
  ingredientsApi,
  recipesApi,
  prepLogsApi,
  foodCostApi,
  supplierOrdersApi,
  aiApi,
} from './api/client.js';
import { useSocket } from './hooks/useSocket.js';
import { Header, AppTab } from './components/Header.js';
import { NavigationMenu } from './components/NavigationMenu.js';
import { StationFilter } from './components/StationFilter.js';
import { KdsBoard } from './components/KdsBoard.js';
import { NewTicketModal } from './components/NewTicketModal.js';
import { InventoryView } from './components/InventoryView.js';
import { AiPrepView } from './components/AiPrepView.js';
import { WasteLogForm } from './components/WasteLogForm.js';
import { UserManagementView } from './components/UserManagementView.js';
import { AuthPortal } from './components/AuthPortal.js';
import { RecipesManagerView } from './components/RecipesManagerView.js';
import { useAuth } from './context/AuthContext.js';
import { TicketStatus, AiPrepSheetResponse } from './types/index.js';

export function App() {
  const { isAuthenticated, isLoading, hasAdminAccess } = useAuth();

  const [activeTab, setActiveTab] = useState<AppTab>('kds');
  const [selectedStation, setSelectedStation] = useState<string>('ALL');
  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState<boolean>(false);
  const [updatingTicketId, setUpdatingTicketId] = useState<string | null>(null);
  const [prepSheet, setPrepSheet] = useState<AiPrepSheetResponse | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);

  const queryClient = useQueryClient();
  const { isConnected, stationWorkloads, alerts, dismissAlert } = useSocket();

  // ---------------------------------------------------------------- //
  // Queries (Only active when authenticated)
  // ---------------------------------------------------------------- //
  const { data: tickets = [] } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => ticketsApi.getAll(),
    enabled: isAuthenticated,
    refetchInterval: 10000,
  });

  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients'],
    queryFn: () => ingredientsApi.getAll(),
    enabled: isAuthenticated,
    refetchInterval: 15000,
  });

  const { data: recipes = [] } = useQuery({
    queryKey: ['recipes'],
    queryFn: () => recipesApi.getAll(),
    enabled: isAuthenticated,
    staleTime: 60000,
  });

  const { data: prepLogs = [] } = useQuery({
    queryKey: ['prep-logs'],
    queryFn: () => prepLogsApi.getAll(),
    enabled: isAuthenticated,
  });

  const { data: foodCostSummaries = [] } = useQuery({
    queryKey: ['food-cost'],
    queryFn: () => foodCostApi.getSummary(),
    enabled: isAuthenticated,
  });

  const { data: supplierOrders = [] } = useQuery({
    queryKey: ['supplier-orders'],
    queryFn: () => supplierOrdersApi.getAll(),
    enabled: isAuthenticated,
  });

  // ---------------------------------------------------------------- //
  // Derived Data
  // ---------------------------------------------------------------- //
  const stations = useMemo(() => {
    const set = new Set<string>();
    recipes.forEach((r) => {
      if (r.station) set.add(r.station);
    });
    tickets.forEach((t) => {
      if (t.station) set.add(t.station);
    });
    return Array.from(set).sort();
  }, [recipes, tickets]);

  const filteredTickets = useMemo(() => {
    if (selectedStation === 'ALL') return tickets;
    return tickets.filter(
      (t) => t.station?.toLowerCase() === selectedStation.toLowerCase()
    );
  }, [tickets, selectedStation]);

  const ticketCounts = useMemo(() => {
    const queue = tickets.filter((t) => t.status === 'QUEUE').length;
    const firing = tickets.filter((t) => t.status === 'FIRING').length;
    const lowStock = ingredients.filter(
      (i) => Number(i.current_stock) <= Number(i.minimum_threshold)
    ).length;
    return { queue, firing, lowStock };
  }, [tickets, ingredients]);

  // ---------------------------------------------------------------- //
  // Mutations
  // ---------------------------------------------------------------- //
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TicketStatus }) =>
      ticketsApi.updateStatus(id, status),
    onMutate: ({ id }) => setUpdatingTicketId(id),
    onSettled: () => {
      setUpdatingTicketId(null);
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      queryClient.invalidateQueries({ queryKey: ['food-cost'] });
    },
  });

  const createTicketMutation = useMutation({
    mutationFn: ticketsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });

  const createBatchTicketMutation = useMutation({
    mutationFn: ticketsApi.createBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
  const updateStockMutation = useMutation({
    mutationFn: ({ id, stock }: { id: string; stock: number }) =>
      ingredientsApi.updateStock(id, stock),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: ({ ingredientId, qty }: { ingredientId: string; qty: number }) =>
      supplierOrdersApi.create({ ingredient_id: ingredientId, quantity_ordered: qty }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-orders'] });
    },
  });

  const receiveOrderMutation = useMutation({
    mutationFn: (orderId: string) =>
      supplierOrdersApi.updateStatus(orderId, 'DELIVERED', 'PASS'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-orders'] });
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
    },
  });

  const prepOptimizationMutation = useMutation({
    mutationFn: (dayOfWeek: string) => aiApi.runPrepOptimization(dayOfWeek),
    onSuccess: (res) => {
      if (res.data) {
        setPrepSheet(res.data);
      }
    },
  });

  const inventoryAlertMutation = useMutation({
    mutationFn: aiApi.runInventoryAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-orders'] });
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
    },
  });

  const createPrepLogMutation = useMutation({
    mutationFn: prepLogsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prep-logs'] });
      queryClient.invalidateQueries({ queryKey: ['food-cost'] });
    },
  });

  const refreshFoodCostMutation = useMutation({
    mutationFn: foodCostApi.refresh,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-cost'] });
    },
  });

  const addIngredientMutation = useMutation({
    mutationFn: (data: {
      name: string;
      unit: string;
      current_stock: number;
      minimum_threshold: number;
      cost_per_unit: number;
    }) => ingredientsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
    },
  });

  const deleteIngredientMutation = useMutation({
    mutationFn: (id: string) => ingredientsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });

  // ---------------------------------------------------------------- //
  // Strict Authentication Guard
  // Without user login, NEVER show the dashboard!
  // ---------------------------------------------------------------- //
  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 via-indigo-600 to-amber-500 p-0.5 animate-pulse">
          <div className="w-full h-full bg-bg-surface rounded-[14px] flex items-center justify-center">
            <Flame className="w-7 h-7 text-amber-400" />
          </div>
        </div>
        <div className="text-xs text-slate-400 font-mono">Authenticating KitchenPulse session...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPortal />;
  }

  return (
    <div className="min-h-screen bg-bg-primary text-slate-100 flex flex-col font-sans">
      {/* Global Navigation Header with Hotel Branding */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isConnected={isConnected}
        onOpenNewTicket={() => setIsNewTicketModalOpen(true)}
        alerts={alerts}
        onDismissAlert={dismissAlert}
        ticketCounts={ticketCounts}
        onOpenMobileMenu={() => setIsMobileDrawerOpen(true)}
      />

      {/* Main Workspace Body */}
      {/* Dedicated Separated Modular Navigation Menu (Web, Tablet & Mobile) */}
      <NavigationMenu
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        ticketCounts={ticketCounts}
        isMobileDrawerOpen={isMobileDrawerOpen}
        setIsMobileDrawerOpen={setIsMobileDrawerOpen}
        onOpenNewTicket={() => setIsNewTicketModalOpen(true)}
        alertsCount={alerts.length}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 md:pb-8">
        {/* Tab 1: Live Kitchen Display System (KDS) */}
        {activeTab === 'kds' && (
          <div className="space-y-4">
            <StationFilter
              selectedStation={selectedStation}
              onSelectStation={setSelectedStation}
              stations={stations}
              stationWorkloads={stationWorkloads}
            />

            <KdsBoard
              tickets={filteredTickets}
              onUpdateStatus={(id, status) => updateStatusMutation.mutate({ id, status })}
              updatingTicketId={updatingTicketId}
              recipes={recipes}
            />
          </div>
        )}

        {/* Tab 2: Dishes, Drinks & BOM Manager */}
        {activeTab === 'menu' && (
          <RecipesManagerView
            recipes={recipes}
            ingredients={ingredients}
            onRefresh={async () => {
              await queryClient.invalidateQueries({ queryKey: ['recipes'] });
              await queryClient.invalidateQueries({ queryKey: ['ingredients'] });
            }}
            hasAdminAccess={hasAdminAccess}
            onFireTicket={async (recipeId, station) => {
              await createTicketMutation.mutateAsync({
                recipe_id: recipeId,
                station: station || 'Grill',
                table_number: 1,
              });
              setActiveTab('kds');
            }}
          />
        )}

        {/* Tab 3: Inventory & Supply Chain Console */}
        {activeTab === 'inventory' && (
          <InventoryView
            ingredients={ingredients}
            supplierOrders={supplierOrders}
            onUpdateStock={(id, stock) => updateStockMutation.mutateAsync({ id, stock }).then(() => {})}
            onCreateOrder={(ingredientId, qty) =>
              createOrderMutation.mutateAsync({ ingredientId, qty }).then(() => {})
            }
            onReceiveOrder={(orderId) => receiveOrderMutation.mutateAsync(orderId).then(() => {})}
            onRunAiAudit={() => inventoryAlertMutation.mutateAsync().then(() => {})}
            isAuditing={inventoryAlertMutation.isPending}
            onAddIngredient={(data) => addIngredientMutation.mutateAsync(data).then(() => {})}
            onDeleteIngredient={(id) => deleteIngredientMutation.mutateAsync(id).then(() => {})}
            hasAdminAccess={hasAdminAccess}
          />
        )}

        {/* Tab 4: AI Prep & Food Cost Intelligence */}
        {activeTab === 'ai-prep' && (
          <AiPrepView
            prepSheet={prepSheet}
            foodCostSummaries={foodCostSummaries}
            onRunOptimization={(dayOfWeek) => prepOptimizationMutation.mutateAsync(dayOfWeek).then(() => {})}
            onRefreshFoodCost={() => refreshFoodCostMutation.mutateAsync().then(() => {})}
            isLoadingPrep={prepOptimizationMutation.isPending}
            isRefreshingCost={refreshFoodCostMutation.isPending}
          />
        )}

        {/* Tab 5: Shift Scrap & Waste Logging */}
        {activeTab === 'waste-log' && (
          <WasteLogForm
            recipes={recipes}
            prepLogs={prepLogs}
            onSubmit={(data) => createPrepLogMutation.mutateAsync(data).then(() => {})}
            isSubmitting={createPrepLogMutation.isPending}
          />
        )}

        {/* Tab 6: Team & Staff Management (Owner & Admin Only) */}
        {activeTab === 'team' && hasAdminAccess && <UserManagementView />}
      </main>

            {/* New Ticket Modal */}
      <NewTicketModal
        isOpen={isNewTicketModalOpen}
        onClose={() => setIsNewTicketModalOpen(false)}
        recipes={recipes}
        tickets={tickets}
        onSubmit={(data) => createTicketMutation.mutateAsync(data).then(() => {})}
        onSubmitBatch={(batchData) => createBatchTicketMutation.mutateAsync(batchData).then(() => {})}
      />
    </div>
  );
}

export default App;
