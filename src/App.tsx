import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { I18nProvider } from "@/i18n/I18nProvider";
import AppLayout from "@/components/AppLayout";
import Auth from "@/pages/Auth";
import ProfileSetup from "@/pages/ProfileSetup";
import Feed from "@/pages/Feed";
import Search from "@/pages/Search";
import CreatePost from "@/pages/CreatePost";
import CreateStory from "@/pages/CreateStory";
import Reels from "@/pages/Reels";
import Notifications from "@/pages/Notifications";
import ChatList from "@/pages/ChatList";
import ChatRoom from "@/pages/ChatRoom";
import NewGroup from "@/pages/NewGroup";
import ProfilePage from "@/pages/ProfilePage";
import PostDetail from "@/pages/PostDetail";
import Settings from "@/pages/Settings";
import Admin from "@/pages/Admin";
import HashtagPage from "@/pages/HashtagPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
  },
});


function Gate() {
  const { isAuthenticated, hasProfile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="brand-x text-7xl animate-pulse">𝕏</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="*" element={<Navigate to="/auth" replace state={{ from: location }} />} />
      </Routes>
    );
  }

  if (!hasProfile) {
    return (
      <Routes>
        <Route path="/setup" element={<ProfileSetup />} />
        <Route path="*" element={<Navigate to="/setup" replace />} />
      </Routes>
    );
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Feed />} />
        <Route path="/search" element={<Search />} />
        <Route path="/create" element={<CreatePost />} />
        <Route path="/story/new" element={<CreateStory />} />
        <Route path="/reels" element={<Reels />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/chats" element={<ChatList />} />
        <Route path="/chats/new-group" element={<NewGroup />} />
        <Route path="/chats/:id" element={<ChatRoom />} />
        <Route path="/u/:username" element={<ProfilePage />} />
        <Route path="/p/:id" element={<PostDetail />} />
        <Route path="/tag/:tag" element={<HashtagPage />} />
        <Route path="/setup" element={<ProfileSetup />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/auth" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Gate />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
