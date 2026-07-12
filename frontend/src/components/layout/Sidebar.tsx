import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Divider,
  Avatar,
  Tooltip,
} from '@mui/material';
import {
  Inventory2 as InventoryIcon,
  TextSnippet as NarrationIcon,
  PlaylistAddCheck as StagingIcon,
  AccountBalance as MainTransactionIcon,
  BusinessCenter as RestrictedIcon,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';

const DRAWER_WIDTH = 88;

const menuItems = [
  { icon: <InventoryIcon />, label: 'ISIN Master', path: '/isin-master' },
  { icon: <NarrationIcon />, label: 'Narration', path: '/narration-master' },
  { icon: <StagingIcon />, label: 'Staging Transactions', path: '/staging-transaction' },
  { icon: <MainTransactionIcon />, label: 'Main Transaction', path: '/main-transaction' },
  { icon: <RestrictedIcon />, label: 'Restricted Company', path: '/restricted-company' },
];

const bottomItems: { icon: React.ReactNode; label: string; path: string; }[] = [];

interface SidebarProps {
  open: boolean;
}

export const Sidebar = ({ open: _open }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          borderRight: '1px solid #e0e0e0',
          backgroundColor: '#ffffff',
          overflow: 'hidden',
        },
      }}
    >
      {/* Logo Section */}
      <Box
        sx={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid #e0e0e0',
        }}
      >
        <Avatar
          sx={{
            width: 40,
            height: 40,
            bgcolor: '#1976d2',
            fontWeight: 700,
            fontSize: '1.1rem',
          }}
        >
          TC
        </Avatar>
      </Box>

      {/* Main Menu Items */}
      <List sx={{ py: 1, px: 0, flexGrow: 1 }}>
        {menuItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Tooltip key={item.path} title={item.label} placement="right" arrow>
              <ListItemButton
                onClick={() => navigate(item.path)}
                sx={{
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  py: 1.5,
                  px: 1,
                  minHeight: 68,
                  gap: 0.5,
                  position: 'relative',
                  color: isActive ? '#1976d2' : '#666666',
                  backgroundColor: isActive ? '#e3f2fd' : 'transparent',
                  borderLeft: isActive ? '3px solid #1976d2' : '3px solid transparent',
                  '&:hover': {
                    backgroundColor: isActive ? '#e3f2fd' : '#f5f5f5',
                    color: '#1976d2',
                  },
                  '&::before': isActive
                    ? {
                        content: '""',
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: '3px',
                        backgroundColor: '#1976d2',
                      }
                    : {},
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    justifyContent: 'center',
                    color: 'inherit',
                    '& svg': {
                      fontSize: 24,
                    },
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  sx={{
                    m: 0,
                    '& .MuiListItemText-primary': {
                      fontSize: '0.7rem',
                      fontWeight: isActive ? 600 : 400,
                      textAlign: 'center',
                      lineHeight: 1.2,
                    },
                  }}
                />
              </ListItemButton>
            </Tooltip>
          );
        })}
      </List>

      <Divider sx={{ mx: 1 }} />

      {/* Bottom Menu Items */}
      <List sx={{ py: 1, px: 0 }}>
        {bottomItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Tooltip key={item.path} title={item.label} placement="right" arrow>
              <ListItemButton
                onClick={() => navigate(item.path)}
                sx={{
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  py: 1.5,
                  px: 1,
                  minHeight: 56,
                  color: isActive ? '#1976d2' : '#666666',
                  '&:hover': {
                    backgroundColor: '#f5f5f5',
                    color: '#1976d2',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    justifyContent: 'center',
                    color: 'inherit',
                    '& svg': {
                      fontSize: 22,
                    },
                  }}
                >
                  {item.icon}
                </ListItemIcon>
              </ListItemButton>
            </Tooltip>
          );
        })}
      </List>
    </Drawer>
  );
};
