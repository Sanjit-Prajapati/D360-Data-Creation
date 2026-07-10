import { useState, ReactNode } from 'react';
import { Box } from '@mui/material';
import { Sidebar } from './Sidebar';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const [sidebarOpen] = useState(true);

  return (
    <Box sx={{ display: 'flex' }}>
      <Sidebar open={sidebarOpen} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pb: 2,
          pt: 2,
          pl: 2, // LEFT PADDING - matched with right padding for a clean, symmetrical gap
          pr: 2,
          width: '100%',
          maxWidth: '100%',
          height: '100vh',
          minHeight: '100vh',
          bgcolor: 'background.default',
          ml: 0, // LEFT MARGIN - removed double margin shift (flex layout already handles sidebar spacing)
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ 
          flexGrow: 1, 
          maxWidth: '100%', 
          width: '100%',
          minHeight: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          pt: 1.5,
          px: 0.5, // Minimal horizontal padding
        }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};
