import React, { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';

type OutletContext = {
  setTitle: React.Dispatch<React.SetStateAction<string>>;
}

const useTitle = (title: string) => {
  const { setTitle } = useOutletContext<OutletContext>();

  useEffect(() => {
    setTitle(title);
  }, [setTitle, title]);
};

export default useTitle;
