import { Box } from '@mui/material';
import { grey } from '@mui/material/colors';
import { NavLink } from 'react-router-dom';
import logo from '../assets/logo192.png';

const Navbox = ({ route, text }: { route: string, text: string }) => (
  <NavLink
    to={route}
  >
    {({ isActive }) => (
      <Box
        alignItems="center"
        bgcolor={isActive ? grey[900] : 'transparent'}
        borderRadius={1}
        color="white"
        display="flex"
        height={36}
        marginRight={0.5}
        paddingX={1}
        sx={{
          transition: '200ms',
          '&:hover': {
            backgroundColor: isActive ? '' : grey[800],
          },
        }}
      >
        {text}
      </Box>
    )}
  </NavLink>
);

const Navbar = () => (
  <Box
    alignItems="center"
    bgcolor="#d31f27"
    display="flex"
    height={60}
    mt={2}
  >
    <Box
      border="2px solid white"
      borderRadius="50%"
      height={80}
      mx={2}
      width={80}
    >
      <img
        alt="Hex.fm"
        height={80}
        src={logo}
        width={80}
      />
    </Box>
    <Navbox route="/" text="Dashboard" />
    <Navbox route="/match" text="Match" />
    <Navbox route="/inspect" text="Inspect" />
    <Box
      marginLeft="auto"
    >
      <Navbox route="/settings" text="Settings" />
    </Box>
  </Box>
);

export default Navbar;
