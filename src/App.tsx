import { useEffect, useState } from 'react'
import { Plus, Users, PieChart as PieChartIcon, Loader2, Sparkles, ChevronRight, Archive, Eye, EyeOff } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AuthPage } from './components/auth/AuthPage'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { Sidebar } from './components/layout/Sidebar'
import { AnalyticsView } from './components/analytics/AnalyticsView'
import { GroupDetail } from './components/groups/GroupDetail'
import { CreateGroupModal } from './components/groups/CreateGroupModal'
import { useSettlrStore } from './stores/useSettlrStore'
import { seedMockData } from './lib/seed'
import { Toaster } from 'react-hot-toast'

type Tab = 'groups' | 'analytics' | 'profile'

function Dashboard() {
  const { groups, groupSummaries, loadGroups, isLoading, error, activeGroupId, setActiveGroup, archiveGroup, toggleShowArchived, showArchivedGroups } = useSettlrStore()
  const { user, displayName } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('groups')
  const [seeding, setSeeding] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    loadGroups()
  }, [loadGroups])

  const handleSeed = async () => {
    setSeeding(true)
    try {
      await seedMockData()
      await loadGroups()
    } catch (err) {
      console.error(err)
    } finally {
      setSeeding(false)
    }
  }

  // If we are in a specific group, we show the GroupDetail view (which has its own back button)
  if (activeGroupId) {
    return (
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
        <Sidebar activeTab={activeTab} onTabChange={(tab) => {
          setActiveTab(tab)
          setActiveGroup(null) // Reset group when switching tabs
        }} />
        <main className="flex-1 p-4 md:p-12 overflow-y-auto">
          <GroupDetail groupId={activeGroupId} onBack={() => setActiveGroup(null)} />
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="flex-1 p-4 md:p-12 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'groups' && (
            <motion.section 
              key="groups"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="max-w-6xl mx-auto"
            >
              <div className="flex justify-between items-end mb-12">
                <div>
                  <h2 className="text-4xl font-black mb-2">Your Groups</h2>
                  <p className="text-slate-500 dark:text-slate-400">Manage expenses with your squads</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleShowArchived}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 px-4 py-2 rounded-xl transition-colors"
                    title={showArchivedGroups ? 'Hide archived groups' : 'Show archived groups'}
                  >
                    {showArchivedGroups ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {showArchivedGroups ? 'Hide Archived' : 'Archived'}
                  </button>
                  {groups.length === 0 && !isLoading && (
                    <button
                      onClick={handleSeed}
                      disabled={seeding}
                      className="flex items-center gap-2 text-sm font-semibold text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
                    >
                      {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      Try with sample data
                    </button>
                  )}
                </div>
              </div>

              {error && (
                <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              {isLoading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-48 rounded-[2.5rem] bg-slate-200 dark:bg-slate-800 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {groups
                    .filter(g => showArchivedGroups ? true : !g.isArchived)
                    .map(group => {
                      const summary = groupSummaries[group.id];
                      return (
                    <div
                      key={group.id}
                      className={`flex flex-col p-8 rounded-[2.5rem] bg-white dark:bg-slate-800 border shadow-sm hover:shadow-2xl transition-all relative overflow-hidden group ${
                        group.isArchived
                          ? 'border-slate-200 dark:border-slate-700 opacity-60'
                          : 'border-slate-100 dark:border-slate-700 hover:border-primary-200 dark:hover:border-primary-900'
                      }`}
                    >
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-125 transition-transform">
                        <Users className="w-24 h-24" />
                      </div>
                      {group.isArchived && (
                        <span className="absolute top-4 left-4 text-[10px] font-black uppercase tracking-widest bg-slate-200 dark:bg-slate-700 text-slate-500 px-2 py-0.5 rounded-full">Archived</span>
                      )}
                      <button
                        onClick={() => setActiveGroup(group.id)}
                        className="text-left"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform mt-4">
                          <Users className="w-7 h-7 text-primary-600 dark:text-primary-400" />
                        </div>
                        <h3 className="text-2xl font-bold mb-1">{group.name}</h3>
                        <p className="text-slate-500 dark:text-slate-400 font-medium mb-2">
                          {group.members.length} members
                        </p>
                        {summary && (
                          <p className="text-sm text-slate-400 dark:text-slate-500 mb-4">
                            {summary.expenseCount} expense{summary.expenseCount !== 1 ? 's' : ''} · <span className="font-semibold text-slate-600 dark:text-slate-300">${summary.totalSpent.toFixed(2)}</span> total
                          </p>
                        )}
                        <div className="mt-auto flex items-center text-primary-600 dark:text-primary-400 font-black text-sm uppercase tracking-widest">
                          View Squad
                          <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-2 transition-transform" />
                        </div>
                      </button>
                      {!group.isArchived && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Archive "${group.name}"? You can still view it later.`)) {
                              archiveGroup(group.id);
                            }
                          }}
                          className="absolute bottom-4 right-4 p-2 text-slate-300 hover:text-slate-600 dark:hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-all hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
                          title="Archive group"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    );
                  })}

                  <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex flex-col items-center justify-center p-8 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-primary-500 hover:bg-primary-50/30 dark:hover:bg-primary-900/10 transition-all group gap-4 h-full min-h-[200px]"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-primary-100 dark:group-hover:bg-primary-900/50 transition-colors">
                      <Plus className="w-8 h-8 text-slate-400 group-hover:text-primary-500" />
                    </div>
                    <span className="font-black text-slate-500 group-hover:text-primary-600 dark:group-hover:text-primary-400 uppercase text-xs tracking-widest">Create New Group</span>
                  </button>
                </div>
              )}
            </motion.section>
          )}

          {activeTab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="max-w-6xl mx-auto"
            >
              <h2 className="text-4xl font-black mb-12">Insights</h2>
              {activeGroupId ? (
                <AnalyticsView />
              ) : groups.length > 0 ? (
                <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700">
                   <PieChartIcon className="w-16 h-16 text-slate-200 mx-auto mb-6" />
                   <h3 className="text-2xl font-bold mb-4">Select a group to see analytics</h3>
                   <div className="flex flex-wrap justify-center gap-3 max-w-md mx-auto">
                     {groups.map(g => (
                       <button 
                         key={g.id}
                         onClick={() => setActiveGroup(g.id)}
                         className="px-6 py-3 bg-slate-100 dark:bg-slate-700 rounded-2xl font-bold hover:bg-primary-500 hover:text-white transition-all"
                       >
                         {g.name}
                       </button>
                     ))}
                   </div>
                </div>
              ) : (
                <div className="text-center py-20">
                  <p className="text-slate-500">No groups found. Create one to see analytics!</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl mx-auto"
            >
              <h2 className="text-4xl font-black mb-12">Your Profile</h2>
              <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-12 text-center border border-slate-100 dark:border-slate-700 shadow-sm">
                <div className="w-24 h-24 bg-primary-100 dark:bg-primary-900/50 rounded-full flex items-center justify-center text-primary-600 text-4xl font-black mx-auto mb-8 shadow-inner">
                  {displayName?.[0] || user?.email?.[0]?.toUpperCase()}
                </div>
                <h3 className="text-2xl font-bold mb-2">{displayName || 'User'}</h3>
                <p className="text-slate-500 mb-8">{user?.email}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl">
                    <div className="text-xs font-bold text-slate-400 uppercase mb-2">Member Since</div>
                    <div className="font-bold">{new Date(user?.created_at || '').toLocaleDateString()}</div>
                  </div>
                  <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl">
                    <div className="text-xs font-bold text-slate-400 uppercase mb-2">Status</div>
                    <div className="font-bold text-emerald-500">Active</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <CreateGroupModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <Toaster position="bottom-right" toastOptions={{
        style: { borderRadius: '1rem', background: '#1e293b', color: '#fff' }
      }} />
      <ProtectedRoute fallback={<AuthPage />}>
        <Dashboard />
      </ProtectedRoute>
    </AuthProvider>
  )
}

export default App
