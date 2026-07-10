import { Box, Typography } from '@mui/material';
import { keyframes } from '@emotion/react';

interface LoadingSpinnerProps {
  message?: string;
  size?: number;
  fullScreen?: boolean;
}

// Spin animation for orbs - matching the exact CSS
const spin = keyframes`
  0% {
    transform: rotate(0deg) translateY(-100px) rotate(0deg);
  }
  70% {
    transform: rotate(360deg) translateY(-100px) rotate(-360deg);
  }
  100% {
    transform: rotate(360deg) translateY(-100px) rotate(-360deg);
  }
`;

export const LoadingSpinner = ({ 
  message = 'Loading...', 
  fullScreen = false,
}: LoadingSpinnerProps) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: fullScreen ? '100vh' : '400px',
        gap: 3,
        position: fullScreen ? 'fixed' : 'relative',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: fullScreen ? 9999 : 'auto',
        backgroundColor: fullScreen ? 'rgba(0, 0, 0, 0.95)' : 'transparent',
      }}
    >
      {/* Orb Container - exactly matching the CSS */}
      <Box
        sx={{
          position: 'relative',
          width: 400,
          height: 400,
          marginTop: -200,
          marginLeft: -200,
          filter: 'contrast(40)',
          backgroundColor: '#000',
        }}
      >
        {/* Orb 1 - Static center orb (largest) */}
        <Box
          sx={{
            position: 'absolute',
            content: '""',
            width: 50,
            height: 50,
            borderRadius: '50%',
            backgroundColor: '#ff0000',
            left: 175,
            top: 175,
            filter: 'blur(15px)',
          }}
        />

        {/* Orb 2 - Spinning with delay 0.1s */}
        <Box
          sx={{
            position: 'absolute',
            content: '""',
            width: 40,
            height: 40,
            borderRadius: '50%',
            backgroundColor: '#ff0000',
            left: 180,
            top: 180,
            filter: 'blur(15px)',
            animation: `${spin} 4s infinite ease-in-out`,
            animationDelay: '0.1s',
          }}
        />

        {/* Orb 3 - Spinning with delay 0.3s */}
        <Box
          sx={{
            position: 'absolute',
            content: '""',
            width: 40,
            height: 40,
            borderRadius: '50%',
            backgroundColor: '#ff0000',
            left: 180,
            top: 180,
            filter: 'blur(15px)',
            animation: `${spin} 4s infinite ease-in-out`,
            animationDelay: '0.3s',
          }}
        />

        {/* Orb 4 - Spinning with delay 0.5s */}
        <Box
          sx={{
            position: 'absolute',
            content: '""',
            width: 40,
            height: 40,
            borderRadius: '50%',
            backgroundColor: '#ff0000',
            left: 180,
            top: 180,
            filter: 'blur(15px)',
            animation: `${spin} 4s infinite ease-in-out`,
            animationDelay: '0.5s',
          }}
        />

        {/* Orb 5 - Spinning with delay 0.7s */}
        <Box
          sx={{
            position: 'absolute',
            content: '""',
            width: 40,
            height: 40,
            borderRadius: '50%',
            backgroundColor: '#ff0000',
            left: 180,
            top: 180,
            filter: 'blur(15px)',
            animation: `${spin} 4s infinite ease-in-out`,
            animationDelay: '0.7s',
          }}
        />
      </Box>

      {/* Loading Message */}
      {message && (
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Typography
            variant="subtitle2"
            sx={{
              color: '#fff',
              fontWeight: 500,
              letterSpacing: '0.5px',
            }}
          >
            {message}
          </Typography>
        </Box>
      )}
    </Box>
  );
};
