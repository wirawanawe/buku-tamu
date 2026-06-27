"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, CheckCircle2, Users, UserCheck, Gift, Loader2, Sparkles, AlertCircle, ChevronDown, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Guest {
  rowNumber: number;
  no: string;
  name: string;
  undangan: string;
  checklist: boolean;
  jumlahKehadiran: number;
  kuponSouvenir: string;
  keterangan: string;
  konfirmasiHadir: string;
  souvenirA: number;
  souvenirB: number;
}

export default function WeddingGuestBook() {
  const [activeTab, setActiveTab] = useState<"Tamu Rahma (Perempuan)" | "Tamu Angga (Laki Laki)">("Tamu Rahma (Perempuan)");
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  
  // Modal state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [kehadiran, setKehadiran] = useState(1);
  const [souvenirA, setSouvenirA] = useState(0);
  const [souvenirB, setSouvenirB] = useState(0);
  const [checkinError, setCheckinError] = useState<string | null>(null);
  const [checkinSuccess, setCheckinSuccess] = useState<string | null>(null);

  const fetchGuests = async (sheetName: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/guests?sheet=${encodeURIComponent(sheetName)}`);
      const data = await res.json();
      if (data.guests) {
        setGuests(data.guests);
      }
    } catch (error) {
      console.error("Error fetching guests:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuests(activeTab);
  }, [activeTab]);

  const filteredGuests = useMemo(() => {
    return guests.filter((guest) => 
      guest.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [guests, searchQuery]);

  // Group guests by keterangan
  const groupedGuests = useMemo(() => {
    const groups: Record<string, Guest[]> = {};
    filteredGuests.forEach(guest => {
      const group = guest.keterangan || 'Lainnya';
      if (!groups[group]) groups[group] = [];
      groups[group].push(guest);
    });
    return groups;
  }, [filteredGuests]);

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const toggleGroup = (group: string) => {
    setCollapsedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const stats = useMemo(() => {
    const total = guests.length;
    const hadir = guests.filter(g => g.checklist).length;
    const totalOrang = guests.reduce((acc, g) => acc + g.jumlahKehadiran, 0);
    return { total, hadir, totalOrang };
  }, [guests]);

  const handleCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGuest) return;

    setIsSubmitting(true);
    setCheckinError(null);
    try {
      const res = await fetch('/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: activeTab,
          rowNumber: selectedGuest.rowNumber,
          guestName: selectedGuest.name,
          jumlahKehadiran: kehadiran,
          souvenirA,
          souvenirB
        })
      });

      if (res.ok) {
        // Optimistic update
        setGuests(prev => prev.map(g => 
          g.rowNumber === selectedGuest.rowNumber 
            ? { ...g, checklist: true, jumlahKehadiran: kehadiran, souvenirA, souvenirB } 
            : g
        ));
        setCheckinSuccess(`${selectedGuest.name} berhasil check-in!`);
        setTimeout(() => setCheckinSuccess(null), 3000);
        setSelectedGuest(null);
      } else {
        const data = await res.json();
        setCheckinError(data.error || 'Gagal melakukan check-in. Coba lagi.');
      }
    } catch (error) {
      console.error("Error checking in:", error);
      setCheckinError('Koneksi gagal. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetCheckin = async () => {
    if (!selectedGuest) return;

    setIsSubmitting(true);
    setCheckinError(null);
    try {
      const res = await fetch(`/api/guests?sheetName=${encodeURIComponent(activeTab)}&rowNumber=${selectedGuest.rowNumber}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        // Optimistic update: reset to unchecked state
        setGuests(prev => prev.map(g => 
          g.rowNumber === selectedGuest.rowNumber 
            ? { ...g, checklist: false, jumlahKehadiran: 0, souvenirA: 0, souvenirB: 0 } 
            : g
        ));
        setCheckinSuccess(`Check-in ${selectedGuest.name} berhasil dibatalkan.`);
        setTimeout(() => setCheckinSuccess(null), 3000);
        setSelectedGuest(null);
      } else {
        const data = await res.json();
        setCheckinError(data.error || 'Gagal membatalkan check-in. Coba lagi.');
      }
    } catch (error) {
      console.error("Error resetting check-in:", error);
      setCheckinError('Koneksi gagal. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openModal = (guest: Guest) => {
    setSelectedGuest(guest);
    // Initialize form with existing data or defaults
    setKehadiran(guest.checklist ? guest.jumlahKehadiran : 1);
    setSouvenirA(guest.souvenirA || 0);
    setSouvenirB(guest.souvenirB || 0);
  };

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2 py-8"
      >
        <p 
          className="text-5xl md:text-7xl drop-shadow-sm"
          style={{ 
            fontFamily: 'var(--font-script)', 
            color: '#b8993e',
          }}
        >
          Rahma & Angga
        </p>
        <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-800 to-emerald-600 drop-shadow-sm">
          Wedding Guest Book
        </h1>
        <p className="text-slate-700 font-medium">Digital Receptionist System</p>
      </motion.div>

      {/* Dashboard Stats */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div className="glass-card p-6 flex items-center space-x-4">
          <div className="p-3 bg-emerald-600/20 rounded-xl text-emerald-700">
            <Users size={28} />
          </div>
          <div>
            <p className="text-sm text-slate-600 font-medium">Total Undangan</p>
            <h3 className="text-3xl font-bold text-slate-800">{stats.total}</h3>
          </div>
        </div>
        <div className="glass-card p-6 flex items-center space-x-4">
          <div className="p-3 bg-emerald-600/20 rounded-xl text-emerald-700">
            <CheckCircle2 size={28} />
          </div>
          <div>
            <p className="text-sm text-slate-600 font-medium">Tamu Hadir (Grup)</p>
            <h3 className="text-3xl font-bold text-slate-800">{stats.hadir}</h3>
          </div>
        </div>
        <div className="glass-card p-6 flex items-center space-x-4">
          <div className="p-3 bg-emerald-600/20 rounded-xl text-emerald-700">
            <UserCheck size={28} />
          </div>
          <div>
            <p className="text-sm text-slate-600 font-medium">Total Kehadiran (Orang)</p>
            <h3 className="text-3xl font-bold text-slate-800">{stats.totalOrang}</h3>
          </div>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card overflow-hidden flex flex-col"
      >
        {/* Tabs */}
        <div className="flex border-b border-slate-300/50 bg-white/30 backdrop-blur-md">
          {(["Tamu Rahma (Perempuan)", "Tamu Angga (Laki Laki)"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setSearchQuery("");
              }}
              className={cn(
                "flex-1 py-4 text-center font-semibold transition-all relative",
                activeTab === tab ? "text-emerald-800" : "text-slate-600 hover:text-slate-800"
              )}
            >
              {tab}
              {activeTab === tab && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-600 rounded-t-full"
                />
              )}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Cari nama tamu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-12 py-3 bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-xl transition-all text-slate-800 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Hapus pencarian"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* List */}
          <div className="space-y-3 min-h-[400px]">
            {loading ? (
              <div className="h-40 flex items-center justify-center text-emerald-600">
                <Loader2 className="animate-spin" size={32} />
              </div>
            ) : filteredGuests.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-slate-500 space-y-2">
                <AlertCircle size={32} />
                <p>Tidak ada tamu yang ditemukan.</p>
              </div>
            ) : (
              <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar space-y-4">
                {Object.entries(groupedGuests).map(([groupName, groupGuests]) => {
                  const isCollapsed = collapsedGroups[groupName];
                  const groupHadir = groupGuests.filter(g => g.checklist).length;
                  return (
                    <div key={groupName} className="rounded-xl border border-slate-200/70 overflow-hidden">
                      {/* Group Header */}
                      <button
                        onClick={() => toggleGroup(groupName)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-emerald-50/80 hover:bg-emerald-100/80 transition-colors text-left"
                      >
                        <div className="flex items-center space-x-2">
                          <ChevronDown size={18} className={cn("text-emerald-700 transition-transform", isCollapsed && "-rotate-90")} />
                          <span className="font-semibold text-emerald-800">{groupName}</span>
                          <span className="text-xs text-slate-500 bg-white/70 px-2 py-0.5 rounded-full">
                            {groupHadir}/{groupGuests.length} hadir
                          </span>
                        </div>
                      </button>
                      {/* Group Guests */}
                      {!isCollapsed && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3">
                          {groupGuests.map((guest, idx) => (
                            <motion.div
                              key={`${groupName}-${guest.rowNumber}`}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                              onClick={() => openModal(guest)}
                              className={cn(
                                "p-3 rounded-lg border cursor-pointer transition-all hover:scale-[1.02]",
                                guest.checklist 
                                  ? "bg-emerald-100/60 border-emerald-300/50 hover:border-emerald-400" 
                                  : "bg-white/80 border-slate-200 hover:border-emerald-500/50"
                              )}
                            >
                              <div className="flex justify-between items-start">
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-semibold text-slate-800 truncate">{guest.name}</h4>
                                </div>
                                {guest.checklist && (
                                  <div className="bg-emerald-200/50 text-emerald-600 p-1 rounded-full ml-2 shrink-0">
                                    <CheckCircle2 size={16} />
                                  </div>
                                )}
                              </div>
                              {guest.checklist && (
                                <div className="mt-2 flex items-center space-x-3 text-xs text-slate-600">
                                  <span className="flex items-center"><Users size={12} className="mr-1"/> {guest.jumlahKehadiran} Orang</span>
                                  {(guest.souvenirA > 0 || guest.souvenirB > 0) && (
                                    <span className="flex items-center"><Gift size={12} className="mr-1"/> 
                                      {guest.souvenirA > 0 && `A: ${guest.souvenirA}`}
                                      {guest.souvenirA > 0 && guest.souvenirB > 0 && ', '}
                                      {guest.souvenirB > 0 && `B: ${guest.souvenirB}`}
                                    </span>
                                  )}
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Check-in Modal */}
      <AnimatePresence>
        {selectedGuest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => !isSubmitting && setSelectedGuest(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white p-6 rounded-2xl shadow-2xl border border-emerald-100"
            >
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-emerald-600 p-3 rounded-full shadow-lg shadow-emerald-500/50 text-white">
                <Sparkles size={24} />
              </div>

              <div className="mt-4 text-center space-y-1">
                <h3 className="text-2xl font-bold text-slate-800">{selectedGuest.name}</h3>
                <p className="text-slate-500">{selectedGuest.keterangan}</p>
                <div className="inline-block px-3 py-1 bg-emerald-50 rounded-full text-xs text-emerald-700 border border-emerald-200 mt-2">
                  RSVP: {selectedGuest.konfirmasiHadir || "Tidak diketahui"}
                </div>
              </div>

              <form onSubmit={handleCheckin} className="mt-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 flex items-center">
                    <Users size={16} className="mr-2 text-emerald-600"/>
                    Jumlah Kehadiran (Orang)
                  </label>
                  <div className="flex items-center space-x-3">
                    <button type="button" onClick={() => setKehadiran(Math.max(1, kehadiran - 1))} className="w-10 h-10 rounded-full glass-input flex items-center justify-center text-xl font-bold hover:bg-slate-700">-</button>
                    <input 
                      type="number" 
                      min="1" 
                      value={kehadiran} 
                      onChange={(e) => setKehadiran(parseInt(e.target.value) || 1)}
                      className="flex-1 glass-input text-center text-lg font-bold"
                    />
                    <button type="button" onClick={() => setKehadiran(kehadiran + 1)} className="w-10 h-10 rounded-full glass-input flex items-center justify-center text-xl font-bold hover:bg-slate-700">+</button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 flex items-center">
                      <Gift size={16} className="mr-2 text-emerald-600"/>
                      Souvenir A
                    </label>
                    <input 
                      type="number" 
                      min="0" 
                      value={souvenirA} 
                      onChange={(e) => setSouvenirA(parseInt(e.target.value) || 0)}
                      className="w-full glass-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 flex items-center">
                      <Gift size={16} className="mr-2 text-emerald-600"/>
                      Souvenir B
                    </label>
                    <input 
                      type="number" 
                      min="0" 
                      value={souvenirB} 
                      onChange={(e) => setSouvenirB(parseInt(e.target.value) || 0)}
                      className="w-full glass-input"
                    />
                  </div>
                </div>

                {checkinError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start space-x-2">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{checkinError}</span>
                  </div>
                )}

                <div className="pt-4 flex space-x-3">
                  <button
                    type="button"
                    onClick={() => { setSelectedGuest(null); setCheckinError(null); }}
                    disabled={isSubmitting}
                    className="flex-1 py-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center justify-center shadow-lg shadow-emerald-500/30 transition-all active:scale-95"
                  >
                    {isSubmitting ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <>
                        <CheckCircle2 size={20} className="mr-2" />
                        Check-in Tamu
                      </>
                    )}
                  </button>
                </div>

                {selectedGuest.checklist && (
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleResetCheckin}
                      disabled={isSubmitting}
                      className="w-full py-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 font-semibold transition-all active:scale-95 flex items-center justify-center"
                    >
                      Batal Check-in / Reset Tamu
                    </button>
                  </div>
                )}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Toast */}
      <AnimatePresence>
        {checkinSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-lg shadow-emerald-600/30 flex items-center space-x-2"
          >
            <CheckCircle2 size={20} />
            <span className="font-medium">{checkinSuccess}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  );
}
