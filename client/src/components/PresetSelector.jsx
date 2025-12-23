import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, Tabs, Tab, Box, Card, CardContent, Typography, Button, Grid, Chip } from '@mui/material';

export function PresetSelector({ open, onClose, categories, presets, onSelectPreset }) {
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);

  useEffect(() => {
    // Set the initial tab selection when categories are loaded
    if (categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0]._id);
    }
  }, [categories, selectedCategoryId]);


  const handleTabChange = (event, newValue) => {
    setSelectedCategoryId(newValue);
  };

  const handleSelect = (preset) => {
    onSelectPreset(preset);
    onClose();
  };

  const filteredPresets = presets.filter(p => p.category?._id === selectedCategoryId);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Select a Persona</DialogTitle>
      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={selectedCategoryId} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
            {categories.map(cat => (
              <Tab label={cat.name} value={cat._id} key={cat._id} />
            ))}
          </Tabs>
        </Box>
        <Box sx={{ minHeight: '400px' }}>
          <Grid container spacing={2}>
            {filteredPresets.map(preset => (
              <Grid item xs={12} sm={6} md={4} key={preset._id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography gutterBottom variant="h6" component="h2" sx={{ lineHeight: 1.2 }}>
                        {preset.name}
                        </Typography>
                    </Box>
                    {preset.subCategory && (
                        <Chip label={preset.subCategory} size="small" color="primary" variant="outlined" sx={{ mb: 1 }} />
                    )}
                    <Typography variant="body2" color="text.secondary">
                      {preset.description}
                    </Typography>
                  </CardContent>
                  <Box sx={{ p: 2, pt: 0 }}>
                    <Button
                      variant="contained"
                      onClick={() => handleSelect(preset)}
                      fullWidth
                    >
                      Start Chat
                    </Button>
                  </Box>
                </Card>
              </Grid>
            ))}
            {filteredPresets.length === 0 && (
                <Box sx={{ p: 3, width: '100%', textAlign: 'center' }}>
                    <Typography color="text.secondary">No presets in this category.</Typography>
                </Box>
            )}
          </Grid>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
