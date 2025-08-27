import React, { useState } from 'react';
import { Box, Container, Grid } from '@mui/material';
import { SWRConfig } from 'swr';
import { AutosaveProvider } from '@/context/AutosaveContext';
import PaneAContext from '@/components/context/PaneAContext';
import ItemDetailFormContext from '@/components/context/ItemDetailFormContext';

const ContextApiPage: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <SWRConfig value={{ revalidateOnFocus: false }}>
      <AutosaveProvider>
        <Container maxWidth="xl">
          <Box py={2}>
            <h1>React Autosave Sample (Context API 版)</h1>
            <Grid container spacing={2} sx={{ height: '80vh' }}>
              <Grid item xs={6}>
                <Box border={1} borderColor="grey.300" borderRadius={1} height="100%">
                  <PaneAContext 
                    selectedId={selectedId}
                    onSelectedIdChange={setSelectedId}
                  />
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box border={1} borderColor="grey.300" borderRadius={1} height="100%">
                  <ItemDetailFormContext selectedId={selectedId} />
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Container>
      </AutosaveProvider>
    </SWRConfig>
  );
};

export default ContextApiPage;