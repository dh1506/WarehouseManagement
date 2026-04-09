import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useOutboundOrder, usePickingTasks, useUpdatePickedQty, useTransitionOutboundStatus } from '../hooks/useOutbound';
import type { PickingTask } from '../types/outboundType';

export function OutboundPickingScreen() {
  const { id: orderId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTaskIndex, setActiveTaskIndex] = useState(0);

  const { data: order } = useOutboundOrder(orderId!);
  const { data: tasks = [], isLoading, refetch } = usePickingTasks(orderId!);
  const updatePickedQty = useUpdatePickedQty(orderId!);
  const transitionStatus = useTransitionOutboundStatus(orderId!);

  // Find first pending task on load
  useEffect(() => {
    const firstPendingIdx = tasks.findIndex((t) => t.status !== 'DONE');
    if (firstPendingIdx >= 0 && firstPendingIdx !== activeTaskIndex) {
      setActiveTaskIndex(firstPendingIdx);
    }
  }, [tasks, activeTaskIndex]);

  const completedTasks = tasks.filter((t) => t.status === 'DONE').length;
  const totalTasks = tasks.length;
  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const remainingTasks = totalTasks - completedTasks;
  const allDone = totalTasks > 0 && completedTasks === totalTasks;

  const activeTask = tasks[activeTaskIndex];
  const pendingTasks = tasks.filter((t, idx) => idx > activeTaskIndex && t.status !== 'DONE');
  const nextTask = pendingTasks[0];

  const handleConfirm = async (task: PickingTask, qty: number) => {
    await updatePickedQty.mutateAsync({
      lineItemId: task.lineItemId,
      pickedQty: qty,
    });

    // Advance to next pending
    const nextPendingIdx = tasks.findIndex((t, i) => i > activeTaskIndex && t.status !== 'DONE');
    if (nextPendingIdx >= 0) {
      setActiveTaskIndex(nextPendingIdx);
    }
  };

  const handleComplete = async () => {
    await transitionStatus.mutateAsync({ newStatus: 'COMPLETED' });
    navigate(`/outbound/${orderId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading picking tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface text-on-surface min-h-full pb-20">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 shadow-sm px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-extrabold tracking-tighter text-blue-800 dark:text-blue-200 uppercase font-manrope">OUTBOUND OPERATIONS</h1>
          <div className="h-6 w-px bg-slate-200"></div>
          <div className="flex items-center gap-2 text-slate-500">
            <span className="material-symbols-outlined text-lg cursor-pointer hover:text-primary transition-colors" data-icon="shortcut" onClick={() => navigate(`/outbound/${orderId}`)}>shortcut</span>
            <span className="text-sm font-medium">Picking Queue / #{order?.code || orderId}</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="relative">
            <span className="material-symbols-outlined text-slate-500 cursor-pointer" data-icon="notifications">notifications</span>
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-error rounded-full"></span>
          </div>
          <span className="material-symbols-outlined text-slate-500 cursor-pointer" onClick={() => refetch()} data-icon="refresh">refresh</span>
        </div>
      </header>

      <div className="p-8 max-w-7xl mx-auto">
        
        {/* Order Progress Header Section */}
        <section className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-surface-container-lowest p-6 rounded-xl shadow-sm border-b-2 border-primary-container/10">
            <div className="flex justify-between items-end mb-4">
              <div>
                <p className="text-on-surface-variant text-sm font-semibold mb-1 uppercase tracking-wider">Picking Progress</p>
                <h2 className="text-3xl font-extrabold text-primary tracking-tight">{progressPct}% Completed</h2>
              </div>
              <div className="text-right">
                <p className="text-on-surface-variant text-xs mb-1">Expected Completion</p>
                <p className="text-sm font-bold text-secondary">In 12 minutes</p>
              </div>
            </div>
            <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-primary-container rounded-full transition-all duration-700 ease-in-out" 
                style={{ width: `${progressPct}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-3 text-xs font-medium text-slate-500">
              <span>{completedTasks} / {totalTasks} Items</span>
              <span>{remainingTasks} Locations remaining</span>
            </div>
          </div>
          
          <div className="bg-secondary-container/20 p-6 rounded-xl border border-secondary-container/30 backdrop-blur-md flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-secondary" data-icon="auto_awesome">auto_awesome</span>
              <p className="text-secondary font-bold text-sm">AI Route Optimization</p>
            </div>
            <p className="text-on-secondary-container text-xs leading-relaxed mb-4">
              Route optimized using <b>S-Shape picking</b> method to reduce travel distance by 22%.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {Array.from(new Set(tasks.map((t) => t.aisle).filter(Boolean))).map((aisle, i, arr) => (
                <div key={aisle} className="flex items-center">
                  <div className="px-2 py-1 bg-white/60 rounded-lg text-[10px] font-bold text-secondary uppercase tracking-tighter shadow-sm border border-secondary/10">
                    Aisle {aisle}
                  </div>
                  {i < arr.length - 1 && (
                    <span className="material-symbols-outlined text-[12px] text-secondary/60 mx-1" data-icon="trending_flat">trending_flat</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {allDone ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center max-w-2xl mx-auto shadow-sm">
            <span className="material-symbols-outlined text-6xl text-emerald-500 mb-4 block" data-icon="check_circle" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
            <h3 className="text-2xl font-bold text-emerald-800 mb-2">
              All {totalTasks} lines completed!
            </h3>
            <p className="text-emerald-700 mb-8">All items have been picked securely. You may finalize the shipment.</p>
            <button
              onClick={handleComplete}
              disabled={transitionStatus.isPending}
              className="px-10 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-emerald-600/30 disabled:opacity-60"
            >
              {transitionStatus.isPending ? (
                <span className="flex items-center gap-3 justify-center">
                  <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                '✓ Complete Order'
              )}
            </button>
          </div>
        ) : (
          <section className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary" data-icon="list_alt">list_alt</span>
                Locations to Pick
              </h3>
              <div className="flex gap-2">
                <button className="px-4 py-2 text-xs font-bold rounded-lg bg-surface-container-high text-on-surface-variant flex items-center gap-2 hover:bg-slate-200 transition-colors">
                  <span className="material-symbols-outlined text-sm" data-icon="filter_list">filter_list</span>
                  Sort: Optimized
                </button>
              </div>
            </div>

            {/* Active Task (Currently Picking) */}
            {activeTask && (
              <div className="relative bg-white rounded-xl shadow-lg border-2 border-primary-container overflow-hidden group mb-6">
                <div className="absolute left-0 top-0 bottom-0 w-2 bg-primary"></div>
                <div className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <div className="bg-primary-container text-white w-20 h-20 rounded-xl flex flex-col items-center justify-center shrink-0 shadow-inner">
                      <span className="text-[10px] uppercase font-bold opacity-80">Location</span>
                      <span className="text-2xl font-black">{activeTask.locationCode}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-secondary-container text-on-secondary-container text-[10px] font-bold rounded uppercase">
                          Zone {activeTask.aisle || 'General'}
                        </span>
                        <span className="text-xs font-medium text-slate-400">SKU: {activeTask.productCode}</span>
                      </div>
                      <h4 className="text-xl font-bold text-on-surface">{activeTask.productName}</h4>
                      <div className="mt-2 flex items-center gap-4">
                        <div className="flex items-center gap-1 text-on-surface-variant bg-slate-50 px-2 py-1 rounded-md">
                          <span className="material-symbols-outlined text-sm" data-icon="layers">layers</span>
                          <span className="text-sm font-semibold">Level: {activeTask.level || 1}</span>
                        </div>
                        {activeTask.lotNumber && (
                          <div className="flex items-center gap-1 text-on-surface-variant bg-slate-50 px-2 py-1 rounded-md mb-1">
                            <span className="material-symbols-outlined text-sm" data-icon="inventory_2">inventory_2</span>
                            <span className="text-sm font-semibold">Lot: {activeTask.lotNumber}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-8 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0">
                    <div className="text-center">
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Quantity</p>
                      <p className="text-4xl font-black text-primary ml-1">{String(activeTask.requestedQty).padStart(2, '0')}</p>
                    </div>
                    <button 
                      onClick={() => handleConfirm(activeTask, activeTask.requestedQty)}
                      disabled={updatePickedQty.isPending}
                      className="flex-1 md:flex-none bg-primary hover:bg-primary-container text-white px-8 py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 shadow-md shadow-primary/20 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {updatePickedQty.isPending ? (
                        <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      ) : (
                        <span className="material-symbols-outlined text-xl" data-icon="check_circle" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      )}
                      Confirm Pick
                    </button>
                  </div>
                </div>
                
                {/* Visual Hint for next location */}
                {nextTask && (
                  <div className="bg-surface-container-low px-6 py-2 flex items-center gap-3 text-xs border-t border-slate-100">
                    <span className="text-slate-400 font-bold uppercase tracking-tighter">Next Up:</span>
                    <span className="text-secondary font-bold">{nextTask.locationCode} (Nearby)</span>
                    <span className="material-symbols-outlined text-sm text-secondary" data-icon="trending_flat">trending_flat</span>
                  </div>
                )}
              </div>
            )}

            {/* Next Tasks (Tonal Representation) */}
            <div className="grid grid-cols-1 gap-3">
              {pendingTasks.map((task) => (
                <div key={task.id} className="bg-surface-container-lowest p-5 rounded-xl flex items-center justify-between border-l-4 border-slate-300 shadow-sm hover:border-primary/40 transition-colors">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-white rounded-lg flex flex-col items-center justify-center border border-slate-200 shadow-sm shrink-0">
                      <span className="text-[8px] uppercase font-bold text-slate-400">Location</span>
                      <span className="text-lg font-bold text-slate-700 leading-tight">{task.locationCode}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-on-surface line-clamp-1">{task.productName}</h4>
                      <p className="text-xs text-slate-500 mt-1">SKU: {task.productCode} • Level: {task.level || 1}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-[8px] uppercase font-bold text-slate-400">QTY</p>
                      <p className="text-xl font-bold text-on-surface">{String(task.requestedQty).padStart(2, '0')}</p>
                    </div>
                    <button className="p-2 text-slate-400 hover:text-primary transition-colors hover:bg-slate-50 rounded-lg">
                      <span className="material-symbols-outlined" data-icon="more_vert">more_vert</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Bottom Status Grid (Bento Style) */}
        {!allDone && (
          <section className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1 bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">Completed</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-on-surface">{completedTasks}</span>
                <span className="text-sm font-bold text-slate-400">/ {totalTasks} SKU</span>
              </div>
            </div>
            
            <div className="md:col-span-1 bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">Shipping Carton</p>
              <div className="flex items-center gap-2 text-secondary">
                <span className="material-symbols-outlined text-xl" data-icon="shopping_basket">shopping_basket</span>
                <span className="text-lg font-bold text-on-surface">BOX-A2</span>
              </div>
            </div>
            
            <div className="md:col-span-2 bg-gradient-to-br from-primary to-blue-900 p-5 rounded-xl shadow-lg flex items-center justify-between text-white border border-primary-container">
              <div>
                <p className="text-[10px] font-bold opacity-70 uppercase mb-1 tracking-widest">Outbound Order</p>
                <p className="text-lg font-bold">{order?.priority === 'URGENT' ? 'Priority: Urgent' : 'Priority: High (Lazada Express)'}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl opacity-90 text-amber-300" data-icon="bolt" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Contextual Floating Action Buttons */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-3">
        <button 
          onClick={() => navigate(`/outbound/${orderId}`)}
          className="w-14 h-14 bg-white text-primary rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all border border-slate-100"
          title="Warehouse Map"
        >
          <span className="material-symbols-outlined text-xl" data-icon="map">map</span>
        </button>
        <button className="w-16 h-16 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-primary/30">
          <span className="material-symbols-outlined text-3xl" data-icon="qr_code_scanner">qr_code_scanner</span>
        </button>
      </div>
    </div>
  );
}
