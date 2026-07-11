import { useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createAppTheme } from '@/theme';
import { MainLayout } from '@/components/layout/MainLayout';
import { IsinMaster } from '@/features/isinMaster/IsinMaster';
import { NarrationMaster } from '@/features/narrationMaster/NarrationMaster';
import { TransactionCreation } from '@/features/stagingTransaction/StagingTransaction';
import { MainTransaction } from '@/features/mainTransaction/MainTransaction';
import { RestrictedCompany } from '@/features/restrictedCompany/RestrictedCompany';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  const theme = useMemo(() => createAppTheme('light'), []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <Routes>
            <Route
              path="/"
              element={
                <MainLayout>
                  <Navigate to="/isin-master" replace />
                </MainLayout>
              }
            />
            <Route
              path="/isin-master"
              element={
                <MainLayout>
                  <IsinMaster />
                </MainLayout>
              }
            />
            <Route
              path="/narration-master"
              element={
                <MainLayout>
                  <NarrationMaster />
                </MainLayout>
              }
            />
            <Route
              path="/staging-transaction"
              element={
                <MainLayout>
                  <TransactionCreation />
                </MainLayout>
              }
            />
            <Route
              path="/main-transaction"
              element={
                <MainLayout>
                  <MainTransaction />
                </MainLayout>
              }
            />
            <Route
              path="/restricted-company"
              element={
                <MainLayout>
                  <RestrictedCompany />
                </MainLayout>
              }
            />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/isin-master" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
