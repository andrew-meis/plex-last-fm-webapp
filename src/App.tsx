import { Box, Typography } from '@mui/material';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './components/Navbar';

const App = () => {
  const [title, setTitle] = useState('');

  return (
    <Box
      bgcolor="#fefefe"
      borderLeft="1px dashed #ddd"
      borderRight="1px dashed #ddd"
      margin="auto"
      maxHeight="100vh"
      maxWidth="lg"
      minHeight="100vh"
      overflow="scroll"
    >
      <Navbar />
      <Typography
        fontWeight={700}
        lineHeight={2}
        marginX={2}
        variant="h4"
      >
        {title}
      </Typography>
      <Outlet context={{ setTitle }} />
    </Box>
  );
};

export default App;
