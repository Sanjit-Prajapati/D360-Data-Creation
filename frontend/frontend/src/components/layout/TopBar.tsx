import {
  AppBar,
  Toolbar,
  Box,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Button,
  Tooltip,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Person as PersonIcon,
  KeyboardArrowDown as ArrowDownIcon,
  Language as LanguageIcon,
} from '@mui/icons-material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getInitials } from '@/utils/helpers';

interface TopBarProps {
  onMenuClick: () => void;
}

export const TopBar = ({ onMenuClick: _onMenuClick }: TopBarProps) => {
  const navigate = useNavigate();
  const user = { username: 'Admin User', email: 'admin@company.com' };
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        zIndex: 1200,
        bgcolor: '#ffffff',
        borderBottom: '1px solid #e8eaed',
        ml: '88px',
        width: 'calc(100% - 88px)',
      }}
    >
      <Toolbar sx={{ minHeight: '52px !important', px: 3, justifyContent: 'flex-end' }}>
        {/* Profile Section */}
        <Tooltip title="Account" arrow>
          <Box
            onClick={handleProfileMenuOpen}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              cursor: 'pointer',
              padding: '5px 10px 5px 6px',
              borderRadius: 6,
              transition: 'all 0.2s',
              '&:hover': {
                backgroundColor: '#f1f3f4',
              },
            }}
          >
            <Avatar
              sx={{
                width: 34,
                height: 34,
                bgcolor: '#1a73e8',
                fontSize: '0.8rem',
                fontWeight: 700,
                boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
              }}
            >
              {getInitials(user?.username || 'Admin', '')}
            </Avatar>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <Typography variant="body2" fontWeight={600} sx={{ color: '#202124', lineHeight: 1.3, fontSize: '0.8rem' }}>
                {user?.username || 'Admin User'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#5f6368', fontSize: '0.7rem', lineHeight: 1.2 }}>
                Administrator
              </Typography>
            </Box>
            <ArrowDownIcon sx={{ fontSize: 16, color: '#5f6368', ml: -0.5 }} />
          </Box>
        </Tooltip>

        {/* Profile Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleProfileMenuClose}
          onClick={handleProfileMenuClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{
            sx: {
              width: 280,
              mt: 1,
              borderRadius: 3,
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
              border: '1px solid #e8eaed',
            },
          }}
        >
          <Box sx={{ px: 2.5, py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
              <Avatar
                sx={{
                  width: 52,
                  height: 52,
                  bgcolor: '#1a73e8',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                }}
              >
                {getInitials(user?.username || 'Admin', '')}
              </Avatar>
              <Box>
                <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#202124', fontSize: '0.95rem' }}>
                  {user?.username || 'Admin User'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#5f6368', fontSize: '0.8rem' }}>
                  {user?.email || 'admin@company.com'}
                </Typography>
              </Box>
            </Box>
            <Button
              fullWidth
              variant="outlined"
              size="small"
              onClick={() => navigate('/profile')}
              sx={{
                mt: 1,
                borderColor: '#dadce0',
                color: '#1a73e8',
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 2,
                '&:hover': {
                  borderColor: '#1a73e8',
                  backgroundColor: '#f1f3f4',
                },
              }}
            >
              Manage Account
            </Button>
          </Box>

          <Divider />

          <MenuItem
            onClick={() => navigate('/profile')}
            sx={{
              py: 1.5,
              px: 2.5,
              '&:hover': { backgroundColor: '#f1f3f4' },
            }}
          >
            <ListItemIcon>
              <PersonIcon fontSize="small" sx={{ color: '#5f6368' }} />
            </ListItemIcon>
            <ListItemText>Profile Settings</ListItemText>
          </MenuItem>

          <MenuItem
            onClick={() => navigate('/settings')}
            sx={{
              py: 1.5,
              px: 2.5,
              '&:hover': { backgroundColor: '#f1f3f4' },
            }}
          >
            <ListItemIcon>
              <SettingsIcon fontSize="small" sx={{ color: '#5f6368' }} />
            </ListItemIcon>
            <ListItemText>Application Settings</ListItemText>
          </MenuItem>

          <MenuItem
            sx={{
              py: 1.5,
              px: 2.5,
              '&:hover': { backgroundColor: '#f1f3f4' },
            }}
          >
            <ListItemIcon>
              <LanguageIcon fontSize="small" sx={{ color: '#5f6368' }} />
            </ListItemIcon>
            <ListItemText>Language &amp; Region</ListItemText>
          </MenuItem>

        </Menu>
      </Toolbar>
    </AppBar>
  );
};
